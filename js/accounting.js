// js/accounting.js
import { appData, getNodeById } from './state.js';
import { NODE_TYPES, NODE_STATUS } from './constants.js';
import { getChildrenOf } from './tree.js';

/**
 * ── THE CORE GROUPING ENGINE ──────────────────────────────────────
 * Groups all activity (standalone expenses and fragments of multi-day trips/projects)
 * by their actual occurrence date.
 */
export function getNodesGroupedByDate() {
    const allUniqueDates = new Set();
    
    // 1. Collect all dates where activity happened
    appData.nodes.forEach(n => {
        if (n.date && n.status !== NODE_STATUS.TRASH) {
            allUniqueDates.add(n.date.split('T')[0]);
        }
    });

    const sortedDates = Array.from(allUniqueDates).sort((a, b) => new Date(b) - new Date(a));
    const result = [];

    sortedDates.forEach(dateStr => {
        // Find all expenses on this specific day, SORTED by time (Descending)
        const dayExpenses = appData.nodes
            .filter(n => 
                n.type === NODE_TYPES.EXPENSE && 
                n.status !== NODE_STATUS.TRASH && 
                (n.date || '').split('T')[0] === dateStr
            )
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        const dayTotal = dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        
        // Group these expenses by their Top-Level Parent (Trip/Project)
        const parentMap = new Map();
        const standalone = [];

        dayExpenses.forEach(exp => {
            let current = exp;
            let rootObj = null;

            // Traverse up to find the root parent (Trip or Project only)
            while (current && current.parent_id) {
                const parent = getNodeById(current.parent_id);
                if (parent) {
                    if (parent.type === NODE_TYPES.TRIP || parent.type === NODE_TYPES.PROJECT) {
                        rootObj = parent;
                        break; 
                    }
                    current = parent;
                } else break;
            }

            if (rootObj) {
                // Group under Trip/Project
                if (!parentMap.has(rootObj.id)) parentMap.set(rootObj.id, []);
                parentMap.get(rootObj.id).push(exp);
            } else if (!exp.parent_id) {
                // Standalone Expense (Absolute Top Level)
                standalone.push(exp);
            }
            // Note: If exp has a parent but no Trip/Project root, it's a sub-detail 
            // of a standalone expense. We IGNORE it here because it will be 
            // rendered recursively within its standalone parent.
        });

        // Add Trips/Projects that STARTED on this day (even if they have no expenses yet)
        appData.nodes.forEach(n => {
            if ((n.type === NODE_TYPES.TRIP || n.type === NODE_TYPES.PROJECT) && 
                n.status !== NODE_STATUS.TRASH &&
                (n.date || '').split('T')[0] === dateStr &&
                !parentMap.has(n.id)) {
                parentMap.set(n.id, []); 
            }
        });

        // Format the display items for this day
        const items = [];
        standalone.forEach(s => items.push(s));
        parentMap.forEach((children, rootId) => {
            const root = getNodeById(rootId);
            if (!root) return;
            // Create a "Partial View" of the project/trip for this day
            items.push({ 
                ...root, 
                _filteredChildren: children,
                _dayTotal: children.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
            });
        });

        result.push({
            date: dateStr,
            total: dayTotal,
            items: items
        });
    });

    return result;
}

/**
 * ── BUDGET & MONTHLY STATS ────────────────────────────────────────
 */
export function getMonthlyTotal(month, year) {
    let total = 0;
    appData.nodes.filter(n => 
        n.type === NODE_TYPES.EXPENSE && 
        n.status !== NODE_STATUS.TRASH && 
        n.date
    ).forEach(n => {
        const d = new Date(n.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            total += parseFloat(n.amount || 0);
        }
    });
    return total;
}

/**
 * ── ONGOING ITEMS DETECTOR ────────────────────────────────────────
 */
export function getOngoingItems(todayStr) {
    return appData.nodes.filter(n => {
        if (n.status === NODE_STATUS.TRASH || n.parent_id) return false;
        if (n.type !== NODE_TYPES.TRIP && n.type !== NODE_TYPES.PROJECT) return false;

        const children = getChildrenOf(n.id);
        if (children.length === 0) return false;

        const uniqueDates = new Set(children.map(c => (c.date || '').split('T')[0]).filter(Boolean));
        const hasFuture = [...uniqueDates].some(d => d > todayStr);
        const isMultiDay = uniqueDates.size > 1 || hasFuture;
        return isMultiDay;
    });
}
