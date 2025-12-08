// src/admin/products/products.js

import { ProductsAdminService } from '../../services/admin/products.service.js';

let productsList = [];
let categoriesList = []; // AGREGA: Lista de categorías
let isEditing = false;
let editingProductId = null;

// RUTA DE FETCH: Es relativa al archivo HTML base (src/admin/admin.html)
const PRODUCT_FORM_HTML_PATH = './products/products.html'; 

/**
 * Inicializa la vista de administración de productos.
 * @param {string} containerId - ID del contenedor donde inyectar el HTML.
 */
export async function initProductsAdmin(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 1. Cargar el HTML de la interfaz de productos
    try {
        const response = await fetch(PRODUCT_FORM_HTML_PATH);
        if (!response.ok) {
            throw new Error(`Error al obtener HTML. Status: ${response.status} URL: ${response.url}`);
        }
        const html = await response.text();
        container.innerHTML = html;
        
        // 2. Cargar categorías antes de adjuntar eventos y productos
        await loadCategories();
        
        // 3. Adjuntar eventos y cargar datos iniciales
        attachEventListeners();
        await loadProducts();
        
    } catch (error) {
        console.error("Error al inicializar el panel de productos:", error);
        container.innerHTML = `<p class="error-msg">Error al cargar la interfaz de administración.</p>`;
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('image_file').addEventListener('change', handleImagePreview);
    
    document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);
    
    // Delegación de eventos para la tabla
    document.getElementById('products-table').addEventListener('click', handleTableActions);
    
    // AGREGA: Evento para crear nueva categoría
    const createCategoryBtn = document.getElementById('create-category-btn');
    createCategoryBtn.addEventListener('click', handleCreateCategory);
    
    // ⭐ NUEVO: Detener la propagación de clic en el input y botón de la nueva categoría
    // Esto previene que el clic active listeners en elementos contenedores (como el
    // que podría estar llamando al diálogo de archivos).
    document.getElementById('new_category_name').addEventListener('click', (e) => e.stopPropagation());
    createCategoryBtn.addEventListener('click', (e) => e.stopPropagation()); 
}

// --- Manejo del Formulario de Productos ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const id = document.getElementById('product-id').value;
    const name = formData.get('name'); 
    const price = parseFloat(formData.get('price'));
    const categoriaId = parseInt(document.getElementById('category_id').value); // CAMBIO: Obtiene el ID de la categoría
    const imageFile = document.getElementById('image_file').files[0];
    const currentImageUrl = document.getElementById('current_image_url').value;
    const isActive = document.getElementById('is_active').checked;
    
    // 1. Validación de Categoría
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría existente.");
        return;
    }
    
    let imageUrl = currentImageUrl; // Usar URL actual por defecto

    try {
        document.getElementById('save-product-btn').disabled = true;

        // 2. Subir nueva imagen si se seleccionó un archivo
        if (imageFile) {
            imageUrl = await ProductsAdminService.uploadImage(imageFile);
            
            // Si estábamos editando y la URL de la imagen cambió, eliminamos la vieja
            if (isEditing && currentImageUrl && currentImageUrl !== imageUrl) {
                await ProductsAdminService.deleteImage(currentImageUrl);
            }
        }
        
        // 3. Preparar datos para DB
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId, // CAMBIO: Usa categoria_id
            is_active: isActive,
            image_url: imageUrl,
        };

        let result;
        if (isEditing) {
            // EDITAR
            result = await ProductsAdminService.updateProduct(parseInt(id), productData);
            alert(`Producto ${result.name} actualizado!`);
        } else {
            // CREAR
            result = await ProductsAdminService.createProduct(productData);
            alert(`Producto ${result.name} agregado!`);
        }

        // 4. Recargar y limpiar
        await loadProducts();
        resetForm();

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
    }
}

// --- Manejo de Categorías ---

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
    select.innerHTML = '<option value="">-- Seleccione una Categoría --</option>'; // Limpiar
    
    categoriesList.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        select.appendChild(option);
    });
}

