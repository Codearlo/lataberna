// src/admin/products/edit-product/edit-product.service.js

import { supabase, PRODUCTS_BUCKET } from '../../../config/supabaseClient.js'; 

// --- CORRECCIÓN AQUÍ ---
// 1. Apuntamos al archivo .services.js (con 's' y 'services')
// 2. Este archivo contiene las funciones de base de datos, no el controlador de la vista.
import { getCategories, createCategory, uploadImage } from '../add-product/add-product.services.js';

/**
 * Elimina una imagen del bucket de Supabase Storage.
 * @param {string} imageUrl - La URL pública de la imagen.
 */
export async function deleteImage(imageUrl) {
    if (!imageUrl) return;

    // Extraer el nombre del archivo del final de la URL pública
    const parts = imageUrl.split('/');
    const fileName = parts.pop();
    
    // Si la URL no apunta a un archivo dentro del bucket, salimos
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
 * @param {number} id - El ID del producto.
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
        throw new Error(`Producto con ID ${id} no encontrado o error de base de datos.`);
    }
}

/**
 * Actualiza un producto existente.
 * @param {number} id - El ID del producto a actualizar.
 * @param {object} productData - Los datos del producto.
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
 * @param {number} id - El ID del producto a eliminar.
 */
export async function deleteProduct(id) {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Reexportamos SOLO las funciones importadas.
// deleteImage YA fue exportada arriba, así que no la ponemos aquí para evitar el error "Duplicate export".
export { getCategories, createCategory, uploadImage };