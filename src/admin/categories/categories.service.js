// src/admin/categories/categories.service.js

// CAMBIO: Importamos CATEGORIES_BUCKET
import { supabase, CATEGORIES_BUCKET } from '../../config/supabaseClient.js';

export async function getCategories() {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
}

export async function createCategory(name, imageUrl = null) {
    const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre: name, image_url: imageUrl }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCategory(id, name, imageUrl) {
    const { data, error } = await supabase
        .from('categorias')
        .update({ nombre: name, image_url: imageUrl })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Sube imagen de categoría al bucket de CATEGORÍAS.
 */
export async function uploadCategoryImage(file) {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop();
    // Prefijo simple
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;

    // CAMBIO: Usamos CATEGORIES_BUCKET
    const { error: uploadError } = await supabase.storage
        .from(CATEGORIES_BUCKET)
        .upload(fileName, file);

    if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);

    const { data } = supabase.storage
        .from(CATEGORIES_BUCKET)
        .getPublicUrl(fileName);

    return data.publicUrl;
}

export async function getCategoryProductCount(id) {
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);

    if (error) throw error;
    return count;
}

async function getOrCreateNoCategory() {
    const { data, error } = await supabase
        .from('categorias')
        .select('id')
        .ilike('nombre', 'SIN CATEGORIA')
        .maybeSingle();

    if (error) throw error;
    if (data) return data.id;

    const { data: newCat, error: createError } = await supabase
        .from('categorias')
        .insert([{ nombre: 'SIN CATEGORIA' }])
        .select()
        .single();

    if (createError) throw createError;
    return newCat.id;
}

export async function deleteCategory(id, moveProducts = false) {
    if (!moveProducts) {
        const count = await getCategoryProductCount(id);
        if (count > 0) {
            throw new Error(`La categoría tiene ${count} productos. Se requiere confirmación.`);
        }
    } else {
        const targetId = await getOrCreateNoCategory();
        if (targetId === id) throw new Error("No se puede eliminar la categoría de respaldo.");

        const { error: updateError } = await supabase
            .from('products')
            .update({ categoria_id: targetId })
            .eq('categoria_id', id);

        if (updateError) throw updateError;
    }

    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

    if (error) throw error;
}