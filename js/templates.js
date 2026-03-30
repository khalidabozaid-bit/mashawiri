// js/templates.js

import { getChildrenOf, computeNodeFinancials } from './tree.js';
import { getCategoryObj, formatCurrency, formatDateTime } from './helpers.js';
import { NODE_TYPES, CONSUMPTION_TYPES } from './constants.js';

/**
 * ── HELPER TEMPLATES ──────────────────────────────────────────────
 */
export function getTypeBadgeHtml(itemType) {
    if (itemType === 'fixed') {
        return `<span class="u-badge u-badge-primary"><i class='bx bx-lock-alt'></i> أساسي</span>`;
    } else if (itemType === CONSUMPTION_TYPES.LUXURY) {
        return `<span class="u-badge" style="color:#c026d3; background:#fae8ff;"><i class='bx bx-party'></i> ترفيه</span>`;
    }
    return '';
}

export function renderTagsHtml(tagsArr) {
    if (!tagsArr || tagsArr.length === 0) return '';
    return tagsArr.map(t => `<span class="u-badge u-badge-primary">${t}</span>`).join('');
}

/**
 * ── SUB-ITEM (Fixed Rules Component) ─────────────────────────────────
 * Rules:
 * - isDetail: true -> Numbered (1. 2.), Dots on LEFT, No Icon.
 * - isDetail: false -> Not Numbered (Trip/Project peers), Dots on LEFT, Small Icon.
 *   Category Badge is now beside the AMOUNT for !isDetail items.
 */
