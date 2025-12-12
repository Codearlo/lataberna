// src/public/modules/store/product-grid/product-grid.js

import { getActiveProducts } from '../../../../services/store/products.service.js'; 
import { renderProductCard } from './product-grid.utils.js'; 
import { updateSidebarFilters } from '../desktop-sidebar/desktop-sidebar.js';

let allProductsCache = []; 

// ESTADO GLOBAL DE LA APP (Para combinar filtros)
let currentAppState = {
    categoryIds: [], // IDs seleccionados (vacio = todos)
    searchTerm: '',
    filters: {
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

    mainContainer.innerHTML = '<div style="text-align:center; padding:40px; width:100%;">Cargando catálogo...</div>';

    try {
        let rawProducts = await getActiveProducts();
        
        if (!rawProducts || rawProducts.length === 0) {
            mainContainer.innerHTML = '<p class="empty-grid-msg">No hay productos disponibles por ahora.</p>';
            return;
        }

        // --- PROCESAMIENTO ---
        const processedProducts = rawProducts.map((p, index) => {
            const hasDiscount = (index % 3 === 0); 
            const fakeOriginalPrice = hasDiscount ? p.price * 1.25 : null;

            // Extracción de Marca
            let cleanName = p.name.replace(/Pack\s+/i, "").replace(/Botella\s+/i, "");
            const generics = ["RON", "PISCO", "GIN", "VODKA", "WHISKY", "CERVEZA", "VINO", "ESPUMANTE", "LATA", "SIXPACK"];
            const words = cleanName.trim().split(" ");
            let brand = "Genérico";
            if (words.length > 0) {
                if (generics.includes(words[0].toUpperCase()) && words.length > 1) {
                    brand = words[1];
                } else {
                    brand = words[0]; 
                }
            }
            brand = brand.replace(/,/g, "").trim();

            return {
                ...p,
                hasDiscount,
                fakeOriginalPrice,
                brand: brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
            };
        });

        // Ordenar: Packs primero
        processedProducts.sort((a, b) => (a.is_pack === b.is_pack) ? 0 : (a.is_pack ? -1 : 1));

        allProductsCache = processedProducts;
        
        // 1. Render Inicial
        applyGlobalFilters(mainContainer);

        // 2. Inicializar Sidebar
        updateSidebarFilters(allProductsCache);

        // --- LISTENERS UNIFICADOS ---

        // A. Cambios en el Sidebar (Precios, Marcas, Packs, Ofertas)
        window.addEventListener('filter-changed', (e) => {
            currentAppState.filters = e.detail;
            applyGlobalFilters(mainContainer);
        });

        // B. Barra de Categorías (Multiselección)
        window.addEventListener('categories-selection-changed', (e) => {
            currentAppState.categoryIds = e.detail.selectedIds;
            currentAppState.searchTerm = ''; // Limpiar búsqueda al cambiar categoría
            applyGlobalFilters(mainContainer);
        });

        // C. Búsqueda Header
        window.addEventListener('search-query', (e) => {
            currentAppState.searchTerm = e.detail.term;
            // No limpiamos categorías necesariamente, pero para evitar confusión:
            currentAppState.categoryIds = []; 
            applyGlobalFilters(mainContainer);
        });

        // D. Sidebar Categoría Simple
        window.addEventListener('category-selected', (e) => {
            const catId = e.detail.categoryId;
            currentAppState.categoryIds = (catId === 'all') ? [] : [catId];
            currentAppState.searchTerm = '';
            applyGlobalFilters(mainContainer);
        });

    } catch (error) {
        console.error("Error cargando productos:", error);
        mainContainer.innerHTML = '<p class="empty-grid-msg">Error al cargar el catálogo.</p>';
    }
}

/**
 * FUNCIÓN MAESTRA DE FILTRADO
 * Combina Categoría + Búsqueda + Filtros del Sidebar
 */
function applyGlobalFilters(container) {
    const { categoryIds, searchTerm, filters } = currentAppState;

    let results = allProductsCache;

    // 1. Filtrar por Categoría(s)
    if (categoryIds.length > 0) {
        results = results.filter(p => categoryIds.includes(p.categoria_id));
    }

    // 2. Filtrar por Búsqueda
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        results = results.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            (p.category && p.category.toLowerCase().includes(lowerTerm))
        );
    }

    // 3. Filtrar por Sidebar (Precio, Marca, Oferta, PACKS)
    if (filters) {
        results = results.filter(p => {
            const matchPrice = p.price >= filters.minPrice && p.price <= filters.maxPrice;
            const matchBrand = filters.brands.length === 0 || filters.brands.includes(p.brand);
            const matchOffer = !filters.onlyOffers || p.hasDiscount;
            // Lógica para "Solo Packs"
            const matchPack = !filters.onlyPacks || p.is_pack; 

            return matchPrice && matchBrand && matchOffer && matchPack;
        });
    }

    // --- DECISIÓN DE RENDERIZADO ---
    // Si hay filtros activos (sidebar o búsqueda), usamos vista plana.
    // Si solo hay categorías seleccionadas (o nada), usamos vista agrupada (si no hay filtro de packs).
    
    const isSidebarActive = filters && (filters.brands.length > 0 || filters.onlyOffers || filters.onlyPacks || filters.minPrice > 0);
    const isSearchActive = !!searchTerm;

    if (isSidebarActive || isSearchActive) {
        // Vista Plana (Resultados filtrados)
        let title = "Resultados";
        if (isSearchActive) title = `Resultados para "${searchTerm}"`;
        else if (filters.onlyPacks) title = "Packs y Combos Seleccionados";
        else title = "Tu Selección Filtrada";

        renderFlatGrid(container, results, title);
    } else {
        // Vista Agrupada (Por defecto o solo Categoría)
        if (categoryIds.length > 0) {
            renderGroupedGrid(container, results);
        } else {
            // Vista "Home" (Todo)
            renderFlatGrid(container, results, null); // Muestra todo con Packs arriba
        }
    }
}

// --- FUNCIONES DE RENDER (Mismas de antes) ---

function renderGroupedGrid(container, products) {
    container.innerHTML = '';
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No hay productos.</div>';
        return;
    }
    const productsByCategory = products.reduce((acc, product) => {
        const catName = product.category || 'Otros';
        if (catName.toUpperCase() === 'SIN CATEGORIA') return acc;
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(product);
        return acc;
    }, {});

    Object.keys(productsByCategory).sort().forEach(categoryName => {
        const items = productsByCategory[categoryName];
        if (items.length > 0) createCategorySection(container, categoryName, items, true);
    });
}

function renderFlatGrid(container, products, titleText) {
    container.innerHTML = '';
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No se encontraron productos.</div>';
        return;
    }
    createCategorySection(container, titleText, products, true);
}

function createCategorySection(container, categoryName, products, showAll) {
    const displayedProducts = showAll ? products : products.slice(0, 5);
    const section = document.createElement('section');
    section.className = 'category-section';

    if (categoryName) {
        const title = document.createElement('h2');
        title.className = 'category-title';
        if (categoryName.startsWith('Resultados') || categoryName.startsWith('Tu') || categoryName.startsWith('Packs')) {
            title.textContent = categoryName;
        } else {
            title.textContent = `COLECCIÓN DE ${categoryName.toUpperCase()}`;
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
    container.appendChild(section);
}