// src/services/store/products.service.js

// Sube 2 niveles (store -> services) y entra a config/
import { supabase } from '../../config/supabaseClient.js'; 

/**
 * Obtiene los productos activos con su categoría.
 */
export async function getActiveProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, categoria:categorias(nombre)')
            .eq('is_active', true) 
            .order('nombre', { foreignTable: 'categorias', ascending: true }) 
            .order('id', { ascending: false }); 
        
        if (error) throw error;
        
        return data.map(product => ({
            ...product,
            category: product.categoria ? product.categoria.nombre : 'Sin Categoría'
        }));

    } catch (err) {
        console.error("Error al obtener productos:", err);
        return []; 
    }
}

/**
 * Obtiene las categorías para el menú de navegación.
 * Excluye "SIN CATEGORIA" y ordena alfabéticamente.
 */
export async function getMenuCategories() {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('id, nombre')
            .neq('nombre', 'SIN CATEGORIA') // Excluye la categoría por defecto
            .order('nombre', { ascending: true }); // Orden alfabético
        
        if (error) throw error;
        return data;

    } catch (err) {
        console.error("Error al obtener categorías para el menú:", err);
        return [];
    }
}