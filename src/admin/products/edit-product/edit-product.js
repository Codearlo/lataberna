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
let processedImageFile = null; 
let cropper = null; 

// --- Control Modal ---
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

function getProductIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

export async function initEditProduct(containerId) {
    productId = getProductIdFromUrl();
    initToastNotification();

    if (!productId) {
        showToast("❌ Error: No se especificó un ID.");
        return;
    }
    
    try {
        // 1. Configurar listeners y lógica visual
        attachEventListeners();
        setupSwitch(); 
        setupDiscountSwitch(); 

        // 2. Cargar datos
        await loadCategories(); 
        await loadProductData(parseInt(productId)); 
        
    } catch (error) {
        console.error("Error init:", error);
        showToast(`❌ Error: ${error.message}`);
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // 1. Input Manual
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);
    
    // 2. Click en caja
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) imageBox.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL') imgInput.click();
    });

    // 3. Drag & Drop
    const uploadContainer = document.querySelector('.image-upload-container');
    if (uploadContainer) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, () => {
                uploadContainer.style.borderColor = '#d4af37';
                uploadContainer.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, () => {
                uploadContainer.style.borderColor = '#ccc'; // O el color original de tu CSS
                uploadContainer.style.backgroundColor = 'transparent';
            }, false);
        });

        uploadContainer.addEventListener('drop', handleDrop, false);
    }

    // 4. Paste Global
    document.addEventListener('paste', handlePaste);

    // Botones
    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    document.getElementById('delete-product-btn').addEventListener('click', openDeleteModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
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
    
    if (searchInput) {
        const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

        const filterFn = (e) => {
            const term = normalize(e.target.value);
            const filtered = categoriesList.filter(cat => normalize(cat.nombre).includes(term));
            renderCategoriesCustomDropdown(filtered);
            dropdownContainer.classList.add('active-dropdown');
        };
        searchInput.addEventListener('input', filterFn);
        searchInput.addEventListener('focus', filterFn);
        document.addEventListener('click', (e) => { if (!dropdownContainer.contains(e.target)) dropdownContainer.classList.remove('active-dropdown'); });
        dropdownContainer.querySelector('.chevron-down').addEventListener('click', () => searchInput.focus());
    }
}

async function loadProductData(id) {
    const product = await getProductById(id);
    if (!product) throw new Error(`Producto ${id} no encontrado.`);
    
    currentProduct = product;
    
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    
    document.getElementById('current_image_url').value = product.image_url || '';
    document.getElementById('category_id').value = product.categoria_id;
    document.getElementById('category_search').value = product.category || ''; 

    // Estado Activo
    const activeSwitch = document.getElementById('is_active');
    activeSwitch.checked = product.is_active;
    activeSwitch.dispatchEvent(new Event('change')); 

    // Descuento
    const discountSwitch = document.getElementById('has_discount');
    discountSwitch.checked = !!product.has_discount;
    document.getElementById('discount_percentage').value = product.discount_percentage || '';
    discountSwitch.dispatchEvent(new Event('change'));

    renderImagePreview(product.image_url);
}

function renderImagePreview(url) {
    const prev = document.getElementById('image-preview');
    prev.innerHTML = '';
    if (url) {
        const img = document.createElement('img'); img.src = url;
        img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain';
        // Fondo ajedrez para ver transparencia
        img.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)';
        img.style.backgroundSize = '20px 20px'; img.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        prev.appendChild(img);
        document.getElementById('upload-placeholder').style.display='none';
    } else {
        document.getElementById('upload-placeholder').style.display='flex';
    }
}

// --- GESTIÓN DE IMAGEN UNIFICADA ---

// A. Input Change
function handleImageSelection(e) {
    const file = e.target.files[0];
    if (file) openCropper(file);
    e.target.value='';
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

// D. Función Central Cropper
function openCropper(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const imgElement = document.getElementById('image-to-crop');
        imgElement.src = event.target.result;
        
        document.getElementById('remove-bg-check').checked = false;
        document.getElementById('crop-modal').classList.add('visible');
        
        if(cropper) cropper.destroy();
        // eslint-disable-next-line no-undef
        cropper = new Cropper(imgElement, { aspectRatio: 1, viewMode: 1, autoCropArea: 0.8, background: false });
    };
    reader.readAsDataURL(file);
}

function cropAndSave() {
    if (!cropper) return;
    let canvas = cropper.getCroppedCanvas({ width:800, height:800, fillColor:'#fff' });
    const removeBg = document.getElementById('remove-bg-check').checked;

    if(removeBg) {
        canvas = cropper.getCroppedCanvas({ width:800, height:800 });
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0,0,800,800);
        const d = imgData.data;
        const threshold = 230;
        for(let i=0; i<d.length; i+=4) {
            if(d[i]>threshold && d[i+1]>threshold && d[i+2]>threshold) d[i+3]=0;
        }
        ctx.putImageData(imgData,0,0);
    }
    canvas.toBlob(blob => {
        processedImageFile = new File([blob], "edit.webp", { type:'image/webp' });
        renderImagePreview(URL.createObjectURL(processedImageFile));
        showToast(removeBg ? "✂️ Recortado y sin fondo!" : "✂️ Imagen lista!");
        closeCropModal();
    }, 'image/webp', 0.85);
}

