// src/admin/list-products/list-products.js

import { ProductsAdminService } from '../products.service.js';

// Variables de estado (DEBEN MANTENERSE AQUÍ)
let productsList = [];
let categoriesList = []; 
let currentFilter = 'active'; 

// Variables de estado para la paginación
let currentPage = 1;
const PRODUCTS_PER_PAGE = 10;
let totalProductsCount = 0;
let currentSearchTerm = ''; // Estado para mantener el término de búsqueda

const LIST_HTML_PATH = './list-products/list-products.html'; 
let searchTimeout = null; 
const DEBOUNCE_DELAY = 50; 

/**
 * Inicializa la vista de listado de productos.
 */
export async function initListProducts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        // 1. Cargar datos estáticos
        await loadCategories();
        
        // 2. Adjuntar listeners
        attachEventListeners(); 
        
        // 3. Carga Inicial de Productos
        await loadProducts(); 
        
    } catch (error) {
        console.error("Error al inicializar el panel de listado de productos:", error);
        container.innerHTML = `<p class="error-msg">Error al cargar la interfaz de listado. Revise la consola para detalles.</p>`;
    }
}

function attachEventListeners() {
    // Evento de búsqueda dinámica (DEBOUNCE)
    document.getElementById('product-search-input').addEventListener('input', (e) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            handleDynamicSearch();
        }, DEBOUNCE_DELAY);
        
        // APLICAMOS CLASE DE CARGA INMEDIATAMENTE para feedback visual
        const listCard = document.querySelector('.admin-panel-list.admin-card');
        if (listCard) {
            listCard.classList.add('is-searching');
        }
    });

    // Delegación de eventos para las listas de tarjetas (AHORA NAVEGA A LA PÁGINA DE EDICIÓN)
    document.getElementById('products-list-views').addEventListener('click', handleListActions);
    
    // Evento para el cambio de pestañas
    document.getElementById('product-view-tabs').addEventListener('click', handleTabSwitch);
    
    // DELEGACIÓN DE EVENTOS PARA PAGINACIÓN
    document.getElementById('pagination-container').addEventListener('click', handlePaginationClick);
}

/**
 * Dispara la búsqueda dinámica (al escribir, con debounce).
 */
function handleDynamicSearch() {
    const searchTerm = document.getElementById('product-search-input').value.trim();
    
    if (searchTerm === currentSearchTerm) {
        const listCard = document.querySelector('.admin-panel-list.admin-card');
        if (listCard) {
            listCard.classList.remove('is-searching');
        }
        return;
    }
    
    currentSearchTerm = searchTerm;
    currentPage = 1; 
    loadProducts();
}

/**
 * Maneja el clic en los botones de paginación.
 */
function handlePaginationClick(e) {
    const target = e.target;
    let newPage = currentPage;

    if (target.id === 'prev-page-btn') {
        newPage = Math.max(1, currentPage - 1);
    } else if (target.id === 'next-page-btn') {
        const totalPages = Math.ceil(totalProductsCount / PRODUCTS_PER_PAGE);
        newPage = Math.min(totalPages, currentPage + 1);
    } else if (target.dataset.page) {
        newPage = parseInt(target.dataset.page);
    }

    if (newPage !== currentPage) {
        currentPage = newPage;
        const listCard = document.querySelector('.admin-panel-list.admin-card');
        if (listCard) {
            listCard.classList.add('is-searching');
        }
        loadProducts(); 
    }
}


/**
 * Maneja el clic en las pestañas (Tabs) de la lista de productos.
 */
function handleTabSwitch(e) {
    const target = e.target;
    if (!target.classList.contains('tab-button')) return;

    const newFilter = target.dataset.filter;
    
    // 1. Actualizar el estado del botón activo
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    
    if (newFilter !== currentFilter) {
        currentFilter = newFilter;
        
        // 2. Ocultar todos los contenedores de vista y mostrar el nuevo
        document.querySelectorAll('.products-grid').forEach(view => view.classList.remove('active-view'));
        
        // Mostrar el contenedor de la vista activa (active o all)
        const viewContainerId = `${newFilter}-products-list`;
        document.getElementById(viewContainerId).classList.add('active-view');

        // 3. Simplemente manejamos la visibilidad de los mensajes de vacío
        renderProductsTable(); 
    }
}

/**
 * Maneja el clic en una tarjeta de producto para abrir la página de edición.
 */
function handleListActions(e) {
    const target = e.target;
    const card = target.closest('.product-list-item');
    if (!card) return;
    
    const productId = card.dataset.id;
    
    // NAVEGACIÓN A PÁGINA DE EDICIÓN
    window.location.href = `?view=products&action=edit&id=${productId}`;
}

// --- Lógica de la Lista y Paginación (Cargada desde el servicio) ---

/**
 * Carga los productos filtrados y paginados desde la base de datos.
 */
