import { getNodesGroupedByDate } from './accounting.js';
import { appData, saveData, rebuildNodeMap } from './state.js';
import { getCategoryObj, formatCurrency } from './helpers.js';
import { computeNodeFinancials } from './tree.js';
import { NODE_TYPES } from './constants.js';
import { generateTripHTML, generateProjectHTML, generateNodeHTML } from './templates.js';
import { toggleTripAccordion } from './ui_core.js';

// Window Attachments
window.renderReports = renderReports;
window.toggleReportsView = toggleReportsView;
window.exportData = exportData;
window.importData = importData;

export function toggleReportsView(type) {
    const chartBtn = document.getElementById('btn-chart-view');
    const listBtn = document.getElementById('btn-list-view');
    const chartWrap = document.getElementById('wrapper-chart-view');
    const listWrap = document.getElementById('wrapper-list-view');

    if (!chartBtn || !listBtn || !chartWrap || !listWrap) return;

    if (type === 'list') {
        listBtn.classList.add('active');
        chartBtn.classList.remove('active');
        chartWrap.style.display = 'none';
        listWrap.style.display = 'block';
        renderDetailedReports();
    } else {
        chartBtn.classList.add('active');
        listBtn.classList.remove('active');
        chartWrap.style.display = 'block';
        listWrap.style.display = 'none';
        renderMonthlyChart();
    }
}

export function renderReports() {
    const isList = document.getElementById('wrapper-list-view')?.style.display === 'block';
    if(isList) renderDetailedReports();
    else renderMonthlyChart();
}

/**
 * ── DETAILED HISTORY REPORT ──────────────────────────────────────
 */
