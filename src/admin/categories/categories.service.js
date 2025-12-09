// src/admin/categories/categories.service.js

import { supabase } from '../../config/supabaseClient.js';

export async function getCategories() {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
}

export async function createCategory(name) {
    const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre: name }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(id) {
    // Primero verificamos si hay productos usando esta categoría
    const { count, error: checkError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);

    if (checkError) throw checkError;

    if (count > 0) {
        throw new Error(`No se puede eliminar: Hay ${count} productos en esta categoría.`);
    }

    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

    if (error) throw error;
}