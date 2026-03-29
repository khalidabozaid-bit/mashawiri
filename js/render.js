import { getTreeTopLevel, getActiveTrips, getActiveProjects, getChildrenOf, computeNodeFinancials, getGrandTotal, getTopLevelExpenses, getCompletedNodes, getTrashedNodes } from './tree.js';
import { getCategoryObj, formatCurrency, formatDateTime } from './helpers.js';
import { NODE_TYPES, NODE_STATUS, CONSUMPTION_TYPES } from './constants.js';
import { appData } from './state.js';
import { generateTripHTML, generateNodeHTML, generateProjectHTML } from './templates.js';

import { getNodesGroupedByDate, getMonthlyTotal, getOngoingItems } from './accounting.js';

// Window Attachments for inline HTML event handlers (Moved to top for availability)
window.updateUI = updateUI;
window.renderDashboard = renderDashboard;
window.renderProjectsList = renderProjectsList;
window.renderTrashList = renderTrashList;

export function updateUI() {
    renderDashboard();
    renderProjectsList();
    renderTrashList();
    if(window.renderCategorySelects) window.renderCategorySelects();
    if(window.renderReports) setTimeout(window.renderReports, 50);
}

export function renderDashboard() {
    const todayList = document.getElementById('today-transactions-list');
    const historyList = document.getElementById('history-transactions-list');
    
    if (!todayList || !historyList) return;

    // Get Local Today String (YYYY-MM-DD)
    const localToday = new Date();
    const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;

    // 1. Get Grouped Data from Accounting Engine
    const groupedData = getNodesGroupedByDate();
    const ongoingItems = getOngoingItems(todayStr);

    // ── RENDER ONGOING WIDGET ──
    const ongoingContainer = document.getElementById('ongoing-trips-container');
    if (ongoingContainer) {
        if (ongoingItems.length === 0) {
            ongoingContainer.style.display = 'none';
        } else {
            ongoingContainer.style.display = 'block';
            const ongListId = 'dash-ongoing-list';
            ongoingContainer.innerHTML = `
                <div onclick="window.toggleTripAccordion('${ongListId}', event)" style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer;" class="u-flex-between">
                    <span style="background:var(--ongoing-bg); border:1px solid var(--ongoing-yellow); color:#92400e; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:800;">
                        <i class='bx bx-time-five'></i> مشاوير ومشاريع جارية (${ongoingItems.length})
                    </span>
                    <i class='bx bx-chevron-down' id="icon-${ongListId}" style="color:var(--text-muted); opacity:0.6;"></i>
                    <div style="flex:1; height:1px; background:var(--border-color); margin-right:8px;"></div>
                </div>
                <div id="${ongListId}" style="display:none;">
                    ${ongoingItems.map(item => {
                        const childrenToday = getChildrenOf(item.id).filter(c => (c.date || '').split('T')[0] === todayStr);
                        const partialItem = {
                            ...item,
                            _filteredChildren: childrenToday,
                            _dayTotal: childrenToday.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
                        };
                        if (item.type === NODE_TYPES.TRIP) return generateTripHTML(partialItem, '-ong', true);
                        return generateProjectHTML(partialItem, false, '-ong', true);
                    }).join('')}
                </div>
            `;
        }
    }

    // ── PREPARE TODAY & HISTORY FEEDS ──
    const todayData = groupedData.find(g => g.date === todayStr);
    const todayItems = (todayData ? todayData.items : []).filter(item => {
        // Prevent duplication: if it's already in 'Ongoing', hide from 'Today' list
        return !ongoingItems.some(ong => ong.id === item.id);
    });

    // ── RENDER TODAY ──
    if (todayItems.length === 0) {
        todayList.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><i class='bx bx-calendar-x' style="font-size:48px; opacity:0.2; margin-bottom:12px;"></i><p>لا توجد مصروفات مسجلة اليوم</p></div>`;
    } else {
        todayList.innerHTML = `
            <div style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 10px;">
                <div style="background:var(--primary-light); border:1px solid var(--primary); padding:4px 14px; border-radius:20px; font-size:12px; font-weight:800; color:var(--primary); box-shadow:var(--shadow-sm);">
                     <i class='bx bx-calendar-star'></i> اليوم: ${todayStr}
                </div>
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
            </div>
            ${todayItems.map(item => {
                if (item.type === NODE_TYPES.TRIP) return generateTripHTML(item, '-dash', true);
                if (item.type === NODE_TYPES.PROJECT) return generateProjectHTML(item, false, '-dash', true);
                return generateNodeHTML(item, '-dash');
            }).join('')}
        `;
    }

    // ── RENDER HISTORY ──
    const historyGroups = groupedData.filter(g => g.date !== todayStr);
    if (historyGroups.length === 0) {
        historyList.innerHTML = `<div class="empty-state"><p>لا يوجد سجل للمصروفات السابقة</p></div>`;
    } else {
        let historyHtml = '';
        historyGroups.forEach(group => {
            const filteredItems = group.items.filter(item => !ongoingItems.some(ong => ong.id === item.id));
            if (filteredItems.length === 0) return;

            const dayId = `hist-d-${group.date}`;
            historyHtml += `
            <div style="margin: 20px 0 12px 0; display: flex; align-items: center; gap: 10px;">
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
                <div onclick="window.toggleTripAccordion('${dayId}', event)" style="cursor:pointer; background:var(--card-bg); border:1px solid var(--border-color); padding:4px 12px; border-radius:12px; font-size:11px; font-weight:800; color:var(--text-muted); box-shadow:var(--shadow-sm); display:flex; align-items:center; gap:8px;">
                    <i class='bx bx-calendar'></i> ${formatDateTime(group.date)} 
                    <span style="color:var(--primary); background:rgba(59, 130, 246, 0.1); padding:2px 8px; border-radius:8px;">${formatCurrency(group.total)} ج.م</span>
                    <i class='bx bx-chevron-down' id="icon-${dayId}" style="opacity:0.5;"></i>
                </div>
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
            </div>
            <div id="${dayId}" style="display:none;">
                ${filteredItems.map(item => {
                    if (item.type === NODE_TYPES.TRIP) return generateTripHTML(item, '-his', true);
                    if (item.type === NODE_TYPES.PROJECT) return generateProjectHTML(item, false, '-his', true);
                    return generateNodeHTML(item, '-his');
                }).join('')}
            </div>
            `;
        });
        historyList.innerHTML = historyHtml || `<div class="empty-state"><p>لا يوجد سجل للمصروفات السابقة</p></div>`;
    }

    // ── TOTALS & BUDGET ──
    const todayTotalVal = todayData ? todayData.total : 0;
    const todayTotalEl = document.getElementById('dash-today-total');
    if (todayTotalEl) todayTotalEl.innerHTML = `${formatCurrency(todayTotalVal)} <span class="currency">ج.م</span>`;

    const monthTotal = getMonthlyTotal(localToday.getMonth(), localToday.getFullYear());
    const monthTotalEl = document.getElementById('dash-month-total');
    if (monthTotalEl) monthTotalEl.textContent = formatCurrency(monthTotal);


    const budget = appData.monthlyBudget || 0;
    const progressContainer = document.getElementById('budget-progress-container');
    if (progressContainer && budget > 0) {
        progressContainer.style.display = 'block';
        const percent = Math.min(100, (monthTotal / budget) * 100);
        const color = percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : '#10b981';
        progressContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-weight:700; color:rgba(255,255,255,0.8);">
                <span>الميزانية: ${formatCurrency(budget)} ج.م</span>
                <span>${percent.toFixed(0)}%</span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.2); border-radius:10px; overflow:hidden;">
                <div style="width:${percent}%; height:100%; background:${color}; border-radius:10px; transition:width 0.4s;"></div>
            </div>
        `;
    } else if (progressContainer) progressContainer.style.display = 'none';
}

