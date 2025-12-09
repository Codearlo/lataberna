// src/admin/products/add-product/add-product.service.js

import { supabase, PRODUCTS_BUCKET } from '../../../config/supabaseClient.js'; 

/**
 * Sube un archivo de imagen al bucket de Supabase Storage.
 * Esta función es compartida y usada por add-product y edit-product.
 * @param {File} file - El objeto File de la imagen.
 * @returns {Promise<string>} La URL pública de la imagen.
 */
export async function uploadImage(file) {
    if (!file) throw new Error("No se proporcionó archivo de imagen.");

    // Crear un nombre de archivo único
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .upload(fileName, file);

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
    }

    // Obtener la URL pública
    const { data: publicUrlData } = supabase.storage
        .from(PRODUCTS_BUCKET)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}

/**
 * Obtiene todas las categorías disponibles.
 * Esta función es compartida y usada por add-product y edit-product.
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
 * Esta función es compartida y usada por add-product y edit-product.
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
 * Crea un nuevo producto.
 * @param {object} productData - Datos del producto a crear (name, price, categoria_id, is_active, image_url).
 */
export async function createProduct(productData) {
    const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

    if (error) throw error;
    return data;
}