// src/admin/products/edit-product/edit-product.js

import { 
    getProductById,
    getCategories, 
    createCategory, 
    uploadImage, 
    updateProduct,
    deleteProduct,
    deleteImage
} from './edit-product.service.js'; 

import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];
let productId = null;
let currentProduct = null;

// --- Funciones de Control del Modal de Eliminación ---
window.openDeleteModal = openDeleteModal; 
window.closeDeleteModal = closeDeleteModal; 

function openDeleteModal() {
    if (!currentProduct) return;
    document.getElementById('product-to-delete-name').textContent = currentProduct.name;
    document.getElementById('delete-modal-container').classList.add('visible');
}

function closeDeleteModal() {
    document.getElementById('delete-modal-container').classList.remove('visible');
}

// --- Funciones de Inicialización ---

function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

export async function initEditProduct(containerId) {
    productId = getProductIdFromUrl();
    const container = document.getElementById(containerId);
    
    // Inicializar Toast
    initToastNotification();

    if (!productId) {
        showToast("❌ Error: No se especificó un ID de producto.");
        return;
    }
    
    try {
        await loadCategories(); // Carga las categorías para el buscador
        await loadProductData(parseInt(productId)); // Carga datos y rellena inputs
        attachEventListeners();
        setupSwitch(); // Configura el texto del switch
        
    } catch (error) {
        console.error("Error al inicializar la edición:", error);
        showToast(`❌ Error: ${error.message}`);
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // Preview de imagen
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImagePreview);
    
    // Click en la caja de imagen dispara el input
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            imgInput.click();
        });
    }

    // Botones de acción
    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    document.getElementById('delete-product-btn').addEventListener('click', openDeleteModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

    // --- LÓGICA DEL BUSCADOR DE CATEGORÍAS (Igual a add-product) ---
    const dropdownContainer = document.getElementById('category-dropdown');
    const searchInput = document.getElementById('category_search');
    
    if (searchInput && dropdownContainer) {
        const filterFn = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = categoriesList.filter(cat => cat.nombre.toLowerCase().includes(term));
            renderCategoriesCustomDropdown(filtered);
            dropdownContainer.classList.add('active-dropdown');
        };

        searchInput.addEventListener('input', filterFn);
        searchInput.addEventListener('focus', filterFn);

        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('active-dropdown');
            }
        });
        
        const chevron = dropdownContainer.querySelector('.chevron-down');
        if (chevron) {
            chevron.addEventListener('click', () => searchInput.focus());
        }
    }
}

// --- Lógica de Carga y Llenado ---

async function loadProductData(id) {
    const product = await getProductById(id);

    if (!product) {
         throw new Error(`Producto con ID ${id} no encontrado.`);
    }
    
    currentProduct = product;
    
    // Llenar inputs
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    document.getElementById('is_active').checked = product.is_active;
    document.getElementById('current_image_url').value = product.image_url || '';
    
    // Llenar Categoría (Custom Dropdown Logic)
    document.getElementById('category_id').value = product.categoria_id;
    // Asumimos que el servicio devuelve 'category' con el nombre
    document.getElementById('category_search').value = product.category || ''; 

    // Mostrar preview inicial
    handleImagePreview(null, product.image_url);
    
    // Actualizar texto del switch
    const statusText = document.getElementById('status-text');
    if(statusText) {
        statusText.textContent = product.is_active ? 'Producto Activo' : 'Producto Inactivo';
        statusText.style.color = product.is_active ? '#28a745' : '#dc3545';
    }
}

