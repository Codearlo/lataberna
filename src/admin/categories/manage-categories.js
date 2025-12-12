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
let currentEditingCategory = null; 
let processedImageFile = null; // Archivo final procesado (WebP)
let cropper = null; // Instancia del cropper

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

    openCreateBtn.addEventListener('click', () => openModal());
    deleteSelectedBtn.addEventListener('click', handleBulkDelete);

    // Eventos de imagen (Click, Cambio y Pegar)
    const imgBox = document.getElementById('cat-img-preview-box');
    const fileInput = document.getElementById('cat-image-input');
    
    imgBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImageFileSelect);

    // Soporte para PEGAR (Ctrl+V)
    document.addEventListener('paste', handlePaste);

    // Eventos de recorte
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);
}

// --- MANEJO DE IMAGEN Y RECORTE ---

function handlePaste(e) {
    // Solo si el modal de crear/editar está abierto
    const modal = document.getElementById('create-modal-container');
    if (!modal.classList.contains('visible')) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image/')) {
            const blob = item.getAsFile();
            openCropper(blob);
            break;
        }
    }
}

function handleImageFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        openCropper(file);
        e.target.value = ''; // Reset para poder seleccionar la misma
    }
}

function openCropper(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const imageElement = document.getElementById('image-to-crop');
        imageElement.src = ev.target.result;
        
        document.getElementById('remove-bg-check').checked = false;
        
        // Ocultar modal principal temporalmente o poner encima?
        // Ponemos el de crop encima (z-index mayor en CSS)
        const cropModal = document.getElementById('crop-modal');
        cropModal.classList.add('visible');

        if (cropper) cropper.destroy();
        
        // eslint-disable-next-line no-undef
        cropper = new Cropper(imageElement, {
            aspectRatio: 1, // CUADRADO
            viewMode: 1,
            autoCropArea: 0.8,
            movable: true,
            zoomable: true,
            scalable: false,
            background: false 
        });
    };
    reader.readAsDataURL(file);
}

function cropAndSave() {
    if (!cropper) return;

    let canvas = cropper.getCroppedCanvas({
        width: 500, // Tamaño optimizado para categoría
        height: 500,
        fillColor: '#fff' 
    });

    const removeBg = document.getElementById('remove-bg-check').checked;
    
    if (removeBg) {
        canvas = cropper.getCroppedCanvas({ width: 500, height: 500 });
        canvas = removeWhiteBackground(canvas);
    }

    canvas.toBlob((blob) => {
        processedImageFile = new File([blob], "cat_image.webp", { type: 'image/webp' });

        const preview = document.getElementById('cat-img-preview');
        const placeholder = document.getElementById('cat-img-placeholder');
        
        preview.src = URL.createObjectURL(processedImageFile);
        preview.style.display = 'block';
        
        // Mostrar transparencia con fondo de cuadrícula
        preview.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)';
        preview.style.backgroundSize = '20px 20px';

        placeholder.style.display = 'none';
        
        closeCropModal();
        showToast(removeBg ? "✂️ Recortado y sin fondo!" : "✂️ Imagen lista!");

    }, 'image/webp', 0.85); 
}

function removeWhiteBackground(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 230; 

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; 
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.remove('visible');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
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

        card.addEventListener('click', (e) => {
            if (e.target.closest('.edit-category-btn')) return;
            toggleSelection(card, cat.id);
        });

        const editBtn = card.querySelector('.edit-category-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(cat);
        });

        container.appendChild(card);
    });
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

// --- MODAL PRINCIPAL ---

function openModal(category = null) {
    const modal = document.getElementById('create-modal-container');
    const title = document.getElementById('modal-title-text');
    const inputName = document.getElementById('modal-category-name');
    const inputId = document.getElementById('modal-category-id');
    const preview = document.getElementById('cat-img-preview');
    const placeholder = document.getElementById('cat-img-placeholder');
    const btnConfirm = document.getElementById('btn-confirm-create');
    const btnCancel = document.getElementById('btn-cancel-create');

    // Resetear estado
    processedImageFile = null; // Limpiar imagen previa
    inputName.classList.remove('error');

    if (category) {
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
            placeholder.style.display = 'flex';
        }
    } else {
        currentEditingCategory = null;
        title.textContent = "Nueva Categoría";
        inputName.value = '';
        inputId.value = '';
        preview.style.display = 'none';
        placeholder.style.display = 'flex';
    }

    modal.classList.add('visible');
    inputName.focus();

    const cleanup = () => {
        modal.classList.remove('visible');
        btnCancel.removeEventListener('click', closeHandler);
        btnConfirm.removeEventListener('click', saveHandler);
        inputName.removeEventListener('keypress', enterHandler);
        document.removeEventListener('paste', handlePaste); // Limpiar evento global
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

            // Si hay nueva imagen procesada, subirla
            if (processedImageFile) {
                imageUrl = await uploadCategoryImage(processedImageFile);
            }

            if (currentEditingCategory) {
                await updateCategory(currentEditingCategory.id, name, imageUrl);
                showToast(`✅ Categoría actualizada.`);
            } else {
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
    // Paste ya está agregado globalmente en init, pero solo funciona si el modal está visible
}

// ... (Funciones de borrado masivo idénticas a la versión anterior) ...
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