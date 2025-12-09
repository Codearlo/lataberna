// src/admin/products/list-products/list-products.js

import { initBottomNav } from '../../modules/bottom-nav/bottom-nav.js';
import { getSession, initAuthForm } from '../../auth/auth.js'; 
import { getFilteredProductsPaged } from './list-products.service.js'; // NUEVO SERVICIO

// --- Configuración de Paginación y Estado ---
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let currentFilter = 'active'; // 'active' | 'all'
let currentSearchTerm = '';
let isSearchActive = false;
let totalProducts = 0;

// **RUTAS DE NAVEGACIÓN**
const PRODUCTS_VIEW_ROUTES = {
    'products': './list-products.html', // A sí misma
    'profile': '../../profile/profile.html' // A la vista de perfil
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
    const session = await getSession();
    const contentContainer = document.getElementById(ADMIN_CONTENT_ID);

    if (!session) {
        // No logueado: Cargar formulario de login y detener
        initAuthForm(ADMIN_CONTENT_ID);
        // Opcional: Redirigir al login
        return;
    }

    // Logueado: Inicializar la vista
    try {
        // 1. Adjuntar listeners
        attachEventListeners();
        
        // 2. Inicializar la navegación inferior
        initBottomNav('products', '../modules/bottom-nav/bottom-nav.html', PRODUCTS_VIEW_ROUTES);
        
        // 3. Cargar datos iniciales (Productos activos en la primera página)
        await loadProducts();
        
    } catch (error) {
        console.error("Error al inicializar la lista de productos:", error);
        contentContainer.innerHTML = `<p class="error-msg">Error al cargar la interfaz de productos.</p>`;
    }
}


function attachEventListeners() {
    // 1. Buscador (Debounce o simplemente en el evento 'input' por simplicidad)
    const searchInput = document.getElementById('product-search-input');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchTerm = searchInput.value.trim();
            currentPage = 1; // Resetear la página al buscar
            loadProducts();
        }, 300); // 300ms de debounce
    });

    // 2. Tabs de Filtrado
    const tabsContainer = document.getElementById('product-view-tabs');
    tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button');
        if (!button) return;

        // Actualizar estado de las tabs
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Actualizar el estado de la vista
        currentFilter = button.dataset.filter;
        currentPage = 1; // Resetear la página al cambiar de filtro
        updateActiveView(currentFilter);
        loadProducts();
    });
    
    // 3. Paginación (Delegación)
    document.getElementById(PAGINATION_CONTAINER_ID).addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || button.disabled) return;
        
        if (button.dataset.page) {
            currentPage = parseInt(button.dataset.page);
            loadProducts();
        }
    });

    // 4. Delegación para el ítem de la lista (Redirigir a Edición)
    const productListViews = document.getElementById('products-list-views');
    productListViews.addEventListener('click', (e) => {
        const listItem = e.target.closest('.product-list-item');
        if (listItem) {
            const productId = listItem.dataset.id;
            window.location.href = `../edit-product/edit-product.html?id=${productId}`;
        }
    });
}

/**
 * Muestra el contenedor de la lista de productos correcto.
 * @param {string} filter - 'active' o 'all'
 */
function updateActiveView(filter) {
    const activeGrid = document.getElementById(ACTIVE_PRODUCTS_GRID_ID);
    const allGrid = document.getElementById(ALL_PRODUCTS_GRID_ID);
    
    activeGrid.classList.remove('active-view');
    allGrid.classList.remove('active-view');

    if (filter === 'active') {
        activeGrid.classList.add('active-view');
    } else {
        allGrid.classList.add('active-view');
    }
}


// --- Lógica de Carga y Renderizado ---

async function loadProducts() {
    const listContainer = document.querySelector(PRODUCTS_LIST_CONTAINER_ID).querySelector(`.products-grid.active-view`);
    const emptyMsgElement = document.getElementById(`${currentFilter}-empty-msg`);
    
    // Indicador de búsqueda/carga
    const panel = document.querySelector('.admin-panel-list.admin-card');
    panel.classList.add('is-searching');
    
    listContainer.innerHTML = '';
    emptyMsgElement.style.display = 'none';

    try {
        // Usar la función de servicio local
        const { products, totalCount } = await getFilteredProductsPaged({
            searchTerm: currentSearchTerm,
            filterBy: currentFilter,
            itemsPerPage: ITEMS_PER_PAGE,
            pageNumber: currentPage
        });
        
        totalProducts = totalCount;

        if (products.length === 0) {
            emptyMsgElement.style.display = 'block';
        } else {
            products.forEach(product => {
                listContainer.appendChild(renderProductListItem(product));
            });
        }
        
        renderPagination();

    } catch (error) {
        console.error("Error al cargar productos:", error);
        listContainer.innerHTML = `<p class="error-msg" style="text-align:center;">Error al cargar la lista de productos: ${error.message}</p>`;
    } finally {
        panel.classList.remove('is-searching');
    }
}


/**
 * Genera el HTML para un ítem de la lista de productos.
 * @param {object} product - Objeto de producto.
 */
function renderProductListItem(product) {
    const item = document.createElement('div');
    item.classList.add('product-list-item');
    item.classList.add(product.is_active ? 'active-item' : 'inactive');
    item.dataset.id = product.id;

    const statusText = product.is_active ? 'Activo' : 'Inactivo';
    const statusClass = product.is_active ? 'active-badge' : 'inactive-badge';
    
    item.innerHTML = `
        <div class="product-image-container">
            <img src="${product.image_url}" alt="${product.name} imagen">
        </div>
        <div class="product-info-minimal">
            <h4 class="product-name-title">${product.name}</h4>
            <p class="product-category">${product.category}</p>
        </div>
        <div class="product-status-price-container">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <p class="product-price-minimal"><span class="price">S/ ${product.price.toFixed(2)}</span></p>
        </div>
    `;

    return item;
}

/**
 * Renderiza los botones de paginación.
 */
function renderPagination() {
    const paginationArea = document.getElementById(PAGINATION_CONTAINER_ID);
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationArea.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination-content">';
    
    // Botón Anterior
    paginationHTML += `<button data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Anterior</button>`;

    // Botones de página (Mostrar hasta 5 páginas centradas)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage - 2 < 1) {
        endPage = Math.min(totalPages, 5);
    }
    if (currentPage + 2 > totalPages) {
        startPage = Math.max(1, totalPages - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHTML += `<button data-page="${i}" class="${activeClass}">${i}</button>`;
    }
    
    // Botón Siguiente
    paginationHTML += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente &raquo;</button>`;
    
    // Información de productos
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalProducts);

    paginationHTML += `</div><p class="pagination-info">Mostrando ${startItem}-${endItem} de ${totalProducts} productos</p>`;
    
    paginationArea.innerHTML = paginationHTML;
}


// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', initListProductsPage);