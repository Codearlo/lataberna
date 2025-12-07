// src/services/admin/products.service.js

import { supabase, PRODUCTS_BUCKET } from '../../config/supabaseClient.js'; 

const ProductsAdminService = {
    
    // --- LÓGICA DE ALMACENAMIENTO (Storage) ---
    
    /**
     * Sube un archivo de imagen al Storage de Supabase.
     * @param {File} file - El objeto File de la imagen.
     * @returns {string} La URL pública de la imagen.
     */
    async uploadImage(file) {
        // Usamos el timestamp y un nombre aleatorio para asegurar unicidad
        const filePath = `${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
            .from(PRODUCTS_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
            
        if (error) throw error;

        // Obtener la URL pública (Supabase 2.x ya no requiere token para buckets públicos)
        const { data: publicUrlData } = supabase.storage
            .from(PRODUCTS_BUCKET)
            .getPublicUrl(data.path);
            
        return publicUrlData.publicUrl;
    },

    /**
     * Elimina una imagen del Storage de Supabase usando su URL pública.
     * @param {string} publicUrl - La URL pública de la imagen.
     */
    async deleteImage(publicUrl) {
        // La URL pública es: [SUPABASE_URL]/storage/v1/object/public/[BUCKET]/[PATH]
        // Necesitamos extraer solo el [PATH]
        const pathSegments = publicUrl.split('/');
        const filePath = pathSegments.slice(pathSegments.indexOf(PRODUCTS_BUCKET) + 1).join('/');

        const { error } = await supabase.storage
            .from(PRODUCTS_BUCKET)
            .remove([filePath]);
            
        if (error) throw error;
        return true;
    },
    
    // --- LÓGICA DE BASE DE DATOS (CRUD) ---
    
    /**
     * Obtiene todos los productos, independientemente de su estado (active/inactive).
     */
    async getAllProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: false }); 
        
        if (error) throw error;
        return data;
    },

    /**
     * Crea un nuevo producto.
     */
    async createProduct(productData) {
        // productData debe incluir: name, price, category, is_active, image_url
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select();
            
        if (error) throw error;
        return data[0];
    },

    /**
     * Actualiza un producto existente.
     */
    async updateProduct(id, productData) {
        // productData contiene solo los campos a actualizar
        const { data, error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', id)
            .select();
            
        if (error) throw error;
        return data[0];
    },

    /**
     * Elimina un producto.
     */
    async deleteProduct(id, imageUrl) {
        // 1. Eliminar la imagen del Storage (si existe)
        if (imageUrl) {
            await ProductsAdminService.deleteImage(imageUrl);
        }

        // 2. Eliminar el registro de la DB
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        return true;
    }
};

export { ProductsAdminService };