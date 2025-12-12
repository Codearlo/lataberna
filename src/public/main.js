// src/public/main.js

import { initHeader } from './modules/layout/header/header.js';
import { initProductGrid } from './modules/store/product-grid/product-grid.js';
import { initCartModal } from './modules/store/cart-modal/cart-modal.js'; 
import { initToastNotification } from './modules/store/toast-notification/toast.js'; 
import { initWhatsappButton } from './modules/whatsapp-button/whatsapp-button.js'; 
import { initCategoriesBar } from './modules/store/categories-bar/categories-bar.js'; // IMPORT

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Inicializa el Header
    initHeader('main-header'); 

    // 2. Inicializa el Modal del Carrito
    initCartModal();
    
    // 3. Inicializa el Toast
    initToastNotification(); 

    // 4. Inicializa la Barra de Categorías (Rappi Style) - NUEVO
    initCategoriesBar();

    // 5. Inicializa la Rejilla de Productos
    initProductGrid('product-grid-container'); 
    
    // 6. Botón flotante de WhatsApp
    initWhatsappButton('whatsapp-button-container'); 
});