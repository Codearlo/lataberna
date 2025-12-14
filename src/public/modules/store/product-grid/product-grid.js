// src/public/modules/store/product-grid/product-grid.js

import { getProductsMetadata, getProductsPaged } from '../../../../services/store/products.service.js'; 
import { renderProductCard } from './product-grid.utils.js'; 
import { updateSidebarFilters } from '../desktop-sidebar/desktop-sidebar.js';

// Configuración de Paginación
const ITEMS_PER_PAGE = 12;

// Estado Global de la Grid
let gridState = {
    page: 1,
    products: [],     
    total: 0,         
    isLoading: false,
    
    // Filtros activos
    filters: {
        categoryIds: [],
        searchTerm: '',
        minPrice: 0,
        maxPrice: Infinity,
        brands: [],
        onlyOffers: false, 
        onlyPacks: false
    }
};

export async function initProductGrid(containerId) {
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) return;

    // Estructura base
    mainContainer.innerHTML = `
        <div id="grid-content-area"></div>
        <div id="grid-loader" class="loader-container" style="display:none;">
            <div class="spinner"></div>
        </div>
        <div class="load-more-container">
            <button id="btn-load-more" class="load-more-btn" style="display:none;">Cargar más productos</button>
        </div>
    `;

    const contentArea = document.getElementById('grid-content-area');
    const loadMoreBtn = document.getElementById('btn-load-more');

    // 1. Cargar Metadata para el Sidebar
    try {
        const metadata = await getProductsMetadata();
        updateSidebarFilters(metadata); 
    } catch (e) {
        console.error("Error metadata:", e);
    }

    // 2. Cargar Primera Página
    await fetchAndRender(true);

    // --- EVENTOS ---

    loadMoreBtn.addEventListener('click', () => {
        gridState.page++;
        fetchAndRender(false); 
    });

    window.addEventListener('filter-changed', (e) => {
        gridState.filters.minPrice = e.detail.minPrice;
        gridState.filters.maxPrice = e.detail.maxPrice;
        gridState.filters.brands = e.detail.brands;
        gridState.filters.onlyOffers = e.detail.onlyOffers;
        gridState.filters.onlyPacks = e.detail.onlyPacks;
        
        resetAndReload();
    });

    window.addEventListener('categories-selection-changed', (e) => {
        const selectedIds = e.detail.selectedIds;
        const packsSelected = selectedIds.includes('packs');

        if (packsSelected) {
            gridState.filters.onlyPacks = true;
            gridState.filters.categoryIds = selectedIds.filter(id => id !== 'packs');
        } else {
            gridState.filters.onlyPacks = false;
            gridState.filters.categoryIds = selectedIds;
        }

        gridState.filters.searchTerm = ''; 
        resetAndReload();
    });

    window.addEventListener('search-query', (e) => {
        gridState.filters.searchTerm = e.detail.term;
        gridState.filters.categoryIds = []; 
        gridState.filters.onlyPacks = false; 
        resetAndReload();
    });

    window.addEventListener('category-selected', (e) => {
        const catId = e.detail.categoryId;
        gridState.filters.categoryIds = (catId === 'all') ? [] : [catId];
        gridState.filters.searchTerm = '';
        gridState.filters.onlyPacks = false;
        resetAndReload();
    });
}

function resetAndReload() {
    gridState.page = 1;
    gridState.products = [];
    fetchAndRender(true); 
}

async function fetchAndRender(isReset) {
    if (gridState.isLoading) return;
    gridState.isLoading = true;

    const contentArea = document.getElementById('grid-content-area');
    const loader = document.getElementById('grid-loader');
    const loadMoreBtn = document.getElementById('btn-load-more');

    loader.style.display = 'flex';
    loadMoreBtn.style.display = 'none';
    if (isReset) {
        contentArea.innerHTML = ''; 
    }

    try {
        const { products, total } = await getProductsPaged({
            page: gridState.page,
            limit: ITEMS_PER_PAGE,
            categoryIds: gridState.filters.categoryIds,
            searchTerm: gridState.filters.searchTerm,
            minPrice: gridState.filters.minPrice,
            maxPrice: gridState.filters.maxPrice,
            brands: gridState.filters.brands,
            onlyPacks: gridState.filters.onlyPacks
        });

        // Filtrado Client-Side para "Solo Ofertas" usando datos REALES
        let productsToShow = products;
        if (gridState.filters.onlyOffers) {
            productsToShow = products.filter(p => p.has_discount);
        }

        gridState.products = isReset ? productsToShow : [...gridState.products, ...productsToShow];
        gridState.total = total;

        if (gridState.products.length === 0 && isReset) {
            contentArea.innerHTML = '<div class="empty-state-msg">No encontramos productos.</div>';
        } else {
            renderBatch(contentArea, productsToShow);
        }

        const loadedCount = (gridState.page * ITEMS_PER_PAGE); 
        if (loadedCount < total) {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.textContent = `Ver más (${total - loadedCount} restantes)`;
        } else {
            loadMoreBtn.style.display = 'none';
        }

    } catch (error) {
        console.error("Error grid:", error);
        contentArea.innerHTML = '<p class="error-msg">Error de conexión.</p>';
    } finally {
        gridState.isLoading = false;
        loader.style.display = 'none';
    }
}

function renderBatch(container, products) {
    let grid = container.querySelector('.category-products-grid');
    
    if (!grid) {
        const titleText = getTitleText();
        if (titleText) {
            const title = document.createElement('h2');
            title.className = 'category-title';
            title.textContent = titleText;
            container.appendChild(title);
        }

        grid = document.createElement('div');
        grid.className = 'category-products-grid';
        container.appendChild(grid);
    }

    products.forEach(product => {
        const card = renderProductCard(product);
        grid.appendChild(card);
    });
}

function getTitleText() {
    const f = gridState.filters;
    if (f.searchTerm) return `Resultados para "${f.searchTerm}"`;
    if (f.onlyPacks) return "Combos";
    if (f.categoryIds.length > 0) return "Tu Selección";
    if (f.onlyOffers) return "Ofertas Especiales";
    return null;
}