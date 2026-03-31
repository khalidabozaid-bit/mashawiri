// js/actions.js

import { appData, saveData } from './state.js';
import { getChildrenOf } from './tree.js';
import { generateId, getNowLocalString, escapeHTML } from './helpers.js';
import { NODE_STATUS } from './constants.js';
import { CONFIG } from './config.js';

export const Actions = {
    // NODE MUTATIONS
    addOrUpdateNode: function(nodeData) {
        // Sanitize sensitive text fields
        if (nodeData.title) nodeData.title = escapeHTML(nodeData.title);
        if (nodeData.notes) nodeData.notes = escapeHTML(nodeData.notes);
        if (nodeData.subcategory) nodeData.subcategory = escapeHTML(nodeData.subcategory);

        const existingIndex = appData.nodes.findIndex(n => n.id === nodeData.id);
        if (existingIndex > -1) {
            Object.assign(appData.nodes[existingIndex], nodeData);
        } else {
            appData.nodes.push(nodeData);
        }
    },

    deleteNode: function(nodeId) {
        if (CONFIG.features.enableTrash) {
            // Recursive move to trash
            function trashWithChildren(nId) {
                const node = appData.nodes.find(n => n.id === nId);
                if (node) node.status = NODE_STATUS.TRASH;
                const children = getChildrenOf(nId, true); // Include already trashed to ensure full branch trashing
                children.forEach(c => trashWithChildren(c.id));
            }
            trashWithChildren(nodeId);
        } else {
            // Recursive permanent deletion
            this.deletePermanently(nodeId);
        }
    },

    deletePermanently: function(nodeId) {
        const idsToDelete = [];
        
        function collectIds(nId) {
            idsToDelete.push(nId);
            const children = getChildrenOf(nId, true); // Important: must find all descendants regardless of status
            children.forEach(c => collectIds(c.id));
        }
        
        collectIds(nodeId);
        
        // Single atomic multi-delete
        appData.nodes = appData.nodes.filter(n => !idsToDelete.includes(n.id));
    },

    restoreNode: function(nodeId) {
        function restoreWithChildren(nId) {
            const node = appData.nodes.find(n => n.id === nId);
            if (node) node.status = NODE_STATUS.ACTIVE;
            const children = getChildrenOf(nId, true); // Find all trashed children to restore them too
            children.forEach(c => restoreWithChildren(c.id));
        }
        restoreWithChildren(nodeId);
    },

    emptyTrash: function() {
        appData.nodes = appData.nodes.filter(n => n.status !== NODE_STATUS.TRASH);
    },

    importNodesBulk: function(nodesArray) {
        if (!nodesArray || nodesArray.length === 0) return;
        appData.nodes = appData.nodes.concat(nodesArray);
    },

    // CATEGORY MUTATIONS
    ensureCategoryExists: function(catName) {
        if (!catName) return 'c6'; // fallback Default (Other)
        let exists = appData.categories.find(c => c.name === catName);
        if (!exists) {
            const newId = 'c_' + generateId();
            appData.categories.push({ 
                id: newId, 
                name: catName, 
                icon: 'bx-label', 
                color: '#64748b', 
                bg: '#f1f5f9' 
            });
            return newId;
        }
        return exists.id;
    },

    // SETTINGS/CUSTOM LABELS MUTATIONS
    addCustomLabel: function(label) {
        if (!appData.customLabels) appData.customLabels = [];
        if (!appData.customLabels.includes(label)) {
            appData.customLabels.push(label);
        }
    },
    
    deleteCustomLabel: function(label) {
        if (!appData.customLabels) return;
        appData.customLabels = appData.customLabels.filter(l => l !== label);
    },

    // LIFECYCLE
    completeNode: function(nodeId) {
        const node = appData.nodes.find(n => n.id === nodeId);
        if (!node) return;
        node.status = NODE_STATUS.COMPLETED;
        node.end_date = getNowLocalString(); // exact datetime of completion
    },

    reopenNode: function(nodeId) {
        const node = appData.nodes.find(n => n.id === nodeId);
        if (!node) return;
        node.status = NODE_STATUS.ACTIVE;
        node.end_date = null;
    },

    deleteTodayNodes: function() {
        const localToday = new Date();
        const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
        
        // Find all nodes that are directly today
        const todayNodes = appData.nodes.filter(n => (n.date || '').split('T')[0] === todayStr);
        
        // Delete them one by one (to handle recursion if they are trips/projects)
        todayNodes.forEach(node => {
            this.deleteNode(node.id);
        });
    },

    shareNode: async function(nodeId) {
        const node = appData.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const { computeNodeFinancials, getChildrenOf } = await import('./tree.js');
        const { formatCurrency, formatDateTime } = await import('./helpers.js');
        
        const fin = computeNodeFinancials(node);
        const children = getChildrenOf(nodeId);
        
        let text = `💰 *ملخص مشاوريري: ${node.title}*\n`;
        text += `📅 التاريخ: ${formatDateTime(node.date)}\n`;
        text += `💵 الإجمالي: ${formatCurrency(fin.effectiveTotal)} ج.م\n`;
        
        if (children.length > 0) {
            text += `\n📋 *التفاصيل:*\n`;
            children.sort((a,b) => new Date(a.date||0) - new Date(b.date||0)).forEach((c, idx) => {
                const cFin = computeNodeFinancials(c);
                text += `${idx + 1}. ${c.title}: ${formatCurrency(cFin.effectiveTotal)} ج.م\n`;
            });
        }
        
        text += `\n✨ _تمت المشاركة من تطبيق مشاوريري_ 💎`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `ملخص: ${node.title}`,
                    text: text
                });
            } catch (err) {
                console.error("Share failed", err);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(text);
                if (window.showToast) window.showToast('تم نسخ الملخص للحافظة! يمكنك لصقه في واتساب.', 'success');
            } catch (err) {
                console.error("Copy failed", err);
            }
        }
    },

    factoryReset: async function() {
        const legacyKeys = [CONFIG.storageKey, STORAGE_KEY_V5, STORAGE_KEY_V4, 'mashawiri_data', 'app_data'];
        legacyKeys.forEach(k => localStorage.removeItem(k));
        
        try {
            const { DB } = await import('./db.js');
            await DB.delete(CONFIG.storageKey);
            console.log("Mashawiri: Factory reset complete.");
        } catch (e) {
            console.error("Mashawiri: DB clear failed during reset", e);
        }
        
        window.location.reload();
    }
};

window.Actions = Actions;
