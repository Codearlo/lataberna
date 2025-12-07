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
    
    if (initialProducts && initialProducts.length > 0) {
        // Renderizar productos si existen
        initialProducts.forEach(product => {
            gridContainer.appendChild(renderProductCard(product));
        });
    } else {
        // Mostrar mensaje si no hay productos
        gridContainer.innerHTML = '<p class="empty-grid-msg">No hay productos disponibles por ahora. ¡Vuelve pronto!</p>';
    }

    subscribeToProductChanges();
}

function subscribeToProductChanges() {
    // La lógica Realtime debe usar un canal (channel) y apuntar a los cambios de la tabla.
    supabase
        .channel('products_changes') // Nombre del canal (puede ser cualquiera)
        .on(
            'postgres_changes', // Tipo de evento para cambios en la base de datos
            { event: 'INSERT', schema: 'public', table: 'products' }, // Configuración para INSERT
            (payload) => {
                const newCard = renderProductCard(payload.new);
                gridContainer.prepend(newCard); 
            }
        )
        .on(
            'postgres_changes', // Tipo de evento para cambios en la base de datos
            { event: 'UPDATE', schema: 'public', table: 'products' }, // Configuración para UPDATE
            (payload) => {
                updateProductCard(payload.new);
            }
        )
        .on(
            'postgres_changes', // Tipo de evento para cambios en la base de datos
            { event: 'DELETE', schema: 'public', table: 'products' }, // Configuración para DELETE
            (payload) => {
                // Supabase envía 'old' para DELETE, que contiene el ID
                removeProductCard(payload.old.id);
            }
        )
        .subscribe();
}