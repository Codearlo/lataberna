// src/admin/packs/list-packs/list-packs.js

import { initBottomNav } from '../../modules/bottom-nav/bottom-nav.js';
import { getSession } from '../../auth/auth.js'; 
import { getFilteredPacksPaged } from './list-packs.service.js';

// --- Configuración de Paginación y Estado ---
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let currentFilter = 'active'; 
let currentSearchTerm = '';
let totalPacks = 0;

// **RUTAS DE NAVEGACIÓN**
const PACKS_VIEW_ROUTES = {
    'products': '../../products/list-products/list-products.html',
    'packs': './list-packs.html',
    'profile': '../../profile/profile.html'
};

const ADMIN_CONTENT_ID = 'app-content';
const PACKS_LIST_CONTAINER_ID = '#packs-list-views';
const ACTIVE_PACKS_GRID_ID = 'active-packs-list';
const ALL_PACKS_GRID_ID = 'all-packs-list';
const PAGINATION_CONTAINER_ID = 'pagination-container'; 

/**
 * Inicializa la página de gestión de packs.
 */
export async function initListPacksPage() {
    if (window.listPacksInitialized) return;
    window.listPacksInitialized = true;
    
    const session = await getSession();
    const contentContainer = document.getElementById(ADMIN_CONTENT_ID);

    if (!session) {
        window.location.href = '../../auth/auth.html';
        return;
    }

    // Logueado: Inicializar la vista
    try {
        attachEventListeners();
        initBottomNav('packs', '../../modules/bottom-nav/bottom-nav.html', PACKS_VIEW_ROUTES); 
        await loadPacks();
        
    } catch (error) {
        console.error("Error al inicializar la lista de packs:", error);
        if(contentContainer) contentContainer.innerHTML = `<p class="error-msg">Error al cargar la interfaz.</p>`;
    }
}


function attachEventListeners() {
    // Buscador
    const searchInput = document.getElementById('pack-search-input');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = searchInput.value.trim();
                currentPage = 1; 
                loadPacks();
            }, 300);
        });
    }

    // Tabs
    const tabsContainer = document.getElementById('pack-view-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-btn'); 
            if (!button) return;

            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); 
            button.classList.add('active');
            
            currentFilter = button.dataset.filter;
            currentPage = 1;
            updateActiveView(currentFilter);
            loadPacks();
        });
    }
    
    // Paginación
    const paginationContainer = document.getElementById(PAGINATION_CONTAINER_ID);
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button || button.disabled) return;
            
            if (button.dataset.page) {
                currentPage = parseInt(button.dataset.page);
                loadPacks();
            }
        });
    }

    // Click en tarjeta (Editar)
    const packsListViews = document.getElementById('packs-list-views');
    if (packsListViews) {
        packsListViews.addEventListener('click', (e) => {
            const listItem = e.target.closest('.product-card'); 
            if (listItem) {
                const packId = listItem.dataset.id;
                // La edición apunta a la nueva carpeta packs/edit-pack
                window.location.href = `../edit-pack/edit-pack.html?id=${packId}`; 
            }
        });
    }
}

function updateActiveView(filter) {
    const activeGrid = document.getElementById(ACTIVE_PACKS_GRID_ID);
    const allGrid = document.getElementById(ALL_PACKS_GRID_ID);
    
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

async function loadPacks() {
    const activeListId = currentFilter === 'all' ? ALL_PACKS_GRID_ID : ACTIVE_PACKS_GRID_ID;
    const listContainer = document.getElementById(activeListId);
    const emptyMsgElement = document.getElementById(`${currentFilter}-empty-msg`); 
    
    if (!listContainer) return;

    const mainContainer = document.getElementById('app-content');
    if (mainContainer) mainContainer.classList.add('is-searching');
    
    listContainer.innerHTML = `<div class="u-flex-center" style="padding:40px"><div class="spin" style="width:24px;height:24px;border:2px solid #FFC107;border-top-color:transparent;border-radius:50%"></div></div>`;
    if (emptyMsgElement) emptyMsgElement.style.display = 'none'; 

    try {
        const { packs, totalCount } = await getFilteredPacksPaged({
            searchTerm: currentSearchTerm,
            filterBy: currentFilter,
            itemsPerPage: ITEMS_PER_PAGE,
            pageNumber: currentPage
        });
        
        totalPacks = totalCount;

        if (packs.length === 0) {
            listContainer.innerHTML = ''; 
            if (emptyMsgElement) emptyMsgElement.style.display = 'block';
        } else {
            listContainer.innerHTML = '';
            packs.forEach(pack => {
                listContainer.appendChild(renderPackCard(pack));
            });
            if (emptyMsgElement) emptyMsgElement.style.display = 'none';
        }
        
        renderPagination();

    } catch (error) {
        console.error("Error al cargar packs:", error);
        listContainer.innerHTML = `<p class="error-msg">Error: ${error.message}</p>`;
    } finally {
        if (mainContainer) mainContainer.classList.remove('is-searching');
    }
}

function renderPackCard(pack) {
    // Reutilizamos la clase 'product-card'
    const card = document.createElement('a');
    card.classList.add('product-card');
    card.dataset.id = pack.id;
    card.href = `../edit-pack/edit-pack.html?id=${pack.id}`; // Apunta a editar pack

    const priceFormatted = `S/ ${pack.price.toFixed(2)}`;
    
    let stockClass = 'stock-none';
    let stockText = 'Agotado';
    if (pack.is_active) {
        stockClass = 'stock-high';
        stockText = 'Activo';
    }

    const imgHtml = pack.image_url 
        ? `<img src="${pack.image_url}" alt="${pack.name}" class="product-thumb">`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;

    card.innerHTML = `
        <div class="product-card-left">
            <div class="product-icon-box" style="background: rgba(13, 110, 253, 0.1); color: #0d6efd;"> 
                ${imgHtml}
            </div>
            <div class="product-details">
                <h4 class="product-name">${pack.name}</h4>
                <div class="product-meta">
                    <span>PACK • ${pack.category || 'Categoría'}</span>
                    <span style="opacity:0.3">•</span>
                    <span>ID: ${pack.id}</span>
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

function renderPagination() {
    const paginationArea = document.getElementById(PAGINATION_CONTAINER_ID);
    if (!paginationArea) return;

    const totalPages = Math.ceil(totalPacks / ITEMS_PER_PAGE); // Usamos totalPacks
    
    if (totalPages <= 1) {
        paginationArea.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination-content">';
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `<button data-page="${currentPage - 1}" ${prevDisabled}>&laquo; Anterior</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage - 2 < 1) endPage = Math.min(totalPages, 5);
    if (currentPage + 2 > totalPages) startPage = Math.max(1, totalPages - 4);
    startPage = Math.max(1, startPage);
    endPage = Math.min(totalPages, endPage);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHTML += `<button data-page="${i}" class="${activeClass}">${i}</button>`;
    }
    
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `<button data-page="${currentPage + 1}" ${nextDisabled}>Siguiente &raquo;</button>`;
    
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalPacks);
    paginationHTML += `</div><p class="pagination-info">Mostrando ${startItem}-${endItem} de ${totalPacks} packs</p>`;
    paginationArea.innerHTML = paginationHTML;
}

initListPacksPage();