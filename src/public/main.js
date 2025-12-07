// src/public/main.js

import { initHeader } from './modules/layout/header/header.js';
import { initProductGrid } from './modules/store/product-grid/product-grid.js';
import { initCartModal } from './modules/store/cart-modal/cart-modal.js'; // Asumimos que esta función ya existe

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa el Header y el Contador
    initHeader('main-header'); 

    // 2. Inicializa el Modal del Carrito (Estructura visual)
    initCartModal();

    // 3. Inicializa la Rejilla de Productos (Carga, Realtime y Render)
    initProductGrid('product-grid-container'); 
});