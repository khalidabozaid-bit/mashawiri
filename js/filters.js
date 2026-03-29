// js/filters.js

import { appData } from './state.js';
import { getCategoryObj, formatCurrency } from './helpers.js';
import { computeNodeFinancials } from './tree.js';
import { NODE_TYPES } from './constants.js';
import { generateTripHTML, generateProjectHTML, generateNodeHTML } from './templates.js';

export function handleSearch() {
    const searchInput = document.getElementById('global-search');
    if(!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        resetSearch();
        return;
    }

    let matches = [];
    appData.nodes.forEach(n => {
        const cat = getCategoryObj(n.category);
        const catName = cat ? cat.name : '';
        const amount = (n.amount || computeNodeFinancials(n).effectiveTotal || 0).toString();
        const text = `${n.title||''} ${catName} ${n.subcategory||''} ${(n.tags||[]).join(' ')} ${n.location||''} ${n.notes||''} ${amount}`.toLowerCase();
        
        if (text.includes(query)) {
            matches.push(n);
        }
    });

    renderFilteredView(matches, `نتيجة البحث عن: ${query}`);
    if(window.closeSearch) window.closeSearch();
}

export function openFilterView(type, value) {
    let matches = [];
    let title = 'تصفية';

    if (type === 'label') {
        title = `ملصق: #${value}`;
        appData.nodes.forEach(n => {
            if (n.tags && n.tags.includes(value)) matches.push(n);
        });
    } else if (type === 'category') {
        title = `قسم: ${getCategoryObj(value).name}`;
        appData.nodes.forEach(n => {
            if (n.category === value) matches.push(n);
        });
    }

    renderFilteredView(matches, title);
}

export function renderFilteredView(matches, title) {
    if(window.switchView) window.switchView('view-filtered');
    
    document.getElementById('filtered-view-title').textContent = title;
    const content = document.getElementById('filtered-content');
    let total = 0;

    if (matches.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-search'></i>
                <p>لا توجد نتائج</p>
            </div>
        `;
        document.getElementById('filter-total').innerHTML = `0.00 <span class="currency">ج.م</span>`;
        return;
    }

    // Only sum top-level matches to avoid double-counting sub-expenses
    // (sub-expenses are already included in their parent's effectiveTotal)
    matches.forEach(m => {
        if (!m.parent_id) {
            total += computeNodeFinancials(m).effectiveTotal;
        }
    });
    // Also add any matched sub-expenses whose parent is NOT in matches
    matches.forEach(m => {
        if (m.parent_id && !matches.find(x => x.id === m.parent_id)) {
            total += computeNodeFinancials(m).effectiveTotal;
        }
    });

    document.getElementById('filter-total').innerHTML = `${formatCurrency(total)} <span class="currency">ج.م</span>`;

    content.innerHTML = matches.map(m => {
        if(m.type === NODE_TYPES.TRIP) return generateTripHTML(m);
        if(m.type === NODE_TYPES.PROJECT) return generateProjectHTML(m);
        
        // For sub-expenses, add context indicating their parent
        let ctxHtml = '';
        if (m.parent_id) {
            const p = appData.nodes.find(x => x.id === m.parent_id);
            if(p) {
                ctxHtml = `<div style="font-size:10px; color:var(--primary); margin-bottom:4px;"><i class='bx bx-folder'></i> بداخل: ${p.title}</div>`;
            }
        }
        return `<div style="margin-bottom:8px;">${ctxHtml} ${generateNodeHTML(m, 0)}</div>`;
    }).join('');
}

export function resetSearch() {
    const searchInput = document.getElementById('global-search');
    if(searchInput) searchInput.value = '';
    if(window.switchView) window.switchView('view-dashboard');
    if(window.updateUI) window.updateUI();
}

window.handleSearch = handleSearch;
window.openFilterView = openFilterView;
window.resetSearch = resetSearch;
