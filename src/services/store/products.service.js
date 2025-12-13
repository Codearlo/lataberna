// src/services/store/products.service.js

import { supabase } from '../../config/supabaseClient.js'; 

/**
 * Obtiene METADATA ligera de TODOS los productos (id, nombre, precio, categoría).
 * Esto sirve para calcular los rangos de precio y marcas en el Sidebar.
 */
export async function getProductsMetadata() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, price, categoria_id, is_pack') 
            .eq('is_active', true);
        
        if (error) throw error;
        
        // Procesamos marcas
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

        // 1. Categorías (Solo si NO estamos en modo "Solo Packs" forzado por la barra, o si hay IDs reales)
        // Nota: Si categoryIds contiene 'packs', lo ignoramos en la query SQL
        const realCategoryIds = categoryIds.filter(id => id !== 'packs');
        
        if (realCategoryIds.length > 0) {
            query = query.in('categoria_id', realCategoryIds);
        }

        // 2. Packs
        if (onlyPacks) {
            query = query.eq('is_pack', true);
        }

        // 3. Búsqueda Texto
        if (searchTerm) {
            query = query.ilike('name', `%${searchTerm}%`);
        }

        // 4. Marcas
        if (brands.length > 0) {
            const orString = brands.map(b => `name.ilike.%${b}%`).join(',');
            query = query.or(orString);
        }

        // Ordenamiento
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

// Compatibilidad Admin
export async function getActiveProducts() {
    return [];
}

/**
 * Obtiene las categorías para el menú de navegación.
 * AHORA INCLUYE 'image_url' E INYECTA LA CATEGORÍA VIRTUAL 'PACKS'.
 */
export async function getMenuCategories() {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('id, nombre, image_url') 
            .neq('nombre', 'SIN CATEGORIA')
            .order('nombre', { ascending: true });
        
        if (error) throw error;

        // --- INYECCIÓN DE CATEGORÍA VIRTUAL "PACKS" ---
        const packsCategory = {
            id: 'packs', // ID de texto especial
            nombre: 'PACKS',
            // Asegúrate de poner tu imagen aquí: assets/icons/packs.webp
            image_url: 'assets/icons/packs.webp' 
        };

        // Retornamos Packs primero, luego el resto
        return [packsCategory, ...data];

    } catch (err) {
        console.error("Error obteniendo categorías:", err);
        return [];
    }
}