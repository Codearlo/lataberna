// src/admin/packs/edit-pack/edit-pack.services.js

import { supabase, PRODUCTS_BUCKET } from '../../../config/supabaseClient.js'; 

// Importamos funciones base de otros servicios para reutilizar la lógica
import { getCategories, createCategory, uploadImage, getAvailableProducts, getExtras } from '../add-pack/add-pack.services.js';

// Reexportamos funciones base
export { getCategories, createCategory, uploadImage, getAvailableProducts, getExtras };

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
 * Obtiene un Pack específico por ID, incluyendo su categoría y composición.
 * @param {number} id - El ID del Pack (producto).
 */
export async function getPackById(id) {
    // 1. Obtener los detalles básicos del Pack
    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, categoria:categorias(nombre)')
        .eq('id', id)
        .eq('is_pack', true) // Asegurar que es un pack
        .limit(1)
        .single();

    if (productError) {
        console.error("Error fetching pack data:", productError);
        throw new Error(`Pack con ID ${id} no encontrado o error de base de datos.`);
    }
    
    // 2. Obtener la composición de Extras del Pack
    const { data: compositionData, error: compositionError } = await supabase
        .from('packs_composition')
        .select('quantity, extra:extras(id, nombre)')
        .eq('pack_product_id', id);

    if (compositionError) {
        console.error("Error fetching pack composition:", compositionError);
        throw compositionError;
    }

    // Mapear la composición para un formato más fácil de usar en JS
    const composition = compositionData.map(item => ({
        id: item.extra.id,
        name: item.extra.nombre,
        qty: item.quantity
    }));

    return {
        ...productData,
        category: productData.categoria ? productData.categoria.nombre : 'Sin Categoría',
        composition: composition,
    };
}

/**
 * Actualiza un Pack existente (producto y composición).
 * @param {number} id - El ID del Pack a actualizar.
 * @param {object} packData - Los datos del producto (name, price, categoria_id, is_active, image_url).
 * @param {Array<object>} compositionData - Array de {extra_id, quantity} para la tabla packs_composition.
 */
export async function updatePack(id, packData, compositionData) {
    // 1. Actualizar la tabla 'products'
    const { data: product, error: productError } = await supabase
        .from('products')
        .update(packData)
        .eq('id', id)
        .eq('is_pack', true)
        .select()
        .single();

    if (productError) {
        console.error("Error al actualizar producto Pack:", productError);
        throw productError;
    }

    // 2. Limpiar la composición antigua
    const { error: deleteError } = await supabase
        .from('packs_composition')
        .delete()
        .eq('pack_product_id', id);
        
    if (deleteError) {
        console.error("Error al limpiar composición antigua:", deleteError);
        // Continuamos con la inserción, pero registramos el error
    }

    // 3. Insertar la nueva composición del Pack
    const compositionToInsert = compositionData.map(item => ({
        pack_product_id: id,
        extra_id: item.extra_id,
        quantity: item.quantity,
    }));
    
    const { error: compositionError } = await supabase
        .from('packs_composition')
        .insert(compositionToInsert);

    if (compositionError) {
        console.error("Error al insertar nueva composición del Pack:", compositionError);
        throw compositionError;
    }

    return product;
}

/**
 * Elimina un Pack.
 * @param {number} id - El ID del Pack a eliminar.
 */
export async function deletePack(id) {
    // La eliminación en 'products' con ON DELETE CASCADE se encargará de 'packs_composition'
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('is_pack', true); // Solo eliminar si es un pack

    if (error) throw error;
}