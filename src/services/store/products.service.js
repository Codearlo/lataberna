// src/services/store/products.service.js

// Sube 2 niveles (store -> services) y entra a config/
import { supabase } from '../../config/supabaseClient.js'; 

export async function getActiveProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true) 
            .order('category', { ascending: true }); 
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error al obtener productos:", err);
        return []; 
    }
}