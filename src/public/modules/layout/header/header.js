// src/public/modules/layout/header/header.js

import { CartService } from '../../../../services/store/cart.service.js';
import { openCartModal } from '../../store/cart-modal/cart-modal.js'; 
import { getMenuCategories } from '../../../../services/store/products.service.js';

const CART_COUNT_ID = 'cart-count-value';
const HEADER_HTML_PATH = 'src/public/modules/layout/header/header.html'; 

export async function initHeader(containerId) {
    const headerElement = document.getElementById(containerId);
    if (!headerElement) return;

    try {
        // 1. Cargar HTML
        const response = await fetch(HEADER_HTML_PATH);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        headerElement.innerHTML = await response.text();

        // 2. Renderizar Categorías en el Menú Lateral
        await renderSidebarMenu();

        // 3. Lógica del Carrito
        headerElement.querySelector('.cart-icon-container').addEventListener('click', openCartModal);
        updateCartCount();

        // 4. Lógica del Menú Hamburguesa (Sidebar)
        setupSidebarLogic();

        // 5. Lógica de Búsqueda (Dispara evento para el grid)
        setupSearchLogic();

    } catch (error) {
        console.error("Error init header:", error);
    }
}

async function renderSidebarMenu() {
    const navList = document.getElementById('header-nav-list');
    if (!navList) return;

    try {
        const categories = await getMenuCategories();
        
        // Limpiamos la lista (dejando el "Ver Todo" si se desea o recreándolo)
        navList.innerHTML = `<li><a href="#" class="nav-link" data-category="all">Ver Todo</a></li>`;

        categories.forEach(cat => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = "#"; 
            a.textContent = cat.nombre; 
            a.dataset.categoryId = cat.id;
            
            // Al hacer clic en una categoría del menú lateral
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // Cerrar sidebar
                toggleSidebar(false);
                // Disparar evento para filtrar grid
                window.dispatchEvent(new CustomEvent('category-selected', { 
                    detail: { categoryId: cat.id } 
                }));
            });
            
            li.appendChild(a);
            navList.appendChild(li);
        });

        // Listener para "Ver Todo"
        navList.querySelector('[data-category="all"]').addEventListener('click', (e) => {
            e.preventDefault();
            toggleSidebar(false);
            window.dispatchEvent(new CustomEvent('category-selected', { detail: { categoryId: 'all' } }));
        });

    } catch (e) { console.error(e); }
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

function setupSearchLogic() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;

    let timeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const term = e.target.value.trim();
            // Disparamos evento global 'search-query'
            window.dispatchEvent(new CustomEvent('search-query', { 
                detail: { term: term } 
            }));
        }, 300); // Pequeño delay para no saturar
    });
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