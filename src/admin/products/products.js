// src/admin/products/products.js

// CORRECCIÓN DE RUTA FINAL: Subir dos niveles (products, admin) y bajar a services/admin
import { ProductsAdminService } from '../../services/admin/products.service.js';

let productsList = [];
let isEditing = false;
let editingProductId = null;

const PRODUCT_FORM_HTML_PATH = './admin/products/products.html'; // Ruta de fetch desde main.js

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
        const html = await response.text();
        container.innerHTML = html;
        
        // 2. Adjuntar eventos y cargar datos iniciales
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
}

// --- Manejo del Formulario ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const id = document.getElementById('product-id').value;
    const name = formData.get('name');
    const price = parseFloat(formData.get('price'));
    const category = formData.get('category');
    const imageFile = document.getElementById('image_file').files[0];
    const currentImageUrl = document.getElementById('current_image_url').value;
    const isActive = document.getElementById('is_active').checked;
    
    let imageUrl = currentImageUrl; // Usar URL actual por defecto

    try {
        document.getElementById('save-product-btn').disabled = true;

        // 1. Subir nueva imagen si se seleccionó un archivo
        if (imageFile) {
            imageUrl = await ProductsAdminService.uploadImage(imageFile);
            
            // Si estábamos editando y la URL de la imagen cambió, eliminamos la vieja
            if (isEditing && currentImageUrl && currentImageUrl !== imageUrl) {
                await ProductsAdminService.deleteImage(currentImageUrl);
            }
        }
        
        // 2. Preparar datos para DB
        const productData = {
            name: name,
            price: price,
            category: category,
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

        // 3. Recargar y limpiar
        await loadProducts();
        resetForm();

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
    }
}

// --- Manejo de la Tabla ---

async function loadProducts() {
    try {
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
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>S/ ${product.price.toFixed(2)}</td>
            <td>${product.category}</td>
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
    document.getElementById('category').value = product.category;
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