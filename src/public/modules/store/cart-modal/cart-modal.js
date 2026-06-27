// src/public/modules/store/cart-modal/cart-modal.js

import { CartService } from '../../../../services/store/cart.service.js';
import { showToast } from '../toast-notification/toast.js';

const MODAL_CONTAINER_ID = 'cart-modal-container';
const CART_LIST_ID = 'cart-items-list';
const CART_TOTAL_ID = 'cart-total-amount';

export function initCartModal() {
    const container = document.getElementById(MODAL_CONTAINER_ID);
    if (!container) return;

    // Estructura HTML del modal del carrito + popup flotante del recordatorio
    container.innerHTML = `
        <div class="cart-modal-overlay"></div>
        <div class="cart-modal">

            <!-- 1. HEADER: título + X roja, fijo arriba -->
            <div class="cart-modal-header">
                <h3>🛒 Tu Pedido</h3>
                <button class="close-modal-btn" data-action="close" aria-label="Cerrar">&times;</button>
            </div>

            <!-- 2. BODY: lista de productos, único scroll -->
            <div class="cart-modal-body">
                <div id="${CART_LIST_ID}"></div>
            </div>

            <!-- 3. FOOTER: total + pago + botón, fijo abajo -->
            <div class="cart-modal-footer" id="cart-modal-footer">
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
            </div>

            <!-- ponytail: popup flotante del recordatorio, vive DENTRO del carrito
                 para que se centre en el panel (no en la página) y el backdrop
                 solo cubra el área del carrito -->
            <div id="location-reminder-popup" style="display: none;">
                <div class="location-reminder-overlay"></div>
                <div class="location-reminder-modal">
                    <span class="reminder-icon">📍</span>
                    <p class="reminder-text">
                        ¡Casi listo!<br>
                        Por favor, comparte tu <span class="reminder-highlight">"Ubicación Actual"</span> en el chat de WhatsApp después de enviar el mensaje para que el delivery llegue rápido.
                    </p>
                    <button id="btn-confirm-whatsapp" class="checkout-btn btn-whatsapp">
                        ENVIAR PEDIDO AHORA 🚀
                    </button>
                    <button class="close-btn" data-action="back">Volver atrás</button>
                </div>
            </div>

        </div>
    `;

    // Listeners para los botones
    document.getElementById('btn-continue-checkout').addEventListener('click', handleContinueToReminder);
    document.getElementById('btn-confirm-whatsapp').addEventListener('click', handleFinalWhatsappRedirect);

    container.querySelector('.cart-modal-overlay').addEventListener('click', closeCartModal);
    // ponytail: listener global para TODOS los botones de cerrar/volver, estén
    // dentro del carrito o del modal independiente del recordatorio
    document.querySelectorAll('.close-btn, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action === 'back') returnToCart();
            else closeCartModal();
        });
    });
    // ponytail: cerrar el modal independiente al hacer click en su overlay
    const reminderOverlay = document.querySelector('.location-reminder-overlay');
    if (reminderOverlay) {
        reminderOverlay.addEventListener('click', returnToCart);
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const reminderOpen = document.getElementById('location-reminder-popup')?.style.display === 'block';
            if (reminderOpen) returnToCart();
            else if (container.classList.contains('visible')) closeCartModal();
        }
    });
    
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

    // Cambiar a la vista de recordatorio (popup superpuesto al carrito)
    setLocationReminderVisible(true);
}

/**
 * ponytail: muestra/oculta el popup flotante del recordatorio de ubicación.
 * NO oculta los 3 bloques del carrito — el popup se superpone encima para
 * que el contenido del carrito se siga viendo (borroso) detrás. */
function setLocationReminderVisible(visible) {
    const popup = document.getElementById('location-reminder-popup');
    if (!popup) return;
    popup.style.display = visible ? 'block' : 'none';
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
    setLocationReminderVisible(false);
}

