// src/admin/categories/manage-categories.js

import { getCategories, createCategory, deleteCategory } from './categories.service.js';
import { initToastNotification, showToast } from '../../public/modules/store/toast-notification/toast.js';

async function initManageCategories() {
    initToastNotification();
    await loadAndRenderCategories();

    const addBtn = document.getElementById('add-category-btn');
    const input = document.getElementById('new-category-input');

    // Evento Click Botón
    addBtn.addEventListener('click', handleAddCategory);

    // Evento Enter en Input
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddCategory();
    });
}

async function loadAndRenderCategories() {
    const container = document.getElementById('categories-list-container');
    try {
        const categories = await getCategories();
        
        if (categories.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay categorías registradas.</div>';
            return;
        }

        container.innerHTML = '';
        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `
                <span class="category-name">
                    <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    ${cat.nombre}
                </span>
                <button class="delete-cat-btn" data-id="${cat.id}" aria-label="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;

            // Listener para eliminar
            const deleteBtn = card.querySelector('.delete-cat-btn');
            deleteBtn.addEventListener('click', () => handleDelete(cat.id, cat.nombre));

            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty-state" style="color:red">Error al cargar categorías.</div>';
    }
}

async function handleAddCategory() {
    const input = document.getElementById('new-category-input');
    const name = input.value.trim();

    if (!name) {
        showToast("⚠️ Escribe un nombre para la categoría.");
        return;
    }

    try {
        await createCategory(name);
        showToast(`✅ Categoría "${name}" creada.`);
        input.value = '';
        loadAndRenderCategories(); // Recargar lista
    } catch (error) {
        console.error(error);
        showToast(`❌ Error: ${error.message}`);
    }
}

async function handleDelete(id, name) {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${name}"?`)) return;

    try {
        await deleteCategory(id);
        showToast(`🗑️ Categoría eliminada.`);
        loadAndRenderCategories();
    } catch (error) {
        console.error(error);
        // El servicio lanza error si hay productos asociados
        showToast(`❌ ${error.message}`); 
    }
}

document.addEventListener('DOMContentLoaded', initManageCategories);