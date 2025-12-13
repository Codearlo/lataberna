// src/public/modules/store/product-grid/product-grid.js

import { getProductsMetadata, getProductsPaged } from '../../../../services/store/products.service.js'; 
import { renderProductCard } from './product-grid.utils.js'; 
import { updateSidebarFilters } from '../desktop-sidebar/desktop-sidebar.js';

// Configuración de Paginación
const ITEMS_PER_PAGE = 12; // Recomendado para mantener simetría

// Estado Global de la Grid
let gridState = {
    page: 1,
    products: [],     // Productos cargados y visibles
    total: 0,         // Total disponible en DB para el filtro actual
    isLoading: false,
    
    // Filtros activos
    filters: {
        categoryIds: [],
        searchTerm: '',
        minPrice: 0,
        maxPrice: Infinity,
        brands: [],
        onlyOffers: false, // Nota: Ofertas es simulado cliente, pero filtrado visualmente
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

    // 1. Cargar Metadata para el Sidebar (Solo una vez al inicio)
    // Esto configura los filtros de precios y marcas disponibles
    try {
        const metadata = await getProductsMetadata();
        updateSidebarFilters(metadata); // Inicializamos el sidebar con datos reales ligeros
    } catch (e) {
        console.error("Error metadata:", e);
    }

    // 2. Cargar Primera Página
    await fetchAndRender(true);

    // --- EVENTOS ---

    // A. Botón Cargar Más
    loadMoreBtn.addEventListener('click', () => {
        gridState.page++;
        fetchAndRender(false); // false = no limpiar, añadir al final
    });

    // B. Filtros del Sidebar
    window.addEventListener('filter-changed', (e) => {
        // Actualizamos filtros y reseteamos a página 1
        gridState.filters.minPrice = e.detail.minPrice;
        gridState.filters.maxPrice = e.detail.maxPrice;
        gridState.filters.brands = e.detail.brands;
        gridState.filters.onlyOffers = e.detail.onlyOffers;
        gridState.filters.onlyPacks = e.detail.onlyPacks;
        
        resetAndReload();
    });

    // C. Barra de Categorías (MODIFICADO PARA SOPORTAR PACKS VIRTUAL)
    window.addEventListener('categories-selection-changed', (e) => {
        const selectedIds = e.detail.selectedIds;
        
        // Verificamos si se seleccionó la categoría virtual 'packs'
        const packsSelected = selectedIds.includes('packs');

        if (packsSelected) {
            // Activamos el modo "Solo Packs"
            gridState.filters.onlyPacks = true;
            // Quitamos 'packs' de la lista de IDs para que no falle el SQL
            // y usamos cualquier otro ID seleccionado si lo hubiera (aunque en modo single select no habrá)
            gridState.filters.categoryIds = selectedIds.filter(id => id !== 'packs');
        } else {
            // Desactivamos modo packs
            gridState.filters.onlyPacks = false;
            gridState.filters.categoryIds = selectedIds;
        }

        gridState.filters.searchTerm = ''; // Limpiar búsqueda
        resetAndReload();
    });

    // D. Búsqueda Header
    window.addEventListener('search-query', (e) => {
        gridState.filters.searchTerm = e.detail.term;
        gridState.filters.categoryIds = []; // Prioridad a búsqueda global
        // Reset de packs si busca por texto
        gridState.filters.onlyPacks = false; 
        resetAndReload();
    });

    // E. Categoría Simple Sidebar
    window.addEventListener('category-selected', (e) => {
        const catId = e.detail.categoryId;
        gridState.filters.categoryIds = (catId === 'all') ? [] : [catId];
        gridState.filters.searchTerm = '';
        gridState.filters.onlyPacks = false; // Reset packs
        resetAndReload();
    });
}

function resetAndReload() {
    gridState.page = 1;
    gridState.products = [];
    fetchAndRender(true); // true = limpiar grid actual
}

async function fetchAndRender(isReset) {
    if (gridState.isLoading) return;
    gridState.isLoading = true;

    const contentArea = document.getElementById('grid-content-area');
    const loader = document.getElementById('grid-loader');
    const loadMoreBtn = document.getElementById('btn-load-more');

    // UI Loading
    loader.style.display = 'flex';
    loadMoreBtn.style.display = 'none';
    if (isReset) {
        contentArea.innerHTML = ''; // Limpiar si es filtro nuevo
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

        // Procesamiento Client-Side (Marcas simuladas y Ofertas)
        // Necesitamos procesar esto aquí para que las tarjetas se rendericen bien
        const processedBatch = products.map((p, index) => {
            // Lógica de simulación para visualización
            // Nota: El índice es local al batch, así que el patrón de ofertas puede variar por página
            const hasDiscount = (p.id % 3 === 0); // Usamos ID para que sea consistente entre recargas
            const fakeOriginalPrice = hasDiscount ? p.price * 1.25 : null;
            
            // Marca (ya viene limpia si usamos metadata, pero por seguridad si viene del query normal)
            // En getProductsPaged no procesamos la marca, así que lo hacemos aquí para la tarjeta
            // (Aunque el filtro ya se aplicó en servidor vía 'ilike')
            
            return {
                ...p,
                hasDiscount,
                fakeOriginalPrice
            };
        });

        // Filtrado Client-Side FINAL solo para "Solo Ofertas"
        // Como "hasDiscount" es simulado, no podemos filtrarlo en BD.
        // Si el usuario marca "Solo Ofertas", ocultamos los que no lo son de este lote.
        let productsToShow = processedBatch;
        if (gridState.filters.onlyOffers) {
            productsToShow = processedBatch.filter(p => p.hasDiscount);
        }

        gridState.products = isReset ? productsToShow : [...gridState.products, ...productsToShow];
        gridState.total = total;

        // Renderizado
        if (gridState.products.length === 0 && isReset) {
            contentArea.innerHTML = '<div class="empty-state-msg">No encontramos productos.</div>';
        } else {
            // Si es reset, decidimos si mostrar agrupado o plano
            // Por simplicidad en paginación infinita, usaremos siempre Grid Plano
            // salvo que queramos insertar títulos entre lotes (complejo).
            // Usaremos Grid Plano para paginación fluida.
            renderBatch(contentArea, productsToShow);
        }

        // Control del botón "Cargar Más"
        // Si tenemos menos productos cargados que el total real en DB
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
    // Si el contenedor está vacío (reset), creamos la estructura del grid
    let grid = container.querySelector('.category-products-grid');
    
    if (!grid) {
        // Título opcional
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
    return null; // Home por defecto sin título
}