export function renderProjectsList() {
    const container = document.getElementById('projects-list-container');
    if (!container) return;

    const allProjects = getActiveProjects().sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
    const allTrips = getActiveTrips();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const ongoingTrips = allTrips.filter(trip => {
        const children = getChildrenOf(trip.id);
        if (children.length === 0) return false;
        const uniqueDates = new Set(children.map(c => (c.date||'').split('T')[0]).filter(Boolean));
        return uniqueDates.size > 1 || [...uniqueDates].some(d => d > todayStr);
    });

    let html = '';
    if (ongoingTrips.length > 0) {
        html += `<div style="margin-bottom:8px; padding-bottom:6px; border-bottom:2px solid #fbbf24; font-size:12px; font-weight:800; color:#92400e;"><i class='bx bx-run'></i> مشاوير جارية / ممتدة</div>`;
        html += ongoingTrips.map(t => {
            if (t.type === NODE_TYPES.TRIP) return generateTripHTML(t, '-pl');
            return generateProjectHTML(t, false, '-pl');
        }).join('');
    }
    if (allProjects.length > 0) {
        if (ongoingTrips.length > 0) html += `<div style="margin: 20px 0 8px 0; padding-bottom:6px; border-bottom:2px solid var(--border-color); font-size:12px; font-weight:800; color:var(--text-muted);"><i class='bx bx-briefcase'></i> المشروعات</div>`;
        html += allProjects.map(p => generateProjectHTML(p)).join('');
    }

    if (!html) {
        container.innerHTML = `<div class="empty-state"><i class='bx bx-briefcase-alt-2'></i><p>لا توجد مشروعات أو مشاوير ممتدة</p><button class="btn-primary" onclick="openModal('addProjectModal')">أنشئ مشروعك الأول</button></div>`;
    } else container.innerHTML = html;
}

export function renderTrashList() {
    const container = document.getElementById('trash-list-container');
    if (!container) return;
    const trashed = getTrashedNodes();
    if (trashed.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><i class='bx bx-trash-alt' style="font-size:48px; opacity:0.1; margin-bottom:12px;"></i><p>سلة المحذوفات فارغة</p></div>`;
        return;
    }
    container.innerHTML = trashed.map(node => `
        <div class="t-item mb-2" style="padding:14px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; display:flex; align-items:center; gap:12px;">
            <div style="background:#fee2e2; color:#ef4444; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class='bx ${node.type === NODE_TYPES.TRIP ? 'bx-run' : node.type === NODE_TYPES.PROJECT ? 'bx-briefcase' : 'bx-cart'}' style="font-size:18px;"></i>
            </div>
            <div style="flex:1; min-width:0;">
                <div style="font-size:14px; font-weight:800; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${node.title}</div>
                <div style="font-size:10px; color:var(--text-muted); font-weight:700;">${formatDateTime(node.date)}</div>
            </div>
            <div style="display:flex; gap:6px;">
                <button onclick="window.restoreNodeHandler('${node.id}')" style="background:#f0fdf4; color:#22c55e; border:1px solid #dcfce7; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:800; cursor:pointer;" title="استعادة"><i class='bx bx-undo'></i></button>
                <button onclick="window.hardDeleteHandler('${node.id}')" style="background:#fee2e2; color:#ef4444; border:1px solid #fee2e2; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:800; cursor:pointer;" title="حذف نهائي"><i class='bx bx-trash-alt'></i></button>
            </div>
        </div>
    `).join('');
}

// End of file window attachments (Already moved to top)
