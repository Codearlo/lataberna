// src/admin/products/list-products/list-products.js

import { initBottomNav } from '../../modules/bottom-nav/bottom-nav.js';
import { getSession } from '../../auth/auth.js'; 
import { getFilteredProductsPaged } from './list-products.service.js';

// --- Configuración de Paginación y Estado ---
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let currentFilter = 'active'; 
let currentSearchTerm = '';
let totalProducts = 0;

// **RUTAS DE NAVEGACIÓN**
const PRODUCTS_VIEW_ROUTES = {
    'products': './list-products.html',
    'packs': '../../packs/list-packs/list-packs.html',
    'profile': '../../profile/profile.html'
};

const ADMIN_CONTENT_ID = 'app-content';
const PRODUCTS_LIST_CONTAINER_ID = '#products-list-views';
const ACTIVE_PRODUCTS_GRID_ID = 'active-products-list';
const ALL_PRODUCTS_GRID_ID = 'all-products-list';
const PAGINATION_CONTAINER_ID = 'pagination-container'; 

/**
 * Inicializa la página de gestión de productos.
 */
export async function initListProductsPage() {
    if (window.listProductsInitialized) return;
    window.listProductsInitialized = true;
    
    const session = await getSession();
    const contentContainer = document.getElementById(ADMIN_CONTENT_ID);

    if (!session) {
        window.location.href = '../../auth/auth.html';
        return;
    }

    // Logueado: Inicializar la vista
    try {
        attachEventListeners();
        initBottomNav('products', '../../modules/bottom-nav/bottom-nav.html', PRODUCTS_VIEW_ROUTES); 
        await loadProducts();
        
    } catch (error) {
        console.error("Error al inicializar la lista de productos:", error);
        if(contentContainer) contentContainer.innerHTML = `<p class="error-msg">Error al cargar la interfaz.</p>`;
    }
}


function attachEventListeners() {
    // Buscador
    const searchInput = document.getElementById('product-search-input');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = searchInput.value.trim();
                currentPage = 1; 
                loadProducts();
            }, 300);
        });
    }

    // Tabs
    const tabsContainer = document.getElementById('product-view-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-btn'); 
            if (!button) return;

            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); 
            button.classList.add('active');
            
            currentFilter = button.dataset.filter;
            currentPage = 1;
            updateActiveView(currentFilter);
            loadProducts();
        });
    }
    
    // Paginación
    const paginationContainer = document.getElementById(PAGINATION_CONTAINER_ID);
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.pagination-btn');
            if (!button || button.disabled) return;
            
            const targetPage = parseInt(button.dataset.page);
            if (targetPage && targetPage !== currentPage) {
                currentPage = targetPage;
                loadProducts();
            }
        });
    }

    // Click en tarjeta (Editar)
    const productListViews = document.getElementById('products-list-views');
    if (productListViews) {
        productListViews.addEventListener('click', (e) => {
            const listItem = e.target.closest('.product-card'); 
            if (listItem) {
                const productId = listItem.dataset.id;
                window.location.href = `../edit-product/edit-product.html?id=${productId}`;
            }
        });
    }
}

function updateActiveView(filter) {
    const activeGrid = document.getElementById(ACTIVE_PRODUCTS_GRID_ID);
    const allGrid = document.getElementById(ALL_PRODUCTS_GRID_ID);
    
    if (activeGrid) activeGrid.classList.remove('active-view');
    if (allGrid) allGrid.classList.remove('active-view');

    if (filter === 'all' && allGrid) {
        allGrid.classList.add('active-view');
    } else if (activeGrid) {
        activeGrid.classList.add('active-view');
    }
    
    const activeMsg = document.getElementById(`active-empty-msg`);
    if (activeMsg) activeMsg.style.display = 'none';
    const allMsg = document.getElementById(`all-empty-msg`);
    if (allMsg) allMsg.style.display = 'none';
}

