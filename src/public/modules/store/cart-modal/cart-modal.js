// src/public/modules/store/cart-modal/cart-modal.js

import { CartService } from '../../../../services/store/cart.service.js';
import { showToast } from '../toast-notification/toast.js';

const MODAL_CONTAINER_ID = 'cart-modal-container';
const CART_LIST_ID = 'cart-items-list';
const CART_TOTAL_ID = 'cart-total-amount';

export function initCartModal() {
    const container = document.getElementById(MODAL_CONTAINER_ID);
    if (!container) return;

    // Estructura HTML actualizada para el flujo de 2 pasos
    container.innerHTML = `
        <div class="cart-modal-overlay" onclick="window.closeCartModal()"></div>
        <div class="cart-modal">
            
            <div id="cart-main-view">
                <h3>🛒 Tu Pedido</h3>
                
                <div id="${CART_LIST_ID}"></div>
                
                <div class="cart-summary">
                    <span>TOTAL:</span>
                    <span id="${CART_TOTAL_ID}">S/ 0.00</span>
                </div>

                <div class="payment-section" id="payment-section" style="display:none;">
                    <span class="payment-title">Elige tu método de pago:</span>
                    <div class="payment-options">
                        <label class="payment-label">
                            <input type="radio" name="payment_method" value="Yape/Plin">
                            📱 Yape / Plin
                        </label>
                        <label class="payment-label">
                            <input type="radio" name="payment_method" value="Efectivo">
                            💵 Efectivo
                        </label>
                    </div>
                    <span class="payment-disclaimer">ℹ️ No te preocupes, el pago se realiza al recibir o coordinar por WhatsApp.</span>
                </div>

                <button id="btn-continue-checkout" class="checkout-btn btn-continue">
                    CONTINUAR 👉
                </button>
                
                <button class="close-btn" onclick="window.closeCartModal()">Cerrar</button>
            </div>

            <div id="location-reminder-view" style="display:none;">
                <span class="reminder-icon">📍</span>
                <p class="reminder-text">
                    ¡Casi listo!<br>
                    Por favor, comparte tu <span class="reminder-highlight">"Ubicación Actual"</span> en el chat de WhatsApp después de enviar el mensaje para que el delivery llegue rápido.
                </p>
                
                <button id="btn-confirm-whatsapp" class="checkout-btn btn-whatsapp">
                    ENVIAR PEDIDO AHORA 🚀
                </button>
                
                <button class="close-btn" onclick="window.returnToCart()">Volver atrás</button>
            </div>

        </div>
    `;

    // Listeners para los botones
    document.getElementById('btn-continue-checkout').addEventListener('click', handleContinueToReminder);
    document.getElementById('btn-confirm-whatsapp').addEventListener('click', handleFinalWhatsappRedirect);
    
    // Funciones globales
    window.changeQuantity = changeQuantity;
    window.removeItem = removeItem;
    window.openCartModal = openCartModal; 
    window.closeCartModal = closeCartModal;
    window.returnToCart = returnToCart;
}

/**
 * PASO 1: Valida el carrito y el pago, luego muestra el recordatorio.
 */
function handleContinueToReminder() {
    const cart = CartService.getCart();
    if (cart.length === 0) {
        showToast("⚠️ Tu carrito está vacío.");
        return;
    }

    const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
    
    if (!selectedPayment) {
        showToast("⚠️ Por favor selecciona un método de pago.");
        const section = document.getElementById('payment-section');
        section.classList.add('shake-animation');
        setTimeout(() => section.classList.remove('shake-animation'), 500);
        return;
    }

    // Cambiar a la vista de recordatorio
    document.getElementById('cart-main-view').style.display = 'none';
    document.getElementById('location-reminder-view').style.display = 'block';
}

/**
 * PASO 2: Abre WhatsApp directamente al hacer clic (funciona en Safari).
 */
function handleFinalWhatsappRedirect() {
    const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
    // Recuperamos el valor, si por alguna razón se perdió, usamos 'Efectivo' por defecto
    const paymentMethod = selectedPayment ? selectedPayment.value : 'Efectivo';

    CartService.sendOrderToWhatsapp(paymentMethod);
    window.closeCartModal();
}

/**
 * Permite volver a la vista del carrito desde el recordatorio.
 */
function returnToCart() {
    document.getElementById('location-reminder-view').style.display = 'none';
    document.getElementById('cart-main-view').style.display = 'block';
}

export function renderCartItems() {
    const cart = CartService.getCart();
    const listElement = document.getElementById(CART_LIST_ID);
    const totalElement = document.getElementById(CART_TOTAL_ID);
    const paymentSection = document.getElementById('payment-section');
    const continueBtn = document.getElementById('btn-continue-checkout');

    if (!listElement) return;

    if (cart.length === 0) {
        listElement.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío. ¡Es hora de un trago!</p>';
        if (paymentSection) paymentSection.style.display = 'none';
        if (continueBtn) continueBtn.disabled = true;
    } else {
        if (paymentSection) paymentSection.style.display = 'block';
        if (continueBtn) continueBtn.disabled = false;

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

    totalElement.textContent = `S/ ${CartService.getCartTotal().toFixed(2)}`;
}

export function openCartModal() {
    // Resetear vistas: Siempre empezar en la vista principal
    returnToCart(); 

    // Resetear selección de pago para obligar a elegir
    const radios = document.querySelectorAll('input[name="payment_method"]');
    radios.forEach(r => r.checked = false);

    renderCartItems(); 
    document.getElementById(MODAL_CONTAINER_ID).classList.add('visible');
}

export function closeCartModal() {
    document.getElementById(MODAL_CONTAINER_ID).classList.remove('visible');
}

function changeQuantity(id, change) {
    CartService.updateQuantity(id, change);
}

function removeItem(id) {
    CartService.removeFromCart(id);
}