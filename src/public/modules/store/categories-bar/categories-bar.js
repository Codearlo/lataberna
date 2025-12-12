// src/public/modules/store/categories-bar/categories-bar.js

import { getMenuCategories } from '../../../../services/store/products.service.js';

const CONTAINER_ID = 'categories-bar-container';

// Set para manejar las selecciones activas
const selectedCategories = new Set();

/**
 * Inicializa la barra de categorías horizontal.
 * Soporta multiselección y sincronización con Sidebar.
 */
export async function initCategoriesBar() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    try {
        const categories = await getMenuCategories();
        renderBar(container, categories);

        // --- NUEVO: Sincronización con el Sidebar ---
        // Escuchamos cuando el usuario elige una categoría desde el menú lateral
        window.addEventListener('category-selected', (e) => {
            const externalCatId = e.detail.categoryId;
            
            // Limpiamos la multiselección previa porque el sidebar actúa como filtro único/reinicio
            selectedCategories.clear();

            // Si la selección no es "Ver Todo" (all), marcamos esa categoría específica
            if (externalCatId !== 'all') {
                selectedCategories.add(externalCatId);
            }

            // Actualizamos visualmente los iconos (pone/quita la clase .active)
            updateBarVisualState();
        });

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
        // Guardamos el ID en el elemento HTML para encontrarlo luego
        item.dataset.id = cat.id;

        const imgSrc = `assets/categories/cat_${cat.id}.png`;
        const fallbackIcon = `https://cdn-icons-png.flaticon.com/512/3565/3565405.png`; 

        item.innerHTML = `
            <div class="cat-nav-icon">
                <img src="${imgSrc}" alt="${cat.nombre}" onerror="this.src='${fallbackIcon}'">
            </div>
            <span class="cat-nav-label">${cat.nombre.toLowerCase()}</span>
        `;

        // Lógica de clic en la propia barra (Multiselección)
        item.addEventListener('click', () => {
            if (selectedCategories.has(cat.id)) {
                selectedCategories.delete(cat.id);
            } else {
                selectedCategories.add(cat.id);
            }

            updateBarVisualState();

            // Avisamos al Grid que cambiaron las categorías seleccionadas
            window.dispatchEvent(new CustomEvent('categories-selection-changed', { 
                detail: { selectedIds: Array.from(selectedCategories) } 
            }));
        });

        wrapper.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
}

/**
 * Actualiza las clases CSS .active de los iconos basándose en el Set selectedCategories
 */
function updateBarVisualState() {
    const allItems = document.querySelectorAll('.cat-nav-item');
    
    allItems.forEach(item => {
        // Convertimos el dataset.id (string) al tipo correcto (number) para comparar con el Set
        const id = Number(item.dataset.id);
        
        if (selectedCategories.has(id)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}