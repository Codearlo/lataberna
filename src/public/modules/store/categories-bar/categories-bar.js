// src/public/modules/store/categories-bar/categories-bar.js

import { getMenuCategories } from '../../../../services/store/products.service.js';

const CONTAINER_ID = 'categories-bar-container';

// Set para manejar las selecciones activas
const selectedCategories = new Set();

export async function initCategoriesBar() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    // --- NUEVO: Lógica de Sombra al Scroll ---
    window.addEventListener('scroll', () => {
        // Si bajamos más de 10px, activamos la sombra
        if (window.scrollY > 10) {
            container.classList.add('is-pinned');
        } else {
            container.classList.remove('is-pinned');
        }
    });

    try {
        const categories = await getMenuCategories();
        renderBar(container, categories);

        // --- Sincronización con el Sidebar ---
        window.addEventListener('category-selected', (e) => {
            const externalCatId = e.detail.categoryId;
            
            // Sidebar reinicia la selección (filtro único)
            selectedCategories.clear();

            if (externalCatId !== 'all') {
                selectedCategories.add(externalCatId);
                // Opcional: Hacer scroll automático hasta la categoría seleccionada
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
    // 1. Crear Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'categories-bar-wrapper';
    wrapper.id = 'categories-scroll-wrapper'; // ID para referencia fácil

    // 2. Crear Elemento de Degradado (Fade)
    const fadeOverlay = document.createElement('div');
    fadeOverlay.className = 'categories-scroll-fade';
    container.appendChild(fadeOverlay); // Se añade al container, sobre el wrapper

    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'cat-nav-item';
        item.dataset.id = cat.id;

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

    // --- LÓGICA DE UX: INDICADORES DE SCROLL ---
    
    // A. Detectar scroll para ocultar el degradado si llegamos al final
    wrapper.addEventListener('scroll', () => {
        handleScrollFade(wrapper, fadeOverlay);
    });

    // B. Ejecutar animación "Pistazo" (Nudge) inicial
    // Esperamos un poco para asegurarnos de que el usuario ya vio la pantalla
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

/**
 * Animación suave que mueve la barra a la derecha y regresa.
 * Esto enseña al usuario que hay contenido oculto.
 */
function triggerScrollHint(wrapper) {
    // Solo animar si hay contenido para scrollear
    if (wrapper.scrollWidth > wrapper.clientWidth) {
        // Mover 40px a la derecha
        wrapper.scrollBy({ left: 40, behavior: 'smooth' });
        
        // Regresar después de 600ms
        setTimeout(() => {
            wrapper.scrollBy({ left: -40, behavior: 'smooth' });
        }, 600);
    }
}

/**
 * Controla la visibilidad del degradado derecho.
 */
function handleScrollFade(wrapper, fadeElement) {
    // Margen de error de 5px (por redondeo de zoom en móviles)
    const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth - 5;
    
    if (wrapper.scrollLeft >= maxScrollLeft) {
        fadeElement.classList.add('is-hidden'); // Ocultar si llegamos al final
    } else {
        fadeElement.classList.remove('is-hidden'); // Mostrar si hay más contenido
    }
}

/**
 * Centra la categoría seleccionada en la vista (útil para sincronización con sidebar)
 */
function scrollToCategory(catId) {
    const item = document.querySelector(`.cat-nav-item[data-id="${catId}"]`);
    if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}