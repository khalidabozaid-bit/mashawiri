// js/main.js

import { appData, loadData, saveData } from './state.js';
import { Actions } from './actions.js';
import { updateUI } from './render.js';
import { initForms, closeAllModals, openModal } from './forms.js';
import { handleSearch } from './filters.js';
import { CONFIG } from './config.js';
import { getTrashedNodes, getCompletedNodes } from './tree.js';
import './ui_core.js';
import './filters.js';
import './reports.js';
import './export_import.js';

// Window Attachments for inline HTML event handlers (Moved to top for availability)
window.openModal = openModal;
window.closeAllModals = closeAllModals;
window.switchView = switchView;
window.toggleSettingsDropdown = toggleSettingsDropdown;
window.closeSettingsDropdown = closeSettingsDropdown;
window.toggleTheme = toggleTheme;
window.toggleSearch = toggleSearch;
window.renderCategorySelects = renderCategorySelects;
window.renderCategoriesManager = renderCategoriesManager;
window.deleteCategoryHandler = deleteCategoryHandler;
window.setMonthlyBudget = setMonthlyBudget;
window.completeNodeHandler = (id) => {
    if (!confirm('هل تريد إنهاء هذا البند؟')) return;
    Actions.completeNode(id);
};
window.reopenNodeHandler = (id) => {
    Actions.reopenNode(id);
};
window.archiveProjectHandler = (id) => {
    if (!confirm('هل تريد أرشفة هذا البند؟ سيُخفى من القائمة الرئيسية.')) return;
    Actions.completeNode(id);
};
window.deleteProjectHandler = (id) => {
    if (!confirm('⚠️ هل أنت متأكد من الحذف؟ سيُحذف البند وكل مصروفاته.')) return;
    Actions.deleteNode(id);
};
window.deleteTodayExpensesHandler = () => {
    const localToday = new Date();
    const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
    if (confirm(`⚠️ هل أنت متأكد من حذف جميع مصروفات اليوم (${todayStr})؟ هذه الخطوة لا يمكن التراجع عنها.`)) {
        Actions.deleteTodayNodes();
        console.log("Deleted all today nodes.");
    }
};
window.factoryResetHandler = () => {
    if (confirm('☠️⚠️ تحذير: أنت على وشك حذف جميع البيانات والعودة لضبط المصنع.')) {
        if (confirm('⚠️ هل أنت متأكد حقاً؟ سيتم مسح كل شيء نهائياً!')) {
            Actions.factoryReset();
        }
    }
};
window.restoreNodeHandler = (id) => {
    Actions.restoreNode(id);
};
window.hardDeleteHandler = (id) => {
    if (!confirm('⚠️ تحذير: سيتم حذف هذا العنصر نهائياً ولا يمكن استعادته مرة أخرى. هل أنت متأكد؟')) return;
    Actions.deletePermanently(id);
};
window.emptyTrashHandler = () => {
    if (getTrashedNodes().length === 0) return;
    if (!confirm('⚠️ هل أنت متأكد من تفريغ سلة المحذوفات تماماً؟ سيتم حذف جميع العناصر نهائياً.')) return;
    Actions.emptyTrash();
};

const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const settingsDropdown = document.getElementById('settingsDropdown');

export function switchView(viewId, push = true) {
    views.forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(viewId);
    if (viewEl) viewEl.classList.add('active');
    
    navItems.forEach(nav => {
        nav.classList.remove('active');
        if(nav.dataset.target && ('view-' + nav.dataset.target) === viewId) {
            nav.classList.add('active');
        }
    });

    if (push) {
        const hash = "#/" + viewId.replace('view-', '');
        history.pushState({ viewId }, "", hash);
    }
}

// Handle Back Button
window.addEventListener('popstate', (e) => {
    // Check if the state we are coming FROM had a modal
    const modalWasOpen = document.querySelector('.bottom-sheet.open');
    
    if (modalWasOpen) {
        closeAllModals(true);
        // If the new state still has a viewId, switch to it
        if (e.state && e.state.viewId) {
            switchView(e.state.viewId, false);
        }
        return;
    }

    if (e.state && e.state.viewId) {
        switchView(e.state.viewId, false);
    } else {
        // Fallback to hash or dashboard
        const hash = window.location.hash.replace('#/', '');
        const viewId = hash ? 'view-' + hash : 'view-dashboard';
        switchView(viewId, false);
    }
});

export function toggleSettingsDropdown(e) {
    e.stopPropagation();
    if(settingsDropdown) settingsDropdown.classList.toggle('show');
}

export function closeSettingsDropdown() {
    if(settingsDropdown) settingsDropdown.classList.remove('show');
}

export function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('mashawiri_theme', isDark ? 'dark' : 'light');
}

export function toggleSearch() {
    const bar = document.getElementById('search-container-bar');
    if (!bar) return;
    const isHidden = window.getComputedStyle(bar).display === 'none';
    if(isHidden) {
        bar.style.display = 'block';
        const input = document.getElementById('global-search');
        if (input) input.focus();
    } else {
        closeSearch();
        const input = document.getElementById('global-search');
        if (input) {
            input.value = '';
            if(window.handleSearch) window.handleSearch();
        }
    }
}

