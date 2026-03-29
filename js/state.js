// js/state.js
import { CONFIG } from './config.js';
import { STORAGE_KEY_V4, STORAGE_KEY_V5, DEFAULT_CATEGORIES, DEFAULT_LABELS, NODE_TYPES } from './constants.js';
import { DB } from './db.js';

// Internal state
let _appData = {
    categories: [...DEFAULT_CATEGORIES],
    customLabels: [...DEFAULT_LABELS],
    nodes: []
};

let isInitialized = false;
let isSaving = false;
let isMigrating = false;
let saveTimeout;

// Proxy Tracking
const proxyMap = new WeakMap();

/**
 * Deep Proxy to automatically save on any change
 */
function createDeepProxy(target, path = []) {
    if (typeof target !== 'object' || target === null) return target;
    
    // Return cached proxy if exists
    if (proxyMap.has(target)) return proxyMap.get(target);

    const handler = {
        get(obj, prop) {
            const value = Reflect.get(obj, prop);
            return createDeepProxy(value, [...path, prop]);
        },
        set(obj, prop, value) {
            const result = Reflect.set(obj, prop, value);
            if (isInitialized) {
                // If we're modifying the nodes array directly, rebuild the map
                if (Array.isArray(obj)) {
                    rebuildNodeMap();
                }
                scheduleSave();
                if (window.updateUI) window.updateUI();
            }
            return result;
        },
        deleteProperty(obj, prop) {
            const result = Reflect.deleteProperty(obj, prop);
            if (isInitialized) {
                if (Array.isArray(obj)) {
                    rebuildNodeMap();
                }
                scheduleSave();
                if (window.updateUI) window.updateUI();
            }
            return result;
        }
    };

    const proxy = new Proxy(target, handler);
    proxyMap.set(target, proxy);
    return proxy;
}

export const appData = createDeepProxy(_appData);

export let currentReportMode = 'daily';
export let currentActionItem = { id: null, type: null, parentId: null };

export function setCurrentActionItem(item) {
    currentActionItem = item;
}

// Map globals for any HTML inline attributes
window.appData = appData;

// Node Map for O(1) lookups
export let nodeMap = new Map();

export function rebuildNodeMap() {
    nodeMap.clear();
    // Use the raw _appData to avoid proxy overhead during map generation, 
    // or use appData.nodes if we want to ensure we're seeing the latest proxy state.
    // _appData.nodes is fine as the proxy mutates the underlying object.
    if (_appData && _appData.nodes) {
        _appData.nodes.forEach(node => {
            if (node && node.id) nodeMap.set(node.id, node);
        });
    }
}

export function getNodeById(id) {
    return nodeMap.get(id);
}

/**
 * Load data from IndexedDB or migrate from LocalStorage
 */
