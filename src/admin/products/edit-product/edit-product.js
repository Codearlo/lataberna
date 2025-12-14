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
        // 1. PRIMERO: Configurar listeners y lógica visual
        // Esto asegura que cuando los datos lleguen y muevan los switches, la UI reaccione
        attachEventListeners();
        setupSwitch(); 
        setupDiscountSwitch(); 

        // 2. SEGUNDO: Cargar datos
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
    
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);
    
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) imageBox.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL') imgInput.click();
    });

    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    document.getElementById('delete-product-btn').addEventListener('click', openDeleteModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);

    setupCategorySearch();
}

function setupCategorySearch() {
    const dropdownContainer = document.getElementById('category-dropdown');
    const searchInput = document.getElementById('category_search');
    
    if (searchInput) {
        // Normalización para búsquedas sin acentos
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
    activeSwitch.dispatchEvent(new Event('change')); // Actualizar texto "Producto Activo"

    // Cargar descuento
    const discountSwitch = document.getElementById('has_discount');
    discountSwitch.checked = !!product.has_discount;
    document.getElementById('discount_percentage').value = product.discount_percentage || '';
    
    // Disparar evento para actualizar UI (Ahora sí funcionará porque setupDiscountSwitch ya corrió)
    discountSwitch.dispatchEvent(new Event('change'));

    renderImagePreview(product.image_url);
}

function renderImagePreview(url) {
    const prev = document.getElementById('image-preview');
    prev.innerHTML = '';
    if (url) {
        const img = document.createElement('img'); img.src = url;
        img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain';
        prev.appendChild(img);
        document.getElementById('upload-placeholder').style.display='none';
    } else {
        document.getElementById('upload-placeholder').style.display='flex';
    }
}

// --- IMAGEN ---
function handleImageSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('image-to-crop').src = event.target.result;
        document.getElementById('remove-bg-check').checked = false;
        document.getElementById('crop-modal').classList.add('visible');
        if(cropper) cropper.destroy();
        // eslint-disable-next-line no-undef
        cropper = new Cropper(document.getElementById('image-to-crop'), { aspectRatio: 1, viewMode: 1, autoCropArea: 0.8, background: false });
    };
    reader.readAsDataURL(file);
    e.target.value='';
}

function cropAndSave() {
    if (!cropper) return;
    let canvas = cropper.getCroppedCanvas({ width:800, height:800, fillColor:'#fff' });
    if(document.getElementById('remove-bg-check').checked) {
        canvas = cropper.getCroppedCanvas({ width:800, height:800 });
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0,0,800,800);
        const d = imgData.data;
        for(let i=0; i<d.length; i+=4) if(d[i]>230 && d[i+1]>230 && d[i+2]>230) d[i+3]=0;
        ctx.putImageData(imgData,0,0);
    }
    canvas.toBlob(blob => {
        processedImageFile = new File([blob], "edit.webp", { type:'image/webp' });
        renderImagePreview(URL.createObjectURL(processedImageFile));
        showToast("✂️ Imagen lista!");
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
    
    // Configuración inicial del listener
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