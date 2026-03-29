import { appData, getNodeById } from './state.js';
import { NODE_TYPES, NODE_STATUS } from './constants.js';

export function getChildrenOf(parentId, includeTrash = false) {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n => 
        n.parent_id === parentId && 
        (includeTrash || n.status !== NODE_STATUS.TRASH)
    );
}

export function getParentOf(nodeId) {
    const node = getNodeById(nodeId);
    if (!node || !node.parent_id) return null;
    return getNodeById(node.parent_id);
}

export function isContainer(node) {
    return getChildrenOf(node.id).length > 0;
}

export function computeNodeFinancials(node) {
    const children = getChildrenOf(node.id);
    let itemsSum = 0;
    
    // Recursive sum
    children.forEach(child => {
        const childFin = computeNodeFinancials(child);
        itemsSum += childFin.effectiveTotal;
    });

    const manualAmount = (node.amount !== undefined && node.amount !== null && node.amount !== '') 
                         ? parseFloat(node.amount) : null;
    
    let effectiveTotal = 0;
    let untracked = 0;

    // RULE: total = manual amount (if exists). If not, total = itemsSum.
    // untracked = total - itemsSum.
    if (manualAmount !== null) {
        effectiveTotal = manualAmount;
        untracked = manualAmount - itemsSum; 
    } else {
        effectiveTotal = itemsSum;
        untracked = 0;
    }

    return {
        itemsSum,
        manualAmount,
        effectiveTotal,
        untracked,
        hasChildren: children.length > 0
    };
}

// Extraction / Filtering for Top Levels
export function getTreeTopLevel() {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n => !n.parent_id && n.status !== NODE_STATUS.TRASH);
}

export function getActiveProjects() {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n => n.type === NODE_TYPES.PROJECT && n.status !== NODE_STATUS.TRASH);
}

export function getActiveTrips() {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n => n.type === NODE_TYPES.TRIP && n.status !== NODE_STATUS.TRASH);
}

export function getCompletedNodes() {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n =>
        (n.type === NODE_TYPES.TRIP || n.type === NODE_TYPES.PROJECT) &&
        n.status === NODE_STATUS.COMPLETED &&
        n.status !== NODE_STATUS.TRASH
    ).sort((a, b) => new Date(b.end_date || 0) - new Date(a.end_date || 0));
}

export function getTopLevelExpenses() {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n => n.type === NODE_TYPES.EXPENSE && !n.parent_id && n.status !== NODE_STATUS.TRASH);
}

export function getTrashedNodes() {
    if (!appData || !appData.nodes) return [];
    return appData.nodes.filter(n => n.status === NODE_STATUS.TRASH);
}

export function getGrandTotal() {
    if (!appData || !appData.nodes) return 0;
    let grandTotal = 0;
    appData.nodes.filter(n => !n.parent_id && n.status !== NODE_STATUS.TRASH).forEach(top => {
        grandTotal += computeNodeFinancials(top).effectiveTotal;
    });
    return grandTotal;
}

// Map globals for any HTML inline attributes (not typically here but safe)
window.getChildrenOf = getChildrenOf;
window.getParentOf = getParentOf;
window.computeNodeFinancials = computeNodeFinancials;
window.getTreeTopLevel = getTreeTopLevel;
window.getActiveProjects = getActiveProjects;
window.getActiveTrips = getActiveTrips;
window.getTopLevelExpenses = getTopLevelExpenses;
window.getTrashedNodes = getTrashedNodes;
window.getGrandTotal = getGrandTotal;