export async function loadData() {
    if (isInitialized) return;
    console.log("Mashawiri: Initializing data load (V2 Mode)...");

    try {
        // 1. Try V2 Record-based load
        const nodes = await DB.getAll('nodes');
        const settings = await DB.get('appSettings', 'appDataStore');
        
        if (nodes && nodes.length > 0) {
            console.log(`Mashawiri: Loaded ${nodes.length} nodes from V2 Store.`);
            _appData.nodes = nodes;
            if (settings) {
                if (settings.categories) _appData.categories = settings.categories;
                if (settings.customLabels) _appData.customLabels = settings.customLabels;
                if (settings.monthlyBudget) _appData.monthlyBudget = settings.monthlyBudget;
            }
            isInitialized = true;
            rebuildNodeMap();
            return;
        }

        // 2. Migration: Check for V1 Blob-based data
        const v1Blob = await DB.get(CONFIG.storageKey, 'appDataStore');
        if (v1Blob && Array.isArray(v1Blob.nodes)) {
            console.warn("Mashawiri: V1 Blob detected. Migrating to V2 Records...");
            isMigrating = true;
            
            _appData.nodes = v1Blob.nodes;
            if (v1Blob.categories) _appData.categories = v1Blob.categories;
            if (v1Blob.customLabels) _appData.customLabels = v1Blob.customLabels;
            
            // Perform one-time migration save
            isInitialized = true; // Set true so saveData can run
            await saveData();
            
            // Cleanup V1 blob
            await DB.delete(CONFIG.storageKey, 'appDataStore');
            
            isMigrating = false;
            console.log("Mashawiri: V1 Migration complete.");
            rebuildNodeMap();
            return;
        }

        // 3. Legacy Migration: LocalStorage
        console.log("Mashawiri: IndexedDB empty. Checking LocalStorage...");
        const legacyKeys = [CONFIG.storageKey, STORAGE_KEY_V5, STORAGE_KEY_V4, 'mashawiri_data', 'app_data'];
        let migrated = false;

        for (const key of legacyKeys) {
            const lsData = localStorage.getItem(key);
            if (!lsData) continue;
            
            try {
                const parsed = JSON.parse(lsData);
                isMigrating = true;
                
                if (key === STORAGE_KEY_V4 || key === 'mashawiri_data' || !parsed.nodes) {
                    _appData.nodes = migrateV4toV5(parsed);
                } else {
                    if (parsed.nodes) _appData.nodes = parsed.nodes;
                    if (parsed.categories) _appData.categories = parsed.categories;
                    if (parsed.customLabels) _appData.customLabels = parsed.customLabels;
                }
                
                isInitialized = true;
                await saveData(); 
                isMigrating = false;
                migrated = true;
                console.log(`Mashawiri: Migrated legacy data from [${key}] successful.`);
                break; 
            } catch (err) {
                console.error(`Mashawiri: Failed to migrate legacy key [${key}]`, err);
            }
        }

        if (!migrated) {
            console.log("Mashawiri: No data found. New profile created.");
            isInitialized = true;
        }
    } catch (e) {
        console.error("Mashawiri: Critical error during loadData", e);
        isInitialized = true; 
    }

    rebuildNodeMap();
}

function migrateV4toV5(oldData) {
    const nodes = [];
    if (oldData.generalExpenses) {
        nodes.push(...oldData.generalExpenses.map(e => mapExpenseToNode(e, null)));
    }
    if (oldData.trips) {
        oldData.trips.forEach(trip => {
            nodes.push({
                id: trip.id,
                parent_id: null,
                type: NODE_TYPES.TRIP,
                title: trip.title || trip.name,
                date: trip.date,
                tags: trip.tags || []
            });
            if (trip.expenses) {
                nodes.push(...trip.expenses.map(e => mapExpenseToNode(e, trip.id)));
            }
        });
    }
    return nodes;
}

function mapExpenseToNode(e, parentId) {
    return {
        id: e.id,
        parent_id: parentId,
        type: NODE_TYPES.EXPENSE,
        title: e.title,
        amount: parseFloat(e.amount) || 0,
        date: e.date,
        category: e.category,
        tags: e.tags || [],
        basic_type: e.type || 'normal',
        payment_method: e.payment_method || 'cash',
        paid_by: e.paid_by || 'self',
        payment_type: e.payment_type || 'normal'
    };
}

async function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveData, CONFIG.syncDelay || 1000);
}

export async function saveData() {
    if (isSaving || !isInitialized || isMigrating) return;
    isSaving = true;

    try {
        // 1. Sync Settings Blob
        const settings = {
            categories: _appData.categories,
            customLabels: _appData.customLabels,
            monthlyBudget: _appData.monthlyBudget
        };
        await DB.set('appSettings', settings, 'appDataStore');

        // 2. Sync Nodes (Handle Deletions & Updates)
        const allNodesInDB = await DB.getAll('nodes');
        const currentIds = new Set(_appData.nodes.map(n => n.id));

        // Delete nodes from DB that are no longer in memory
        const idsToDelete = allNodesInDB.map(n => n.id).filter(id => !currentIds.has(id));
        if (idsToDelete.length > 0) {
            await DB.bulkDelete(idsToDelete, 'nodes');
            console.log(`Mashawiri: Deleted ${idsToDelete.length} nodes from store.`);
        }

        // Sync current nodes using bulkPut (all in one transaction)
        await DB.bulkPut(_appData.nodes, 'nodes');
        console.log(`Mashawiri: ${_appData.nodes.length} nodes synced to V2 Store.`);
        
        window.dispatchEvent(new CustomEvent('mashawiri-saved'));
    } catch (e) {
        console.error("Mashawiri: V2 Sync failed", e);
    } finally {
        isSaving = false;
    }
}
