// src/services/store/products.service.js

// Sube 2 niveles (store -> services) y entra a config/
import { supabase } from '../../config/supabaseClient.js'; 

export async function getActiveProducts() {
    try {
        // Ahora necesitamos hacer un JOIN para ordenar por el nombre de la categoría
        const { data, error } = await supabase
            .from('products')
            // Selecciona todos los campos de products y el nombre de la categoría
            .select('*, categoria:categorias(nombre)')
            .eq('is_active', true) 
            // Ordena por el nombre de la categoría (join) y luego por el id del producto
            .order('nombre', { foreignTable: 'categorias', ascending: true }) 
            .order('id', { ascending: false }); 
        
        if (error) throw error;
        
        // Mapeamos los datos para aplanar el nombre de la categoría para consistencia con el código del frontend
        return data.map(product => ({
            ...product,
            category: product.categoria.nombre 
        }));

    } catch (err) {
        console.error("Error al obtener productos:", err);
        return []; 
    }
}