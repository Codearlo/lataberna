// src/public/modules/store/product-grid/product-grid.js

import { getActiveProducts } from '../../../../services/store/products.service.js'; 
import { renderProductCard } from './product-grid.utils.js'; 

let allProductsCache = []; // Almacén local de productos

export async function initProductGrid(containerId) {
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) return;

    mainContainer.innerHTML = '<div style="text-align:center; padding:40px; width:100%;">Cargando catálogo...</div>';

    try {
        const allProducts = await getActiveProducts();
        
        if (!allProducts || allProducts.length === 0) {
            mainContainer.innerHTML = '<p class="empty-grid-msg">No hay productos disponibles por ahora.</p>';
            return;
        }

        allProductsCache = allProducts;
        
        // Render inicial: Mostrar TODO agrupado por defecto
        renderGrid(mainContainer, allProductsCache);

        // 1. Escuchar MULTISELECCIÓN de la barra de categorías
        window.addEventListener('categories-selection-changed', (e) => {
            const selectedIds = e.detail.selectedIds;
            handleMultiCategoryFilter(mainContainer, selectedIds);
        });

        // 2. Escuchar búsqueda del Header (Mantenemos compatibilidad)
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
    // Si no hay nada seleccionado (array vacío), mostramos TODO (Vista por defecto)
    if (!selectedIds || selectedIds.length === 0) {
        renderGrid(container, allProductsCache);
        return;
    }

    // Filtramos productos que pertenezcan a ALGUNA de las categorías seleccionadas
    const filtered = allProductsCache.filter(p => selectedIds.includes(p.categoria_id));
    
    // Mostramos los resultados en un grid plano
    renderFlatGrid(container, filtered, "Tu Selección");
}

function handleSearchFilter(container, term) {
    if (!term) {
        renderGrid(container, allProductsCache);
        return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = allProductsCache.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) || 
        (p.category && p.category.toLowerCase().includes(lowerTerm))
    );
    
    renderFlatGrid(container, filtered, `Resultados para "${term}"`);
}

/** Renderizado Agrupado (Vista por defecto) */
function renderGrid(container, products) {
    container.innerHTML = '';
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
            createCategorySection(container, categoryName, items, false);
        }
    });
}

/** Renderizado Plano (Para filtros y búsquedas) */
function renderFlatGrid(container, products, titleText) {
    container.innerHTML = '';
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No hay productos en esta selección.</div>';
        return;
    }
    createCategorySection(container, titleText, products, true);
}

function createCategorySection(container, categoryName, products, showAll) {
    const displayedProducts = showAll ? products : products.slice(0, 5);

    const section = document.createElement('section');
    section.className = 'category-section';

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = showAll ? categoryName.toUpperCase() : `COLECCIÓN DE ${categoryName.toUpperCase()}`;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'category-products-grid'; 

    displayedProducts.forEach(product => {
        const card = renderProductCard(product);
        grid.appendChild(card);
    });
    section.appendChild(grid);

    // Botón "Ver Todo" solo en vista agrupada
    if (!showAll && products.length > 5) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'category-footer';
        const btn = document.createElement('button');
        btn.className = 'view-all-cat-btn';
        btn.textContent = `VER TODO ${categoryName.toUpperCase()}`;
        
        btn.addEventListener('click', () => {
            // Al hacer clic en "Ver Todo" de una sección, filtramos solo por esa categoría
            handleMultiCategoryFilter(container, [products[0].categoria_id]);
            
            // Opcional: Actualizar visualmente la barra superior si existe
            // (Esto requeriría lógica extra para sincronizar UI, pero funcionalmente el grid ya responde)
        });

        buttonContainer.appendChild(btn);
        section.appendChild(buttonContainer);
    }
    container.appendChild(section);
}