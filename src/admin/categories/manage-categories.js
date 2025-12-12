// src/admin/categories/manage-categories.js

import { 
    getCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    getCategoryProductCount,
    uploadCategoryImage 
} from './categories.service.js';
import { initToastNotification, showToast } from '../../public/modules/store/toast-notification/toast.js';

const FOLDER_ICON_SVG = `<svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

let selectedCategories = new Set();
let allCategoriesData = []; 
let currentEditingCategory = null; // Para saber si estamos editando
let selectedImageFile = null; // Archivo seleccionado para subir

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

    // Abrir modal en modo "Crear"
    openCreateBtn.addEventListener('click', () => openModal());
    
    deleteSelectedBtn.addEventListener('click', handleBulkDelete);

    // Eventos del modal
    const imgBox = document.getElementById('cat-img-preview-box');
    const fileInput = document.getElementById('cat-image-input');
    
    imgBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImageFileSelect);
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
        
        // Determinar imagen o icono
        let iconHtml = FOLDER_ICON_SVG;
        if (cat.image_url) {
            iconHtml = `<img src="${cat.image_url}" class="category-thumb" alt="${cat.nombre}">`;
        }

        card.innerHTML = `
            <div class="category-left-group">
                ${iconHtml}
                <span class="category-name">${cat.nombre}</span>
            </div>
            
            <div style="display:flex; align-items:center;">
                <button class="edit-category-btn" data-id="${cat.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <div class="custom-checkbox">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            </div>
        `;

        // Click en la tarjeta -> Toggle Selección (para borrar)
        card.addEventListener('click', (e) => {
            // Si el click fue en el botón de editar, no seleccionamos
            if (e.target.closest('.edit-category-btn')) return;
            toggleSelection(card, cat.id);
        });

        // Click en botón editar
        const editBtn = card.querySelector('.edit-category-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(cat);
        });

        container.appendChild(card);
    });
}

// --- SELECCIÓN (DELETE) ---

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

// --- MODAL (CREATE / EDIT) ---

function handleImageFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const preview = document.getElementById('cat-img-preview');
            const placeholder = document.getElementById('cat-img-placeholder');
            preview.src = ev.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Abre el modal. Si recibe 'category', es edición. Si no, es creación.
 */
function openModal(category = null) {
    const modal = document.getElementById('create-modal-container');
    const title = document.getElementById('modal-title-text');
    const inputName = document.getElementById('modal-category-name');
    const inputId = document.getElementById('modal-category-id');
    const preview = document.getElementById('cat-img-preview');
    const placeholder = document.getElementById('cat-img-placeholder');
    const fileInput = document.getElementById('cat-image-input');
    const btnConfirm = document.getElementById('btn-confirm-create');
    const btnCancel = document.getElementById('btn-cancel-create');

    // Resetear estado
    selectedImageFile = null;
    fileInput.value = '';
    inputName.classList.remove('error');

    if (category) {
        // MODO EDICIÓN
        currentEditingCategory = category;
        title.textContent = "Editar Categoría";
        inputName.value = category.nombre;
        inputId.value = category.id;
        
        if (category.image_url) {
            preview.src = category.image_url;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
        }
    } else {
        // MODO CREACIÓN
        currentEditingCategory = null;
        title.textContent = "Nueva Categoría";
        inputName.value = '';
        inputId.value = '';
        preview.style.display = 'none';
        placeholder.style.display = 'block';
    }

    modal.classList.add('visible');
    inputName.focus();

    // Handlers internos para cerrar/guardar
    const cleanup = () => {
        modal.classList.remove('visible');
        btnCancel.removeEventListener('click', closeHandler);
        btnConfirm.removeEventListener('click', saveHandler);
        inputName.removeEventListener('keypress', enterHandler);
    };

    const closeHandler = () => cleanup();

    const saveHandler = async () => {
        const name = inputName.value.trim();
        if (!name) {
            showToast("⚠️ Escribe un nombre.");
            return;
        }

        try {
            btnConfirm.disabled = true;
            btnConfirm.textContent = "...";

            let imageUrl = currentEditingCategory ? currentEditingCategory.image_url : null;

            // Si hay nueva imagen seleccionada, subirla
            if (selectedImageFile) {
                imageUrl = await uploadCategoryImage(selectedImageFile);
            }

            if (currentEditingCategory) {
                // UPDATE
                await updateCategory(currentEditingCategory.id, name, imageUrl);
                showToast(`✅ Categoría actualizada.`);
            } else {
                // CREATE
                await createCategory(name, imageUrl);
                showToast(`✅ Categoría creada.`);
            }

            cleanup();
            await fetchCategories();
            document.getElementById('search-input').value = '';

        } catch (error) {
            console.error(error);
            showToast(`❌ Error: ${error.message}`);
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.textContent = "Guardar";
        }
    };

    const enterHandler = (e) => {
        if (e.key === 'Enter') saveHandler();
    };

    btnCancel.addEventListener('click', closeHandler);
    btnConfirm.addEventListener('click', saveHandler);
    inputName.addEventListener('keypress', enterHandler);
}

// --- ELIMINACIÓN MASIVA (Sin cambios mayores) ---

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

        for (const item of conflicts) {
            const decision = await showConflictModal(item.name, item.count);
            if (decision === 'continue') {
                btn.textContent = `Moviendo ${item.name}...`;
                await deleteCategory(item.id, true);
                deletedCount++;
            }
        }

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
        if (btn) btn.innerHTML = originalHTML;
        await fetchCategories();
        updateSelectionUI();
        const searchTerm = document.getElementById('search-input').value;
        if (searchTerm) document.getElementById('search-input').dispatchEvent(new Event('input'));
    }
}

// ... (Funciones de Modales de Conflicto y Batch - Sin cambios lógicos, se mantienen igual) ...
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

        listEl.innerHTML = namesList.map(name => `<li>${FOLDER_ICON_SVG} ${name}</li>`).join('');
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