async function loadProducts() {
    const activeViewContainer = document.getElementById('active-products-list');
    const allViewContainer = document.getElementById('all-products-list');
    const paginationContainer = document.getElementById('pagination-container');
    const listCard = document.querySelector('.admin-panel-list.admin-card'); 

    try {
        const result = await ProductsAdminService.getFilteredProductsPaged({
            searchTerm: currentSearchTerm,
            itemsPerPage: PRODUCTS_PER_PAGE,
            pageNumber: currentPage
        });
        
        productsList.splice(0, productsList.length, ...result.products); 
        totalProductsCount = result.totalCount;
        
        createAndHydrateLists(); 
        renderPagination();
        renderProductsTable(); 

    } catch (error) {
        console.error("Error al cargar productos:", error);
        
        const errorHtml = '<p class="error-msg" style="text-align:center;">Error al cargar los productos. Revise la consola.</p>';
        activeViewContainer.innerHTML = errorHtml;
        allViewContainer.innerHTML = errorHtml;
        paginationContainer.innerHTML = '';

    } finally {
        if (listCard) {
            listCard.classList.remove('is-searching');
        }
    }
}

async function loadCategories() {
    try {
        const newCategories = await ProductsAdminService.getCategories();
        categoriesList.splice(0, categoriesList.length, ...newCategories); // Actualiza categoriesList
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

/**
 * Crea las tarjetas DOM para los productos de la página actual.
 * Utiliza DocumentFragment para evitar el "flicker".
 */
function createAndHydrateLists() {
    const activeListView = document.getElementById('active-products-list');
    const allListView = document.getElementById('all-products-list');
    
    const activeFragment = document.createDocumentFragment();
    const allFragment = document.createDocumentFragment();

    productsList.forEach(product => {
        const card = createProductCard(product); 
        
        allFragment.appendChild(card); 
        
        if (product.is_active) {
            activeFragment.appendChild(card.cloneNode(true));
        }
    });

    activeListView.innerHTML = '';
    activeListView.appendChild(activeFragment);
    
    allListView.innerHTML = '';
    allListView.appendChild(allFragment);
}

/**
 * Renderiza la interfaz de paginación.
 */
function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    const totalPages = Math.ceil(totalProductsCount / PRODUCTS_PER_PAGE);
    
    paginationContainer.innerHTML = ''; 

    if (totalProductsCount === 0 || totalPages === 1) {
        return;
    }
    
    const paginationContent = document.createElement('div');
    paginationContent.classList.add('pagination-content');
    
    const prevBtn = `<button id="prev-page-btn" class="secondary-btn" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
    const nextBtn = `<button id="next-page-btn" class="secondary-btn" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
    
    let pageNumbers = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, currentPage + Math.floor(maxButtons / 2));

    if (endPage - startPage + 1 < maxButtons) {
        if (currentPage <= Math.floor(maxButtons / 2)) {
            endPage = Math.min(totalPages, maxButtons);
        } else if (currentPage > totalPages - Math.floor(maxButtons / 2)) {
            startPage = Math.max(1, totalPages - maxButtons + 1);
        }
    }


    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        pageNumbers += `<button class="page-number-btn ${isActive}" data-page="${i}">${i}</button>`;
    }

    paginationContent.innerHTML = `
        ${prevBtn}
        ${pageNumbers}
        ${nextBtn}
        <span class="pagination-info">Página ${currentPage} de ${totalPages} (${totalProductsCount} productos)</span>
    `;

    paginationContainer.appendChild(paginationContent);
}

function renderProductsTable() {
    const activeViewContainerId = currentFilter === 'active' ? 'active-products-list' : 'all-products-list';
    const activeViewContainer = document.getElementById(activeViewContainerId);
    
    const matchesFound = activeViewContainer.children.length;

    const emptyMsgId = currentFilter === 'active' ? 'active-empty-msg' : 'all-empty-msg';
    const otherEmptyMsgId = currentFilter === 'active' ? 'all-empty-msg' : 'active-empty-msg';
    
    document.getElementById(emptyMsgId).style.display = (matchesFound === 0) ? 'block' : 'none';
    document.getElementById(otherEmptyMsgId).style.display = 'none'; 
}


function createProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-list-item'); 
    if (!product.is_active) {
        card.classList.add('inactive');
    }
    card.dataset.id = product.id; 
    
    const imageUrl = product.image_url || 'https://via.placeholder.com/60x60?text=No+Img';
    const categoryName = product.category_name || 'Sin Categoría';
    const isActive = product.is_active;

    card.innerHTML = `
        <div class="product-image-container">
            <img src="${imageUrl}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info-minimal">
            <h5 class="product-name-title">${product.name}</h5>
            <p class="product-id">ID: ${product.id}</p>
            <p class="product-category">Categoría: ${categoryName}</p>
        </div>
        <div class="product-status-price-container">
             <span class="status-badge ${isActive ? 'active-badge' : 'inactive-badge'}">
                ${isActive ? 'ACTIVO' : 'INACTIVO'}
            </span>
            <div class="product-price-minimal">
                <span class="price">S/ ${product.price.toFixed(2)}</span>
            </div>
        </div>
    `;

    return card;
}