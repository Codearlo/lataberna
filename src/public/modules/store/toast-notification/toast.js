// src/public/modules/store/toast-notification/toast.js

const TOAST_ID = 'toast-notification-container';
const TOAST_MESSAGE_ID = 'toast-message';
const AUTOHIDE_DELAY = 1000; // 1 segundo (1000ms)

let timeoutId = null; // Para manejar el temporizador de auto-ocultado

/**
 * Inicializa el elemento HTML del toast y añade el listener de cierre.
 */
export function initToastNotification() {
    const body = document.body;
    
    // Crear la estructura HTML del toast con mejor formato
    const toastHTML = `
        <div id="${TOAST_ID}">
            <div class="toast-message-content">
                <span style="font-size:1.1em; color: #fff;">✅</span>
                <span id="${TOAST_MESSAGE_ID}"></span>
            </div>
            <button class="toast-close-btn" onclick="window.hideToast()">✖</button>
        </div>
    `;
    
    // Añadir el toast al final del body
    body.insertAdjacentHTML('beforeend', toastHTML);

    // Hacer la función de cierre global para que funcione con onclick
    window.hideToast = hideToast; 
}

/**
 * Muestra el toast con un mensaje y configura el auto-ocultado.
 * @param {string} message - El mensaje a mostrar.
 */
export function showToast(message) {
    const toast = document.getElementById(TOAST_ID);
    const messageElement = document.getElementById(TOAST_MESSAGE_ID);

    if (!toast || !messageElement) return;

    // 1. Limpiar el temporizador anterior si existe
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    
    // 2. Establecer el mensaje y aplicar la clase 'show' para iniciar la animación de opacidad
    messageElement.textContent = message;
    toast.classList.add('show');
    
    // 3. Configurar el auto-ocultado
    timeoutId = setTimeout(() => {
        hideToast();
    }, AUTOHIDE_DELAY);
}

/**
 * Oculta el toast.
 */
export function hideToast() {
    const toast = document.getElementById(TOAST_ID);
    if (toast) {
        // Al remover la clase 'show', la transición CSS se encarga del desvanecimiento
        toast.classList.remove('show');
    }
    // Limpiar el temporizador para evitar que se dispare después de un cierre manual
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}