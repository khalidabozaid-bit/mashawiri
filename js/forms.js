// js/forms.js

import { appData, currentActionItem, setCurrentActionItem } from './state.js';
import { Actions } from './actions.js';
import { getParentOf, getChildrenOf } from './tree.js';
import { getNowLocalString, generateId } from './helpers.js';
import { NODE_TYPES, PAYMENT_METHODS, CONSUMPTION_TYPES, PAYMENT_TYPES } from './constants.js';

// Window Attachments for inline HTML event handlers (Moved to top for availability)
window.openModal = openModal;
window.closeAllModals = closeAllModals;
window.openItemActionMenu = openItemActionMenu;
window.handleEditItem = handleEditItem;
window.handleDeleteItem = handleDeleteItem;
window.handleAddSubItem = handleAddSubItem;
window.toggleAdvanced = toggleAdvanced;
window.addLabelToForm = addLabelToForm;
window.removeLabelFromForm = removeLabelFromForm;
window.initForms = initForms;

let currentFormLabels = { node: [], trip: [], project: [] };

// --- LABEL HANDLING IN FORMS ---
export function addLabelToForm(prefix) {
    const input = document.getElementById(prefix + '-tag-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    const cleanVal = val.startsWith('#') ? val.substring(1) : val;
    
    if (!currentFormLabels[prefix].includes(cleanVal)) {
        currentFormLabels[prefix].push(cleanVal);
        renderFormLabels(prefix);
    }
    input.value = '';
}

export function removeLabelFromForm(prefix, index) {
    currentFormLabels[prefix].splice(index, 1);
    renderFormLabels(prefix);
}

export function renderFormLabels(prefix) {
    const container = document.getElementById(prefix + '-labels-container');
    if(!container) return;
    container.innerHTML = '';
    currentFormLabels[prefix].forEach((label, i) => {
        const chip = document.createElement('span');
        chip.className = 'form-tag-chip';
        chip.innerHTML = `${label} <button type="button" onclick="removeLabelFromForm('${prefix}', ${i})" aria-label="حذف"><i class='bx bx-x'></i></button>`;
        container.appendChild(chip);
    });
}

export function renderQuickLabels(prefix) {
    const container = document.getElementById(prefix + '-quick-labels');
    if (!container) return;
    container.innerHTML = '';
    if (appData.customLabels && appData.customLabels.length > 0) {
        appData.customLabels.slice(0, 5).forEach(lbl => {
            const pill = document.createElement('span');
            pill.style.cssText = 'font-size:11px; color:var(--text-muted); background:var(--bg-color); border:1px solid var(--border-color); border-radius:20px; padding:3px 10px; cursor:pointer; font-family:inherit; font-weight:600; white-space:nowrap;';
            pill.textContent = lbl;
            pill.onclick = () => { document.getElementById(`${prefix}-tag-input`).value = lbl; addLabelToForm(prefix); };
            container.appendChild(pill);
        });
    }
}

// --- MODALS OPEN/CLOSE ---
export function openModal(modalId, parentId = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('open');
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('show');

    // Push state so back button closes modal
    if (!history.state || history.state.modalId !== modalId) {
        history.pushState({ modalId, viewId: history.state?.viewId || 'view-dashboard' }, "", window.location.hash);
    }

    // Reset advanced section
    const advanced = modal.querySelector('.advanced-section.collapsible-section');
    if (advanced) {
        advanced.classList.remove('show');
        const toggler = modal.querySelector('.text-btn i');
        if(toggler) {
            toggler.classList.remove('bx-chevron-up');
            toggler.classList.add('bx-chevron-down');
        }
    }



    if (modalId === 'addNodeModal') {
        setCurrentActionItem({ id: null, type: NODE_TYPES.EXPENSE, parentId: parentId });
        
        const pIdEl = document.getElementById('node-parent-id');
        if(pIdEl) pIdEl.value = parentId || '';
        
        const typeEl = document.getElementById('node-type');
        if(typeEl) typeEl.value = NODE_TYPES.EXPENSE;
        
        const dateInput = document.getElementById('node-date');
        if(dateInput) dateInput.value = ''; 
        
        if (parentId && dateInput) {
            const nodeSelf = appData.nodes.find(n => n.id === parentId);
            const children = getChildrenOf(parentId).sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
            if (children.length > 0 && children[0].date) {
                dateInput.value = children[0].date;
            } else if (nodeSelf && nodeSelf.date) {
                try {
                    const pDate = new Date(nodeSelf.date);
                    if (!isNaN(pDate)) dateInput.value = toLocalISOString(pDate);
                } catch(e) { }
            }
        }
        if (dateInput && !dateInput.value) {
            dateInput.value = getNowLocalString(); 
        }

        renderFormLabels('node');
        renderQuickLabels('node');
        
        if(window.renderCategorySelects) window.renderCategorySelects();
    }
    else if (modalId === 'addTripModal') {
        const dateInput = document.getElementById('trip-start-date');
        if (dateInput && !dateInput.value) dateInput.value = getNowLocalString();
        renderFormLabels('trip');
        renderQuickLabels('trip');
    }
    else if (modalId === 'addProjectModal') {
        const dateInput = document.getElementById('project-start-date');
        if (dateInput && !dateInput.value) dateInput.value = getNowLocalString();
        renderFormLabels('project');
        renderQuickLabels('project');
    }
}

export function closeAllModals(fromHistory = false) {
    const overlay = document.getElementById('modalOverlay');
    if(overlay) overlay.classList.remove('show');
    
    const openModals = document.querySelectorAll('.bottom-sheet.open');
    
    // If closing manually (not via back button), we need to pop the state
    if (!fromHistory && openModals.length > 0 && history.state && history.state.modalId) {
        history.back();
    }

    openModals.forEach(sheet => {
        sheet.classList.remove('open');
    });
    document.querySelectorAll('form').forEach(f => {
        if(f.id !== 'form-add-category' && f.id !== 'form-add-custom-label') f.reset();
    });
    
    const resetIds = ['node-edit-id', 'node-parent-id', 'trip-edit-id', 'project-edit-id'];
    resetIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    ['node', 'trip', 'project'].forEach(prefix => {
        currentFormLabels[prefix] = [];
        renderFormLabels(prefix);
    });
}

export function openItemActionMenu(e, id, type, parentId = null) {
    if(e) e.stopPropagation();
    setCurrentActionItem({ id, type, parentId });
    const menu = document.getElementById('itemActionMenu');
    if(menu) {
        menu.classList.add('show');
        const btnSub = menu.querySelector('#btn-add-sub-item');
        if (btnSub) {
            const isContainer = (type === NODE_TYPES.TRIP || type === NODE_TYPES.PROJECT);
            btnSub.innerHTML = isContainer 
                ? `<i class='bx bx-plus-circle'></i> إضافة مصروف` 
                : `<i class='bx bx-plus-circle'></i> إضافة تفريعة`;
            
            btnSub.style.display = ''; // Always show for supported types
        }
        
        const rect = e.currentTarget.getBoundingClientRect();
        let top = rect.bottom + window.scrollY;
        let left = Math.max(0, rect.left + window.scrollX - 100); 
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
    }
}

export function handleEditItem() {
    const menu = document.getElementById('itemActionMenu');
    if(menu) menu.classList.remove('show');
    const { id } = currentActionItem;
    const node = appData.nodes.find(n => n.id === id); 
    if (!node) return;

    if (node.type === NODE_TYPES.EXPENSE) {
        document.getElementById('node-edit-id').value = node.id;
        document.getElementById('node-parent-id').value = node.parent_id || '';
        document.getElementById('node-title').value = node.title;
        document.getElementById('node-amount').value = node.amount;
        document.getElementById('node-category').value = node.category;
        document.getElementById('node-subcategory').value = node.subcategory || '';
        document.getElementById('node-date').value = node.date ? node.date.slice(0, 16) : '';
        
        const t1 = document.querySelector(`input[name="node-expense-type"][value="${node.basic_type}"]`);
        if(t1) t1.checked = true;
        const t2 = document.querySelector(`input[name="node-payment-method"][value="${node.payment_method}"]`);
        if(t2) t2.checked = true;
        const t3 = document.querySelector(`input[name="node-payment-type"][value="${node.payment_type}"]`);
        if(t3) t3.checked = true;
        
        document.getElementById('node-paid-by').value = node.paid_by || 'self';
        document.getElementById('node-other-name').value = node.other_name || '';
        document.getElementById('node-location').value = node.location || '';
        document.getElementById('node-notes').value = node.notes || '';
        
        currentFormLabels.node = node.tags ? [...node.tags] : [];
        openModal('addNodeModal', node.parent_id);

    } else if (node.type === NODE_TYPES.TRIP) {
        document.getElementById('trip-edit-id').value = node.id;
        document.getElementById('trip-title').value = node.title;
        document.getElementById('trip-start-date').value = node.date;
        currentFormLabels.trip = node.tags ? [...node.tags] : [];
        openModal('addTripModal');

    } else if (node.type === NODE_TYPES.PROJECT) {
        document.getElementById('project-edit-id').value = node.id;
        document.getElementById('project-title').value = node.title;
        document.getElementById('project-start-date').value = node.date;
        document.getElementById('project-end-date').value = node.end_date || '';
        currentFormLabels.project = node.tags ? [...node.tags] : [];
        openModal('addProjectModal');
    }
}

export function handleDeleteItem() {
    const menu = document.getElementById('itemActionMenu');
    if(menu) menu.classList.remove('show');
    const { id } = currentActionItem;
    if (!confirm("هل أنت متأكد من حذف هذا العنصر؟ (سيتم حذف المفردات الفرعية)")) return;
    
    Actions.deleteNode(id);
}

export function handleAddSubItem() {
    const menu = document.getElementById('itemActionMenu');
    if(menu) menu.classList.remove('show');
    const { id } = currentActionItem;
    if (!id) return;
    openModal('addNodeModal', id);
}

// --- FORM SUBMIT HANDLERS ---
export function initForms() {
    // Expense
    const addNodeForm = document.getElementById('form-add-node');
    if (addNodeForm) {
        addNodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('node-edit-id').value || generateId();
            const manualAmount = document.getElementById('node-amount').value;
            
            Actions.addOrUpdateNode({
                id: id,
                parent_id: document.getElementById('node-parent-id').value || null,
                type: NODE_TYPES.EXPENSE,
                title: document.getElementById('node-title').value.trim(),
                amount: manualAmount ? parseFloat(manualAmount) : null,
                category: document.getElementById('node-category').value,
                subcategory: document.getElementById('node-subcategory')?.value || '',
                date: document.getElementById('node-date')?.value || getNowLocalString(),
                tags: [...currentFormLabels.node],
                basic_type: document.querySelector('input[name="node-expense-type"]:checked')?.value || CONSUMPTION_TYPES.NORMAL,
                payment_method: document.querySelector('input[name="node-payment-method"]:checked')?.value || PAYMENT_METHODS.CASH,
                paid_by: document.getElementById('node-paid-by')?.value || 'self',
                other_name: document.getElementById('node-other-name')?.value || '',
                payment_type: document.querySelector('input[name="node-payment-type"]:checked')?.value || PAYMENT_TYPES.NORMAL,
                location: document.getElementById('node-location')?.value || '',
                notes: document.getElementById('node-notes')?.value || ''
            });
            closeAllModals();
            if(window.updateUI) window.updateUI();
        });
    }

    // Trip
    const addTripForm = document.getElementById('form-add-trip');
    if(addTripForm) {
        addTripForm.addEventListener('submit', e => {
            e.preventDefault();
            Actions.addOrUpdateNode({
                id: document.getElementById('trip-edit-id').value || generateId(),
                parent_id: null,
                type: NODE_TYPES.TRIP,
                title: document.getElementById('trip-title').value.trim(),
                date: document.getElementById('trip-start-date').value, 
                tags: [...currentFormLabels.trip]
            });
            closeAllModals();
            if(window.updateUI) window.updateUI();
        });
    }

    // Project
    const addProjectForm = document.getElementById('form-add-project');
    if(addProjectForm) {
        addProjectForm.addEventListener('submit', e => {
            e.preventDefault();
            Actions.addOrUpdateNode({
                id: document.getElementById('project-edit-id').value || generateId(),
                parent_id: null,
                type: NODE_TYPES.PROJECT,
                title: document.getElementById('project-title').value.trim(),
                date: document.getElementById('project-start-date').value,
                end_date: document.getElementById('project-end-date').value,
                tags: [...currentFormLabels.project]
            });
            closeAllModals();
            if(window.updateUI) window.updateUI();
        });
    }

    // Manage Labels
    const addCustomLabelForm = document.getElementById('form-add-custom-label');
    if(addCustomLabelForm) {
        addCustomLabelForm.addEventListener('submit', e => {
            e.preventDefault();
            const val = document.getElementById('new-custom-label-input').value.trim();
            if(val) Actions.addCustomLabel(val);
            document.getElementById('new-custom-label-input').value = '';
            // refresh ui
            if(appData.customLabels) {
                const list = document.getElementById('customLabelsList');
                if(list) list.innerHTML = appData.customLabels.map(l => `<li style="padding:6px; background:#f8fafc; margin-bottom:4px; border-radius:4px;">${l}</li>`).join('');
            }
        });
    }
}

export function toggleAdvanced(id, btn) {
    const el = document.getElementById(id);
    if(el) {
        const isShown = el.classList.contains('show');
        if(isShown) {
            el.classList.remove('show');
        } else {
            el.classList.add('show');
        }
    }
    const icon = btn.querySelector('i');
    if(icon) {
        icon.classList.toggle('bx-chevron-up');
        icon.classList.toggle('bx-chevron-down');
    }
}

// End of file window attachments (Already moved to top)
