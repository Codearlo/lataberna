// src/admin/add-product/add-product.js

import { ProductsAdminService } from '../products.service.js'; // Ruta corregida

let categoriesList = [];

/**
 * Inicializa la página de agregar producto.
 */
export async function initAddProduct(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 1. Cargar datos estáticos
    await loadCategories();
    
    // 2. Adjuntar listeners
    attachEventListeners();
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    document.getElementById('image_file').addEventListener('change', handleImagePreview);
    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
}

// --- Lógica del Formulario ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const name = formData.get('name'); 
    const price = parseFloat(formData.get('price'));
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const imageFile = document.getElementById('image_file').files[0];
    const isActive = document.getElementById('is_active').checked;
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría existente.");
        return;
    }
    
    let imageUrl = ''; 

    try {
        document.getElementById('save-product-btn').disabled = true;

        if (imageFile) {
            imageUrl = await ProductsAdminService.uploadImage(imageFile);
        } else {
            alert("Debe seleccionar una imagen para el producto.");
            return;
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        const result = await ProductsAdminService.createProduct(productData);
        alert(`Producto ${result.name} agregado!`);
        
        // Redirigir a la lista después de la creación exitosa
        window.location.href = '?view=products&action=list'; 

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
    }
}


// --- Funciones de Utilidad y Categorías ---

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

function handleImagePreview(e) {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = file ? URL.createObjectURL(file) : null;
    
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