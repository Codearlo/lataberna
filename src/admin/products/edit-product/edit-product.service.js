// src/admin/products/edit-product/edit-product.service.js

import { supabase, PRODUCTS_BUCKET } from '../../../config/supabaseClient.js'; 

// Importamos funciones reutilizables de add-product
import { getCategories, createCategory, uploadImage } from '../add-product/add-product.services.js';

/**
 * Elimina una imagen del bucket de Supabase Storage.
 * @param {string} imageUrl - La URL pública de la imagen.
 */
export async function deleteImage(imageUrl) {
    if (!imageUrl) return;

    const parts = imageUrl.split('/');
    const fileName = parts.pop();
    
    if (fileName === PRODUCTS_BUCKET || !imageUrl.includes(PRODUCTS_BUCKET)) return; 

    const { error } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .remove([fileName]);

    if (error) {
        console.error("Error deleting file:", error);
    }
}

/**
 * Obtiene un producto específico por ID.
 */
export async function getProductById(id) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, categoria:categorias(nombre)')
            .eq('id', id)
            .limit(1)
            .single();

        if (error) throw error;
        
        return {
            ...data,
            category: data.categoria ? data.categoria.nombre : 'Sin Categoría'
        };

    } catch (err) {
        console.error("Error al obtener producto por ID:", err);
        throw new Error(`Producto con ID ${id} no encontrado.`);
    }
}

/**
 * Actualiza un producto existente.
 */
export async function updateProduct(id, productData) {
    const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Elimina un producto.
 */
export async function deleteProduct(id) {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export { getCategories, createCategory, uploadImage };