// src/public/main.js

import { initHeader } from './modules/layout/header/header.js';
import { initProductGrid } from './modules/store/product-grid/product-grid.js';
import { initCartModal } from './modules/store/cart-modal/cart-modal.js'; 

// Importa la función de inicialización del Admin (RUTA CORREGIDA)
import { initAdminPanel } from '../admin/admin.js'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // Simple Router: Revisamos si la URL indica que estamos en el panel de administración
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    
    if (view === 'admin') {
        // Inicializar Admin Panel (debe limpiar el contenido de main y footer si es necesario)
        initAdminPanel('app-content', 'main-footer');
    } else {
        // Inicializar la vista de la Tienda (Por defecto)
        
        // 1. Inicializa el Header y el Contador
        initHeader('main-header'); 

        // 2. Inicializa el Modal del Carrito (Estructura visual)
        initCartModal();

        // 3. Inicializa la Rejilla de Productos (Carga, Realtime y Render)
        initProductGrid('product-grid-container'); 
    }
});