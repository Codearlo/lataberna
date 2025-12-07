// src/public/modules/store/product-grid/product-grid.js

// Sube 4 niveles (product-grid, store, modules, public) y entra a config/services
import { supabase } from '../../../../config/supabaseClient.js'; // Ruta a src/config/
import { getActiveProducts } from '../../../../services/store/products.service.js'; // Ruta a src/services/store/
import { renderProductCard, updateProductCard, removeProductCard } from './product-grid.utils.js'; 

let gridContainer; 

export async function initProductGrid(containerId) {
    gridContainer = document.getElementById(containerId);
    if (!gridContainer) {
        console.error("Contenedor de productos no encontrado:", containerId);
        return;
    }

    const initialProducts = await getActiveProducts();
    initialProducts.forEach(product => {
        gridContainer.appendChild(renderProductCard(product));
    });

    subscribeToProductChanges();
}

function subscribeToProductChanges() {
    // La lógica Realtime usa la instancia de Supabase
    supabase
        .from('products')
        .on('INSERT', (payload) => {
            const newCard = renderProductCard(payload.new);
            gridContainer.prepend(newCard); 
        })
        .on('UPDATE', (payload) => {
            updateProductCard(payload.new);
        })
        .on('DELETE', (payload) => {
            removeProductCard(payload.old.id);
        })
        .subscribe();
}