async function handleCreateCategory() {
    const newCategoryName = document.getElementById('new_category_name').value.trim();
    
    if (!newCategoryName) {
        alert("Por favor, introduce el nombre de la nueva categoría.");
        return;
    }
    
    if (categoriesList.some(c => c.nombre.toLowerCase() === newCategoryName.toLowerCase())) {
        alert(`La categoría "${newCategoryName}" ya existe.`);
        document.getElementById('new_category_name').value = '';
        return;
    }

    try {
        document.getElementById('create-category-btn').disabled = true;
        
        const newCategory = await ProductsAdminService.createCategory(newCategoryName);
        
        alert(`Categoría "${newCategory.nombre}" creada con éxito.`);
        
        // 1. Recargar la lista de categorías
        await loadCategories();
        
        // 2. Seleccionar la nueva categoría en el dropdown
        document.getElementById('category_id').value = newCategory.id;
        
        // 3. Limpiar el input de nueva categoría
        document.getElementById('new_category_name').value = '';

    } catch (error) {
        console.error("Error al crear categoría:", error);
        alert(`Error al crear categoría: ${error.message}`);
    } finally {
        document.getElementById('create-category-btn').disabled = false;
    }
}


// --- Manejo de la Tabla ---

async function loadProducts() {
    try {
        // CAMBIO: La función getAllProducts ahora devuelve objetos con el nombre de la categoría aplanado (product.category_name)
        productsList = await ProductsAdminService.getAllProducts();
        renderProductsTable();
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

function renderProductsTable() {
    const tableBody = document.querySelector('#products-table tbody');
    tableBody.innerHTML = '';
    
    productsList.forEach(product => {
        const row = tableBody.insertRow();
        row.dataset.id = product.id;
        
        // CAMBIO: Usa product.category_name en lugar de product.category
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>S/ ${product.price.toFixed(2)}</td>
            <td>${product.category_name}</td> 
            <td>${product.is_active ? '✅' : '❌'}</td>
            <td>
                <button class="action-btn edit-btn" data-action="edit">Editar</button>
                <button class="action-btn delete-btn" data-action="delete">Eliminar</button>
            </td>
        `;
    });
}

function handleTableActions(e) {
    const target = e.target;
    if (target.tagName !== 'BUTTON') return;
    
    const row = target.closest('tr');
    const productId = parseInt(row.dataset.id);
    const action = target.dataset.action;
    
    if (action === 'edit') {
        startEditing(productId);
    } else if (action === 'delete') {
        confirmDelete(productId);
    }
}

function startEditing(id) {
    const product = productsList.find(p => p.id === id);
    if (!product) return;
    
    // 1. Llenar el formulario
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    // CAMBIO: Setea el ID de la categoría (asumiendo que el campo se llama categoria_id en el objeto del producto)
    document.getElementById('category_id').value = product.categoria_id; 
    document.getElementById('is_active').checked = product.is_active;
    document.getElementById('current_image_url').value = product.image_url || '';
    
    // 2. Mostrar preview y cambiar botones
    handleImagePreview(null, product.image_url);
    document.getElementById('save-product-btn').textContent = 'Actualizar';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    
    isEditing = true;
    editingProductId = id;
    window.scrollTo(0, 0); // Desplazar al inicio para ver el formulario
}

async function confirmDelete(id) {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
    
    const product = productsList.find(p => p.id === id);
    if (!product) return;

    try {
        await ProductsAdminService.deleteProduct(id, product.image_url);
        alert(`Producto ${product.name} eliminado.`);
        await loadProducts();
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('current_image_url').value = '';
    document.getElementById('save-product-btn').textContent = 'Guardar Producto';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('image_file').value = ''; // Limpiar el campo de archivo
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('new_category_name').value = ''; // Limpiar campo de nueva categoría
    
    isEditing = false;
    editingProductId = null;
}

// --- Utilidades ---

function handleImagePreview(e, url = null) {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = url || (file ? URL.createObjectURL(file) : null);
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '150px';
        img.style.maxHeight = '150px';
        img.alt = 'Preview';
        previewContainer.appendChild(img);

        if (file) {
            // Limpieza necesaria si se crea una URL de objeto
            img.onload = () => URL.revokeObjectURL(img.src);
        }
    }
}