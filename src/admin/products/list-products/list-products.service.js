// src/admin/products/list-products/list-products.service.js

import { supabase } from '../../../../config/supabaseClient.js'; 

const TABLE_NAME = 'products';
const SELECT_QUERY = 'id, name, price, is_active, image_url, categoria:categorias(nombre)';

/**
 * Obtiene productos filtrados y paginados.
 * @param {object} options - Opciones de filtrado y paginación.
 * @param {string} options.searchTerm - Término de búsqueda para nombre o ID.
 * @param {string} options.filterBy - Filtro de estado ('active', 'inactive', 'all').
 * @param {number} options.itemsPerPage - Número de ítems por página.
 * @param {number} options.pageNumber - Número de página.
 * @returns {Promise<{products: object[], totalCount: number}>} Lista de productos y el conteo total.
 */
export async function getFilteredProductsPaged({ searchTerm = '', filterBy = 'active', itemsPerPage = 10, pageNumber = 1 }) {
    
    const offset = (pageNumber - 1) * itemsPerPage;
    const limit = itemsPerPage;
    
    let query = supabase.from(TABLE_NAME).select(SELECT_QUERY, { count: 'exact' });
    
    // 1. Aplicar filtro de estado
    if (filterBy === 'active') {
        query = query.eq('is_active', true);
    } else if (filterBy === 'inactive') {
        query = query.eq('is_active', false);
    }
    
    // 2. Aplicar búsqueda (por nombre o ID)
    if (searchTerm) {
        // La búsqueda puede ser por el ID (si es un número) o por el nombre (si no lo es)
        const isIdSearch = !isNaN(searchTerm) && searchTerm.length < 5; // Asumir que IDs cortos son IDs
        
        if (isIdSearch) {
            query = query.eq('id', parseInt(searchTerm));
        } else {
            // Usar iLike para búsqueda insensible a mayúsculas y minúsculas en el nombre
            query = query.ilike('name', `%${searchTerm}%`);
        }
    }
    
    // 3. Aplicar ordenación (por nombre de categoría y luego por ID)
    query = query
        .order('nombre', { foreignTable: 'categorias', ascending: true }) 
        .order('id', { ascending: false }); 
        
    // 4. Aplicar paginación
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;

    if (error) {
        console.error("Error fetching paginated products:", error);
        throw error;
    }

    // Mapear y aplanar los datos
    const products = data.map(product => ({
        ...product,
        category: product.categoria ? product.categoria.nombre : 'Sin Categoría'
    }));
    
    return { 
        products, 
        totalCount: count || 0
    };
}