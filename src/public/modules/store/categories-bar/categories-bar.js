// src/public/modules/store/categories-bar/categories-bar.js

import { getMenuCategories } from '../../../../services/store/products.service.js';

const CONTAINER_ID = 'categories-bar-container';

// Set para manejar las selecciones activas
const selectedCategories = new Set();

export async function initCategoriesBar() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    // Lógica de Sombra al Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            container.classList.add('is-pinned');
        } else {
            container.classList.remove('is-pinned');
        }
    });

    try {
        const categories = await getMenuCategories();
        renderBar(container, categories);

        // Sincronización con el Sidebar
        window.addEventListener('category-selected', (e) => {
            const externalCatId = e.detail.categoryId;
            selectedCategories.clear();

            if (externalCatId !== 'all') {
                selectedCategories.add(externalCatId);
                scrollToCategory(externalCatId);
            }
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
    wrapper.id = 'categories-scroll-wrapper';

    const fadeOverlay = document.createElement('div');
    fadeOverlay.className = 'categories-scroll-fade';
    container.appendChild(fadeOverlay);

    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'cat-nav-item';
        item.dataset.id = cat.id;

        // CAMBIO: Usar la imagen de la base de datos si existe
        const fallbackIcon = `https://cdn-icons-png.flaticon.com/512/3565/3565405.png`; 
        const imgSrc = cat.image_url ? cat.image_url : fallbackIcon;

        item.innerHTML = `
            <div class="cat-nav-icon">
                <img src="${imgSrc}" alt="${cat.nombre}" loading="lazy" onerror="this.src='${fallbackIcon}'">
            </div>
            <span class="cat-nav-label">${cat.nombre.toLowerCase()}</span>
        `;

        item.addEventListener('click', () => {
            if (selectedCategories.has(cat.id)) {
                selectedCategories.delete(cat.id);
            } else {
                selectedCategories.add(cat.id);
            }

            updateBarVisualState();

            window.dispatchEvent(new CustomEvent('categories-selection-changed', { 
                detail: { selectedIds: Array.from(selectedCategories) } 
            }));
        });

        wrapper.appendChild(item);
    });

    container.appendChild(wrapper);

    wrapper.addEventListener('scroll', () => {
        handleScrollFade(wrapper, fadeOverlay);
    });

    setTimeout(() => {
        triggerScrollHint(wrapper);
    }, 1500);
}

function updateBarVisualState() {
    const allItems = document.querySelectorAll('.cat-nav-item');
    allItems.forEach(item => {
        const id = Number(item.dataset.id);
        if (selectedCategories.has(id)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function triggerScrollHint(wrapper) {
    if (wrapper.scrollWidth > wrapper.clientWidth) {
        wrapper.scrollBy({ left: 40, behavior: 'smooth' });
        setTimeout(() => {
            wrapper.scrollBy({ left: -40, behavior: 'smooth' });
        }, 600);
    }
}

function handleScrollFade(wrapper, fadeElement) {
    const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth - 5;
    if (wrapper.scrollLeft >= maxScrollLeft) {
        fadeElement.classList.add('is-hidden'); 
    } else {
        fadeElement.classList.remove('is-hidden'); 
    }
}

function scrollToCategory(catId) {
    const item = document.querySelector(`.cat-nav-item[data-id="${catId}"]`);
    if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}