function closeCropModal() { document.getElementById('crop-modal').classList.remove('visible'); if(cropper) { cropper.destroy(); cropper=null; } }

// --- SUBMIT ---
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('product-id').value);
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const catId = parseInt(document.getElementById('category_id').value);
    const active = document.getElementById('is_active').checked;
    const currentImg = document.getElementById('current_image_url').value;

    const hasDiscount = document.getElementById('has_discount').checked;
    const discountPercentage = hasDiscount ? parseInt(document.getElementById('discount_percentage').value) : 0;

    if (!catId) return showToast("⚠️ Selecciona categoría.");
    if (hasDiscount && (!discountPercentage || discountPercentage <= 0)) return showToast("⚠️ Porcentaje inválido.");

    try {
        const btn = document.getElementById('save-product-btn');
        btn.disabled = true; btn.textContent = 'Guardando...';

        let finalUrl = currentImg;
        if (processedImageFile) {
            finalUrl = await uploadImage(processedImageFile);
            // Opcional: Borrar imagen vieja si existía y es diferente (y está en nuestro bucket)
            if (currentImg && currentImg !== finalUrl) await deleteImage(currentImg);
        }
        
        const data = { 
            name, price, categoria_id: catId, is_active: active, image_url: finalUrl,
            has_discount: hasDiscount, discount_percentage: discountPercentage 
        };

        await updateProduct(id, data);
        showToast("✅ Producto actualizado!");
        setTimeout(() => window.location.href = '../list-products/list-products.html', 1500);
    } catch (e) {
        showToast(`❌ Error: ${e.message}`);
        document.getElementById('save-product-btn').disabled = false;
        document.getElementById('save-product-btn').textContent = 'Actualizar'; // Texto original
    }
}

async function confirmDelete() {
    if(!currentProduct) return;
    try {
        document.getElementById('confirm-delete-btn').disabled = true;
        if(currentProduct.image_url) await deleteImage(currentProduct.image_url);
        await deleteProduct(currentProduct.id);
        showToast("🗑️ Eliminado.");
        setTimeout(() => window.location.href = '../list-products/list-products.html', 1500);
    } catch (e) { showToast(`❌ Error: ${e.message}`); closeDeleteModal(); }
}

// --- UTIL ---
async function loadCategories() {
    categoriesList = await getCategories();
    renderCategoriesCustomDropdown(categoriesList);
}

function renderCategoriesCustomDropdown(list) {
    const ul = document.getElementById('dropdown-options');
    ul.innerHTML = list.length ? '' : '<li class="dropdown-item" style="color:#999">Sin resultados</li>';
    list.forEach(c => {
        const li = document.createElement('li'); li.className='dropdown-item'; li.textContent=c.nombre;
        li.addEventListener('click', (e) => {
            e.stopPropagation(); document.getElementById('category_id').value=c.id;
            document.getElementById('category_search').value=c.nombre;
            document.getElementById('category-dropdown').classList.remove('active-dropdown');
        });
        ul.appendChild(li);
    });
}

async function handleCreateCategory() {
    const name = document.getElementById('new_category_name').value.trim();
    if(!name) return showToast("⚠️ Nombre vacío.");
    try {
        const newCat = await createCategory(name);
        showToast("✅ Categoría creada.");
        categoriesList.push(newCat);
        renderCategoriesCustomDropdown(categoriesList);
        document.getElementById('category_id').value=newCat.id;
        document.getElementById('category_search').value=newCat.nombre;
        document.getElementById('new_category_name').value='';
    } catch (e) { showToast(`❌ Error: ${e.message}`); }
}

function setupSwitch() {
    document.getElementById('is_active').addEventListener('change', (e) => updateStatusText(e.target.checked));
}

function updateStatusText(active) {
    const txt = document.getElementById('status-text');
    txt.textContent = active ? 'Producto Activo' : 'Producto Inactivo';
    txt.style.color = active ? '#28a745' : '#dc3545';
}

function setupDiscountSwitch() {
    const sw = document.getElementById('has_discount');
    const txt = document.getElementById('discount-text');
    const box = document.getElementById('discount-input-container');
    
    sw.addEventListener('change', () => {
        if(sw.checked) {
            txt.textContent='Con Descuento'; 
            txt.style.color='#dc3545'; 
            box.style.display='flex';
        } else {
            txt.textContent='Sin Descuento'; 
            txt.style.color='#495057'; 
            box.style.display='none';
            document.getElementById('discount_percentage').value='';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => initEditProduct('app-content'));