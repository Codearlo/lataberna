// src/public/modules/store/product-grid/product-grid.js

import { supabase } from '../../../../config/supabaseClient.js';
import { getActiveProducts } from '../../../../services/store/products.service.js';
import { renderProductCard, updateProductCard, removeProductCard } from './product-grid.utils.js'; 
// Importaremos estas funciones de utilidad, que debes crear a continuación.

let gridContainer; // Variable global para el contenedor del grid

// 1. FUNCIÓN DE INICIO
/**
 * Inicializa la rejilla de productos.
 * @param {string} containerId - ID del contenedor en index.html.
 */
export async function initProductGrid(containerId) {
    gridContainer = document.getElementById(containerId);
    if (!gridContainer) {
        console.error("Contenedor de productos no encontrado:", containerId);
        return;
    }

    // A. Carga inicial de todos los productos (sin Realtime)
    const initialProducts = await getActiveProducts();
    initialProducts.forEach(product => {
        gridContainer.appendChild(renderProductCard(product));
    });

    // B. Activa la escucha de cambios en tiempo real
    subscribeToProductChanges();
}


// 2. FUNCIÓN DE SUSCRIPCIÓN EN TIEMPO REAL
function subscribeToProductChanges() {
    supabase
        .from('products')
        .on('INSERT', (payload) => {
            // Producto añadido: Lo agregamos al inicio del grid
            const newCard = renderProductCard(payload.new);
            gridContainer.prepend(newCard); 
        })
        .on('UPDATE', (payload) => {
            // Producto actualizado: Actualizamos el precio/nombre
            updateProductCard(payload.new);
        })
        .on('DELETE', (payload) => {
            // Producto eliminado: Lo quitamos de la vista
            removeProductCard(payload.old.id);
        })
        .subscribe();
}