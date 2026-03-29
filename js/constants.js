// js/constants.js

export const PAYMENT_METHODS = {
    CASH: "cash",
    CARD: "card",
    WALLET: "wallet"
};

export const CONSUMPTION_TYPES = {
    BASIC: "basic",
    NORMAL: "normal",
    LUXURY: "entertainment"
};

export const PAYMENT_TYPES = {
    NORMAL: "normal",
    GIFT: "gift",
    DEBT: "debt"
};

export const NODE_TYPES = {
    TRIP: "trip",
    EXPENSE: "expense",
    PROJECT: "project"
};

export const NODE_STATUS = {
    ACTIVE: "active",
    COMPLETED: "completed",
    TRASH: "trash"
};

export const EXPORT_FORMATS = {
    EXCEL: "xlsx",
    CSV: "csv"
};

export const EXPORT_MODES = {
    FLAT: "flat",
    TRIP: "trip",
    CATEGORY: "category"
};

export const DEFAULT_LABELS = ["عمل", "سفر", "عائلي", "نادي", "طوارئ"];

export const DEFAULT_CATEGORIES = [
    { id: 'c1', name: 'طعام', icon: 'bx-restaurant', color: '#f59e0b', bg: '#fef3c7' },
    { id: 'c2', name: 'تسوق', icon: 'bx-shopping-bag', color: '#8b5cf6', bg: '#ede9fe' },
    { id: 'c3', name: 'فواتير', icon: 'bx-receipt', color: '#06b6d4', bg: '#cffafe' },
    { id: 'c4', name: 'صحة', icon: 'bx-plus-medical', color: '#10b981', bg: '#d1fae5' },
    { id: 'c5', name: 'مواصلات', icon: 'bx-car', color: '#3b82f6', bg: '#eff6ff' },
    { id: 'c6', name: 'أخرى', icon: 'bx-package', color: '#64748b', bg: '#f1f5f9' }
];

// Migration constants
export const STORAGE_KEY_V4 = 'mashawiri_data_v4';
export const STORAGE_KEY_V5 = 'mashawiri_data_v5';
