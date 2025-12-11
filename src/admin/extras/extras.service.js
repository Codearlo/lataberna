// src/admin/extras/extras.service.js

import { supabase } from '../../config/supabaseClient.js';

const TABLE_NAME = 'extras';

export async function getExtras() {
    // Nota: Asumimos que la tabla 'extras' tiene las columnas 'id' y 'nombre'
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error) {
        console.error("Error fetching extras:", error);
        throw error;
    }
    return data;
}

export async function createExtra(name) {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([{ nombre: name }])
        .select()
        .single();

    if (error) {
        console.error("Error creating extra:", error);
        throw error;
    }
    return data;
}

/**
 * Elimina uno o más extras.
 * @param {number[]} ids - Array de IDs de los extras a eliminar.
 */
export async function deleteExtras(ids) {
    // Idealmente, se debe verificar si el extra está en algún pack antes de borrar
    // Por simplicidad, aquí se borra directamente
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);

    if (error) {
        console.error("Error deleting extras:", error);
        throw error;
    }
}