export function renderCartItems() {
    const cart = CartService.getCart();
    const listElement = document.getElementById(CART_LIST_ID);
    const totalElement = document.getElementById(CART_TOTAL_ID);
    const paymentSection = document.getElementById('payment-section');
    const continueBtn = document.getElementById('btn-continue-checkout');

    if (!listElement) return;

    if (cart.length === 0) {
        listElement.innerHTML = `
            <div class="empty-cart-state">
                <span class="empty-cart-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                </span>
                <p class="empty-cart-title">Tu carrito está vacío</p>
                <p class="empty-cart-sub">Agrega tus tragos favoritos para empezar el pedido.</p>
            </div>
        `;
        if (paymentSection) paymentSection.style.display = 'none';
        if (continueBtn) continueBtn.disabled = true;
        const summary = document.querySelector('.cart-summary');
        if (summary) summary.style.display = 'none';
    } else {
        const summary = document.querySelector('.cart-summary');
        if (summary) summary.style.display = 'flex';
        if (paymentSection) paymentSection.style.display = 'block';
        if (continueBtn) continueBtn.disabled = false;

        listElement.innerHTML = cart.map(item => {
            const imgSrc = item.image_url || 'assets/icons/icon.webp';
            return `
            <div class="cart-item" data-id="${item.id}">
                <img class="cart-item-img" src="${imgSrc}" alt="${item.name}" onerror="this.src='assets/icons/icon.webp'">

                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">S/ ${(item.price * item.qty).toFixed(2)}</div>
                </div>

                <div class="cart-item-actions">
                    <button class="remove-item-btn" onclick="window.removeItem(${item.id})" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    <div class="quantity-controls">
                        <button onclick="window.changeQuantity(${item.id}, -1)">−</button>
                        <span>${item.qty}</span>
                        <button onclick="window.changeQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    totalElement.textContent = `S/ ${CartService.getCartTotal().toFixed(2)}`;
}

/* ponytail: manejo de history API para que el botón "atrás" del navegador cierre el modal
   en vez de navegar a la página anterior. sessionStorage guarda el estado para recargas. */
let cartHistoryPushed = false;

function showCartModal() {
    returnToCart();
    const radios = document.querySelectorAll('input[name="payment_method"]');
    radios.forEach(r => r.checked = false);
    renderCartItems();
    document.getElementById(MODAL_CONTAINER_ID).classList.add('visible');
    document.body.classList.add('cart-open');
    document.body.classList.add('modal-open'); // ponytail: lock de scroll compartido con modal de producto
}

function hideCartModal() {
    document.getElementById(MODAL_CONTAINER_ID).classList.remove('visible');
    document.body.classList.remove('cart-open');
    // ponytail: solo quitamos modal-open si el otro modal tampoco está abierto
    const productOpen = document.getElementById('product-modal-container')?.classList.contains('visible');
    if (!productOpen) document.body.classList.remove('modal-open');
}

export function openCartModal() {
    showCartModal();
    sessionStorage.setItem('lataberna_open_modal', 'cart');
    if (!cartHistoryPushed) {
        history.pushState({ modal: 'cart' }, '');
        cartHistoryPushed = true;
    }
}

export function closeCartModal() {
    hideCartModal();
    sessionStorage.removeItem('lataberna_open_modal');
    if (cartHistoryPushed) {
        history.replaceState(null, '');
        cartHistoryPushed = false;
    }
}

/* ponytail: el botón "atrás" del navegador cierra el modal en vez de cambiar de página */
window.addEventListener('popstate', () => {
    const container = document.getElementById(MODAL_CONTAINER_ID);
    if (container && container.classList.contains('visible')) {
        cartHistoryPushed = false;
        hideCartModal();
        sessionStorage.removeItem('lataberna_open_modal');
    }
});

/* ponytail: al recargar la página con el carrito abierto, reabrirlo SIN
   pushear otra entrada al history (la entrada previa a la recarga sigue ahí). */
export function restoreOpenModal() {
    const saved = sessionStorage.getItem('lataberna_open_modal');
    if (saved === 'cart') {
        showCartModal();
        // Marcamos como "ya pusheado" para que al cerrar no se reemplace la entrada vieja
        cartHistoryPushed = true;
    }
}

function changeQuantity(id, change) {
    CartService.updateQuantity(id, change);
}

function removeItem(id) {
    CartService.removeFromCart(id);
}