export function generateInnerNodeHTML(item, parentId = null, idSuffix = '', index = null, isDetail = true) {
    const fin = computeNodeFinancials(item);
    const children = getChildrenOf(item.id);
    const hasChildren = children.length > 0;
    const catSettings = getCategoryObj(item.category);
    const accordionId = `inner-${item.id}${idSuffix}`;

    return `
        <div class="t-item sub-item-row" style="position:relative; display:flex; align-items:center; padding:10px 12px; margin-bottom:0; border-bottom:1px solid var(--border-color);">
            <button class="item-dots-v2" onclick="openItemActionMenu(event, '${item.id}', '${NODE_TYPES.EXPENSE}', '${parentId || ''}')" style="position:absolute; left:4px; top:50%; transform:translateY(-50%); z-index:10;"><i class='bx bx-dots-vertical-rounded'></i></button>

            <div class="u-flex-center" style="width:100%; align-items:center; gap:8px;">
                <div class="t-details" style="flex:1; display:flex; align-items:center; justify-content:space-between; padding-left:24px;">
                    <!-- Right Side: Icon/Number + Title -->
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${isDetail && index !== null ? `
                            <span style="font-size:13px; font-weight:800; color:var(--text-muted); min-width:18px;">${index}.</span>
                        ` : `
                            <div style="width:24px; height:24px; min-width:24px; border-radius:8px; background:${catSettings.bg}; color:${catSettings.color}; display:flex; align-items:center; justify-content:center; font-size:14px;">
                                <i class='bx ${catSettings.icon}'></i>
                            </div>
                        `}
                        
                        <div style="display:flex; align-items:center; gap:6px;">
                            <h4 style="font-size:13.5px; font-weight:700; color:var(--text-main); margin:0; line-height:1.2;">${item.title}</h4>
                            ${hasChildren ? `
                                <span class="u-badge u-badge-info" style="font-size:9px; cursor:pointer;" onclick="event.stopPropagation(); window.toggleTripAccordion('${accordionId}', event);">${children.length} تفاصيل <i class='bx bx-chevron-down'></i></span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Left Side: Category Tag + Amount -->
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${!isDetail ? `
                            <span style="font-size:9.5px; font-weight:800; color:${catSettings.color}; background:${catSettings.bg}; padding:2px 7px; border-radius:5px; line-height:1; white-space:nowrap;">${catSettings.name}</span>
                        ` : ''}
                        <span class="t-amount minus" style="font-size:13.5px; font-weight:800; font-family:monospace; margin:0; white-space:nowrap;">${formatCurrency(fin.effectiveTotal)} ج.م</span>
                    </div>
                </div>
            </div>
        </div>
        ${hasChildren ? `
            <div id="${accordionId}" class="sub-node-container" style="margin-right:24px; border-right:2px solid ${catSettings.color}; display:none;">
                ${children.map((ch, idx) => generateInnerNodeHTML(ch, item.id, idSuffix, idx + 1, true)).join('')}
            </div>
        ` : ''}
    `;
}

/**
 * ── MAIN EXPENSE CARD (Root Level) ─────────────────────────────────────
 */
export function generateNodeHTML(item, idSuffix = '') {
    const fin = computeNodeFinancials(item);
    const children = getChildrenOf(item.id);
    const hasChildren = children.length > 0;
    const catSettings = getCategoryObj(item.category);
    const tagsHtml = renderTagsHtml(item.tags);

    let budgetStatusHtml = '';
    if (hasChildren && item.amount) {
        if (fin.untracked > 0) {
            budgetStatusHtml = `<span class="u-badge" style="background:rgba(34,197,94,0.1); color:#16a34a; border:1px solid rgba(34,197,94,0.2);"><i class='bx bx-wallet'></i> متبقي: ${formatCurrency(fin.untracked)}</span>`;
        } else if (fin.untracked < 0) {
            budgetStatusHtml = `<span class="u-badge u-badge-danger" style="background:rgba(239,68,68,0.1); color:#dc2626; border:1px solid rgba(239,68,68,0.2);"><i class='bx bx-trending-up'></i> تجاوز: ${formatCurrency(Math.abs(fin.untracked))}</span>`;
        }
    }

    const accordionId = `dynamic-${item.id}${idSuffix}`;

    return `
        <div class="t-item" style="position:relative; align-items:flex-start; padding:16px 12px 16px 16px; margin-bottom:8px;">
            <button class="item-dots-v2" onclick="openItemActionMenu(event, '${item.id}', '${NODE_TYPES.EXPENSE}', '${item.parent_id || ''}')" style="position:absolute; right:0px; top:8px; z-index:10;"><i class='bx bx-dots-vertical-rounded'></i></button>
            <div class="u-flex-center" style="width:100%; align-items:flex-start; padding-right:16px; gap:12px;">
                <div class="u-column-center" style="min-width:48px; padding-top:2px;">
                    <div class="t-icon" style="background:${catSettings.bg}; color:${catSettings.color}; width:38px; height:38px; min-width:38px; font-size:20px; border-radius:12px; display:flex; align-items:center; justify-content:center;">
                        <i class='bx ${catSettings.icon}'></i>
                    </div>
                    <span style="font-size:10px; color:var(--text-muted); font-weight:700; text-align:center; margin-top:4px;">${formatDateTime(item.date)}</span>
                </div>
                <!-- Standardized: 17px, Bold (750) -->
                <div class="t-details" style="flex:1; text-align:right; margin-top:8px;">
                    <div class="u-flex-between" style="margin-bottom:8px; align-items:center;">
                        <h4 style="font-size:17px; font-weight:750; color:var(--text-main); margin:0; line-height:1.2;">${item.title}</h4>
                        <span class="t-amount minus" style="font-size:17px; font-weight:800; font-family:monospace; margin:0; margin-right:8px;">${formatCurrency(fin.effectiveTotal)} ج.م</span>
                    </div>
                    <div class="u-flex" style="flex-wrap:wrap; gap:6px; justify-content:flex-start; align-items:center;">
                        <span class="u-badge" style="color:${catSettings.color}; background:${catSettings.bg}; font-size:11.5px; font-weight:700;">${catSettings.name}</span>
                        ${hasChildren ? `<span class="u-badge u-badge-info" style="cursor:pointer;" onclick="event.stopPropagation(); window.toggleTripAccordion('${accordionId}', event);"><i class='bx bx-list-ul'></i> ${children.length} تفاصيل <i class='bx bx-chevron-down'></i></span>` : ''}
                        ${budgetStatusHtml}
                        ${item.subcategory ? `<span class="u-badge u-badge-muted">${item.subcategory}</span>` : ''}
                        ${getTypeBadgeHtml(item.basic_type)}
                        ${tagsHtml ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-right:6px; padding-right:6px; border-right:1px solid var(--border-color);">${tagsHtml}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>

        ${hasChildren ? `
            <div id="${accordionId}" class="sub-node-container" style="margin-right:32px; border-right:2px solid ${catSettings.color}; display:none;">
                ${children.map((ch, idx) => generateInnerNodeHTML(ch, item.id, idSuffix, idx + 1, true)).join('')}
                <div style="text-align: center; margin-top:8px;">
                    <button class="btn-primary small-btn full-width" style="margin:0 auto; font-size:12px; font-weight:700; background:transparent; color:var(--primary); box-shadow:none; padding:10px; border-radius:8px;" onclick="window.openModal && window.openModal('addNodeModal', '${item.id}')"><i class='bx bx-plus-circle'></i> إضافة تفصيل آخر</button>
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * ── TRIP CARD (Container Level) ─────────────────────────────────────────
 */
export function generateTripHTML(item, idSuffix = '', isPartial = false) {
    const children = isPartial ? (item._filteredChildren || []) : getChildrenOf(item.id);
    const totalAmount = isPartial ? (item._dayTotal || 0) : computeNodeFinancials(item).effectiveTotal;
    const accordionId = `trip-body-${item.id}${idSuffix}`;

    return `
        <div class="trip-card" id="trip-outer-${item.id}${idSuffix}">
            <div class="trip-header" onclick="window.toggleTripAccordion('${accordionId}', event)" style="position:relative; padding:12px 16px; cursor:pointer; display:flex; align-items:center;">
                <button class="item-dots-v2" onclick="event.stopPropagation(); window.openItemActionMenu && window.openItemActionMenu(event, '${item.id}', '${NODE_TYPES.TRIP}')" style="position:absolute; right:0px; top:8px; z-index:10;"><i class='bx bx-dots-vertical-rounded'></i></button>
                <div class="u-flex-center" style="width:100%; padding-right:12px; gap:12px;">
                    <div class="u-column-center" style="min-width:48px; padding-top:2px;">
                        <div class="u-column-center" style="background:transparent; width:36px; height:36px;">
                            <span style="font-size:9px; font-weight:700; color:var(--primary); margin-bottom:-4px;">مشوار</span>
                            <i class='bx bx-run' style="font-size:20px; color:var(--primary);"></i>
                        </div>
                        <span style="font-size:10px; color:var(--text-muted); font-weight:700; text-align:center; margin-top:4px;">${formatDateTime(item.date)}</span>
                    </div>
                    <!-- Standardized: 17px, Bold (750) -->
                    <div class="t-details" style="flex:1; margin-top:8px;">
                        <div class="u-flex-between" style="margin-bottom:4px; align-items:center;">
                            <h4 style="color:var(--text-main); font-size:17px; margin:0; line-height:1.2; font-weight:750;">${item.title}</h4>
                            <div class="t-amount minus" style="font-size:17px; font-weight:800; font-family:monospace; margin:0;">
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
            
            <div class="trip-body" id="${accordionId}" style="display:none;">
                <div class="sub-node-container" style="margin-right:32px; border-right:2px solid var(--primary); ${children.length === 0 ? 'background:transparent; border:none; padding:0; margin-bottom:8px;' : ''}">
                    <div class="inner-expenses">
                        ${children.map((exp, idx) => generateInnerNodeHTML(exp, item.id, idSuffix, null, false)).join('')}
                    </div>
                    ${children.length > 0 ? `
                        <div style="text-align: center; border-top: 1px dashed var(--border-color); margin-top:8px; padding-top:12px;">
                            <button class="btn-primary small-btn full-width" style="margin:0 auto; font-size:11px; font-weight:700; background:transparent; color:var(--primary); box-shadow:none; padding:6px; border-radius:8px;" onclick="openModal('addNodeModal', '${item.id}')"><i class='bx bx-plus-circle'></i> إضافة مصروف للمشوار</button>
                        </div>
                    ` : `
                        <div style="padding-top:4px; text-align:center;">
                            <button class="btn-primary small-btn full-width" style="margin:0 auto; font-size:11px; font-weight:700; background:transparent; color:var(--primary); box-shadow:none; padding:6px; border-radius:8px;" onclick="openModal('addNodeModal', '${item.id}')"><i class='bx bx-plus-circle'></i> إضافة مصروف للمشوار</button>
                        </div>
                    `}
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
        grouped[dateKey].forEach((child, idx) => { childrenHtml += generateInnerNodeHTML(child, project.id, idSuffix, null, false); });
    });

    const cardId = `proj-card-${project.id}${idSuffix}`;
    const expandId = `proj-expand-${project.id}${idSuffix}`;
    const tripBodyId = `trip-body-${project.id}${idSuffix}`;

    return `
        <div id="${cardId}" class="project-card ${isCompleted ? 'completed' : ''}">
            <div onclick="window.toggleProjectCard('${project.id}', '${idSuffix}', event)" class="u-flex-center" style="padding:14px 16px; cursor:pointer;">
                <div style="background:rgba(255,255,255,0.1); border-radius:10px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class='bx bx-briefcase' style="font-size:22px; color:white;"></i>
                </div>
                <div style="flex:1; margin-right:12px;">
                    <div style="font-size:15px; font-weight:800; color:white; margin-bottom:2px;">${project.title}</div>
                    <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:rgba(255,255,255,0.6); font-weight:700;">
                        <span><i class='bx bx-check-circle'></i> ${children.length}</span>
                        <span>·</span>
                        <span><i class='bx bx-calendar'></i> ${daysCount} يوم</span>
                    </div>
                </div>
                <div style="text-align:left; flex-shrink:0;">
                    <div style="font-size:16/px; font-weight:800; font-family:monospace;">${formatCurrency(totalSpend)}</div>
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
