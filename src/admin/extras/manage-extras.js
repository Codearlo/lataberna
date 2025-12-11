// src/admin/extras/manage-extras.js

import { getExtras, createExtra, deleteExtras } from './extras.service.js';
import { initToastNotification, showToast } from '../../public/modules/store/toast-notification/toast.js';

// --- CONSTANTES ---
// Icono SVG para extras (debe coincidir con el del HTML)
const EXTRA_ICON_SVG = `<svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/></svg>`;

let selectedExtras = new Set();
let allExtrasData = []; 

async function initManageExtras() {
    initToastNotification();
    await fetchExtras(); 

    const searchInput = document.getElementById('search-input');
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allExtrasData.filter(extra => 
                extra.nombre.toLowerCase().includes(term)
            );
            renderExtrasList(filtered);
        });
    }

    if (openCreateBtn) openCreateBtn.addEventListener('click', openCreateModal);
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', handleBulkDelete);
}

// --- CARGA Y RENDERIZADO ---

async function fetchExtras() {
    const container = document.getElementById('extras-list-container');
    
    try {
        allExtrasData = await getExtras();
        renderExtrasList(allExtrasData);
    } catch (error) {
        console.error(error);
        if (container) container.innerHTML = '<div class="empty-state" style="color:red">Error al cargar extras.</div>';
    }
}

function renderExtrasList(listToRender) {
    const container = document.getElementById('extras-list-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (listToRender.length === 0) {
        container.innerHTML = '<div class="empty-state">No se encontraron extras.</div>';
        return;
    }

    listToRender.forEach(extra => {
        const card = document.createElement('div');
        // Reutilizamos la clase category-card para aprovechar los estilos generales de lista
        card.className = 'category-card extra-card'; 
        if (selectedExtras.has(extra.id)) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <span class="category-name extra-name">
                ${EXTRA_ICON_SVG}
                ${extra.nombre}
            </span>
            <div class="custom-checkbox">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
        `;

        card.addEventListener('click', () => toggleSelection(card, extra.id));
        container.appendChild(card);
    });
}

// --- SELECCIÓN ---

function toggleSelection(cardElement, id) {
    if (selectedExtras.has(id)) {
        selectedExtras.delete(id);
        cardElement.classList.remove('selected');
    } else {
        selectedExtras.add(id);
        cardElement.classList.add('selected');
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const btn = document.getElementById('delete-selected-btn');
    const countSpan = document.getElementById('selected-count');
    
    if (!btn || !countSpan) return;

    const count = selectedExtras.size;
    countSpan.textContent = count;
    btn.disabled = count === 0;
}

// --- CREACIÓN (MODAL) ---

function openCreateModal() {
    const modal = document.getElementById('create-modal-container');
    const input = document.getElementById('modal-new-extra-name');
    const btnCancel = document.getElementById('btn-cancel-create');
    const btnConfirm = document.getElementById('btn-confirm-create');

    input.value = ''; 
    modal.classList.add('visible');
    input.focus();

    const close = () => {
        modal.classList.remove('visible');
        btnCancel.removeEventListener('click', close);
        btnConfirm.removeEventListener('click', save);
        input.removeEventListener('keypress', handleEnter);
    };

    const save = async () => {
        const name = input.value.trim();
        if (!name) {
            showToast("⚠️ Escribe un nombre.");
            return;
        }

        try {
            btnConfirm.disabled = true;
            btnConfirm.textContent = "...";
            
            await createExtra(name);
            showToast(`✅ Extra creado.`);
            
            close(); 
            await fetchExtras();
            document.getElementById('search-input').value = '';

        } catch (error) {
            showToast(`❌ Error: ${error.message}`);
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.textContent = "Guardar";
        }
    };

    const handleEnter = (e) => {
        if (e.key === 'Enter') save();
    };

    btnCancel.addEventListener('click', close);
    btnConfirm.addEventListener('click', save);
    input.addEventListener('keypress', handleEnter);
}

// --- ELIMINACIÓN MASIVA ---

async function handleBulkDelete() {
    if (selectedExtras.size === 0) return;

    const idsToDelete = Array.from(selectedExtras);
    const namesList = allExtrasData
        .filter(e => idsToDelete.includes(e.id))
        .map(e => e.nombre);

    const confirmed = await showBatchConfirmModal(namesList);
    
    if (confirmed) {
        const btn = document.getElementById('delete-selected-btn');
        const originalHTML = btn.innerHTML; 
        
        try {
            btn.disabled = true;
            btn.textContent = `Eliminando ${idsToDelete.length} extras...`;
            
            await deleteExtras(idsToDelete);
            
            showToast(`✅ ${idsToDelete.length} extras eliminados.`);
            selectedExtras.clear(); 

        } catch (error) {
            console.error(error);
            showToast(`❌ Error: ${error.message}`);
        } finally {
            if (btn) btn.innerHTML = originalHTML;
            await fetchExtras();
            updateSelectionUI();
            const searchTerm = document.getElementById('search-input').value;
            if (searchTerm) {
                 document.getElementById('search-input').dispatchEvent(new Event('input'));
            }
        }
    }
}

// --- MODALES DINÁMICOS ---

function showBatchConfirmModal(namesList) {
    return new Promise((resolve) => {
        const modal = document.getElementById('batch-confirm-modal');
        const listEl = document.getElementById('batch-extra-list');
        const btnCancel = document.getElementById('btn-cancel-batch');
        const btnConfirm = document.getElementById('btn-confirm-batch');

        listEl.innerHTML = namesList.map(name => `
            <li>
                ${EXTRA_ICON_SVG} ${name}
            </li>
        `).join('');
        
        modal.classList.add('visible');

        const cleanup = () => {
            modal.classList.remove('visible');
            btnCancel.removeEventListener('click', handleCancel);
            btnConfirm.removeEventListener('click', handleConfirm);
        };
        const handleCancel = () => { cleanup(); resolve(false); };
        const handleConfirm = () => { cleanup(); resolve(true); };

        btnCancel.addEventListener('click', handleCancel, { once: true });
        btnConfirm.addEventListener('click', handleConfirm, { once: true });
    });
}

document.addEventListener('DOMContentLoaded', initManageExtras);