// src/public/modules/store/cart-modal/cart-modal.js

import { CartService } from '../../../../services/store/cart.service.js';
import { showToast } from '../toast-notification/toast.js';

const MODAL_CONTAINER_ID = 'cart-modal-container';
const CART_LIST_ID = 'cart-items-list';
const CART_TOTAL_ID = 'cart-total-amount';

export function initCartModal() {
    const container = document.getElementById(MODAL_CONTAINER_ID);
    if (!container) return;

    // Estructura HTML
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

                <button id="checkout-btn" class="checkout-btn">PEDIR POR WHATSAPP</button>
                <button class="close-btn" onclick="window.closeCartModal()">Cerrar</button>
            </div>

            <div id="location-reminder-view">
                <span class="reminder-icon">📍</span>
                <p class="reminder-text">
                    ¡Casi listo!<br>
                    Por favor, comparte tu <span class="reminder-highlight">"Ubicación Actual"</span> en el chat de WhatsApp después de enviar el mensaje.
                </p>
                <div class="countdown-label">Abriendo WhatsApp en...</div>
                <span id="countdown-display" class="countdown-timer">3</span>
            </div>

        </div>
    `;

    document.getElementById('checkout-btn').addEventListener('click', handleCheckoutProcess);
    
    // Funciones globales para onclick en HTML generado
    window.changeQuantity = changeQuantity;
    window.removeItem = removeItem;
    window.openCartModal = openCartModal; 
    window.closeCartModal = closeCartModal;
}

function handleCheckoutProcess() {
    const cart = CartService.getCart();
    if (cart.length === 0) {
        showToast("⚠️ Tu carrito está vacío.");
        return;
    }

    const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
    
    if (!selectedPayment) {
        showToast("⚠️ Por favor selecciona un método de pago.");
        const section = document.getElementById('payment-section');
        section.classList.add('shake-animation'); // Añadiremos esta animación en CSS
        setTimeout(() => section.classList.remove('shake-animation'), 500);
        return;
    }

    const paymentMethod = selectedPayment.value;

    // Cambiar vista
    document.getElementById('cart-main-view').style.display = 'none';
    document.getElementById('location-reminder-view').style.display = 'block';

    // Cuenta regresiva
    let count = 3;
    const countDisplay = document.getElementById('countdown-display');
    countDisplay.textContent = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countDisplay.textContent = count;
        } else {
            clearInterval(timer);
            CartService.sendOrderToWhatsapp(paymentMethod);
            window.closeCartModal();
        }
    }, 1000);
}

export function renderCartItems() {
    const cart = CartService.getCart();
    const listElement = document.getElementById(CART_LIST_ID);
    const totalElement = document.getElementById(CART_TOTAL_ID);
    const paymentSection = document.getElementById('payment-section');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!listElement) return;

    if (cart.length === 0) {
        listElement.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío. ¡Es hora de un trago!</p>';
        if (paymentSection) paymentSection.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (paymentSection) paymentSection.style.display = 'block';
        if (checkoutBtn) checkoutBtn.disabled = false;

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
    // Resetear vistas
    const mainView = document.getElementById('cart-main-view');
    const reminderView = document.getElementById('location-reminder-view');
    if (mainView && reminderView) {
        mainView.style.display = 'block';
        reminderView.style.display = 'none';
    }

    // Resetear radio buttons para obligar a elegir de nuevo (opcional, buena práctica UX en este caso)
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