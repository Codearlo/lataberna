// src/admin/packs/add-pack/add-pack.js

import { 
    getCategories, 
    createCategory, 
    uploadImage, 
    getAvailableProducts,
    getExtras,
    createExtra,
    createPack
} from './add-pack.services.js'; 

import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];
let availableProducts = [];
let availableExtras = [];
let packComposition = new Map(); 

let selectedProductName = ""; 
let processedImageFile = null; 
let cropper = null; 

export async function initAddPack(containerId) {
    console.log("Iniciando Add Pack..."); 
    initToastNotification();

    try {
        await loadInitialData();
        setupCategoryDropdown();
        setupProductDropdown();
        setupExtraDropdown();
        attachEventListeners(); 
        setupSwitch();
        setupDiscountSwitch(); // Nuevo
    } catch (error) {
        console.error("Error en la inicialización:", error);
    }
}

async function loadInitialData() {
    const [cats, prods, extras] = await Promise.all([
        getCategories(),
        getAvailableProducts(),
        getExtras()
    ]);
    categoriesList = cats;
    availableProducts = prods;
    availableExtras = extras;
    renderCompositionList();
}

function attachEventListeners() {
    const form = document.getElementById('pack-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);
    document.addEventListener('paste', handlePaste);

    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            imgInput.click();
        });
    }

    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);

    const createExtraBtn = document.getElementById('create-extra-btn');
    if (createExtraBtn) createExtraBtn.addEventListener('click', handleCreateExtra);
    
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);
    
    const addBtn = document.getElementById('add-extra-btn');
    if (addBtn) addBtn.addEventListener('click', addExtraToComposition);
    
    document.addEventListener('click', (e) => {
        const dropdownContainers = document.querySelectorAll('.custom-dropdown-container');
        let clickedInsideDropdown = false;
        dropdownContainers.forEach(cont => {
            if (cont.contains(e.target)) clickedInsideDropdown = true;
        });
        if (!clickedInsideDropdown) {
             dropdownContainers.forEach(cont => cont.classList.remove('active-dropdown'));
        }
    });
}

function updatePackName() {
    const nameInput = document.getElementById('name');
    if (!selectedProductName) {
        nameInput.value = '';
        return;
    }
    let generatedName = `Combo ${selectedProductName}`;
    packComposition.forEach(extra => {
        generatedName += ` + ${extra.name}`;
    });
    nameInput.value = generatedName;
}

// --- DROPDOWNS ---
function setupCustomDropdown(containerId, searchInputId, hiddenInputId, optionsListId, sourceData, isProduct = false, onSelectCallback = () => {}) {
    const dropdownContainer = document.getElementById(containerId);
    const searchInput = document.getElementById(searchInputId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const optionsList = document.getElementById(optionsListId);

    if (!searchInput) return;

    const filterFn = (term) => {
        const key = isProduct ? 'name' : 'nombre';
        const currentSource = (containerId === 'extra-dropdown') 
            ? sourceData.filter(item => !packComposition.has(item.id)) 
            : sourceData;
        const filtered = currentSource.filter(item => item[key].toLowerCase().includes(term));
        optionsList.innerHTML = ''; 
        if (filtered.length === 0) {
            optionsList.innerHTML = `<li class="dropdown-item" style="color:#999; cursor:default;">Sin resultados</li>`;
        } else {
            filtered.forEach(item => {
                const li = document.createElement('li');
                li.className = 'dropdown-item';
                li.textContent = item[key];
                li.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    hiddenInput.value = item.id;
                    searchInput.value = item[key]; 
                    dropdownContainer.classList.remove('active-dropdown');
                    onSelectCallback(item.id, item[key]);
                });
                optionsList.appendChild(li);
            });
        }
        document.querySelectorAll('.custom-dropdown-container').forEach(cont => { if(cont.id !== containerId) cont.classList.remove('active-dropdown'); });
        dropdownContainer.classList.add('active-dropdown');
    };
    
    const inputHandler = (e) => filterFn(e.target.value ? e.target.value.toLowerCase() : '');
    searchInput.addEventListener('input', inputHandler);
    searchInput.addEventListener('focus', inputHandler);
    const chevron = dropdownContainer.querySelector('.chevron-down');
    if (chevron) chevron.addEventListener('click', () => searchInput.focus());
}

function setupCategoryDropdown() {
    setupCustomDropdown('category-dropdown', 'category_search', 'category_id', 'dropdown-options', categoriesList, false);
}

