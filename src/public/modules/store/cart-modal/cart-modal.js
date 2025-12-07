// src/public/modules/store/cart-modal/cart-modal.js

import { CartService } from '../../../../services/store/cart.service.js';

const MODAL_CONTAINER_ID = 'cart-modal-container';
const CART_LIST_ID = 'cart-items-list';
const CART_TOTAL_ID = 'cart-total-amount';

// 1. Inicializa y Renderiza el HTML del modal
export function initCartModal() {
    const container = document.getElementById(MODAL_CONTAINER_ID);
    if (!container) return;

    // Estructura HTML base del modal (usamos un div para el fondo y el modal en sí)
    container.innerHTML = `
        <div class="cart-modal-overlay" onclick="window.closeCartModal()"></div>
        <div class="cart-modal">
            <h3>🛒 Tu Pedido</h3>
            <div id="${CART_LIST_ID}"></div>
            <div class="cart-summary">
                <span>TOTAL:</span>
                <span id="${CART_TOTAL_ID}">S/ 0.00</span>
            </div>
            <button id="checkout-btn" class="checkout-btn">PEDIR POR WHATSAPP</button>
            <button class="close-btn" onclick="window.closeCartModal()">Cerrar</button>
        </div>
    `;

    // 2. Event Listener para el Checkout
    document.getElementById('checkout-btn').addEventListener('click', () => {
        // Llama al servicio para enviar el pedido
        CartService.sendOrderToWhatsapp();
        window.closeCartModal(); // Cierra el modal después de enviar
    });
    
    // 6. ADICIÓN: Hacemos las funciones de control de cantidad globales para que funcionen con onclick
    // Esto es necesario porque el HTML se genera dinámicamente y usa atributos onclick.
    window.changeQuantity = changeQuantity;
    window.removeItem = removeItem;
    window.openCartModal = openCartModal; 
    window.closeCartModal = closeCartModal;
}

// 3. Renderiza el contenido actual del carrito
export function renderCartItems() {
    const cart = CartService.getCart();
    const listElement = document.getElementById(CART_LIST_ID);
    const totalElement = document.getElementById(CART_TOTAL_ID);

    if (!listElement) return;

    if (cart.length === 0) {
        listElement.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío. ¡Es hora de un trago!</p>';
    } else {
        listElement.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <span>${item.name}</span>
                <div class="quantity-controls">
                    <button onclick="window.changeQuantity(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="window.changeQuantity(${item.id}, 1)">+</button>
                </div>
                <span>S/ ${(item.price * item.qty).toFixed(2)}</span>
                <button class="remove-item-btn" onclick="window.removeItem(${item.id})">❌</button>
            </div>
        `).join('');
    }

    // Actualiza el total
    totalElement.textContent = `S/ ${CartService.getCartTotal().toFixed(2)}`;
}

// 4. Funciones de Control del Modal (Exportadas para uso interno y en header.js)

// Función para mostrar el modal (llamada desde header.js y ahora global)
export function openCartModal() {
    renderCartItems(); // Renderiza el contenido ANTES de mostrarlo
    document.getElementById(MODAL_CONTAINER_ID).classList.add('visible');
}

// Función para cerrar el modal (llamada desde el overlay y el botón Cerrar y ahora global)
export function closeCartModal() {
    document.getElementById(MODAL_CONTAINER_ID).classList.remove('visible');
}

// 5. Lógica para cambiar cantidad y eliminar (Ahora llama al CartService)
function changeQuantity(id, change) {
    CartService.updateQuantity(id, change);
    // Nota: renderCartItems() se llama automáticamente desde CartService._saveCart()
}

function removeItem(id) {
    CartService.removeFromCart(id);
    // Nota: renderCartItems() se llama automáticamente desde CartService._saveCart()
}