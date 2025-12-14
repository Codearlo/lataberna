// src/admin/packs/list-packs/list-packs.service.js

import { supabase } from '../../../config/supabaseClient.js'; 

const TABLE_NAME = 'products';
// SE AGREGO: has_discount
const SELECT_QUERY = 'id, name, price, is_active, image_url, has_discount, categoria:categorias(nombre)';

// Helper para normalizar texto
function normalizeText(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Obtiene Packs filtrados y paginados con búsqueda insensible a acentos.
 */
export async function getFilteredPacksPaged({ searchTerm = '', filterBy = 'active', itemsPerPage = 10, pageNumber = 1 }) {
    
    // 1. Consulta Base
    let query = supabase.from(TABLE_NAME).select(SELECT_QUERY);
    
    // Solo Packs
    query = query.eq('is_pack', true);
    
    // Filtro Estado
    if (filterBy === 'active') {
        query = query.eq('is_active', true);
    } else if (filterBy === 'inactive') {
        query = query.eq('is_active', false);
    }
    
    query = query.order('id', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching packs:", error);
        throw error;
    }

    // 2. Filtrado JS
    let filteredData = data;
    
    if (searchTerm) {
        const normalizedTerm = normalizeText(searchTerm);
        
        filteredData = data.filter(pack => {
            if (!isNaN(searchTerm) && searchTerm.length < 5 && pack.id.toString() === searchTerm) {
                return true;
            }
            const normalizedName = normalizeText(pack.name);
            return normalizedName.includes(normalizedTerm);
        });
    }

    // 3. Paginación JS
    const totalCount = filteredData.length;
    const offset = (pageNumber - 1) * itemsPerPage;
    const pagedData = filteredData.slice(offset, offset + itemsPerPage);

    // Mapear
    const packs = pagedData.map(pack => ({
        ...pack,
        category: pack.categoria ? pack.categoria.nombre : 'Sin Categoría'
    }));
    
    return { 
        packs, 
        totalCount
    };
}