export function renderDetailedReports() {
    const container = document.getElementById('report-content');
    if (!container) return;
    
    const groupedData = getNodesGroupedByDate();
    if (groupedData.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:40px 0;"><i class='bx bx-file-blank' style="font-size:48px; color:#cbd5e1;"></i><p>لا توجد بيانات مسجلة لعرضها</p></div>`;
        return;
    }

    const hierarchy = {};
    groupedData.forEach(dayInfo => {
        const d = new Date(dayInfo.date);
        const monthYear = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        const dayOfMonth = d.getDate();
        const weekLabel = `الأسبوع ${Math.ceil(dayOfMonth / 7)}`;
        const dayLabel = d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric' });

        if(!hierarchy[monthYear]) hierarchy[monthYear] = { total: 0, weeks: {} };
        if(!hierarchy[monthYear].weeks[weekLabel]) hierarchy[monthYear].weeks[weekLabel] = { total: 0, days: {} };
        
        hierarchy[monthYear].weeks[weekLabel].days[dayLabel] = { total: dayInfo.total, items: dayInfo.items };
        hierarchy[monthYear].total += dayInfo.total;
        hierarchy[monthYear].weeks[weekLabel].total += dayInfo.total;
    });

    let html = '';
    Object.entries(hierarchy).forEach(([month, monthData], mIdx) => {
        const monthId = `rep-m-${mIdx}`;
        html += `
            <div class="report-group-card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; margin-bottom:16px; overflow:hidden;">
                <div class="u-flex-between" onclick="window.toggleTripAccordion('${monthId}', event)" style="cursor:pointer; background:rgba(0,0,0,0.02); padding:14px 16px; border-bottom:1px solid var(--border-color);">
                    <h3 style="margin:0; font-size:15px; font-weight:800; color:var(--text-main);"><i class='bx bx-calendar-star'></i> ${month}</h3>
                    <div class="u-flex-center" style="gap:10px;">
                        <span style="font-size:15px; font-weight:800; color:var(--primary); font-family:monospace;">${formatCurrency(monthData.total)}</span>
                        <i class='bx bx-chevron-down' style="opacity:0.5;"></i>
                    </div>
                </div>
                <div id="${monthId}" style="display:none; padding:12px;">
        `;

        Object.entries(monthData.weeks).forEach(([week, weekData], wIdx) => {
            const weekId = `${monthId}-w-${wIdx}`;
            html += `
                <div style="margin-bottom:12px; border-right:2px solid var(--border-color); padding-right:12px;">
                    <div class="u-flex-between" onclick="window.toggleTripAccordion('${weekId}', event)" style="cursor:pointer; margin-bottom:8px; background:rgba(0,0,0,0.01); padding:8px; border-radius:10px;">
                        <h4 style="margin:0; font-size:13px; color:var(--text-muted); font-weight:700;">${week}</h4>
                        <div class="u-flex-center" style="gap:8px;">
                            <span style="font-size:13px; font-weight:700; color:var(--text-muted);">${formatCurrency(weekData.total)}</span>
                            <i class='bx bx-chevron-down' style="font-size:14px; opacity:0.3;"></i>
                        </div>
                    </div>
                    <div id="${weekId}" style="display:none; padding-top:4px;">
            `;

            Object.entries(weekData.days).forEach(([day, dayData], dIdx) => {
                const dayId = `${weekId}-d-${dIdx}`;
                html += `
                    <div style="margin-bottom:16px;">
                        <div class="u-flex-between" onclick="window.toggleTripAccordion('${dayId}', event)" style="cursor:pointer; margin-bottom:8px; padding:4px 8px; font-size:11px; font-weight:800; opacity:0.8; text-transform:uppercase; border-bottom: 1px dashed var(--border-color);">
                            <span style="display:flex; align-items:center; gap:6px;">
                                <i class='bx bx-chevron-down' id="icon-${dayId}" style="opacity:0.5;"></i>
                                ${day}
                            </span>
                            <span>${formatCurrency(dayData.total)} ج.م</span>
                        </div>
                        <div id="${dayId}" style="display:none;">
                            ${dayData.items.map(m => {
                                if (m.type === NODE_TYPES.TRIP) return generateTripHTML(m, '-rep', true);
                                if (m.type === NODE_TYPES.PROJECT) return generateProjectHTML(m, false, '-rep', true);
                                return generateNodeHTML(m, '-rep');
                            }).join('')}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`; // end week
        });
        html += `</div></div>`; // end month
    });

    container.innerHTML = html;
}

/**
 * ── ANALYTICS CHART ──────────────────────────────────────────────
 */
export function renderMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;
    
    // FIX: Double counting. Only count Leaf Expenses or Nodes with manual totals that are roots.
    let categoryTotals = {};
    
    // Algorithm:
    // 1. If a node is an EXPENSE and has NO children -> count it under its category.
    // 2. If a node is a TRIP/PROJECT/EXPENSE and has a status, but we only care about its effective contribution.
    // simpler approach: sum effective totals of all ABSOLUTE ROOT nodes.
    appData.nodes.filter(n => !n.parent_id).forEach(root => {
        const fin = computeNodeFinancials(root);
        const cat = getCategoryObj(root.category || 'other');
        if(!categoryTotals[cat.name]) categoryTotals[cat.name] = 0;
        categoryTotals[cat.name] += fin.effectiveTotal;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map(l => (appData.categories.find(c => c.name === l) || {color: '#64748b'}).color);

    if (window.myChart) window.myChart.destroy();
    if (labels.length === 0) return;

    if (typeof Chart !== 'undefined') {
        window.myChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 11, weight: '700' }, color: '#64748b', boxWidth: 12, padding: 15 } }
                }
            }
        });
    }
}

/**
 * ── DATA MANAGEMENT (BACKUP/RESTORE) ──────────────────────────────
 */
export function exportData() {
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mashawiri_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
        alert('خطأ في تصدير البيانات: ' + e.message);
    }
}

export function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
                throw new Error("ملف غير صالح: مفقود قائمة المصروفات.");
            }

            if (confirm(`هل أنت متأكد؟ سيتم استبدال ${appData.nodes.length} مصروف حالي بـ ${parsed.nodes.length} مصروف من الملف الاستعادي.`)) {
                // Clear and Assign
                appData.nodes = parsed.nodes;
                if (parsed.categories) appData.categories = parsed.categories;
                if (parsed.customLabels) appData.customLabels = parsed.customLabels;

                saveData();
                rebuildNodeMap();
                window.updateUI();
                alert('تم استعادة البيانات بنجاح!');
                window.location.reload(); // Hard refresh to ensure all maps are clean
            }
        } catch (err) {
            alert("خطأ في قراءة الملف: " + err.message);
        }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
}
