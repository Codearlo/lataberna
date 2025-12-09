// src/admin/categories/manage-categories.js

import { getCategories, createCategory, deleteCategory, getCategoryProductCount } from './categories.service.js';
import { initToastNotification, showToast } from '../../public/modules/store/toast-notification/toast.js';

// --- CONSTANTES ---
// Icono SVG limpio (estilos controlados por CSS .folder-icon)
const FOLDER_ICON_SVG = `<svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

let selectedCategories = new Set();
let allCategoriesData = []; 

async function initManageCategories() {
    initToastNotification();
    await fetchCategories(); 

    const searchInput = document.getElementById('search-input');
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCategoriesData.filter(cat => 
            cat.nombre.toLowerCase().includes(term)
        );
        renderCategoriesList(filtered);
    });

    openCreateBtn.addEventListener('click', openCreateModal);
    deleteSelectedBtn.addEventListener('click', handleBulkDelete);
}

// --- CARGA Y RENDERIZADO ---

async function fetchCategories() {
    const container = document.getElementById('categories-list-container');
    
    try {
        allCategoriesData = await getCategories();
        renderCategoriesList(allCategoriesData);
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty-state" style="color:red">Error al cargar categorías.</div>';
    }
}

function renderCategoriesList(listToRender) {
    const container = document.getElementById('categories-list-container');
    container.innerHTML = '';

    if (listToRender.length === 0) {
        container.innerHTML = '<div class="empty-state">No se encontraron categorías.</div>';
        return;
    }

    listToRender.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        if (selectedCategories.has(cat.id)) {
            card.classList.add('selected');
        }
        
        // Ahora usamos el SVG constante limpio
        card.innerHTML = `
            <span class="category-name">
                ${FOLDER_ICON_SVG}
                ${cat.nombre}
            </span>
            <div class="custom-checkbox">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
        `;

        card.addEventListener('click', () => toggleSelection(card, cat.id));
        container.appendChild(card);
    });
}

// --- SELECCIÓN ---

function toggleSelection(cardElement, id) {
    if (selectedCategories.has(id)) {
        selectedCategories.delete(id);
        cardElement.classList.remove('selected');
    } else {
        selectedCategories.add(id);
        cardElement.classList.add('selected');
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const btn = document.getElementById('delete-selected-btn');
    const countSpan = document.getElementById('selected-count');
    
    if (!btn || !countSpan) return;

    const count = selectedCategories.size;
    countSpan.textContent = count;
    btn.disabled = count === 0;
}

// --- CREACIÓN (MODAL) ---

function openCreateModal() {
    const modal = document.getElementById('create-modal-container');
    const input = document.getElementById('modal-new-category-name');
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
            
            await createCategory(name);
            showToast(`✅ Categoría creada.`);
            
            close(); 
            await fetchCategories();
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
    if (selectedCategories.size === 0) return;

    const btn = document.getElementById('delete-selected-btn');
    const originalHTML = btn.innerHTML; 
    
    btn.disabled = true;
    btn.textContent = "Verificando...";

    const idsToDelete = Array.from(selectedCategories);
    const conflicts = [];
    const safeToDelete = [];

    try {
        // 1. Clasificar
        for (const id of idsToDelete) {
            const category = allCategoriesData.find(c => c.id === id);
            if (!category) continue; 

            const count = await getCategoryProductCount(id);
            
            if (count > 0) {
                conflicts.push({ id, name: category.nombre, count });
            } else {
                safeToDelete.push({ id, name: category.nombre });
            }
        }

        let deletedCount = 0;

        // 2. Conflictos
        for (const item of conflicts) {
            const decision = await showConflictModal(item.name, item.count);
            if (decision === 'continue') {
                btn.textContent = `Moviendo ${item.name}...`;
                await deleteCategory(item.id, true);
                deletedCount++;
            }
        }

        // 3. Seguras
        if (safeToDelete.length > 0) {
            const namesList = safeToDelete.map(i => i.name);
            const confirmed = await showBatchConfirmModal(namesList);

            if (confirmed) {
                btn.textContent = "Eliminando...";
                for (const item of safeToDelete) {
                    await deleteCategory(item.id, false);
                    deletedCount++;
                }
            }
        }

        if (deletedCount > 0) {
            showToast(`✅ ${deletedCount} eliminadas.`);
            selectedCategories.clear(); 
        }

    } catch (error) {
        console.error(error);
        showToast(`❌ Error: ${error.message}`);
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML;
        }
        await fetchCategories();
        updateSelectionUI();
        const searchTerm = document.getElementById('search-input').value;
        if (searchTerm) {
             document.getElementById('search-input').dispatchEvent(new Event('input'));
        }
    }
}

// --- MODALES DINÁMICOS ---

function showConflictModal(categoryName, count) {
    return new Promise((resolve) => {
        const modal = document.getElementById('conflict-modal-container');
        const nameEl = document.getElementById('conflict-cat-name');
        const countEl = document.getElementById('conflict-prod-count');
        const btnSkip = document.getElementById('btn-skip-conflict');
        const btnContinue = document.getElementById('btn-continue-conflict');

        nameEl.innerHTML = `${FOLDER_ICON_SVG} ${categoryName}`;
        countEl.textContent = count;
        modal.classList.add('visible');

        const cleanup = () => {
            modal.classList.remove('visible');
            btnSkip.removeEventListener('click', handleSkip);
            btnContinue.removeEventListener('click', handleContinue);
        };
        const handleSkip = () => { cleanup(); resolve('skip'); };
        const handleContinue = () => { cleanup(); resolve('continue'); };

        btnSkip.addEventListener('click', handleSkip, { once: true });
        btnContinue.addEventListener('click', handleContinue, { once: true });
    });
}

function showBatchConfirmModal(namesList) {
    return new Promise((resolve) => {
        const modal = document.getElementById('batch-confirm-modal');
        const listEl = document.getElementById('batch-cat-list');
        const btnCancel = document.getElementById('btn-cancel-batch');
        const btnConfirm = document.getElementById('btn-confirm-batch');

        listEl.innerHTML = namesList.map(name => `
            <li>
                ${FOLDER_ICON_SVG} ${name}
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

document.addEventListener('DOMContentLoaded', initManageCategories);