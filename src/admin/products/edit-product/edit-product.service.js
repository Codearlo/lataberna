// src/admin/products/edit-product/edit-product.service.js

import { supabase, PRODUCTS_BUCKET } from '../../../../config/supabaseClient.js'; 

// Importar funciones compartidas para reusabilidad
import { getCategories, createCategory, uploadImage } from '../add-product/add-product.service.js';

/**
 * Elimina una imagen del bucket de Supabase Storage.
 * Esta función es compartida y usada por edit-product.
 * @param {string} imageUrl - La URL pública de la imagen.
 */
export async function deleteImage(imageUrl) {
    if (!imageUrl) return;

    // Extraer el nombre del archivo del final de la URL pública
    const parts = imageUrl.split('/');
    // El nombre del archivo es el último elemento después del nombre del bucket
    const fileName = parts.pop();
    
    // Si la URL no apunta a un archivo dentro del bucket, salimos
    if (fileName === PRODUCTS_BUCKET || !imageUrl.includes(PRODUCTS_BUCKET)) return; 

    // El path para el storage es solo el nombre del archivo si está en la raíz del bucket
    const { error } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .remove([fileName]);

    if (error) {
        console.error("Error deleting file:", error);
        // NOTA: No lanzamos error para no bloquear la eliminación del producto si la imagen ya no existe.
    }
}

/**
 * Obtiene un producto específico por ID.
 * @param {number} id - El ID del producto.
 */
export async function getProductById(id) {
    try {
        // Selecciona todos los campos de products y el nombre de la categoría
        const { data, error } = await supabase
            .from('products')
            .select('*, categoria:categorias(nombre)')
            .eq('id', id)
            .limit(1)
            .single(); // Esperamos un solo resultado

        if (error) throw error;
        
        // Mapeamos los datos para aplanar el nombre de la categoría
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
    // Si la eliminación es exitosa, no hay datos que devolver.
}

// Reexportar las funciones de utilidad compartidas
export { getCategories, createCategory, uploadImage, deleteImage };