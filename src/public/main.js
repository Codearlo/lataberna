// src/public/main.js

import { initHeader } from './modules/layout/header/header.js';
import { initProductGrid } from './modules/store/product-grid/product-grid.js';
// Importa otros módulos necesarios aquí (ej: initCartModal)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa el Header (Coloca el logo, el contador de carrito, etc.)
    // Debes crear la función initHeader() en header.js
    initHeader('main-header'); 

    // 2. Inicializa la Rejilla de Productos
    // Esto se encarga de la carga inicial de datos y la suscripción Realtime.
    // Debes crear la función initProductGrid() en product-grid.js
    initProductGrid('product-grid-container'); 

    // 3. Puedes agregar aquí la inicialización de otros módulos si los tuvieras
});