// js/helpers.js

import { appData } from './state.js';
import { DEFAULT_CATEGORIES } from './constants.js';

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getNowLocalString() {
    return toLocalISOString(new Date());
}

export function toLocalISOString(date) {
    if (!date || isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
}

export function getCategoryObj(catId) {
    if (!appData || !appData.categories) return { name: catId || 'غير معروف', icon: 'bx-label', color: '#64748b', bg: '#f1f5f9' };
    const cat = appData.categories.find(c => c.id === catId || c.name === catId);
    if (cat) return cat;
    
    // Fallback to defaults
    const defCat = DEFAULT_CATEGORIES.find(c => c.id === catId || c.name === catId);
    if (defCat) return defCat;
    
    return { name: catId || 'غير معروف', icon: 'bx-label', color: '#64748b', bg: '#f1f5f9' };
}

export function formatCurrency(amount) {
    return parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateTime(dateStr) {
    if(!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const today = new Date();
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        
        if (isToday) {
            return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' });
        } else {
            return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        }
    } catch(e) { return dateStr; }
}

window.formatCurrency = formatCurrency;
window.getCategoryObj = getCategoryObj;
window.getNowLocalString = getNowLocalString;
window.generateId = generateId;
window.formatDateTime = formatDateTime;
