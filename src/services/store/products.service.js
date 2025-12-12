// src/services/store/products.service.js

import { supabase } from '../../config/supabaseClient.js'; 

/**
 * Obtiene METADATA ligera de TODOS los productos (id, nombre, precio, categoría).
 * Esto sirve para calcular los rangos de precio y marcas en el Sidebar
 * sin descargar todas las imágenes pesadas y datos extra.
 * Optimiza el consumo del servidor.
 */
export async function getProductsMetadata() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, price, categoria_id, is_pack') // Solo lo necesario para filtros
            .eq('is_active', true);
        
        if (error) throw error;
        
        // Procesamos marcas aquí mismo para tener la lista lista
        return data.map(p => {
            let cleanName = p.name.replace(/Pack\s+/i, "").replace(/Botella\s+/i, "");
            const generics = ["RON", "PISCO", "GIN", "VODKA", "WHISKY", "CERVEZA", "VINO", "ESPUMANTE", "LATA", "SIXPACK"];
            const words = cleanName.trim().split(" ");
            let brand = "Genérico";
            
            if (words.length > 0) {
                if (generics.includes(words[0].toUpperCase()) && words.length > 1) {
                    brand = words[1];
                } else {
                    brand = words[0]; 
                }
            }
            brand = brand.replace(/,/g, "").trim();
            
            return {
                ...p,
                brand: brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
            };
        });

    } catch (err) {
        console.error("Error fetching metadata:", err);
        return []; 
    }
}

/**
 * Obtiene productos PAGINADOS y FILTRADOS desde el servidor.
 * @param {object} params 
 * @param {number} params.page - Página actual (1, 2, 3...)
 * @param {number} params.limit - Productos por página (Recomendado: 12)
 * @param {number[]} params.categoryIds - Filtro de categorías
 * @param {string} params.searchTerm - Búsqueda
 * @param {number} params.minPrice - Precio mínimo
 * @param {number} params.maxPrice - Precio máximo
 * @param {string[]} params.brands - Array de marcas seleccionadas (nombres)
 * @param {boolean} params.onlyPacks - Si es solo packs
 */
export async function getProductsPaged({ 
    page = 1, 
    limit = 12, 
    categoryIds = [], 
    searchTerm = '', 
    minPrice = 0, 
    maxPrice = 99999,
    brands = [],
    onlyPacks = false
}) {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('products')
            .select('*, categoria:categorias(nombre)', { count: 'exact' })
            .eq('is_active', true)
            .gte('price', minPrice)
            .lte('price', maxPrice);

        // 1. Categorías
        if (categoryIds.length > 0) {
            query = query.in('categoria_id', categoryIds);
        }

        // 2. Packs
        if (onlyPacks) {
            query = query.eq('is_pack', true);
        }

        // 3. Búsqueda Texto
        if (searchTerm) {
            query = query.ilike('name', `%${searchTerm}%`);
        }

        // 4. Marcas (Complejo: Construimos un OR con ilike para cada marca)
        if (brands.length > 0) {
            // Ejemplo: name.ilike.%Cartavio%,name.ilike.%Bacardi%
            const orString = brands.map(b => `name.ilike.%${b}%`).join(',');
            query = query.or(orString);
        }

        // Ordenamiento: Packs primero, luego alfabético
        query = query
            .order('is_pack', { ascending: false })
            .order('name', { ascending: true })
            .range(from, to);

        const { data, error, count } = await query;
        
        if (error) throw error;

        return {
            products: data.map(product => ({
                ...product,
                category: product.categoria ? product.categoria.nombre : 'Sin Categoría'
            })),
            total: count
        };

    } catch (err) {
        console.error("Error fetching paged products:", err);
        return { products: [], total: 0 }; 
    }
}

// Mantenemos estas para compatibilidad si se usan en otro lado (admin), 
// pero la tienda ahora usará las de arriba.
export async function getActiveProducts() {
    // ... (código existente o legacy)
    return [];
}
export async function getMenuCategories() {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('id, nombre')
            .neq('nombre', 'SIN CATEGORIA')
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error(err);
        return [];
    }
}