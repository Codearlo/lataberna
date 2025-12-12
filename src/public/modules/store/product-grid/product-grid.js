// src/public/modules/store/product-grid/product-grid.js

import { getActiveProducts } from '../../../../services/store/products.service.js'; 
import { renderProductCard } from './product-grid.utils.js'; 

let allProductsCache = []; // Almacén local de productos

export async function initProductGrid(containerId) {
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) return;

    mainContainer.innerHTML = '<div style="text-align:center; padding:40px; width:100%;">Cargando catálogo...</div>';

    try {
        let allProducts = await getActiveProducts();
        
        if (!allProducts || allProducts.length === 0) {
            mainContainer.innerHTML = '<p class="empty-grid-msg">No hay productos disponibles por ahora.</p>';
            return;
        }

        // --- ORDENAMIENTO PRIORITARIO ---
        // Ponemos los Packs primero, luego el resto.
        allProducts.sort((a, b) => {
            if (a.is_pack === b.is_pack) return 0;
            return a.is_pack ? -1 : 1; // true (Packs) van antes (-1)
        });

        allProductsCache = allProducts;
        
        // Render inicial: GRID PLANO sin secciones (Título null)
        renderFlatGrid(mainContainer, allProductsCache, null);

        // 1. Escuchar MULTISELECCIÓN de la barra de categorías
        window.addEventListener('categories-selection-changed', (e) => {
            const selectedIds = e.detail.selectedIds;
            handleMultiCategoryFilter(mainContainer, selectedIds);
        });

        // 2. Escuchar búsqueda del Header
        window.addEventListener('search-query', (e) => {
            const term = e.detail.term;
            handleSearchFilter(mainContainer, term);
        });

        // 3. Compatibilidad con Sidebar (Selección simple)
        window.addEventListener('category-selected', (e) => {
            const catId = e.detail.categoryId;
            if (catId === 'all') {
                handleMultiCategoryFilter(mainContainer, []); // Vacío = Todo
            } else {
                handleMultiCategoryFilter(mainContainer, [catId]); // Array con 1 elemento
            }
        });

    } catch (error) {
        console.error("Error cargando productos:", error);
        mainContainer.innerHTML = '<p class="empty-grid-msg">Error al cargar el catálogo.</p>';
    }
}

/**
 * Filtro Multiselección
 * @param {string[]} selectedIds Array de IDs seleccionados
 */
function handleMultiCategoryFilter(container, selectedIds) {
    // Si no hay nada seleccionado (array vacío), mostramos TODO en vista PLANA (Packs arriba)
    if (!selectedIds || selectedIds.length === 0) {
        renderFlatGrid(container, allProductsCache, null);
        return;
    }

    // Si HAY selección, filtramos y mostramos AGRUPADO por secciones (Colección de X...)
    const filtered = allProductsCache.filter(p => selectedIds.includes(p.categoria_id));
    
    // Usamos renderGroupedGrid para mostrar las secciones solicitadas
    renderGroupedGrid(container, filtered);
}

function handleSearchFilter(container, term) {
    if (!term) {
        renderFlatGrid(container, allProductsCache, null);
        return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = allProductsCache.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) || 
        (p.category && p.category.toLowerCase().includes(lowerTerm))
    );
    
    renderFlatGrid(container, filtered, `Resultados para "${term}"`);
}

/** * Renderizado Agrupado (Secciones "Colección de...") 
 * Se usa cuando hay categorías seleccionadas.
 */
function renderGroupedGrid(container, products) {
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No hay productos en esta selección.</div>';
        return;
    }

    const productsByCategory = products.reduce((acc, product) => {
        const catName = product.category || 'Otros';
        if (catName.toUpperCase() === 'SIN CATEGORIA') return acc;
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(product);
        return acc;
    }, {});

    const sortedCategories = Object.keys(productsByCategory).sort();

    sortedCategories.forEach(categoryName => {
        const items = productsByCategory[categoryName];
        if (items.length > 0) {
            // Mostramos todo (true) porque el usuario ya filtró explícitamente
            createCategorySection(container, categoryName, items, true);
        }
    });
}

/** * Renderizado Plano (Todo mezclado) 
 * Se usa para la vista inicial y búsquedas.
 */
function renderFlatGrid(container, products, titleText) {
    container.innerHTML = '';
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No hay productos disponibles.</div>';
        return;
    }
    // Pasamos titleText (puede ser null para no mostrar título)
    createCategorySection(container, titleText, products, true);
}

function createCategorySection(container, categoryName, products, showAll) {
    const displayedProducts = showAll ? products : products.slice(0, 5);

    const section = document.createElement('section');
    section.className = 'category-section';

    // SOLO renderizar el título si categoryName existe
    if (categoryName) {
        const title = document.createElement('h2');
        title.className = 'category-title';
        
        // Si es un resultado de búsqueda o un título custom, lo mostramos directo
        if (categoryName.startsWith('Resultados')) {
            title.textContent = categoryName;
        } else {
            // Si es una categoría, usamos el formato "COLECCIÓN DE..."
            title.textContent = showAll ? categoryName.toUpperCase() : `COLECCIÓN DE ${categoryName.toUpperCase()}`;
        }
        section.appendChild(title);
    }

    const grid = document.createElement('div');
    grid.className = 'category-products-grid'; 

    displayedProducts.forEach(product => {
        const card = renderProductCard(product);
        grid.appendChild(card);
    });
    section.appendChild(grid);

    // Botón "Ver Todo" (Solo si no estamos mostrando todo y hay título/categoría)
    if (!showAll && products.length > 5 && categoryName) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'category-footer';
        const btn = document.createElement('button');
        btn.className = 'view-all-cat-btn';
        btn.textContent = `VER TODO ${categoryName.toUpperCase()}`;
        
        btn.addEventListener('click', () => {
            // Al hacer clic en "Ver Todo", filtramos por esa categoría específica
            if (products.length > 0) {
                // Disparamos evento para que el sistema lo reconozca como un filtro único
                window.dispatchEvent(new CustomEvent('category-selected', { 
                    detail: { categoryId: products[0].categoria_id } 
                }));
            }
        });

        buttonContainer.appendChild(btn);
        section.appendChild(buttonContainer);
    }
    container.appendChild(section);
}