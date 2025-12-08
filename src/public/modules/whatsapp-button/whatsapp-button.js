// src/public/modules/whatsapp-button/whatsapp-button.js

const WHATSAPP_BUTTON_ID = 'whatsapp-button-container';
const WHATSAPP_BUTTON_HTML_PATH = 'src/public/modules/whatsapp-button/whatsapp-button.html';
const PHONE_NUMBER = '51961367961'; // Número ya usado en cart.service.js
const DEFAULT_MESSAGE = 'Hola, estoy navegando en La Taberna y necesito ayuda con un pedido.';

/**
 * Inicializa el botón flotante de WhatsApp.
 * Carga el HTML, lo inyecta y configura el enlace con el número y mensaje.
 */
export async function initWhatsappButton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // 1. Cargar el HTML
        const response = await fetch(WHATSAPP_BUTTON_HTML_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buttonHtml = await response.text();
        
        // 2. Inyectar el HTML cargado
        container.innerHTML = buttonHtml;

        // 3. Configurar el enlace de WhatsApp
        const whatsappLink = document.getElementById('whatsapp-float-btn');
        if (whatsappLink) {
            const encodedMessage = encodeURIComponent(DEFAULT_MESSAGE);
            // Crea la URL completa con el número y el mensaje codificado
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${PHONE_NUMBER}&text=${encodedMessage}`;
            
            whatsappLink.href = whatsappUrl;
        }

    } catch (error) {
        console.error("Error al cargar o inicializar el botón de WhatsApp:", error);
    }
}