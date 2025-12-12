// src/public/modules/store/categories-bar/categories-bar.js

import { getMenuCategories } from '../../../../services/store/products.service.js';

const CONTAINER_ID = 'categories-bar-container';

// Usamos un Set para manejar selecciones únicas de forma eficiente
const selectedCategories = new Set();

/**
 * Inicializa la barra de categorías horizontal.
 * Soporta multiselección y toggle.
 */
export async function initCategoriesBar() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    try {
        const categories = await getMenuCategories();
        // Ya no agregamos "Todo" manual. Si no hay selección, se muestra todo.
        renderBar(container, categories);

    } catch (error) {
        console.error("Error loading categories bar:", error);
        container.style.display = 'none';
    }
}

function renderBar(container, categories) {
    const wrapper = document.createElement('div');
    wrapper.className = 'categories-bar-wrapper';

    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'cat-nav-item';
        item.dataset.id = cat.id;

        // Intentamos cargar la imagen específica, fallback a icono genérico
        const imgSrc = `assets/categories/cat_${cat.id}.png`;
        const fallbackIcon = `https://cdn-icons-png.flaticon.com/512/3565/3565405.png`; 

        item.innerHTML = `
            <div class="cat-nav-icon">
                <img src="${imgSrc}" alt="${cat.nombre}" onerror="this.src='${fallbackIcon}'">
            </div>
            <span class="cat-nav-label">${cat.nombre.toLowerCase()}</span>
        `;

        // Lógica de Toggle (Multiselección)
        item.addEventListener('click', () => {
            if (selectedCategories.has(cat.id)) {
                // Si ya está, lo quitamos (Deseleccionar)
                selectedCategories.delete(cat.id);
                item.classList.remove('active');
            } else {
                // Si no está, lo agregamos (Seleccionar)
                selectedCategories.add(cat.id);
                item.classList.add('active');
            }

            // Disparamos el evento con el ARRAY de todas las categorías seleccionadas
            window.dispatchEvent(new CustomEvent('categories-selection-changed', { 
                detail: { selectedIds: Array.from(selectedCategories) } 
            }));
        });

        wrapper.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
}