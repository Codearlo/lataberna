// src/services/admin/products/products.service.js

import { supabase, PRODUCTS_BUCKET } from '../../../config/supabaseClient.js'; 

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
    
    // --- LÓGICA DE CATEGORÍAS ---
    
    /**
     * Obtiene todas las categorías.
     */
    async getCategories() {
        const { data, error } = await supabase
            .from('categorias')
            .select('id, nombre')
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        return data;
    },
    
    /**
     * Crea una nueva categoría.
     * @param {string} nombre - El nombre de la nueva categoría.
     * @returns {object} La categoría creada.
     */
    async createCategory(nombre) {
        const { data, error } = await supabase
            .from('categorias')
            .insert([{ nombre }])
            .select();
            
        if (error) throw error;
        return data[0];
    },
    
    // --- LÓGICA DE BASE DE DATOS (CRUD de Productos) ---
    
    /**
     * Obtiene todos los productos, independientemente de su estado (active/inactive),
     * e incluye el nombre de la categoría (join).
     */
    async getAllProducts() {
        // Hacemos un join a la tabla 'categorias' para obtener el nombre.
        const { data, error } = await supabase
            .from('products')
            .select('*, categoria:categorias(nombre)') // Selecciona todos los campos de products y el nombre de la categoria
            .order('id', { ascending: false }); 
        
        if (error) throw error;
        // Mapeamos los datos para aplanar el nombre de la categoría para facilidad de uso en el frontend
        return data.map(product => ({
            ...product,
            category_name: product.categoria.nombre // Usamos 'category_name' para consistencia en el frontend
        }));
    },

    /**
     * Crea un nuevo producto.
     * productData debe incluir: name, price, categoria_id, is_active, image_url
     */
    async createProduct(productData) {
        // El campo 'category' fue reemplazado por 'categoria_id'
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select();
            
        if (error) throw error;
        return data[0];
    },

    /**
     * Actualiza un producto existente.
     * productData contiene solo los campos a actualizar
     */
    async updateProduct(id, productData) {
        // El campo 'category' fue reemplazado por 'categoria_id'
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