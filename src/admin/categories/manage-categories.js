// src/admin/categories/manage-categories.js

import { getCategories, createCategory, deleteCategory, getCategoryProductCount } from './categories.service.js';
import { initToastNotification, showToast } from '../../public/modules/store/toast-notification/toast.js';

let selectedCategories = new Set();
let categoriesData = []; 

async function initManageCategories() {
    initToastNotification();
    await loadAndRenderCategories();

    const addBtn = document.getElementById('add-category-btn');
    const input = document.getElementById('new-category-input');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');

    addBtn.addEventListener('click', handleAddCategory);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddCategory();
    });

    deleteSelectedBtn.addEventListener('click', handleBulkDelete);
}

async function loadAndRenderCategories() {
    const container = document.getElementById('categories-list-container');
    
    // Resetear selección
    selectedCategories.clear();
    const countSpan = document.getElementById('selected-count');
    if(countSpan) updateSelectionUI();

    try {
        categoriesData = await getCategories();
        
        if (categoriesData.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay categorías registradas.</div>';
            return;
        }

        container.innerHTML = '';
        categoriesData.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.dataset.id = cat.id; 
            
            card.innerHTML = `
                <span class="category-name">
                    <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    ${cat.nombre}
                </span>
                
                <div class="custom-checkbox">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;

            card.addEventListener('click', () => toggleSelection(card, cat.id));
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty-state" style="color:red">Error al cargar categorías.</div>';
    }
}

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

// --- LÓGICA DE ELIMINACIÓN MASIVA ---

async function handleBulkDelete() {
    if (selectedCategories.size === 0) return;

    const btn = document.getElementById('delete-selected-btn');
    const originalHTML = btn.innerHTML; 
    
    btn.disabled = true;
    btn.textContent = "Verificando...";

    const idsToDelete = Array.from(selectedCategories);
    const conflicts = [];     // Tienen productos
    const safeToDelete = [];  // Vacías

    try {
        // 1. Clasificar
        for (const id of idsToDelete) {
            const category = categoriesData.find(c => c.id === id);
            const count = await getCategoryProductCount(id);
            
            if (count > 0) {
                conflicts.push({ id, name: category ? category.nombre : 'Categoría', count });
            } else {
                safeToDelete.push({ id, name: category ? category.nombre : 'Categoría' });
            }
        }

        let deletedCount = 0;

        // 2. Conflictos (Mover a SIN CATEGORIA)
        for (const item of conflicts) {
            const decision = await showConflictModal(item.name, item.count);
            
            if (decision === 'continue') {
                btn.textContent = `Moviendo productos de ${item.name}...`;
                // true = mover productos a SIN CATEGORIA y luego borrar
                await deleteCategory(item.id, true); 
                deletedCount++;
            }
        }

        // 3. Seguras (Vacías)
        if (safeToDelete.length > 0) {
            const namesList = safeToDelete.map(i => i.name);
            const confirmed = await showBatchConfirmModal(namesList);

            if (confirmed) {
                btn.textContent = "Eliminando restantes...";
                for (const item of safeToDelete) {
                    await deleteCategory(item.id, false);
                    deletedCount++;
                }
            }
        }

        if (deletedCount > 0) {
            showToast(`✅ ${deletedCount} categorías eliminadas.`);
        }

    } catch (error) {
        console.error("Error en eliminación masiva:", error);
        showToast(`❌ Error: ${error.message}`);
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
        await loadAndRenderCategories();
    }
}

// Promesas Modales (Sin cambios en lógica, solo reuso)
function showConflictModal(categoryName, count) {
    return new Promise((resolve) => {
        const modal = document.getElementById('conflict-modal-container');
        const nameEl = document.getElementById('conflict-cat-name');
        const countEl = document.getElementById('conflict-prod-count');
        const btnSkip = document.getElementById('btn-skip-conflict');
        const btnContinue = document.getElementById('btn-continue-conflict');

        nameEl.textContent = categoryName;
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

        listEl.innerHTML = namesList.map(name => `<li>${name}</li>`).join('');
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

// --- CREACIÓN ---

async function handleAddCategory() {
    const input = document.getElementById('new-category-input');
    const name = input.value.trim();

    if (!name) {
        showToast("⚠️ Escribe un nombre para la categoría.");
        return;
    }

    try {
        const btn = document.getElementById('add-category-btn');
        btn.disabled = true;
        await createCategory(name);
        showToast(`✅ Categoría "${name}" creada.`);
        input.value = '';
        await loadAndRenderCategories();
    } catch (error) {
        console.error(error);
        showToast(`❌ Error: ${error.message}`);
    } finally {
        document.getElementById('add-category-btn').disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', initManageCategories);