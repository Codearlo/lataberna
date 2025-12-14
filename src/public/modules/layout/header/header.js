// src/public/modules/layout/header/header.js

import { CartService } from '../../../../services/store/cart.service.js';
import { openCartModal } from '../../store/cart-modal/cart-modal.js'; 
import { getMenuCategories, getActiveProducts } from '../../../../services/store/products.service.js';

const CART_COUNT_ID = 'cart-count-value';
const HEADER_HTML_PATH = 'src/public/modules/layout/header/header.html'; 

// Cachés para el buscador
let searchProductsCache = [];
let searchCategoriesCache = [];

export async function initHeader(containerId) {
    const headerElement = document.getElementById(containerId);
    if (!headerElement) return;

    try {
        const response = await fetch(HEADER_HTML_PATH);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        headerElement.innerHTML = await response.text();

        // 1. Cargar TODOS los datos necesarios (Categorías y Productos)
        await loadSearchData();

        // 2. Renderizar Sidebar Inicial
        renderSidebarMenu(searchCategoriesCache);

        // 3. Eventos UI
        headerElement.querySelector('.cart-icon-container').addEventListener('click', openCartModal);
        updateCartCount();
        setupSidebarLogic();
        
        // 4. Lógica de Búsqueda Inteligente (Categorías + Productos)
        setupLiveSearch();

    } catch (error) {
        console.error("Error init header:", error);
    }
}

async function loadSearchData() {
    try {
        const [categories, products] = await Promise.all([
            getMenuCategories(),
            getActiveProducts()
        ]);
        searchCategoriesCache = categories;
        searchProductsCache = products;
    } catch (e) {
        console.error("Error loading search data:", e);
    }
}

function renderSidebarMenu(categories) {
    const navList = document.getElementById('header-nav-list');
    if (!navList) return;
    
    navList.innerHTML = `<li><a href="#" class="nav-link" data-category="all">Ver Todo</a></li>`;

    categories.forEach(cat => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = "#"; 
        a.textContent = cat.nombre.toLowerCase(); 
        a.dataset.categoryId = cat.id;
        
        a.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSidebar(false);
            window.dispatchEvent(new CustomEvent('category-selected', { detail: { categoryId: cat.id } }));
        });
        
        li.appendChild(a);
        navList.appendChild(li);
    });

    navList.querySelector('[data-category="all"]').addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar(false);
        window.dispatchEvent(new CustomEvent('category-selected', { detail: { categoryId: 'all' } }));
    });
}

function setupSidebarLogic() {
    const toggleBtn = document.getElementById('menu-toggle-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn) toggleBtn.addEventListener('click', () => toggleSidebar(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
    if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));
}

function toggleSidebar(open) {
    const sidebar = document.getElementById('header-nav-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (open) {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
    } else {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
    }
}

/* --- LÓGICA DE BÚSQUEDA AVANZADA --- */
function setupLiveSearch() {
    const searchInput = document.getElementById('global-search-input');
    const dropdown = document.getElementById('search-results-dropdown');
    
    if (!searchInput || !dropdown) return;

    const closeDropdown = () => {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
        searchInput.classList.remove('has-results');
    };

    // Al seleccionar algo de la lista o dar Enter
    const performSearch = (type, value) => {
        closeDropdown();
        searchInput.value = ''; // Limpiamos para dar sensación de navegación
        searchInput.blur();

        if (type === 'category') {
            // Si eligió una categoría, filtramos por ID
            window.dispatchEvent(new CustomEvent('category-selected', { 
                detail: { categoryId: value } 
            }));
        } else {
            // Si eligió producto o texto libre, filtramos por texto
            searchInput.value = value; // Ponemos el nombre para que sepa qué buscó
            window.dispatchEvent(new CustomEvent('search-query', { 
                detail: { term: value } 
            }));
        }
    };

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        
        if (term.length < 1) {
            closeDropdown();
            window.dispatchEvent(new CustomEvent('search-query', { detail: { term: '' } }));
            return;
        }

        // 1. Filtrar Categorías
        const matchedCategories = searchCategoriesCache.filter(c => 
            c.nombre.toLowerCase().includes(term)
        );

        // 2. Filtrar Productos
        const matchedProducts = searchProductsCache.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.category && p.category.toLowerCase().includes(term))
        ); 
        // .slice(0, 6);  <-- LÍMITE ELIMINADO: Muestra todos los resultados encontrados

        if (matchedCategories.length > 0 || matchedProducts.length > 0) {
            renderDropdownResults(matchedCategories, matchedProducts, dropdown, performSearch);
            dropdown.classList.add('visible');
            searchInput.classList.add('has-results');
        } else {
            closeDropdown();
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch('text', searchInput.value.trim());
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    searchInput.addEventListener('focus', () => {
        if(searchInput.value.trim().length > 0) searchInput.dispatchEvent(new Event('input'));
    });
}

function renderDropdownResults(categories, products, container, onSelect) {
    container.innerHTML = '';

    // --- SECCIÓN 1: CATEGORÍAS ---
    if (categories.length > 0) {
        const catTitle = document.createElement('li');
        catTitle.className = 'search-section-title';
        catTitle.textContent = 'Categorías';
        container.appendChild(catTitle);

        categories.forEach(cat => {
            const li = document.createElement('li');
            li.className = 'search-item';
            li.innerHTML = `
                <div class="search-cat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <div class="search-item-info">
                    <span class="search-item-name">${cat.nombre}</span>
                </div>
            `;
            li.addEventListener('click', () => onSelect('category', cat.id));
            container.appendChild(li);
        });
    }

    // --- SECCIÓN 2: PRODUCTOS ---
    if (products.length > 0) {
        const prodTitle = document.createElement('li');
        prodTitle.className = 'search-section-title';
        prodTitle.textContent = 'Productos';
        container.appendChild(prodTitle);

        products.forEach(prod => {
            const li = document.createElement('li');
            li.className = 'search-item';
            
            const imgHtml = prod.image_url 
                ? `<img src="${prod.image_url}" class="search-item-img" alt="${prod.name}">`
                : `<div class="search-item-img" style="display:flex;align-items:center;justify-content:center;color:#ccc">🍺</div>`;

            li.innerHTML = `
                ${imgHtml}
                <div class="search-item-info">
                    <span class="search-item-name">${prod.name}</span>
                    <span class="search-item-price">S/ ${prod.price.toFixed(2)}</span>
                </div>
            `;
            li.addEventListener('click', () => onSelect('product', prod.name));
            container.appendChild(li);
        });
    }
}

export function updateCartCount() {
    const cart = CartService.getCart();
    const totalItems = cart.reduce((total, item) => total + item.qty, 0); 
    const countElement = document.getElementById(CART_COUNT_ID);
    
    if (countElement) {
        countElement.textContent = totalItems > 0 ? totalItems : 0;
        countElement.style.display = totalItems > 0 ? 'flex' : 'none'; 
    }
}