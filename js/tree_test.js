import { computeNodeFinancials } from './tree.js';
import { appData } from './state.js';
import { NODE_TYPES, NODE_STATUS } from './constants.js';

/**
 * ── MASHWIRI LOGIC TESTS ──────────────────────────────────────────
 */

export async function runTests() {
    const results = [];
    
    function test(name, fn) {
        try {
            fn();
            results.push({ name, pass: true });
        } catch (err) {
            results.push({ name, pass: false, message: err.stack || err.message });
        }
    }

    // --- TEST 1: Basic Financial Calculation ---
    test("حساب مالي بسيط (Standalone Expense)", () => {
        const node = { id: 'test-1', type: NODE_TYPES.EXPENSE, amount: 100, parent_id: null };
        appData.nodes = [node]; // Direct mutation because it's a test environment
        
        const fin = computeNodeFinancials(node);
        if (fin.effectiveTotal !== 100) throw new Error(`Expected 100, got ${fin.effectiveTotal}`);
    });

    // --- TEST 2: Recursive Cost Inheritance ---
    test("توريث التكاليف التلقائي (Trip with Expenses)", () => {
        const trip = { id: 'trip-1', type: NODE_TYPES.TRIP, amount: null, parent_id: null };
        const exp1 = { id: 'exp-1', type: NODE_TYPES.EXPENSE, amount: 50, parent_id: 'trip-1' };
        const exp2 = { id: 'exp-2', type: NODE_TYPES.EXPENSE, amount: 75, parent_id: 'trip-1' };
        
        appData.nodes = [trip, exp1, exp2];
        
        const fin = computeNodeFinancials(trip);
        if (fin.itemsSum !== 125) throw new Error(`Expected itemsSum 125, got ${fin.itemsSum}`);
        if (fin.effectiveTotal !== 125) throw new Error(`Expected total 125, got ${fin.effectiveTotal}`);
    });

    // --- TEST 3: Manual Amount Overriding with Residual ---
    test("المبلغ اليدوي مع حساب الفارق (Manual Override)", () => {
        const trip = { id: 'trip-2', type: NODE_TYPES.TRIP, amount: 200, parent_id: null };
        const exp1 = { id: 'exp-3', type: NODE_TYPES.EXPENSE, amount: 150, parent_id: 'trip-2' };
        
        appData.nodes = [trip, exp1];
        
        const fin = computeNodeFinancials(trip);
        if (fin.effectiveTotal !== 200) throw new Error(`Expected total 200, got ${fin.effectiveTotal}`);
        if (fin.untracked !== 50) throw new Error(`Expected untracked 50, got ${fin.untracked}`);
    });

    // --- TEST 4: Deep Nested Inheritance ---
    test("التوريث العميق (Nested Node Inheritance)", () => {
        const root = { id: 'root', type: NODE_TYPES.PROJECT, amount: null, parent_id: null };
        const sub = { id: 'sub', type: NODE_TYPES.EXPENSE, amount: null, parent_id: 'root' };
        const leaf = { id: 'leaf', type: NODE_TYPES.EXPENSE, amount: 33, parent_id: 'sub' };
        
        appData.nodes = [root, sub, leaf];
        
        const finRoot = computeNodeFinancials(root);
        if (finRoot.effectiveTotal !== 33) throw new Error(`Expected root total 33, got ${finRoot.effectiveTotal}`);
    });

    // --- TEST 5: Status Trash Exclusion (Partial - relies on getChildrenOf) ---
    // Note: getChildrenOf doesn't exclude trash by default, filter does.
    // We should test if our tree engine handles status trash if we modify getChildrenOf.
    // Currently getChildrenOf doesn't filter by status, let's keep it that way and test.

    return results;
}
