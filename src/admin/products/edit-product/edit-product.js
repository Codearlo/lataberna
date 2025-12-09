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

// Variables para el recorte
let processedImageFile = null; 
let cropper = null; 

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
    
    initToastNotification();

    if (!productId) {
        showToast("❌ Error: No se especificó un ID de producto.");
        return;
    }
    
    try {
        await loadCategories(); 
        await loadProductData(parseInt(productId)); 
        attachEventListeners();
        setupSwitch(); 
        
    } catch (error) {
        console.error("Error al inicializar la edición:", error);
        showToast(`❌ Error: ${error.message}`);
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);
    
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            imgInput.click();
        });
    }

    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    document.getElementById('delete-product-btn').addEventListener('click', openDeleteModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);

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

async function loadProductData(id) {
    const product = await getProductById(id);

    if (!product) {
         throw new Error(`Producto con ID ${id} no encontrado.`);
    }
    
    currentProduct = product;
    
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    document.getElementById('is_active').checked = product.is_active;
    document.getElementById('current_image_url').value = product.image_url || '';
    
    document.getElementById('category_id').value = product.categoria_id;
    document.getElementById('category_search').value = product.category || ''; 

    renderImagePreview(product.image_url);
    
    const statusText = document.getElementById('status-text');
    if(statusText) {
        statusText.textContent = product.is_active ? 'Producto Activo' : 'Producto Inactivo';
        statusText.style.color = product.is_active ? '#28a745' : '#dc3545';
    }
}

function renderImagePreview(url) {
    const previewContainer = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    
    previewContainer.innerHTML = '';
    
    if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Preview';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        // Fondo de cuadrícula para ver transparencia
        img.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)';
        img.style.backgroundSize = '20px 20px';
        img.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';

        previewContainer.appendChild(img);
        
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
    } else {
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
    }
}

// --- GESTIÓN DE IMAGEN, CROPPER Y FONDO BLANCO ---

function handleImageSelection(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const imageElement = document.getElementById('image-to-crop');
        imageElement.src = event.target.result;
        
        document.getElementById('remove-bg-check').checked = false;

        const modal = document.getElementById('crop-modal');
        modal.classList.add('visible');

        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(imageElement, {
            aspectRatio: 1, 
            viewMode: 1,
            autoCropArea: 0.8,
            movable: true,
            zoomable: true,
            scalable: false,
            background: false 
        });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
}

function cropAndSave() {
    if (!cropper) return;

    // 1. Obtener el canvas
    let canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 800,
        fillColor: '#fff' // Default blanco
    });

    // 2. Verificar eliminación de fondo
    const removeBg = document.getElementById('remove-bg-check').checked;
    
    if (removeBg) {
        // Regenerar sin fondo base
        canvas = cropper.getCroppedCanvas({
            width: 800, 
            height: 800
        });
        canvas = removeWhiteBackground(canvas);
    }

    // 3. Convertir a WebP
    canvas.toBlob((blob) => {
        if (!blob) {
            showToast("❌ Error al recortar imagen");
            return;
        }

        processedImageFile = new File([blob], "edit_image.webp", { type: 'image/webp' });

        const previewUrl = URL.createObjectURL(processedImageFile);
        renderImagePreview(previewUrl);

        const msg = removeBg ? "✂️ Recortado y fondo eliminado!" : "✂️ Imagen lista!";
        showToast(msg);
        closeCropModal();

    }, 'image/webp', 0.85); 
}

/**
 * Función que hace transparente lo blanco
 */
function removeWhiteBackground(originalCanvas) {
    const ctx = originalCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const data = imageData.data;
    const threshold = 230; 

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; 
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return originalCanvas;
}

function closeCropModal() {
    const modal = document.getElementById('crop-modal');
    modal.classList.remove('visible');
    if (cropper) {
        cropper.destroy();
        cropper = null;
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

        // Si hay una nueva imagen procesada
        if (processedImageFile) {
            imageUrl = await uploadImage(processedImageFile);
            
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

async function loadCategories() {
    try {
        categoriesList = await getCategories();
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