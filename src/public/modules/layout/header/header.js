// src/public/modules/layout/header/header.js

import { CartService } from '../../../../services/store/cart.service.js';
import { openCartModal } from '../../store/cart-modal/cart-modal.js'; 
// Importamos la nueva función del servicio
import { getMenuCategories } from '../../../../services/store/products.service.js';

const CART_COUNT_ID = 'cart-count-value';
const HEADER_HTML_PATH = 'src/public/modules/layout/header/header.html'; 

/**
 * Inyecta el HTML del encabezado y establece los listeners iniciales.
 */
export async function initHeader(containerId) {
    const headerElement = document.getElementById(containerId);
    if (!headerElement) return;

    try {
        // 1. Cargar el HTML de forma asíncrona
        const response = await fetch(HEADER_HTML_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const headerHtml = await response.text();
        
        // 2. Inyectar el HTML cargado
        headerElement.innerHTML = headerHtml;

        // 3. Renderizar las categorías dinámicas (NUEVO)
        await renderDynamicMenu();

        // 4. Adjuntar evento: Abrir el carrito al hacer clic
        headerElement.querySelector('.cart-icon-container').addEventListener('click', openCartModal);

        // 5. Lógica del Menú de Hamburguesa
        const menuButton = headerElement.querySelector('.menu-toggle-btn');
        const headerNav = headerElement.querySelector('.header-nav');

        if (menuButton && headerNav) {
            menuButton.addEventListener('click', () => {
                headerNav.classList.toggle('is-open'); 
            });
        }
        
        // 6. Carga inicial del conteo al iniciar la página
        updateCartCount();

    } catch (error) {
        console.error("Error al cargar o inicializar el encabezado:", error);
        headerElement.innerHTML = `
            <div id="main-header" style="background-color: #000; padding: 15px 20px;">
                <p style="color:#ff0000; font-weight: bold;">Error: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Obtiene las categorías de la BD y las añade al menú.
 */
async function renderDynamicMenu() {
    const navList = document.getElementById('header-nav-list');
    if (!navList) return;

    const categories = await getMenuCategories();

    if (categories && categories.length > 0) {
        categories.forEach(cat => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            a.href = "#"; 
            a.textContent = cat.nombre.toUpperCase(); // Convertimos a mayúsculas para mantener el estilo
            a.dataset.categoryId = cat.id; // Guardamos el ID por si queremos filtrar luego
            
            // Opcional: Aquí podrías agregar un evento 'click' para filtrar productos
            
            li.appendChild(a);
            navList.appendChild(li);
        });
    }
}

/**
 * Actualiza el número de ítems mostrados en el ícono del carrito.
 */
export function updateCartCount() {
    const cart = CartService.getCart();
    const totalItems = cart.reduce((total, item) => total + item.qty, 0); 
    const countElement = document.getElementById(CART_COUNT_ID);
    
    if (countElement) {
        countElement.textContent = totalItems > 0 ? totalItems : 0;
        countElement.style.display = totalItems > 0 ? 'flex' : 'none'; 
    }
}