// src/admin/products/add-product/add-product.js

import { 
    getCategories, 
    createCategory, 
    uploadImage, 
    createProduct 
} from './add-product.services.js'; 

import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];
let processedImageFile = null; 
let cropper = null; 

export async function initAddProduct(containerId) {
    console.log("Iniciando Add Product..."); 
    initToastNotification();

    try {
        await loadCategories();
        attachEventListeners();
        setupSwitch();
        setupDiscountSwitch();
    } catch (error) {
        console.error("Error en la inicialización:", error);
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // 1. Input de archivo tradicional
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);

    // 2. Click en la caja para abrir input
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            imgInput.click();
        });
    }

    // 3. EVENTOS DRAG & DROP (Arrastrar y Soltar)
    const uploadContainer = document.querySelector('.image-upload-container');
    if (uploadContainer) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, () => {
                uploadContainer.classList.add('highlight');
                uploadContainer.style.borderColor = '#d4af37';
                uploadContainer.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, () => {
                uploadContainer.classList.remove('highlight');
                uploadContainer.style.borderColor = '#ccc';
                uploadContainer.style.backgroundColor = 'transparent';
            }, false);
        });

        uploadContainer.addEventListener('drop', handleDrop, false);
    }

    // 4. EVENTO PASTE (Pegar desde portapapeles)
    document.addEventListener('paste', handlePaste);

    // Botones de Categoría y Modal
    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);
    
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);

    setupCategorySearch();
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
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

// --- GESTIÓN DE IMAGEN (Unificada) ---

// A. Input Change
function handleImageSelection(e) {
    const file = e.target.files[0];
    if (file) openCropper(file);
    e.target.value = ''; 
}

// B. Drop Handler
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
        openCropper(files[0]);
    } else {
        showToast("⚠️ Por favor suelta una imagen válida.");
    }
}

// C. Paste Handler
function handlePaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image/')) {
            openCropper(item.getAsFile());
            break; 
        }
    }
}

// D. Función Central para abrir el Cropper
function openCropper(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const imageElement = document.getElementById('image-to-crop');
        imageElement.src = event.target.result;
        
        // Resetear checkbox
        document.getElementById('remove-bg-check').checked = false;
        
        // Mostrar Modal
        const modal = document.getElementById('crop-modal');
        modal.classList.add('visible');
        
        // Iniciar Cropper
        if (cropper) cropper.destroy();
        // eslint-disable-next-line no-undef
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
}

function cropAndSave() {
    if (!cropper) return;
    let canvas = cropper.getCroppedCanvas({ width: 800, height: 800, fillColor: '#fff' });
    const removeBg = document.getElementById('remove-bg-check').checked;
    
    if (removeBg) {
        // Si removemos fondo, regeneramos canvas sin fillColor blanco
        canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });
        canvas = removeWhiteBackground(canvas);
    }

    canvas.toBlob((blob) => {
        if (!blob) return showToast("❌ Error al procesar imagen");
        
        processedImageFile = new File([blob], "imagen_producto.webp", { type: 'image/webp' });
        
        const previewContainer = document.getElementById('image-preview');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewUrl = URL.createObjectURL(processedImageFile);
        
        previewContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = previewUrl;
        img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain';
        // Fondo ajedrez para ver transparencia
        img.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)';
        img.style.backgroundSize = '20px 20px'; img.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        
        previewContainer.appendChild(img);
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        
        showToast(removeBg ? "✂️ Recortado y sin fondo!" : "✂️ Imagen recortada lista!");
        closeCropModal();
    }, 'image/webp', 0.85); 
}

function removeWhiteBackground(originalCanvas) {
    const ctx = originalCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const data = imageData.data;
    const threshold = 230; 
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        if (r > threshold && g > threshold && b > threshold) data[i+3] = 0; 
    }
    ctx.putImageData(imageData, 0, 0);
    return originalCanvas;
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.remove('visible');
    if (cropper) { cropper.destroy(); cropper = null; }
}

// --- ENVÍO DEL FORMULARIO ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const isActive = document.getElementById('is_active').checked;
    
    // Descuento
    const hasDiscount = document.getElementById('has_discount').checked;
    const discountPercentage = hasDiscount ? parseInt(document.getElementById('discount_percentage').value) : 0;

    if (!categoriaId) return showToast("⚠️ Selecciona una categoría.");
    if (!processedImageFile) return showToast("⚠️ Debes subir y recortar una imagen.");
    if (hasDiscount && (!discountPercentage || discountPercentage <= 0)) return showToast("⚠️ Ingresa un porcentaje de descuento válido.");

    try {
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Subiendo...';

        const imageUrl = await uploadImage(processedImageFile);
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
            has_discount: hasDiscount,
            discount_percentage: discountPercentage
        };

        await createProduct(productData);
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

function setupDiscountSwitch() {
    const sw = document.getElementById('has_discount');
    const txt = document.getElementById('discount-text');
    const inputContainer = document.getElementById('discount-input-container');
    
    if (sw && txt && inputContainer) {
        sw.addEventListener('change', () => {
            if (sw.checked) {
                txt.textContent = 'Con Descuento';
                txt.style.color = '#dc3545';
                inputContainer.style.display = 'flex';
            } else {
                txt.textContent = 'Sin Descuento';
                txt.style.color = '#495057';
                inputContainer.style.display = 'none';
                document.getElementById('discount_percentage').value = '';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAddProduct('app-content');
});