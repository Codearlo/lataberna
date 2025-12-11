// src/admin/packs/add-pack/add-pack.services.js

import { supabase, PRODUCTS_BUCKET } from '../../../config/supabaseClient.js'; 

/**
 * Sube un archivo de imagen al bucket de Supabase Storage.
 * @param {File} file - El objeto File de la imagen.
 * @returns {Promise<string>} La URL pública de la imagen.
 */
export async function uploadImage(file) {
    if (!file) throw new Error("No se proporcionó archivo de imagen.");

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_pack_${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .upload(fileName, file);

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from(PRODUCTS_BUCKET)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}

/**
 * Obtiene todas las categorías disponibles.
 */
export async function getCategories() {
    const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Crea una nueva categoría.
 * @param {string} name - El nombre de la nueva categoría.
 */
export async function createCategory(name) {
    const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre: name }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Obtiene todos los productos individuales disponibles (no Packs).
 * Esto se usa para seleccionar el producto base del Pack.
 */
export async function getAvailableProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_pack', false) // Solo productos individuales
        .eq('is_active', true) // Solo activos para la base del pack
        .order('name', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Obtiene todos los extras disponibles.
 */
export async function getExtras() {
    const { data, error } = await supabase
        .from('extras')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Crea un nuevo Pack (Producto) y su Composición.
 * @param {object} packData - Datos del Pack a crear (name, price, categoria_id, is_active, image_url, is_pack: true).
 * @param {Array<object>} compositionData - Array de {extra_id, quantity} para la tabla packs_composition.
 */
export async function createPack(packData, compositionData) {
    const { data: pack, error: productError } = await supabase
        .from('products')
        .insert([{ ...packData, is_pack: true }]) // Forzamos is_pack a true
        .select('id')
        .single();

    if (productError) {
        console.error("Error al crear producto Pack:", productError);
        throw productError;
    }

    // Preparar la data de composición con el ID del Pack recién creado
    const compositionToInsert = compositionData.map(item => ({
        pack_product_id: pack.id,
        extra_id: item.extra_id,
        quantity: item.quantity,
    }));
    
    // Insertar la composición del Pack
    const { error: compositionError } = await supabase
        .from('packs_composition')
        .insert(compositionToInsert);

    if (compositionError) {
        // Rollback: eliminar el producto si falla la composición
        await supabase.from('products').delete().eq('id', pack.id);
        console.error("Error al crear composición del Pack:", compositionError);
        throw compositionError;
    }

    return pack; // Retorna el Pack creado
}