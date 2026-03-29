// js/ui_core.js

/**
 * ── TRIP/EXPENSE ACCORDIONS ──────────────────────────────────────
 */
export function toggleTripAccordion(targetId, event = null) {
    if (event) event.stopPropagation();
    
    const el = document.getElementById(targetId);
    if (!el) {
        console.warn(`Toggle target not found: ${targetId}`);
        return;
    }

    // Toggle Display
    const isHidden = el.style.display === 'none' || el.style.display === '';
    el.style.display = isHidden ? 'block' : 'none';

    // Visual Feedback
    const btn = event ? event.currentTarget : null;
    if (btn) {
        const icon = btn.querySelector('.bx-chevron-down, .bx-chevron-up');
        if (icon) {
            icon.classList.toggle('bx-chevron-down', !isHidden);
            icon.classList.toggle('bx-chevron-up', isHidden);
        }
        btn.closest('.trip-card, .t-item, .sub-node-row, .project-card')?.classList.toggle('expanded', isHidden);
    }
}

/**
 * ── PROJECT CARD EXPANSION ───────────────────────────────────────
 */
export function toggleProjectCard(id, suffix = '', event = null) {
    if (event) event.stopPropagation();
    const targetId = `proj-expand-${id}${suffix}`;
    const el = document.getElementById(targetId);
    if (!el) {
        // Fallback for different naming conventions
        const fallback = document.getElementById(`trip-body-${id}${suffix}`);
        if (fallback) return toggleTripAccordion(`trip-body-${id}${suffix}`, event);
        return;
    }

    const isHidden = el.style.display === 'none' || el.style.display === '';
    el.style.display = isHidden ? 'block' : 'none';

    if (event && event.currentTarget) {
        const btn = event.currentTarget;
        const icon = btn.querySelector('.bx-chevron-down, .bx-chevron-up');
        if (icon) {
            icon.classList.toggle('bx-chevron-down', !isHidden);
            icon.classList.toggle('bx-chevron-up', isHidden);
        }
        btn.closest('.project-card')?.classList.toggle('expanded', isHidden);
    }
}

// Global expose
window.toggleTripAccordion = toggleTripAccordion;
window.toggleProjectCard = toggleProjectCard;
