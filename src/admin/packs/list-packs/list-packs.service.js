// src/admin/packs/list-packs/list-packs.service.js

import { supabase } from '../../../config/supabaseClient.js'; 

const TABLE_NAME = 'products';
// Incluye la categoría para mostrar en la lista
const SELECT_QUERY = 'id, name, price, is_active, image_url, categoria:categorias(nombre)';

/**
 * Obtiene Packs filtrados y paginados (donde is_pack = true).
 * @param {object} options - Opciones de filtrado y paginación.
 * @param {string} options.searchTerm - Término de búsqueda para nombre o ID.
 * @param {string} options.filterBy - Filtro de estado ('active', 'inactive', 'all').
 * @param {number} options.itemsPerPage - Número de ítems por página.
 * @param {number} options.pageNumber - Número de página.
 * @returns {Promise<{packs: object[], totalCount: number}>} Lista de packs y el conteo total.
 */
export async function getFilteredPacksPaged({ searchTerm = '', filterBy = 'active', itemsPerPage = 10, pageNumber = 1 }) {
    
    const offset = (pageNumber - 1) * itemsPerPage;
    const limit = itemsPerPage;
    
    let query = supabase.from(TABLE_NAME).select(SELECT_QUERY, { count: 'exact' });
    
    // --- FILTRO CRÍTICO: Solo Packs ---
    query = query.eq('is_pack', true);
    
    // 1. Aplicar filtro de estado
    if (filterBy === 'active') {
        query = query.eq('is_active', true);
    } else if (filterBy === 'inactive') {
        query = query.eq('is_active', false);
    }
    
    // 2. Aplicar búsqueda (por nombre o ID)
    if (searchTerm) {
        const isIdSearch = !isNaN(searchTerm) && searchTerm.length < 5; 
        
        if (isIdSearch) {
            query = query.eq('id', parseInt(searchTerm));
        } else {
            query = query.ilike('name', `%${searchTerm}%`);
        }
    }
    
    // 3. Aplicar ordenación
    query = query
        .order('nombre', { foreignTable: 'categoria', ascending: true }) 
        .order('id', { ascending: false }); 
        
    // 4. Aplicar paginación
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;

    if (error) {
        console.error("Error fetching paginated packs:", error);
        throw error;
    }

    // Mapear y aplanar los datos
    const packs = data.map(pack => ({
        ...pack,
        category: pack.categoria ? pack.categoria.nombre : 'Sin Categoría'
    }));
    
    return { 
        packs, 
        totalCount: count || 0
    };
}