export function closeSearch() {
    const bar = document.getElementById('search-container-bar');
    if (bar) bar.style.display = 'none';
}
window.closeSearch = closeSearch;

// Global click event to close dropdowns / action menus
document.addEventListener('click', (e) => {
    // Action menu (Edit/Delete)
    const menu = document.getElementById('itemActionMenu');
    if (menu && !menu.contains(e.target)) {
        menu.classList.remove('show');
    }
    
    // Settings menu
    if (settingsDropdown && !settingsDropdown.contains(e.target) && !e.target.closest('.settings-btn')) {
        settingsDropdown.classList.remove('show');
    }
});

// Category and Labels Renderers missing from split
export function renderCategorySelects() {
    const selects = document.querySelectorAll('.dynamic-category-select');
    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '';
        
        if (!appData || !appData.categories) return;
        
        appData.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });
        
        const addOpt = document.createElement('option');
        addOpt.value = 'add_new';
        addOpt.textContent = '➕ إضافة تصنيف جديد...';
        addOpt.style.fontWeight = 'bold';
        addOpt.style.color = 'var(--primary)';
        select.appendChild(addOpt);

        if(currentVal && appData.categories.find(c=>c.id === currentVal)) {
            select.value = currentVal;
        } else if(select.options.length > 0) {
            select.value = appData.categories[0].id;
        }
    });
}

export function renderCategoriesManager() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    list.innerHTML = '';
    
    if (!appData || !appData.categories) return;

    appData.categories.forEach(cat => {
        const li = document.createElement('li');
        li.className = 'cat-edit-item';
        li.innerHTML = `
            <div class="cat-edit-info">
                <i class='bx ${cat.icon}' style="color:${cat.color}"></i> ${cat.name}
            </div>
            <div class="cat-edit-actions">
                <button type="button" class="delete" onclick="deleteCategoryHandler('${cat.id}')"><i class='bx bx-trash'></i></button>
            </div>
        `;
        list.appendChild(li);
    });
}

export function deleteCategoryHandler(id) {
    if(appData.categories.length <= 1) {
        alert("لا يمكن حذف جميع التصنيفات!");
        return;
    }
    appData.categories = appData.categories.filter(c => c.id !== id);
    renderCategoriesManager();
}

export function setMonthlyBudget() {
    const current = appData.monthlyBudget || 0;
    const val = prompt('ادخل الميزانية الشهرية المقدرة:', current);
    if (val !== null) {
        appData.monthlyBudget = parseFloat(val) || 0;
    }
}

// Advanced sections are handled via window.toggleAdvanced in forms.js and onclick in HTML.


// Bootstrapping the application
document.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('mashawiri_theme');
    if(savedTheme === 'dark') document.body.classList.add('dark-theme');

    await loadData();
    initForms();

    // Initial View Handling
    const initialHash = window.location.hash.replace('#/', '');
    if (initialHash) {
        switchView('view-' + initialHash, false);
    } else {
        history.replaceState({ viewId: 'view-dashboard' }, "", "#/dashboard");
    }

    // Feature Toggle Enforcement
    if (!CONFIG.features.enableProjects) {
        const projectNav = document.querySelectorAll('.nav-item[data-target="projects"]');
        projectNav.forEach(el => el.style.display = 'none');
        
        const projectSettings = document.querySelectorAll('.settings-menu-item[onclick*="projects"]');
        projectSettings.forEach(el => el.style.display = 'none');
    }

    if (!CONFIG.features.enableExport) {
        const exportEntry = document.querySelectorAll('.settings-menu-item[onclick*="export"]');
        exportEntry.forEach(el => el.style.display = 'none');
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.dataset.target) return;
            const targetId = 'view-' + btn.dataset.target;
            switchView(targetId);
        });
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('dynamic-category-select')) {
            if (e.target.value === 'add_new') {
                e.target.value = appData.categories.length > 0 ? appData.categories[0].id : '';
                if(window.openModal) window.openModal('addCategoryModal');
            }
        }
    });

    const catForm = document.getElementById('form-add-category');
    if (catForm) {
        catForm.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const input = document.getElementById('new-cat-name');
            const name = input.value.trim();
            if(!name) return;
            
            Actions.ensureCategoryExists(name); 
            input.value = '';
            closeAllModals();
        });
    }

    document.querySelectorAll('[data-target-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            if(window.openModal) window.openModal(btn.dataset.targetModal);
        });
    });

    // Dedicated listeners for bottom nav QA buttons
    const qaExpense = document.getElementById('btn-quick-expense');
    if (qaExpense) {
        qaExpense.addEventListener('click', () => {
            if (window.openModal) window.openModal('addNodeModal');
        });
    }
    
    const qaTrip = document.getElementById('btn-quick-trip');
    if (qaTrip) {
        qaTrip.addEventListener('click', () => {
            if (window.openModal) window.openModal('addTripModal');
        });
    }

    if(window.updateUI) {
        window.updateUI();
        console.log("Mashawiri: Initial UI render complete.");
    }
});

// End of file window attachments (Already moved to top)
