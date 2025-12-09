// src/admin/products/list-products/list-products.js

import { initBottomNav } from '../../modules/bottom-nav/bottom-nav.js';
import { getSession, initAuthForm } from '../../auth/auth.js'; 
import { getFilteredProductsPaged } from './list-products.service.js'; // SERVICIO EXISTENTE

// --- Configuración de Paginación y Estado ---
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
// Mantenemos solo los filtros soportados por el servicio
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
        initBottomNav('products', '../../modules/bottom-nav/bottom-nav.html', PRODUCTS_VIEW_ROUTES); 
        
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
        const button = e.target.closest('.tab-btn'); 
        if (!button) return;

        // Actualizar estado de las tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); 
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
        const listItem = e.target.closest('.product-card'); 
        if (listItem) {
            const productId = listItem.dataset.id;
            // Redirigir a la vista de edición existente
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

    if (filter === 'all') {
        allGrid.classList.add('active-view');
    } else {
        activeGrid.classList.add('active-view');
    }
    
    // FIX SINTAXIS: Reemplazar el optional chaining con verificación 'if'
    const activeMsg = document.getElementById(`active-empty-msg`);
    if (activeMsg) activeMsg.style.display = 'none';
    const allMsg = document.getElementById(`all-empty-msg`);
    if (allMsg) allMsg.style.display = 'none';
}


// --- Lógica de Carga y Renderizado ---

async function loadProducts() {
    // Selecciona el contenedor de la lista de productos activo
    const activeListId = currentFilter === 'all' ? ALL_PRODUCTS_GRID_ID : ACTIVE_PRODUCTS_GRID_ID;
    const listContainer = document.getElementById(activeListId);
    // Obtiene el elemento de mensaje vacío.
    const emptyMsgElement = document.getElementById(`${currentFilter}-empty-msg`); 
    
    if (!listContainer) return; // Salir si el contenedor no existe

    // Indicador de búsqueda/carga
    const mainContainer = document.getElementById('app-content');
    mainContainer.classList.add('is-searching');
    
    // Mostrar spinner de carga de la muestra del usuario
    listContainer.innerHTML = `<div class="u-flex-center" style="padding:40px"><div class="spin" style="width:24px;height:24px;border:2px solid #FFC107;border-top-color:transparent;border-radius:50%"></div></div>`;
    
    // Mantenemos la verificación 'if' para asegurar compatibilidad
    if (emptyMsgElement) emptyMsgElement.style.display = 'none'; 

    try {
        // Usamos currentFilter directamente ('active' o 'all')
        const { products, totalCount } = await getFilteredProductsPaged({
            searchTerm: currentSearchTerm,
            filterBy: currentFilter,
            itemsPerPage: ITEMS_PER_PAGE,
            pageNumber: currentPage
        });
        
        totalProducts = totalCount;

        if (products.length === 0) {
            // Mostrar mensaje de lista vacía
            listContainer.innerHTML = ''; 
            if (emptyMsgElement) {
                emptyMsgElement.style.display = 'block';
            }
        } else {
            // Renderizar productos
            listContainer.innerHTML = '';
            products.forEach(product => {
                listContainer.appendChild(renderProductCard(product));
            });
            if (emptyMsgElement) emptyMsgElement.style.display = 'none';
        }
        
        renderPagination();

    } catch (error) {
        console.error("Error al cargar productos:", error);
        listContainer.innerHTML = `<p class="error-msg" style="text-align:center;">Error al cargar la lista de productos: ${error.message}</p>`;
    } finally {
        mainContainer.classList.remove('is-searching');
    }
}


/**
 * Genera el HTML para la nueva tarjeta de producto.
 * @param {object} product - Objeto de producto (del servicio existente).
 */
function renderProductCard(product) {
    const card = document.createElement('a');
    card.classList.add('product-card');
    card.dataset.id = product.id;
    card.href = `../edit-product/edit-product.html?id=${product.id}`;

    const priceFormatted = `S/ ${product.price.toFixed(2)}`;
    
    // Adaptación del Badge: Usamos is_active
    let stockClass = 'stock-none';
    let stockText = 'Agotado';
    if (product.is_active) {
        stockClass = 'stock-high';
        stockText = 'Activo';
    }

    // La imagen es la URL del producto
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
    
    // Corrección de sintaxis: Usamos una variable separada para el atributo disabled
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `<button data-page="${currentPage - 1}" ${prevDisabled}>&laquo; Anterior</button>`;

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
    
    // Corrección de sintaxis: Usamos una variable separada para el atributo disabled
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `<button data-page="${currentPage + 1}" ${nextDisabled}>Siguiente &raquo;</button>`;
    
    // Información de productos
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalProducts);

    paginationHTML += `</div><p class="pagination-info">Mostrando ${startItem}-${endItem} de ${totalProducts} productos</p>`;
    
    paginationArea.innerHTML = paginationHTML;
}


// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', initListProductsPage);