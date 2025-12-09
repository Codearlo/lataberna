// src/admin/products.service.js

import { supabase, PRODUCTS_BUCKET } from '../config/supabaseClient.js'; 

const ProductsAdminService = {
    
    // --- LÓGICA DE ALMACENAMIENTO (Storage) ---
    
    /**
     * Sube un archivo de imagen al Storage de Supabase.
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

        const { data: publicUrlData } = supabase.storage
            .from(PRODUCTS_BUCKET)
            .getPublicUrl(data.path);
            
        return publicUrlData.publicUrl;
    },

    /**
     * Elimina una imagen del Storage de Supabase usando su URL pública.
     */
    async deleteImage(publicUrl) {
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
     */
    async createCategory(nombre) {
        const { data, error } = await supabase
            .from('categorias')
            .insert([{ nombre }])
            .select();
            
        if (error) throw error;
        return data[0];
    },
    
    // --- LÓGICA DE BASE DE DATOS (CRUD y Búsqueda Paginada) ---
    
    /**
     * Obtiene productos filtrados y paginados, usando la función RPC en DB.
     */
    async getFilteredProductsPaged({ searchTerm = '', itemsPerPage = 10, pageNumber = 1 }) {
        try {
            const { data, error } = await supabase.rpc('search_products_paged', {
                search_term: searchTerm,
                items_per_page: itemsPerPage,
                page_number: pageNumber
            });

            if (error) throw error;
            
            const productsData = data || []; 
            
            const { data: countData, error: countError } = await supabase.rpc('count_filtered_products', {
                search_term: searchTerm
            });

            if (countError) throw countError;
            
            const totalCount = (Array.isArray(countData) && countData.length > 0) ? countData[0] : 0; 

            const { data: categories, error: catError } = await supabase
                .from('categorias')
                .select('id, nombre');

            if (catError) throw catError;

            const categoryMap = (categories || []).reduce((map, cat) => {
                map[cat.id] = cat.nombre;
                return map;
            }, {});

            const productsWithCategory = productsData.map(product => ({
                ...product,
                category_name: categoryMap[product.categoria_id] || 'Sin Categoría'
            }));
            
            return {
                products: productsWithCategory,
                totalCount: totalCount
            };

        } catch (err) {
            console.error("Error al obtener productos filtrados:", err);
            return {
                products: [],
                totalCount: 0
            };
        }
    },


    /**
     * Crea un nuevo producto.
     */
    async createProduct(productData) {
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
        if (imageUrl) {
            await ProductsAdminService.deleteImage(imageUrl);
        }

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        return true;
    }
};

export { ProductsAdminService };