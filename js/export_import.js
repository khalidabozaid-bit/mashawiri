// js/export_import.js

import { appData } from './state.js';
import { Actions } from './actions.js';
import { getCategoryObj, getNowLocalString, formatCurrency, generateId } from './helpers.js';
import { computeNodeFinancials } from './tree.js';
import { NODE_TYPES, EXPORT_FORMATS, EXPORT_MODES } from './constants.js';

export function executeAdvancedExport() {
    const format = document.querySelector('input[name="export-format"]:checked').value;
    const mode = document.querySelector('input[name="export-mode"]:checked').value;
    
    let rawData = [];
    
    // Flatten hierarchy
    appData.nodes.filter(n => n.status !== 'trash').forEach(n => {
        const cat = getCategoryObj(n.category);
        const fin = computeNodeFinancials(n);
        let ctx = 'مستقل';
        if (n.parent_id) {
            const p = appData.nodes.find(x => x.id === n.parent_id);
            if (p) ctx = p.title;
        }
        
        rawData.push({
            'المعرف': n.id,
            'النوع': n.type === NODE_TYPES.EXPENSE ? 'مصروف' : (n.type === NODE_TYPES.TRIP ? 'مشوار' : 'مشروع'),
            'عنصر أب': ctx,
            'الاسم': n.title,
            'المبلغ': n.amount || fin.effectiveTotal || 0,
            'التاريخ': (n.date || '').replace('T', ' '),
            'التصنيف الأساسي': cat ? cat.name : '',
            'التصنيف الفرعي': n.subcategory || '',
            'طريقة الدفع': n.payment_method || '',
            'المدفوع بواسطة': n.paid_by === 'other' ? n.other_name : 'أنا',
            'نوع الاستهلاك': n.payment_type || '',
            'الملصقات': (n.tags || []).join(', '),
            'الملاحظات': n.notes || ''
        });
    });

    if (format === EXPORT_FORMATS.CSV) {
        try {
            const ws = XLSX.utils.json_to_sheet(rawData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob(["\ufeff", csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Mashawiri_Export_${getNowLocalString().replace('T','_').replace(':','-')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(e) { console.error(e); alert("عفواً حدث خطأ في استخراج CSV. تأكد من اتصالك بالإنترنت في أول مرة لعمل Cache للمكتبة."); }
    } else {
        try {
            const wb = XLSX.utils.book_new();
            let sheetData = [...rawData];
            
            if (mode === EXPORT_MODES.TRIP) {
                sheetData = sheetData.sort((a,b) => a['عنصر أب'].localeCompare(b['عنصر أب']));
            } else if (mode === EXPORT_MODES.CATEGORY) {
                sheetData = sheetData.sort((a,b) => a['التصنيف الأساسي'].localeCompare(b['التصنيف الأساسي']));
            }

            const wsRaw = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, wsRaw, "بيانات تفصيلية");
            
            const summaryData = [];
            let sumTotal = 0;
            appData.nodes.filter(n => !n.parent_id && n.status !== 'trash').forEach(n => sumTotal += computeNodeFinancials(n).effectiveTotal);
            
            summaryData.push({'البيان': 'تاريخ التصدير', 'القيمة': new Date().toLocaleString()});
            summaryData.push({'البيان': 'إجمالي السجلات', 'القيمة': appData.nodes.filter(n => n.status !== 'trash').length});
            summaryData.push({'البيان': 'الإجمالي الفعلي (أصول)', 'القيمة': formatCurrency(sumTotal)});

            summaryData.push({'البيان': '', 'القيمة': ''}); 
            summaryData.push({'البيان': '--- ملخص التصنيفات ---', 'القيمة': ''});
            const catSums = {};
            appData.nodes.filter(n => n.type === NODE_TYPES.EXPENSE && n.status !== 'trash').forEach(n => {
                const cName = getCategoryObj(n.category).name;
                catSums[cName] = (catSums[cName] || 0) + (parseFloat(n.amount) || computeNodeFinancials(n).itemsSum || 0); 
            });
            for(const [c, val] of Object.entries(catSums)) {
                summaryData.push({'البيان': c, 'القيمة': formatCurrency(val)});
            }

            const wsSum = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSum, "الملخص التحليلي");

            XLSX.writeFile(wb, `Mashawiri_Export_${mode}_${getNowLocalString().replace('T','_').replace(':','-')}.xlsx`);
        } catch(e) { console.error(e); alert("تأكد من اتصالك بالإنترنت لتحميل ملف مكتبة Excel"); }
    }
    if(window.closeAllModals) window.closeAllModals();
}

let importPendingNodes = [];
let importStats = { dup: 0, new: 0 };

export function handleFileSelectForImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                validateAndPrepareImport(data.nodes || data.generalExpenses || []); 
            } catch(e) { alert("ملف JSON غير صالح!"); }
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
                
                const mappedNodes = rows.map(r => ({
                    id: r['المعرف'] || generateId(),
                    type: r['النوع'] === 'مشروع' ? NODE_TYPES.PROJECT : (r['النوع'] === 'مشوار' ? NODE_TYPES.TRIP : NODE_TYPES.EXPENSE),
                    title: r['الاسم'] || 'مستورد',
                    amount: r['المبلغ'] ? parseFloat(r['المبلغ']) : null,
                    date: (r['التاريخ'] || '').replace(' ', 'T'),
                    category: Actions.ensureCategoryExists(r['التصنيف الأساسي']),
                    subcategory: r['التصنيف الفرعي'] || '',
                    tags: r['الملصقات'] ? r['الملصقات'].split(',').map(t=>t.trim()).filter(Boolean) : [],
                    payment_method: r['طريقة الدفع'] || 'cash',
                    paid_by: r['المدفوع بواسطة'] === 'أنا' || !r['المدفوع بواسطة'] ? 'self' : 'other',
                    other_name: r['المدفوع بواسطة'] === 'أنا' ? '' : r['المدفوع بواسطة'],
                    payment_type: r['نوع الاستهلاك'] || 'normal',
                    notes: r['الملاحظات'] || '',
                    parent_id: null
                }));
                validateAndPrepareImport(mappedNodes);
            } catch(e) { alert("حدث خطأ في قراءة ملف الإكسيل/CSV"); console.error(e); }
        };
        reader.readAsArrayBuffer(file);
    }
    
    e.target.value = '';
}