async function loadProducts() {
    const activeListId = currentFilter === 'all' ? ALL_PRODUCTS_GRID_ID : ACTIVE_PRODUCTS_GRID_ID;
    const listContainer = document.getElementById(activeListId);
    const emptyMsgElement = document.getElementById(`${currentFilter}-empty-msg`); 
    
    if (!listContainer) return;

    const mainContainer = document.getElementById('app-content');
    if (mainContainer) mainContainer.classList.add('is-searching');
    
    listContainer.innerHTML = `<div class="u-flex-center" style="padding:40px"><div class="spin" style="width:24px;height:24px;border:2px solid #FFC107;border-top-color:transparent;border-radius:50%"></div></div>`;
    if (emptyMsgElement) emptyMsgElement.style.display = 'none'; 

    try {
        const { products, totalCount } = await getFilteredProductsPaged({
            searchTerm: currentSearchTerm,
            filterBy: currentFilter,
            itemsPerPage: ITEMS_PER_PAGE,
            pageNumber: currentPage
        });
        
        totalProducts = totalCount;

        if (products.length === 0) {
            listContainer.innerHTML = ''; 
            if (emptyMsgElement) emptyMsgElement.style.display = 'block';
        } else {
            listContainer.innerHTML = '';
            products.forEach(product => {
                listContainer.appendChild(renderProductCard(product));
            });
            if (emptyMsgElement) emptyMsgElement.style.display = 'none';
        }
        
        renderPagination();

    } catch (error) {
        console.error("Error al cargar productos:", error);
        listContainer.innerHTML = `<p class="error-msg">Error: ${error.message}</p>`;
    } finally {
        if (mainContainer) mainContainer.classList.remove('is-searching');
    }
}

function renderProductCard(product) {
    const card = document.createElement('a');
    card.classList.add('product-card');
    card.dataset.id = product.id;
    card.href = `../edit-product/edit-product.html?id=${product.id}`;

    const priceFormatted = `S/ ${product.price.toFixed(2)}`;
    
    let stockClass = 'stock-none';
    let stockText = 'Agotado';
    if (product.is_active) {
        stockClass = 'stock-high';
        stockText = 'Activo';
    }

    const imgHtml = product.image_url 
        ? `<img src="${product.image_url}" alt="${product.name}" class="product-thumb">`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;

    card.innerHTML = `
        <div class="product-card-left">
            <div class="product-icon-box">
                ${imgHtml}
            </div>
            <div class="product-details">
                <h4 class="product-name">${product.name}</h4>
                <div class="product-meta">
                    <span>${product.category || 'Categoría'}</span>
                    <span style="opacity:0.3">•</span>
                    <span>ID: ${product.id}</span>
                </div>
            </div>
        </div>
        <div class="product-card-right">
            <div class="product-price">${priceFormatted}</div>
            <span class="stock-badge ${stockClass}">${stockText}</span>
        </div>
    `;
    return card;
}

/**
 * Renderiza la paginación con estilo actualizado (<< < 1 2 ... 5 > >>)
 */
function renderPagination() {
    const paginationArea = document.getElementById(PAGINATION_CONTAINER_ID);
    if (!paginationArea) return;

    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationArea.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination-wrapper">';

    // Función auxiliar para crear botones
    const createBtn = (page, content, isActive = false, isDisabled = false) => {
        const activeClass = isActive ? 'active' : '';
        const disabledAttr = isDisabled ? 'disabled' : '';
        return `<button class="pagination-btn ${activeClass}" data-page="${page}" ${disabledAttr}>${content}</button>`;
    };

    // Botones Inicio (<<) y Anterior (<)
    // Usamos códigos HTML: &laquo; (<<) y &#8249; (< estilo moderno)
    paginationHTML += createBtn(1, '&laquo;', false, currentPage === 1); 
    paginationHTML += createBtn(currentPage - 1, '&#8249;', false, currentPage === 1);

    // Lógica para mostrar números y elipsis (...)
    const pagesToShow = [];
    
    if (totalPages <= 7) {
        // Si son pocas páginas, mostrar todas
        for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
    } else {
        // Lógica de rango con elipsis
        if (currentPage < 4) {
            // Cerca del inicio: 1 2 3 4 5 ... Last
            pagesToShow.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (currentPage > totalPages - 3) {
            // Cerca del final: 1 ... 6 7 8 9 10
            pagesToShow.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            // En medio: 1 ... 4 5 6 ... 10
            pagesToShow.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
    }

    // Generar botones numéricos
    pagesToShow.forEach(p => {
        if (p === '...') {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        } else {
            paginationHTML += createBtn(p, p, p === currentPage);
        }
    });

    // Botones Siguiente (>) y Final (>>)
    // Usamos códigos HTML: &#8250; (> estilo moderno) y &raquo; (>>)
    paginationHTML += createBtn(currentPage + 1, '&#8250;', false, currentPage === totalPages);
    paginationHTML += createBtn(totalPages, '&raquo;', false, currentPage === totalPages);
    
    paginationHTML += `</div>`; // Cierre wrapper

    // Info de conteo
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalProducts);
    paginationHTML += `<p class="pagination-info">Mostrando ${startItem}-${endItem} de ${totalProducts} productos</p>`;
    
    paginationArea.innerHTML = paginationHTML;
}

initListProductsPage();