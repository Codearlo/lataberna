// src/public/main.js

import { initHeader } from './modules/layout/header/header.js';
import { initProductGrid } from './modules/store/product-grid/product-grid.js';
import { initCartModal } from './modules/store/cart-modal/cart-modal.js'; 
import { initToastNotification } from './modules/store/toast-notification/toast.js'; 
import { initWhatsappButton } from './modules/whatsapp-button/whatsapp-button.js'; 

// ELIMINADA: import { initAdminPanel } from '../admin/admin.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // ELIMINADO: Lógica de enrutamiento (?view=admin)
    
    // Inicializar la vista de la Tienda (Por defecto)
    
    // 1. Inicializa el Header y el Contador
    initHeader('main-header'); 

    // 2. Inicializa el Modal del Carrito (Estructura visual)
    initCartModal();
    
    // 3. Inicializa el Toast de Notificaciones (Estructura visual)
    initToastNotification(); 

    // 4. Inicializa la Rejilla de Productos (Carga, Realtime y Render)
    initProductGrid('product-grid-container'); 
    
    // 5. NUEVO: Inicializa el botón flotante de WhatsApp
    initWhatsappButton('whatsapp-button-container'); 
});