export function validateAndPrepareImport(incomingNodes) {
    importPendingNodes = [];
    importStats = { dup: 0, new: 0 };
    
    const tbody = document.getElementById('import-review-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    incomingNodes.forEach(inc => {
        const isDup = appData.nodes.some(existing => 
            existing.id === inc.id || 
            (existing.title === inc.title && existing.amount == inc.amount && existing.date === inc.date)
        );

        if (isDup) {
            importStats.dup++;
        } else {
            importStats.new++;
            importPendingNodes.push(inc);
        }

        const catName = getCategoryObj(inc.category).name;
        
        tbody.innerHTML += `
            <tr style="border-bottom:1px solid var(--border-color); background: ${isDup ? '#fee2e2' : '#dcfce7'};">
                <td style="padding:8px; font-weight:700; color: ${isDup ? 'var(--danger)' : 'var(--success)'};">${isDup ? 'مكرر' : 'جديد'}</td>
                <td style="padding:8px;">${inc.title || '-'}</td>
                <td style="padding:8px; font-family:monospace;">${inc.amount || '-'}</td>
                <td style="padding:8px;">${catName}</td>
            </tr>
        `;
    });

    document.getElementById('import-new-count').textContent = importStats.new;
    document.getElementById('import-dup-count').textContent = importStats.dup;
    
    if(window.openModal) window.openModal('importReviewModal');
}

export function confirmImportSave() {
    if (importPendingNodes.length === 0) {
        alert("لا توجد سجلات جديدة لإضافتها.");
        if(window.closeAllModals) window.closeAllModals();
        return;
    }

    Actions.importNodesBulk(importPendingNodes);
    alert(`تم استيراد ${importPendingNodes.length} سجل بنجاح!`);
    if(window.closeAllModals) window.closeAllModals();
    if(window.updateUI) window.updateUI(); 
}

// Window Attachments
window.executeAdvancedExport = executeAdvancedExport;
window.handleFileSelectForImport = handleFileSelectForImport;
window.confirmImportSave = confirmImportSave;
