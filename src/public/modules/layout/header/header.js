// src/public/modules/layout/header/header.js

import { CartService } from '../../../../services/store/cart.service.js';
// La importación relativa del módulo JS es correcta.
import { openCartModal } from '../../store/cart-modal/cart-modal.js'; 

const CART_COUNT_ID = 'cart-count-value';
// Ruta corregida para el fetch
const HEADER_HTML_PATH = 'src/public/modules/layout/header/header.html'; 

/**
 * Inyecta el HTML del encabezado (cargado de forma asíncrona) y establece los listeners iniciales.
 * @param {string} containerId - El ID del header en index.html ('main-header').
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

        // 3. Adjuntar evento: Abrir el carrito al hacer clic
        headerElement.querySelector('.cart-icon-container').addEventListener('click', openCartModal);

        // 4. Carga inicial del conteo al iniciar la página
        updateCartCount();

    } catch (error) {
        console.error("Error al cargar o inicializar el encabezado:", error);
        // Mensaje de fallback en caso de error de carga
        headerElement.innerHTML = `
            <div id="main-header" style="background-color: #000; padding: 15px 20px;">
                <p style="color:#ff0000; font-weight: bold;">Error al cargar el menú: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Actualiza el número de ítems mostrados en el ícono del carrito.
 */
export function updateCartCount() {
    const cart = CartService.getCart();
    // Suma la cantidad (qty) de todos los ítems
    const totalItems = cart.reduce((total, item) => total + item.qty, 0); 
    const countElement = document.getElementById(CART_COUNT_ID);
    
    if (countElement) {
        countElement.textContent = totalItems > 0 ? totalItems : 0;
        // Muestra el contador solo si hay ítems en el carrito
        countElement.style.display = totalItems > 0 ? 'flex' : 'none'; 
    }
}