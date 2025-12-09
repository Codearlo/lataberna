// src/admin/edit-product/edit-product.js

import { ProductsAdminService } from '../products.service.js'; // Ruta corregida

let categoriesList = [];
let productId = null;
let currentProduct = null;

// --- Funciones de Control del Modal de Eliminación (ahora interno) ---
// Se exponen globalmente para su uso en el HTML del modal de eliminación.
window.openDeleteModal = openDeleteModal; 
window.closeDeleteModal = closeDeleteModal; 

function openDeleteModal() {
    if (!currentProduct) return;
    document.getElementById('product-to-delete-name').textContent = currentProduct.name;
    document.getElementById('delete-modal-container').classList.add('visible');
}

function closeDeleteModal() {
    document.getElementById('product-to-delete-name').textContent = '';
    document.getElementById('delete-modal-container').classList.remove('visible');
}

// --- Funciones de Inicialización ---

function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Inicializa la página de edición de producto.
 */
export async function initEditProduct(containerId) {
    productId = getProductIdFromUrl();
    const container = document.getElementById(containerId);

    if (!container || !productId) {
        container.innerHTML = `<p class="error-msg">Error: ID de producto no especificado para edición.</p>`;
        return;
    }
    
    try {
        // 1. Cargar datos estáticos (categorías)
        await loadCategories();
        
        // 2. Cargar datos del producto específico
        await loadProductData(parseInt(productId));
        
        // 3. Adjuntar listeners
        attachEventListeners();
        
    } catch (error) {
        console.error("Error al inicializar la edición:", error);
        container.innerHTML = `<p class="error-msg">Error al cargar datos: ${error.message}</p>`;
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    document.getElementById('image_file').addEventListener('change', handleImagePreview);
    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    document.getElementById('delete-product-btn').addEventListener('click', openDeleteModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
}

// --- Lógica de Carga y Llenado ---

async function loadProductData(id) {
    // Usamos la búsqueda paginada para obtener el producto
    const result = await ProductsAdminService.getFilteredProductsPaged({
        searchTerm: id.toString(), // Usamos el ID como término de búsqueda
        itemsPerPage: 1,
        pageNumber: 1
    });

    if (!result.products || result.products.length === 0) {
         throw new Error(`Producto con ID ${id} no encontrado.`);
    }
    
    const product = result.products[0];
    
    currentProduct = product;
    
    // Llenar el formulario
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    document.getElementById('category_id').value = product.categoria_id; 
    document.getElementById('is_active').checked = product.is_active;
    document.getElementById('current_image_url').value = product.image_url || '';
    
    // Mostrar preview
    handleImagePreview(null, product.image_url);
}

// --- Lógica del Formulario (Update & Delete) ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const id = parseInt(document.getElementById('product-id').value);
    const name = formData.get('name'); 
    const price = parseFloat(formData.get('price'));
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const imageFile = document.getElementById('image_file').files[0];
    const currentImageUrl = document.getElementById('current_image_url').value;
    const isActive = document.getElementById('is_active').checked;
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría existente.");
        return;
    }
    
    let imageUrl = currentImageUrl; 

    try {
        document.getElementById('save-product-btn').disabled = true;

        if (imageFile) {
            imageUrl = await ProductsAdminService.uploadImage(imageFile);
            
            if (currentImageUrl && currentImageUrl !== imageUrl) {
                await ProductsAdminService.deleteImage(currentImageUrl);
            }
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        const result = await ProductsAdminService.updateProduct(id, productData);
        alert(`Producto ${result.name} actualizado!`);
        
        // Redirigir a la lista después de la actualización exitosa
        window.location.href = '?view=products&action=list'; 

    } catch (error) {
        console.error("Error al actualizar producto:", error);
        alert(`Error al actualizar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
    }
}

async function confirmDelete() {
    if (!currentProduct) return;

    try {
        document.getElementById('confirm-delete-btn').disabled = true;
        closeDeleteModal(); 
        
        await ProductsAdminService.deleteProduct(currentProduct.id, currentProduct.image_url);
        
        alert(`Producto ${currentProduct.name} eliminado.`);
        
        // Redirigir a la lista después de la eliminación
        window.location.href = '?view=products&action=list'; 
        
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(`Error al eliminar: ${error.message}`);
    } finally {
        document.getElementById('confirm-delete-btn').disabled = false;
    }
}

// --- Funciones de Utilidad y Categorías (Reutilizadas) ---

async function loadCategories() {
    try {
        categoriesList = await ProductsAdminService.getCategories();
        renderCategoriesSelect();
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function renderCategoriesSelect() {
    const select = document.getElementById('category_id');
    select.innerHTML = '<option value="">-- Seleccione una Categoría --</option>'; 
    
    categoriesList.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        select.appendChild(option);
    });
}

function handleImagePreview(e, url = null) {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = url || (file ? URL.createObjectURL(file) : null);
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Preview';
        previewContainer.appendChild(img);

        if (file) {
            img.onload = () => URL.revokeObjectURL(img.src);
        }
    }
}

async function handleCreateCategory() {
    const newCategoryName = document.getElementById('new_category_name').value.trim();
    
    if (!newCategoryName) {
        alert("Por favor, introduce el nombre de la nueva categoría.");
        return;
    }

    try {
        document.getElementById('create-category-btn').disabled = true;
        
        const newCategory = await ProductsAdminService.createCategory(newCategoryName);
        
        alert(`Categoría "${newCategory.nombre}" creada con éxito.`);
        
        categoriesList.push(newCategory);
        renderCategoriesSelect();
        
        document.getElementById('category_id').value = newCategory.id;
        document.getElementById('new_category_name').value = '';

    } catch (error) {
        console.error("Error al crear categoría:", error);
        alert(`Error al crear categoría: ${error.message}`);
    } finally {
        document.getElementById('create-category-btn').disabled = false;
    }
}