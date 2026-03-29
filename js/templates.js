// js/templates.js

import { getChildrenOf, computeNodeFinancials } from './tree.js';
import { getCategoryObj, formatCurrency, formatDateTime } from './helpers.js';
import { NODE_TYPES, CONSUMPTION_TYPES } from './constants.js';

/**
 * ── HELPER TEMPLATES ──────────────────────────────────────────────
 */
export function getTypeBadgeHtml(itemType) {
    if (itemType === 'fixed') {
        return `<span class="u-badge u-badge-primary"><i class='bx bx-lock-alt'></i> أساسي/ثابت</span>`;
    } else if (itemType === CONSUMPTION_TYPES.LUXURY) {
        return `<span class="u-badge" style="color:#c026d3; background:#fae8ff;"><i class='bx bx-party'></i> ترفيه/كمالي</span>`;
    }
    return '';
}

export function renderTagsHtml(tagsArr) {
    if (!tagsArr || tagsArr.length === 0) return '';
    return tagsArr.map(t => `<span class="u-badge u-badge-primary">${t}</span>`).join('');
}

/**
 * ── SUB-ROW (Recursive) ───────────────────────────────────────────
 */
export function renderSubNodeRowHTML(item, parentId = null, idSuffix = '') {
    const children = getChildrenOf(item.id);
    const hasChildren = children.length > 0;
    const fin = computeNodeFinancials(item);
    const amountStr = formatCurrency(fin.effectiveTotal);
    
    let untrackedHtml = '';
    if (hasChildren && item.amount) {
        if (fin.untracked > 0) {
            untrackedHtml = `<span class="u-badge u-badge-warning"><i class='bx bx-info-circle'></i> متبقي: ${formatCurrency(fin.untracked)}</span>`;
        } else if (fin.untracked < 0) {
            untrackedHtml = `<span class="u-badge u-badge-danger"><i class='bx bx-error'></i> تجاوز: ${formatCurrency(Math.abs(fin.untracked))}</span>`;
        }
    }
    
    const accordionId = `inner-sub-${item.id}${idSuffix}`;

    let html = `
        <div class="sub-node-row">
            <div class="u-flex-between">
                <div class="u-flex-center" style="flex:1; flex-wrap:wrap;">
                     <i class='bx bx-check-double' style="color:var(--primary); font-size:16px; opacity:0.7;"></i>
                     <div style="font-size:13px; font-weight:700; color:var(--text-main); line-height:1.2;">${item.title} ${untrackedHtml}</div>
                     ${hasChildren ? `<small class="u-badge u-badge-info" style="cursor:pointer;" onclick="event.stopPropagation(); window.toggleTripAccordion('${accordionId}', event);">(${children.length} تفاصيل) <i class='bx bx-chevron-down'></i></small>` : ''}
                </div>
                
                <div class="u-flex-center">
                    <div class="t-amount" style="font-size:13px; font-weight:700; color:var(--text-main); font-family:monospace;">${amountStr} ج.م</div>
                    <button class="item-dots-v2" onclick="event.stopPropagation(); window.openItemActionMenu && window.openItemActionMenu(event, '${item.id}', '${NODE_TYPES.EXPENSE}', '${parentId || ''}')"><i class='bx bx-dots-vertical-rounded'></i></button>
                </div>
            </div>`;

    if (hasChildren) {
        let subHtml = children.map(ch => renderSubNodeRowHTML(ch, item.id, idSuffix)).join('');
        html += `
            <div id="${accordionId}" class="sub-node-container" style="display:none;">
                ${subHtml}
                <div style="text-align:center; padding-top:4px;">
                    <button class="text-btn" style="font-size:11px; font-weight:800;" onclick="openModal('addNodeModal', '${item.id}')">+ إضافة تفصيل آخر</button>
                </div>
            </div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * ── INNER NODE (Wrapper) ──────────────────────────────────────────
 */
export function generateInnerNodeHTML(exp, parentId = null, idSuffix = '') {
    return renderSubNodeRowHTML(exp, parentId, idSuffix);
}

/**
 * ── STANDALONE EXPENSE ────────────────────────────────────────────
 */
export function generateNodeHTML(item, idSuffix = '') {
    const fin = computeNodeFinancials(item);
    const children = getChildrenOf(item.id);
    const hasChildren = children.length > 0;
    
    const catSettings = getCategoryObj(item.category);
    const tagsHtml = renderTagsHtml(item.tags);

    let untrackedHtml = '';
    if (hasChildren && item.amount) {
        if (fin.untracked > 0) {
            untrackedHtml = `<span class="u-badge u-badge-warning"><i class='bx bx-minus-circle'></i> غير مسجل: ${formatCurrency(fin.untracked)}</span>`;
        } else if (fin.untracked < 0) {
            untrackedHtml = `<span class="u-badge u-badge-danger"><i class='bx bx-error-alt'></i> تجاوز: ${formatCurrency(Math.abs(fin.untracked))}</span>`;
        }
    }

    const accordionId = `dynamic-${item.id}${idSuffix}`;

    let html = `
        <div class="t-item" style="position:relative; align-items:flex-start; padding:16px 12px 16px 16px; margin-bottom:8px;">
            <button class="item-dots-v2" onclick="openItemActionMenu(event, '${item.id}', '${NODE_TYPES.EXPENSE}', '${item.parent_id || ''}')" style="position:absolute; right:0px; top:8px; z-index:10;"><i class='bx bx-dots-vertical-rounded'></i></button>
            <div class="u-flex-center" style="width:100%; align-items:flex-start; padding-right:16px; gap:12px;">
                <div class="u-column-center" style="min-width:48px;">
                    <div class="t-icon" style="background:${catSettings.bg}; color:${catSettings.color}; width:38px; height:38px; min-width:38px; font-size:20px; border-radius:12px; display:flex; align-items:center; justify-content:center;">
                        <i class='bx ${catSettings.icon}'></i>
                    </div>
                    <span style="font-size:10px; color:var(--text-muted); font-weight:700; text-align:center;">${formatDateTime(item.date)}</span>
                </div>
                <div class="t-details" style="flex:1;">
                    <div class="u-flex-between" style="margin-bottom:8px;">
                        <h4 style="font-size:15px; font-weight:700; color:var(--text-main); margin:0;">${item.title}</h4>
                        <span class="t-amount minus" style="font-size:16px; font-weight:800; font-family:monospace; margin:0;">${formatCurrency(fin.effectiveTotal)} ج.م</span>
                    </div>
                    <div class="u-flex-center" style="flex-wrap:wrap; gap:6px;">
                        <span class="u-badge" style="color:${catSettings.color}; background:${catSettings.bg}; font-size:11px; font-weight:700; cursor:pointer;" onclick="event.stopPropagation(); window.openFilterView && window.openFilterView('category', '${catSettings.id}')">${catSettings.name}</span>
                        ${hasChildren ? `<span class="u-badge u-badge-info" style="cursor:pointer;" onclick="event.stopPropagation(); window.toggleTripAccordion('${accordionId}', event);"><i class='bx bx-list-ul'></i> ${children.length} تفاصيل <i class='bx bx-chevron-down'></i></span>` : ''}
                        ${untrackedHtml}
                        ${item.subcategory ? `<span class="u-badge u-badge-muted"><i class='bx bx-git-branch'></i> ${item.subcategory}</span>` : ''}
                        ${getTypeBadgeHtml(item.basic_type)}
                        ${tagsHtml ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-right:6px; padding-right:6px; border-right:1px solid var(--border-color);">${tagsHtml}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    if (hasChildren) {
        let innerHtml = children.map(ch => generateInnerNodeHTML(ch, item.id, idSuffix)).join('');
        html += `
            <div id="${accordionId}" class="sub-node-container" style="margin-right:32px; display:none;">
                ${innerHtml}
                <button class="btn-primary small-btn full-width" style="margin-top:12px; font-size:12px; background:var(--border-color); color:var(--primary); box-shadow:none; padding:8px; font-weight:700;" onclick="window.openModal && window.openModal('addNodeModal', '${item.id}')"><i class='bx bx-plus'></i> أضف تفصيل سريع</button>
            </div>
        `;
    }

    return html;
}


/**
 * ── TRIP CARD ─────────────────────────────────────────────────────
 */
export function generateTripHTML(item, idSuffix = '', isPartial = false) {
    const children = isPartial ? (item._filteredChildren || []) : getChildrenOf(item.id);
    const totalAmount = isPartial ? (item._dayTotal || 0) : computeNodeFinancials(item).effectiveTotal;
    
    let innerHtml = '';
    if (children.length > 0) {
        innerHtml = children.map(exp => generateInnerNodeHTML(exp, item.id, idSuffix)).join('');
    }

    const accordionId = `trip-body-${item.id}${idSuffix}`;

    return `
        <div class="trip-card" id="trip-outer-${item.id}${idSuffix}">
            <div class="trip-header" onclick="window.toggleTripAccordion('${accordionId}', event)" style="position:relative; padding:12px 16px; cursor:pointer; display:flex; align-items:center;">
                <button class="item-dots-v2" onclick="event.stopPropagation(); window.openItemActionMenu && window.openItemActionMenu(event, '${item.id}', '${NODE_TYPES.TRIP}')" style="position:absolute; right:0px; top:8px; z-index:10;"><i class='bx bx-dots-vertical-rounded'></i></button>
                <div class="u-flex-center" style="width:100%; padding-right:12px; gap:12px;">
                    <div class="u-column-center" style="min-width:48px;">
                        <div class="u-column-center" style="background:transparent; width:36px; height:36px;">
                            <span style="font-size:9px; font-weight:700; color:var(--primary); margin-bottom:-4px;">مشوار</span>
                            <i class='bx bx-run' style="font-size:20px; color:var(--primary);"></i>
                        </div>
                        <span style="font-size:10px; color:var(--text-muted); font-weight:700; text-align:center;">${formatDateTime(item.date)}</span>
                    </div>
                    <div class="t-details" style="flex:1;">
                        <div class="u-flex-between" style="margin-bottom:4px;">
                            <h4 style="color:var(--text-main); font-size:15px; margin:0; line-height:1.2; font-weight:750;">${item.title} ${isPartial ? '<small style="font-size:10px; opacity:0.6;">(يومي)</small>' : ''}</h4>
                            <div class="t-amount minus" style="font-size:16px; font-weight:800; font-family:monospace; margin:0;">
                                ${formatCurrency(totalAmount)} ج.م
                            </div>
                        </div>
                        <div class="u-flex-between" style="flex-wrap:wrap; gap:6px;">
                            <span class="u-badge u-badge-info"><i class='bx bx-list-ul'></i> ${children.length} مصرفات</span>
                            <i class='bx bx-chevron-down' style="font-size:20px; opacity:0.5;"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="trip-body" id="${accordionId}">
                <div class="sub-node-container" style="margin-right:32px; border-right-color:#cbd5e1;">
                    <div class="inner-expenses">
                        ${innerHtml}
                    </div>
                    <div style="padding: 12px 0 0 0; text-align: center; ${children.length > 0 ? 'border-top: 1px dashed var(--border-color); margin-top:8px;' : ''}">
                        <button class="btn-primary small-btn full-width" style="margin:0 auto; font-size:12px; font-weight:700; background:var(--border-color); color:var(--primary); box-shadow:none; padding:8px; border-radius:8px;" onclick="openModal('addNodeModal', '${item.id}')"><i class='bx bx-plus'></i> إضافة مصروف للمشوار</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * ── PROJECT CARD ──────────────────────────────────────────────────
 */
export function generateProjectHTML(project, isCompleted = false, idSuffix = '', isPartial = false) {
    const children = isPartial ? (project._filteredChildren || []) : getChildrenOf(project.id);
    const localToday = new Date();
    const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth()+1).padStart(2,'0')}-${String(localToday.getDate()).padStart(2,'0')}`;

    let todaySpend = 0, otherSpend = 0;
    children.forEach(c => {
        const amt = parseFloat(c.amount || 0);
        const d = (c.date || '').split('T')[0];
        if (d === todayStr) todaySpend += amt;
        else otherSpend += amt;
    });
    const totalSpend = isPartial ? (project._dayTotal || 0) : (todaySpend + otherSpend);
    const uniqueDates = new Set(children.map(c => (c.date||'').split('T')[0]).filter(Boolean));
    const daysCount = uniqueDates.size;

    const grouped = {};
    children.forEach(child => {
        const d = (child.date || project.date || 'Unknown').split('T')[0];
        if(!grouped[d]) grouped[d] = [];
        grouped[d].push(child);
    });

    let childrenHtml = '';
    Object.keys(grouped).sort().forEach(dateKey => {
        const dayTotal = grouped[dateKey].reduce((s, c) => s + parseFloat(c.amount || 0), 0);
        const isToday = dateKey === todayStr;
        childrenHtml += `
            <div class="u-flex-center" style="margin:12px 0 8px 0; justify-content:center;">
                <span class="u-badge ${isToday ? 'u-badge-warning' : 'u-badge-muted'}" style="margin:0 auto;">
                    <i class='bx bx-calendar-event'></i> ${isToday ? 'اليوم' : dateKey}
                </span>
                <span style="font-size:11px; font-weight:700; color:#64748b; margin-right:8px;">${formatCurrency(dayTotal)} ج.م</span>
            </div>
        `;
        grouped[dateKey].forEach(child => { childrenHtml += generateInnerNodeHTML(child, project.id, idSuffix); });
    });

    const cardId = `proj-card-${project.id}${idSuffix}`;
    const expandId = `proj-expand-${project.id}${idSuffix}`;
    const tripBodyId = `trip-body-${project.id}${idSuffix}`;
    const iconClass = project.type === NODE_TYPES.TRIP ? 'bx-run' : 'bx-briefcase';

    return `
        <div id="${cardId}" class="project-card ${isCompleted ? 'completed' : ''}">

            <div onclick="window.toggleProjectCard('${project.id}', '${idSuffix}', event)" class="u-flex-center" style="padding:14px 16px; cursor:pointer;">
                <div style="background:rgba(255,255,255,0.1); border-radius:10px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class='bx ${iconClass}' style="font-size:20px; color:white;"></i>
                </div>
                <div style="flex:1; min-width:0;">
                    <div class="u-flex-center" style="margin-bottom:2px;">
                        <span style="font-size:14px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${project.title}</span>
                        ${isCompleted ? `<span style="font-size:9px; background:#22c55e; color:white; padding:2px 6px; border-radius:8px; font-weight:800;">✅</span>` : ''}
                    </div>
                    <div style="font-size:11px; opacity:0.55; display:flex; gap:8px;">
                        <span><i class='bx bx-list-ul'></i> ${children.length} مصروف</span>
                        <span>·</span>
                        <span><i class='bx bx-calendar'></i> ${daysCount} يوم</span>
                    </div>
                </div>
                <div style="text-align:left; flex-shrink:0;">
                    <div style="font-size:16px; font-weight:800; font-family:monospace;">${formatCurrency(totalSpend)}</div>
                    <div style="font-size:10px; opacity:0.5; text-align:center;">ج.م</div>
                </div>
                <i class='bx bx-chevron-down' id="proj-chevron-${project.id}${idSuffix}" style="font-size:18px; opacity:0.5; transition:transform 0.2s;"></i>
            </div>

            <div id="${expandId}" style="display:none; padding:0 16px 16px 16px; border-top:1px solid rgba(255,255,255,0.1);">
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin:14px 0;">
                    <div style="background:rgba(251,191,36,0.15); border:1px solid rgba(251,191,36,0.3); border-radius:12px; padding:10px; text-align:center;">
                        <div style="font-size:9px; font-weight:700; color:#fbbf24; margin-bottom:4px;">اليوم</div>
                        <div style="font-size:15px; font-weight:800; color:#fef3c7; font-family:monospace;">${formatCurrency(todaySpend)}</div>
                        <div style="font-size:9px; opacity:0.6; margin-top:2px;">ج.م</div>
                    </div>
                    <div style="background:rgba(96,165,250,0.15); border:1px solid rgba(96,165,250,0.3); border-radius:12px; padding:10px; text-align:center;">
                        <div style="font-size:9px; font-weight:700; color:#93c5fd; margin-bottom:4px;">أيام أخرى</div>
                        <div style="font-size:15px; font-weight:800; color:#dbeafe; font-family:monospace;">${formatCurrency(otherSpend)}</div>
                        <div style="font-size:9px; opacity:0.6; margin-top:2px;">ج.م</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:10px; text-align:center;">
                        <div style="font-size:9px; font-weight:700; color:rgba(255,255,255,0.7); margin-bottom:4px;">الإجمالي</div>
                        <div style="font-size:15px; font-weight:800; color:white; font-family:monospace;">${formatCurrency(totalSpend)}</div>
                        <div style="font-size:9px; opacity:0.6; margin-top:2px;">ج.م</div>
                    </div>
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                    ${!isCompleted ? `
                        <button class="btn-primary small-btn" style="flex:1; background:rgba(255,255,255,0.12); color:white; box-shadow:none; padding:8px; font-size:12px; font-weight:700;" onclick="openModal('addNodeModal','${project.id}')"><i class='bx bx-plus'></i> إضافة منصرف</button>
                        <button onclick="window.completeNodeHandler('${project.id}')" style="padding:8px 12px; background:#22c55e; color:white; border:none; border-radius:10px; font-size:12px; font-weight:800; cursor:pointer;"><i class='bx bx-check'></i> إنهاء</button>
                    ` : `
                        <button onclick="window.reopenNodeHandler('${project.id}')" style="flex:1; padding:8px; background:rgba(255,255,255,0.12); color:white; border:none; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;"><i class='bx bx-refresh'></i> إعادة فتح</button>
                    `}
                    <button onclick="window.archiveProjectHandler('${project.id}')" style="padding:8px 12px; background:rgba(251,191,36,0.2); color:#fbbf24; border:1px solid rgba(251,191,36,0.4); border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;"><i class='bx bx-archive'></i> أرشفة</button>
                    <button onclick="window.deleteProjectHandler('${project.id}')" style="padding:8px 12px; background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.3); border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;"><i class='bx bx-trash'></i></button>
                </div>

                <button onclick="window.toggleTripAccordion('${tripBodyId}', event)"
                        style="width:100%; background:rgba(255,255,255,0.06); color:white; border:none; border-radius:10px; padding:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <i class='bx bx-list-ul'></i> عرض المصروفات التفصيلية <i class='bx bx-chevron-down'></i>
                </button>
                <div id="${tripBodyId}" style="display:none; margin-top:10px;">
                    ${childrenHtml ? `<div style="background:var(--card-bg); border-radius:12px; padding:10px; color:var(--text-main);">${childrenHtml}</div>` : '<p style="color:white; opacity:0.4; font-size:12px; text-align:center; margin:8px 0;">لا يوجد مصاريف بعد</p>'}
                </div>
            </div>
        </div>
    `;
}

// Map to window for global access
window.generateTripHTML = generateTripHTML;
window.generateNodeHTML = generateNodeHTML;
window.generateProjectHTML = generateProjectHTML;
window.generateInnerNodeHTML = generateInnerNodeHTML;
