// src/admin/products/list-products/list-products.service.js

import { supabase } from '../../../config/supabaseClient.js'; 

const TABLE_NAME = 'products';
const SELECT_QUERY = 'id, name, price, is_active, image_url, categoria:categorias(nombre)';

// Helper para normalizar texto (quitar acentos)
function normalizeText(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Obtiene productos filtrados y paginados con búsqueda insensible a acentos.
 */
export async function getFilteredProductsPaged({ searchTerm = '', filterBy = 'active', itemsPerPage = 10, pageNumber = 1 }) {
    
    // 1. Consulta Base: Traer TODO lo que coincida con los filtros de estado
    // (Ya no paginamos en la BD para poder filtrar texto en JS correctamente)
    let query = supabase.from(TABLE_NAME).select(SELECT_QUERY);
    
    // Solo Productos Individuales
    query = query.eq('is_pack', false);
    
    // Filtro Estado
    if (filterBy === 'active') {
        query = query.eq('is_active', true);
    } else if (filterBy === 'inactive') {
        query = query.eq('is_active', false);
    }
    
    // Ordenación por defecto
    query = query.order('id', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching products:", error);
        throw error;
    }

    // 2. Filtrado en Memoria (JavaScript) - Aquí ocurre la magia de los acentos
    let filteredData = data;
    
    if (searchTerm) {
        const normalizedTerm = normalizeText(searchTerm);
        
        filteredData = data.filter(product => {
            // Buscamos por ID (exacto) o por Nombre (normalizado)
            if (!isNaN(searchTerm) && searchTerm.length < 5 && product.id.toString() === searchTerm) {
                return true;
            }
            // Búsqueda de texto normalizada
            const normalizedName = normalizeText(product.name);
            const normalizedCategory = product.categoria ? normalizeText(product.categoria.nombre) : '';
            const normalizedBrand = ""; // Si tuviéramos marca separada

            return normalizedName.includes(normalizedTerm) || normalizedCategory.includes(normalizedTerm);
        });
    }

    // 3. Paginación en Memoria
    const totalCount = filteredData.length;
    const offset = (pageNumber - 1) * itemsPerPage;
    const pagedData = filteredData.slice(offset, offset + itemsPerPage);

    // Mapear datos
    const products = pagedData.map(product => ({
        ...product,
        category: product.categoria ? product.categoria.nombre : 'Sin Categoría'
    }));
    
    return { 
        products, 
        totalCount
    };
}