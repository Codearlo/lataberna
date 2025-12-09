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
    // 1. Verificar si hay productos (Constraint Check Manual)
    const { count, error: checkError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);

    if (checkError) throw checkError;

    if (count > 0) {
        throw new Error(`La categoría tiene ${count} productos asociados.`);
    }

    // 2. Eliminar
    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

    if (error) throw error;
}