function setupProductDropdown() {
    const searchInput = document.getElementById('product_search');
    const hiddenInput = document.getElementById('product_id');
    const onSelectProduct = (id, name) => {
        selectedProductName = name; 
        updatePackName(); 
    };
    setupCustomDropdown('product-dropdown', 'product_search', 'product_id', 'product-dropdown-options', availableProducts, true, onSelectProduct);
    searchInput.addEventListener('input', () => {
         const selectedId = parseInt(hiddenInput.value);
         const selectedProd = availableProducts.find(p => p.id === selectedId);
         if (!selectedProd || searchInput.value !== selectedProd.name) {
             hiddenInput.value = ''; selectedProductName = ''; updatePackName(); 
         }
    });
}

function setupExtraDropdown() {
    const qtyInput = document.getElementById('extra_qty');
    const addBtn = document.getElementById('add-extra-btn');
    const searchInput = document.getElementById('extra_search');
    const hiddenInput = document.getElementById('extra_id');
    const onSelectExtra = (id, name) => {
        qtyInput.style.display = 'inline-block'; qtyInput.value = 1; addBtn.disabled = false;
    };
    setupCustomDropdown('extra-dropdown', 'extra_search', 'extra_id', 'extra-dropdown-options', availableExtras, false, onSelectExtra);
    searchInput.addEventListener('input', () => {
        const selectedExtraId = parseInt(hiddenInput.value);
        const selectedExtraName = availableExtras.find(e => e.id === selectedExtraId)?.nombre;
        if (searchInput.value !== selectedExtraName) {
            hiddenInput.value = ''; qtyInput.style.display = 'none'; addBtn.disabled = true;
        }
    });
}

// --- CREACIÓN RÁPIDA ---
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
        document.getElementById('category_id').value = newCat.id;
        document.getElementById('category_search').value = newCat.nombre;
        setupCategoryDropdown(); 
        newCatInput.value = '';
        btn.disabled = false;
    } catch (error) { showToast(`❌ Error: ${error.message}`); }
}

async function handleCreateExtra() {
    const newExtraInput = document.getElementById('new_extra_name');
    const name = newExtraInput.value.trim();
    if (!name) return showToast("⚠️ Escribe un nombre para el extra.");
    try {
        const btn = document.getElementById('create-extra-btn');
        btn.disabled = true;
        const newExtra = await createExtra(name);
        showToast(`✅ Extra creado: ${newExtra.nombre}`);
        availableExtras.push(newExtra);
        document.getElementById('extra_id').value = newExtra.id;
        document.getElementById('extra_search').value = newExtra.nombre;
        const qtyInput = document.getElementById('extra_qty');
        const addBtn = document.getElementById('add-extra-btn');
        qtyInput.style.display = 'inline-block';
        qtyInput.value = 1;
        addBtn.disabled = false;
        setupExtraDropdown(); 
        newExtraInput.value = '';
        btn.disabled = false;
    } catch (error) { showToast(`❌ Error: ${error.message}`); document.getElementById('create-extra-btn').disabled = false; }
}

// --- EXTRAS ---
function addExtraToComposition() {
    const extraId = parseInt(document.getElementById('extra_id').value);
    const extraSearchInput = document.getElementById('extra_search');
    const extraName = extraSearchInput.value;
    const qty = parseInt(document.getElementById('extra_qty').value);
    const qtyInput = document.getElementById('extra_qty');
    const addBtn = document.getElementById('add-extra-btn');
    const hiddenInput = document.getElementById('extra_id');
    
    if (!extraId || isNaN(qty) || qty <= 0) return showToast("⚠️ Selecciona un extra válido.");
    if (packComposition.has(extraId)) return showToast("⚠️ Extra ya añadido.");

    packComposition.set(extraId, { id: extraId, name: extraName, qty: qty });
    updatePackName();
    renderCompositionList();
    hiddenInput.value = ''; extraSearchInput.value = ''; qtyInput.value = 1; qtyInput.style.display = 'none'; addBtn.disabled = true;
    showToast(`✅ Añadido.`);
    setupExtraDropdown(); 
}

function removeExtraFromComposition(extraId) {
    packComposition.delete(extraId);
    updatePackName();
    renderCompositionList();
    showToast(`🗑️ Eliminado.`);
    setupExtraDropdown(); 
}

function renderCompositionList() {
    const listContainer = document.getElementById('composition-list');
    listContainer.innerHTML = '';
    if (packComposition.size === 0) {
        listContainer.innerHTML = '<p style="color: #6c757d; font-size: 0.9rem; text-align: center;">Añade extras.</p>';
        return;
    }
    packComposition.forEach((item, id) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'composition-item';
        itemEl.innerHTML = `<div class="item-info"><span style="font-size: 1.2em;">${item.qty}x</span><span>${item.name}</span></div><button type="button" class="remove-component-btn" data-id="${id}">&times;</button>`;
        itemEl.querySelector('.remove-component-btn').addEventListener('click', (e) => removeExtraFromComposition(parseInt(e.currentTarget.dataset.id)));
        listContainer.appendChild(itemEl);
    });
}