// --- Lógica del Formulario (Update & Delete) ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('product-id').value);
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const isActive = document.getElementById('is_active').checked;
    
    const imageInput = document.getElementById('image_file');
    const currentImageUrl = document.getElementById('current_image_url').value;
    
    if (!categoriaId) {
        showToast("⚠️ Por favor, selecciona una categoría.");
        return;
    }
    
    let imageUrl = currentImageUrl; 

    try {
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Actualizando...';

        if (imageInput.files[0]) {
            imageUrl = await uploadImage(imageInput.files[0]);
            
            // Si cambió la imagen, borramos la vieja si existe
            if (currentImageUrl && currentImageUrl !== imageUrl) {
                await deleteImage(currentImageUrl);
            }
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        const result = await updateProduct(id, productData);
        showToast(`✅ Producto "${result.name}" actualizado!`);
        
        setTimeout(() => {
             window.location.href = '../list-products/list-products.html'; 
        }, 1500);

    } catch (error) {
        console.error("Error al actualizar:", error);
        showToast(`❌ Error: ${error.message}`);
        document.getElementById('save-product-btn').disabled = false;
        document.getElementById('save-product-btn').textContent = 'Actualizar';
    }
}

async function confirmDelete() {
    if (!currentProduct) return;

    try {
        const deleteBtn = document.getElementById('confirm-delete-btn');
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Eliminando...';
        
        // Eliminar imagen primero
        if (currentProduct.image_url) {
            await deleteImage(currentProduct.image_url);
        }
        
        await deleteProduct(currentProduct.id);
        
        closeDeleteModal();
        showToast(`🗑️ Producto eliminado.`);
        
        setTimeout(() => {
            window.location.href = '../list-products/list-products.html'; 
        }, 1500);
        
    } catch (error) {
        console.error("Error al eliminar:", error);
        showToast(`❌ Error al eliminar: ${error.message}`);
        closeDeleteModal();
    }
}

// --- Funciones de Utilidad (Categorías e Imagen) ---

async function loadCategories() {
    try {
        categoriesList = await getCategories();
        // Inicializamos el dropdown (vacio o completo)
        renderCategoriesCustomDropdown(categoriesList);
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function renderCategoriesCustomDropdown(listToRender) {
    const optionsList = document.getElementById('dropdown-options');
    const hiddenInput = document.getElementById('category_id');
    const searchInput = document.getElementById('category_search');
    
    if (!optionsList) return;
    optionsList.innerHTML = ''; 
    
    if (listToRender.length === 0) {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.textContent = "No se encontraron resultados";
        li.style.color = "#999";
        optionsList.appendChild(li);
        return;
    }
    
    listToRender.forEach(category => {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.textContent = category.nombre;
        
        li.addEventListener('click', (e) => {
            e.stopPropagation(); 
            hiddenInput.value = category.id;
            searchInput.value = category.nombre; 
            document.getElementById('category-dropdown').classList.remove('active-dropdown');
        });
        
        optionsList.appendChild(li);
    });
}

function handleImagePreview(e, url = null) {
    const previewContainer = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = url || (file ? URL.createObjectURL(file) : null);
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Preview';
        previewContainer.appendChild(img);
        
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        if (file) img.onload = () => URL.revokeObjectURL(img.src);
    } else {
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
    }
}

async function handleCreateCategory() {
    const newCatInput = document.getElementById('new_category_name');
    const newCategoryName = newCatInput.value.trim();
    
    if (!newCategoryName) {
        showToast("⚠️ Introduce un nombre para la categoría.");
        return;
    }

    try {
        const createBtn = document.getElementById('create-category-btn');
        createBtn.disabled = true;
        
        const newCategory = await createCategory(newCategoryName);
        showToast(`✅ Categoría creada.`);
        
        categoriesList.push(newCategory);
        renderCategoriesCustomDropdown(categoriesList);
        
        document.getElementById('category_id').value = newCategory.id;
        document.getElementById('category_search').value = newCategory.nombre;
        
        newCatInput.value = '';
        createBtn.disabled = false;

    } catch (error) {
        showToast(`❌ Error: ${error.message}`);
    }
}

function setupSwitch() {
    const sw = document.getElementById('is_active');
    const txt = document.getElementById('status-text');
    
    if (sw && txt) {
        sw.addEventListener('change', () => {
            txt.textContent = sw.checked ? 'Producto Activo' : 'Producto Inactivo';
            txt.style.color = sw.checked ? '#28a745' : '#dc3545'; 
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initEditProduct('app-content');
});