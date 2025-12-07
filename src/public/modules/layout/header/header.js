// src/public/modules/layout/header/header.js

import { CartService } from '../../../../services/store/cart.service.js';

const CART_COUNT_ID = 'cart-count-value';
const CART_CONTAINER_ID = 'cart-modal-container'; // ID del contenedor del modal

/**
 * Inyecta el HTML del encabezado y establece los listeners iniciales.
 * @param {string} containerId - El ID del header en index.html ('main-header').
 */
export function initHeader(containerId) {
    const headerElement = document.getElementById(containerId);
    if (!headerElement) return;

    headerElement.innerHTML = `
        <div class="logo">La Taberna - Delivery Ica</div>
        <div class="cart-icon-container">
            <span id="${CART_COUNT_ID}" class="cart-count">0</span>
            <i class="cart-icon">🛒</i> 
        </div>
    `;

    // Adjuntar evento: Abrir el carrito al hacer clic
    headerElement.querySelector('.cart-icon-container').addEventListener('click', openCartModal);

    // Carga inicial del conteo al iniciar la página
    updateCartCount();
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

/**
 * Función para mostrar el modal del carrito (lógica pendiente del modal).
 */
function openCartModal() {
    // Usaremos CSS/clases para mostrar/ocultar el modal.
    // Necesitas crear la función showCartModal en el futuro componente CartModal.
    const modal = document.getElementById(CART_CONTAINER_ID);
    if (modal) {
        modal.classList.add('visible'); // Asume que 'visible' en tu CSS lo muestra
        // Ejemplo: alert('Mostrar modal');
    }
}