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

/**
 * Cuenta cuántos productos tiene una categoría.
 */
export async function getCategoryProductCount(id) {
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);

    if (error) throw error;
    return count;
}

/**
 * Busca o crea la categoría "SIN CATEGORIA" para refugio de productos huérfanos.
 */
async function getOrCreateNoCategory() {
    // 1. Buscar si ya existe (insensible a mayúsculas)
    const { data, error } = await supabase
        .from('categorias')
        .select('id')
        .ilike('nombre', 'SIN CATEGORIA')
        .maybeSingle();

    if (error) throw error;
    if (data) return data.id;

    // 2. Si no existe, crearla
    const { data: newCat, error: createError } = await supabase
        .from('categorias')
        .insert([{ nombre: 'SIN CATEGORIA' }])
        .select()
        .single();

    if (createError) throw createError;
    return newCat.id;
}

/**
 * Elimina una categoría.
 * @param {number} id - ID de la categoría a eliminar.
 * @param {boolean} moveProducts - Si es true, mueve los productos a "SIN CATEGORIA" antes de borrar.
 */
export async function deleteCategory(id, moveProducts = false) {
    // 1. Verificación inicial si NO se solicitó mover productos
    if (!moveProducts) {
        const count = await getCategoryProductCount(id);
        if (count > 0) {
            throw new Error(`La categoría tiene ${count} productos. Se requiere confirmación para moverlos.`);
        }
    } else {
        // 2. Lógica de Reasignación (Si moveProducts es true)
        const targetId = await getOrCreateNoCategory();

        // Evitar bucle si intentamos borrar la propia categoría "SIN CATEGORIA"
        if (targetId === id) {
            throw new Error("No se puede eliminar la categoría de respaldo 'SIN CATEGORIA' si tiene productos.");
        }

        // Mover los productos a la nueva categoría
        const { error: updateError } = await supabase
            .from('products')
            .update({ categoria_id: targetId })
            .eq('categoria_id', id);

        if (updateError) throw updateError;
    }

    // 3. Eliminar la categoría (ahora vacía)
    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

    if (error) throw error;
}