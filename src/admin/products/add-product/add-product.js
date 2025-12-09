// src/admin/products/add-product/add-product.js

import { 
    getCategories, 
    createCategory, 
    uploadImage, 
    createProduct 
} from './add-product.services.js'; 

import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];
let processedImageFile = null; // Guardará el archivo .webp final
let cropper = null; // Instancia de CropperJS

export async function initAddProduct(containerId) {
    console.log("Iniciando Add Product..."); 
    initToastNotification();

    try {
        await loadCategories();
        attachEventListeners();
        setupSwitch();
    } catch (error) {
        console.error("Error en la inicialización:", error);
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // Al seleccionar archivo -> Abrir Modal de Recorte
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);

    // Clic en la caja dispara el input file
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            imgInput.click();
        });
    }

    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);
    
    // Botones del Modal de Recorte
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);

    // Buscador Categorías
    setupCategorySearch();
}

function setupCategorySearch() {
    const dropdownContainer = document.getElementById('category-dropdown');
    const searchInput = document.getElementById('category_search');
    
    if (searchInput && dropdownContainer) {
        const filterFn = (e) => {
            const term = e.target.value ? e.target.value.toLowerCase() : '';
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
        if (chevron) chevron.addEventListener('click', () => searchInput.focus());
    }
}

// --- GESTIÓN DE IMAGEN Y CROPPER ---

function handleImageSelection(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        // 1. Poner la imagen en el modal
        const imageElement = document.getElementById('image-to-crop');
        imageElement.src = event.target.result;
        
        // 2. Mostrar el modal
        const modal = document.getElementById('crop-modal');
        modal.classList.add('visible');

        // 3. Destruir cropper previo si existe e iniciar uno nuevo
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(imageElement, {
            aspectRatio: 1, // CUADRADO PERFECTO
            viewMode: 1,    // Restringir recorte dentro de la imagen
            autoCropArea: 0.8,
            movable: true,
            zoomable: true,
            scalable: false
        });
    };
    reader.readAsDataURL(file);
    
    // Limpiar el input para permitir seleccionar la misma imagen si se cancela
    e.target.value = ''; 
}

function cropAndSave() {
    if (!cropper) return;

    // 1. Obtener el canvas recortado
    const canvas = cropper.getCroppedCanvas({
        width: 800,  // Redimensionar a un tamaño razonable para web
        height: 800
    });

    // 2. Convertir a WebP
    canvas.toBlob((blob) => {
        if (!blob) {
            showToast("❌ Error al recortar imagen");
            return;
        }

        // Crear archivo para enviar
        processedImageFile = new File([blob], "imagen_producto.webp", { type: 'image/webp' });

        // 3. Mostrar preview en el formulario
        const previewContainer = document.getElementById('image-preview');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewUrl = URL.createObjectURL(processedImageFile);

        previewContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = previewUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        previewContainer.appendChild(img);

        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';

        showToast("✂️ Imagen recortada lista!");
        closeCropModal();

    }, 'image/webp', 0.85); // Calidad WebP 85%
}

function closeCropModal() {
    const modal = document.getElementById('crop-modal');
    modal.classList.remove('visible');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// --- ENVÍO DEL FORMULARIO ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const isActive = document.getElementById('is_active').checked;
    
    if (!categoriaId) {
        showToast("⚠️ Selecciona una categoría.");
        return;
    }

    if (!processedImageFile) {
        showToast("⚠️ Debes subir y recortar una imagen.");
        return;
    }

    try {
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Subiendo...';

        // Subir la imagen procesada
        const imageUrl = await uploadImage(processedImageFile);
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        const result = await createProduct(productData);
        showToast(`✅ Producto agregado!`);
        
        setTimeout(() => {
            window.location.href = '../list-products/list-products.html'; 
        }, 1500);

    } catch (error) {
        console.error(error);
        showToast(`❌ Error: ${error.message}`);
        document.getElementById('save-product-btn').disabled = false;
        document.getElementById('save-product-btn').textContent = 'Guardar Producto';
    }
}

// --- UTILIDADES ---

async function loadCategories() {
    try {
        categoriesList = await getCategories();
        renderCategoriesCustomDropdown(categoriesList);
    } catch (error) {
        console.error(error);
    }
}

function renderCategoriesCustomDropdown(listToRender) {
    const optionsList = document.getElementById('dropdown-options');
    const hiddenInput = document.getElementById('category_id');
    const searchInput = document.getElementById('category_search');
    const dropdownContainer = document.getElementById('category-dropdown');
    
    if (!optionsList) return;
    optionsList.innerHTML = ''; 
    
    if (listToRender.length === 0) {
        optionsList.innerHTML = '<li class="dropdown-item" style="color:#999; cursor:default;">Sin resultados</li>';
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
            dropdownContainer.classList.remove('active-dropdown');
        });
        optionsList.appendChild(li);
    });
}

async function handleCreateCategory() {
    const newCatInput = document.getElementById('new_category_name');
    const name = newCatInput.value.trim();
    if (!name) return showToast("⚠️ Escribe un nombre.");

    try {
        const btn = document.getElementById('create-category-btn');
        btn.disabled = true;
        const newCat = await createCategory(name);
        showToast(`✅ Categoría creada.`);
        categoriesList.push(newCat);
        renderCategoriesCustomDropdown(categoriesList);
        
        document.getElementById('category_id').value = newCat.id;
        document.getElementById('category_search').value = newCat.nombre;
        newCatInput.value = '';
        btn.disabled = false;
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
    initAddProduct('app-content');
});