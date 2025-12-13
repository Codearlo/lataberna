// src/public/modules/store/desktop-sidebar/desktop-sidebar.js

const CONTAINER_ID = 'desktop-sidebar-container';

// Estado de los filtros
let filterState = {
    minPrice: 0,
    maxPrice: 1000,
    brands: [], 
    onlyOffers: false,
    onlyPacks: false // NUEVO: Estado para Packs
};

let allProductsRef = []; 

export async function initDesktopSidebar() {
    // Se inicializa vacío
}

export function updateSidebarFilters(products) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    allProductsRef = products;
    
    // 1. Calcular Rango de Precios
    const prices = products.map(p => p.price);
    const minP = Math.floor(Math.min(...prices));
    const maxP = Math.ceil(Math.max(...prices));
    
    filterState.minPrice = minP;
    filterState.maxPrice = maxP;

    // 2. Extraer Marcas
    const brandCounts = {};
    products.forEach(p => {
        if (p.brand && p.brand.length > 2) { 
            brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        }
    });
    const sortedBrands = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a]);

    // 3. Renderizar
    renderSidebarHTML(container, minP, maxP, sortedBrands);
    
    // 4. Eventos
    attachFilterEvents(container);
}

function renderSidebarHTML(container, min, max, brands) {
    container.innerHTML = `
        <div class="sidebar-card">
            <div class="sidebar-header-main">
                <h3>Filtros</h3>
                <button id="reset-filters-btn" class="reset-link">Borrar todo</button>
            </div>
            
            <div class="filter-section">
                <h4>Rango de Precio</h4>
                <div class="price-inputs">
                    <input type="number" id="min-price-input" value="${min}" min="0">
                    <span>-</span>
                    <input type="number" id="max-price-input" value="${max}" min="0">
                </div>
                <button id="apply-price-btn" class="apply-btn">Aplicar Precio</button>
            </div>

            <div class="filter-section">
                <h4>Tipo de Producto</h4>
                <label class="custom-check-label">
                    <input type="checkbox" id="packs-check">
                    <span class="checkmark"></span>
                    Solo Combos
                </label>
            </div>

            <div class="filter-section">
                <h4>Ofertas</h4>
                <label class="custom-check-label">
                    <input type="checkbox" id="offers-check">
                    <span class="checkmark"></span>
                    Solo Ofertas y Descuentos
                </label>
            </div>

            <div class="filter-section">
                <h4>Marcas Populares</h4>
                <ul class="sidebar-list brands-list">
                    ${brands.slice(0, 15).map(brand => `
                        <li class="sidebar-item-check">
                            <label class="custom-check-label">
                                <input type="checkbox" class="brand-check" value="${brand}">
                                <span class="checkmark"></span>
                                <span class="label-text">${brand}</span>
                            </label>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function attachFilterEvents(container) {
    const minInput = document.getElementById('min-price-input');
    const maxInput = document.getElementById('max-price-input');
    const applyPriceBtn = document.getElementById('apply-price-btn');
    const packsCheck = document.getElementById('packs-check'); // NUEVO
    const offersCheck = document.getElementById('offers-check');
    const brandChecks = document.querySelectorAll('.brand-check');
    const resetBtn = document.getElementById('reset-filters-btn');

    const dispatchFilter = () => {
        filterState.minPrice = parseFloat(minInput.value) || 0;
        filterState.maxPrice = parseFloat(maxInput.value) || 9999;
        filterState.onlyOffers = offersCheck.checked;
        filterState.onlyPacks = packsCheck.checked; // NUEVO
        
        filterState.brands = Array.from(brandChecks)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        window.dispatchEvent(new CustomEvent('filter-changed', {
            detail: { ...filterState }
        }));
    };

    applyPriceBtn.addEventListener('click', dispatchFilter);
    offersCheck.addEventListener('change', dispatchFilter);
    packsCheck.addEventListener('change', dispatchFilter); // NUEVO
    
    brandChecks.forEach(cb => {
        cb.addEventListener('change', dispatchFilter);
    });

    resetBtn.addEventListener('click', () => {
        minInput.value = 0; 
        maxInput.value = 1000;
        offersCheck.checked = false;
        packsCheck.checked = false; // Reset packs
        brandChecks.forEach(cb => cb.checked = false);
        dispatchFilter();
    });
}