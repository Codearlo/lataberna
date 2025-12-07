// src/admin/admin.js

import { initProductsAdmin } from './products/products.js';

/**
 * Inicializa el panel de administración.
 * @param {string} mainContainerId - ID del contenedor principal (app-content).
 * @param {string} footerId - ID del footer.
 */
export function initAdminPanel(mainContainerId, footerId) {
    const mainContainer = document.getElementById(mainContainerId);
    const headerElement = document.getElementById('main-header'); 
    const footerElement = document.getElementById(footerId);
    
    if (!mainContainer) return;
    
    // 1. Limpiar o reemplazar la cabecera y el footer (para admin)
    if (headerElement) headerElement.innerHTML = `<h2 style="padding: 15px; background: #000; color: #fff;">Panel de Administración LA TABERNA</h2>`;
    if (footerElement) footerElement.style.display = 'none';

    // 2. Limpiar el contenido existente
    mainContainer.innerHTML = ''; 
    
    // 3. Crear el contenedor para el panel de productos
    const productsPanel = document.createElement('div');
    productsPanel.id = 'admin-products-panel';
    mainContainer.appendChild(productsPanel);

    // 4. Inicializar el módulo de productos
    initProductsAdmin('admin-products-panel'); 
}