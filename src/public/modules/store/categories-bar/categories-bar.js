// src/public/modules/store/categories-bar/categories-bar.js

import { getMenuCategories } from '../../../../services/store/products.service.js';

const CONTAINER_ID = 'categories-bar-container';

/**
 * Initializes the horizontal categories bar.
 * Dispatches 'category-selected' event to window when clicked.
 */
export async function initCategoriesBar() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    try {
        const categories = await getMenuCategories();
        
        // Add "All" option at the beginning
        const allCategories = [
            { id: 'all', nombre: 'Todo' },
            ...categories
        ];

        renderBar(container, allCategories);

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
        if (cat.id === 'all') item.classList.add('active');
        item.dataset.id = cat.id;

        // Try to load specific category image, fallback to default SVG
        // Naming convention: assets/categories/cat_{id}.png
        const imgSrc = cat.id === 'all' 
            ? 'src/public/modules/store/categories-bar/icons/all.svg' // You can create this or it will fallback
            : `assets/categories/cat_${cat.id}.png`;

        // Generic fallback icon (Folder/Grid)
        const fallbackIcon = `https://cdn-icons-png.flaticon.com/512/3565/3565405.png`; 

        item.innerHTML = `
            <div class="cat-nav-icon">
                <img src="${imgSrc}" alt="${cat.nombre}" onerror="this.src='${fallbackIcon}'">
            </div>
            <span class="cat-nav-label">${cat.nombre.toLowerCase()}</span>
        `;

        item.addEventListener('click', () => {
            // Visual Active State
            document.querySelectorAll('.cat-nav-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // Dispatch Event
            window.dispatchEvent(new CustomEvent('category-selected', { 
                detail: { categoryId: cat.id } 
            }));
        });

        wrapper.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
}