// src/services/store/products.service.js

// Importamos la conexión a Supabase
import { supabase } from '../../../config/supabaseClient.js'; 

/**
 * Trae todos los productos activos de la base de datos.
 * @returns {Array} Lista de productos.
 */
export async function getActiveProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true) // Filtramos solo por los productos activos
            .order('category', { ascending: true }); 
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error al obtener productos:", err);
        // En caso de error, devolvemos un array vacío para no romper la web
        return []; 
    }
}