// --- IMAGEN ---
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

function handleImageSelection(e) {
    const file = e.target.files[0];
    if (file) { openCropper(file); e.target.value = ''; }
}

function openCropper(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('image-to-crop').src = event.target.result;
        document.getElementById('remove-bg-check').checked = false;
        document.getElementById('crop-modal').classList.add('visible');
        if (cropper) cropper.destroy();
        // eslint-disable-next-line no-undef
        cropper = new Cropper(document.getElementById('image-to-crop'), { aspectRatio: 1, viewMode: 1, autoCropArea: 0.8, background: false });
    };
    reader.readAsDataURL(file);
}

function cropAndSave() {
    if (!cropper) return;
    let canvas = cropper.getCroppedCanvas({ width: 800, height: 800, fillColor: '#fff' });
    if (document.getElementById('remove-bg-check').checked) {
        canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });
        canvas = removeWhiteBackground(canvas);
    }
    canvas.toBlob((blob) => {
        processedImageFile = new File([blob], "imagen_pack.webp", { type: 'image/webp' });
        const preview = document.getElementById('image-preview');
        preview.innerHTML = '';
        const img = document.createElement('img'); img.src = URL.createObjectURL(processedImageFile);
        img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain';
        preview.appendChild(img);
        document.getElementById('upload-placeholder').style.display = 'none';
        showToast("✂️ Recortado!");
        closeCropModal();
    }, 'image/webp', 0.85); 
}

function removeWhiteBackground(originalCanvas) {
    const ctx = originalCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) data[i+3] = 0; 
    }
    ctx.putImageData(imageData, 0, 0);
    return originalCanvas;
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.remove('visible');
    if (cropper) { cropper.destroy(); cropper = null; }
}

// --- SUBMIT ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const baseProductId = parseInt(document.getElementById('product_id').value); 
    const isActive = document.getElementById('is_active').checked;

    const hasDiscount = document.getElementById('has_discount').checked;
    const discountPercentage = hasDiscount ? parseInt(document.getElementById('discount_percentage').value) : 0;
    
    if (!categoriaId) return showToast("⚠️ Selecciona una categoría.");
    if (!baseProductId) return showToast("⚠️ Selecciona el Producto Principal.");
    if (packComposition.size === 0) return showToast("⚠️ Un Pack debe tener al menos un Extra.");
    if (!processedImageFile) return showToast("⚠️ Debes subir una imagen.");
    if (hasDiscount && (!discountPercentage || discountPercentage <= 0)) return showToast("⚠️ Porcentaje inválido.");

    try {
        const saveBtn = document.getElementById('save-pack-btn');
        saveBtn.disabled = true; saveBtn.textContent = 'Guardando...';

        const imageUrl = await uploadImage(processedImageFile);
        
        const packData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
            has_discount: hasDiscount,
            discount_percentage: discountPercentage
        };
        
        const compositionData = Array.from(packComposition.values()).map(item => ({
            extra_id: item.id,
            quantity: item.qty
        }));
        
        await createPack(packData, compositionData, baseProductId);
        showToast(`✅ Combo creado exitosamente!`);
        setTimeout(() => window.location.href = '../list-packs/list-packs.html', 1500);

    } catch (error) {
        console.error(error);
        showToast(`❌ Error: ${error.message}`);
        document.getElementById('save-pack-btn').disabled = false;
        document.getElementById('save-pack-btn').textContent = 'Guardar Pack';
    }
}

function setupSwitch() {
    document.getElementById('is_active').addEventListener('change', (e) => {
        const txt = document.getElementById('status-text');
        txt.textContent = e.target.checked ? 'Pack Activo' : 'Pack Inactivo';
        txt.style.color = e.target.checked ? '#28a745' : '#dc3545'; 
    });
}

function setupDiscountSwitch() {
    const sw = document.getElementById('has_discount');
    const txt = document.getElementById('discount-text');
    const box = document.getElementById('discount-input-container');
    sw.addEventListener('change', () => {
        if(sw.checked) {
            txt.textContent='Con Descuento'; txt.style.color='#dc3545'; box.style.display='flex';
        } else {
            txt.textContent='Sin Descuento'; txt.style.color='#495057'; box.style.display='none';
            document.getElementById('discount_percentage').value='';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => initAddPack('app-content'));