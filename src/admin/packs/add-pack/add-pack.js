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
let packComposition = new Map(); // Map<extra_id, {name, id, qty}>

// Variable para almacenar el nombre del producto base seleccionado
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
    } catch (error) {
        console.error("Error en la inicialización:", error);
        showToast("❌ Error al cargar datos iniciales.");
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

    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            imgInput.click();
        });
    }

    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);

    // Botón para crear nuevo extra
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
            if (cont.contains(e.target)) {
                clickedInsideDropdown = true;
            }
        });
        
        if (!clickedInsideDropdown) {
             dropdownContainers.forEach(cont => {
                 cont.classList.remove('active-dropdown');
             });
        }
    });
}

// --- LÓGICA DE NOMBRE AUTOMÁTICO ---
function updatePackName() {
    const nameInput = document.getElementById('name');
    
    if (!selectedProductName) {
        nameInput.value = '';
        return;
    }

    // 1. Empezamos con "Pack [Producto Base]"
    let generatedName = `Pack ${selectedProductName}`;
    
    // 2. Agregamos cada extra
    // Convertimos el Map a array para iterar en orden de inserción (generalmente)
    packComposition.forEach(extra => {
        generatedName += ` + ${extra.name}`;
    });

    // 3. Asignamos al input
    nameInput.value = generatedName;
}

// --- DROPDOWNS ---

function setupCustomDropdown(containerId, searchInputId, hiddenInputId, optionsListId, sourceData, isProduct = false, onSelectCallback = () => {}) {
    const dropdownContainer = document.getElementById(containerId);
    const searchInput = document.getElementById(searchInputId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const optionsList = document.getElementById(optionsListId);

    if (!searchInput || !dropdownContainer || !optionsList) return;

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
        
        document.querySelectorAll('.custom-dropdown-container').forEach(cont => {
             if (cont.id !== containerId) {
                 cont.classList.remove('active-dropdown');
             }
        });
        
        dropdownContainer.classList.add('active-dropdown');
    };
    
    const inputHandler = (e) => filterFn(e.target.value ? e.target.value.toLowerCase() : '');

    searchInput.addEventListener('input', inputHandler);
    searchInput.addEventListener('focus', inputHandler);
    
    const chevron = dropdownContainer.querySelector('.chevron-down');
    if (chevron) chevron.addEventListener('click', () => searchInput.focus());
}

function setupCategoryDropdown() {
    setupCustomDropdown(
        'category-dropdown', 'category_search', 'category_id', 'dropdown-options', categoriesList, false
    );
}

function setupProductDropdown() {
    const searchInput = document.getElementById('product_search');
    const hiddenInput = document.getElementById('product_id');

    // Al seleccionar producto base, actualizamos nombre
    const onSelectProduct = (id, name) => {
        selectedProductName = name; 
        updatePackName(); 
    };

    setupCustomDropdown(
        'product-dropdown', 'product_search', 'product_id', 'product-dropdown-options', availableProducts, true, onSelectProduct 
    );
    
    // Si borra el texto, limpiamos el producto base
    searchInput.addEventListener('input', () => {
         const selectedId = parseInt(hiddenInput.value);
         const selectedProd = availableProducts.find(p => p.id === selectedId);
         
         if (!selectedProd || searchInput.value !== selectedProd.name) {
             hiddenInput.value = '';
             selectedProductName = ''; 
             updatePackName(); 
         }
    });
}

function setupExtraDropdown() {
    const qtyInput = document.getElementById('extra_qty');
    const addBtn = document.getElementById('add-extra-btn');
    const searchInput = document.getElementById('extra_search');
    const hiddenInput = document.getElementById('extra_id');

    const onSelectExtra = (id, name) => {
        qtyInput.style.display = 'inline-block';
        qtyInput.value = 1;
        addBtn.disabled = false;
    };
    
    setupCustomDropdown(
        'extra-dropdown', 'extra_search', 'extra_id', 'extra-dropdown-options', availableExtras, false, onSelectExtra
    );
    
    searchInput.addEventListener('input', () => {
        const selectedExtraId = parseInt(hiddenInput.value);
        const selectedExtraName = availableExtras.find(e => e.id === selectedExtraId)?.nombre;
        if (searchInput.value !== selectedExtraName) {
            hiddenInput.value = '';
            qtyInput.style.display = 'none';
            addBtn.disabled = true;
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
    } catch (error) {
        showToast(`❌ Error: ${error.message}`);
    }
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
    } catch (error) {
        showToast(`❌ Error: ${error.message}`);
        console.error(error);
        const btn = document.getElementById('create-extra-btn');
        if(btn) btn.disabled = false;
    }
}

// --- GESTIÓN DE EXTRAS (CON ACTUALIZACIÓN DE NOMBRE) ---

function addExtraToComposition() {
    const extraId = parseInt(document.getElementById('extra_id').value);
    const extraSearchInput = document.getElementById('extra_search');
    const extraName = extraSearchInput.value;
    const qty = parseInt(document.getElementById('extra_qty').value);
    const qtyInput = document.getElementById('extra_qty');
    const addBtn = document.getElementById('add-extra-btn');
    const hiddenInput = document.getElementById('extra_id');
    
    if (!extraId || isNaN(qty) || qty <= 0) {
        return showToast("⚠️ Selecciona un extra y cantidad válida.");
    }
    
    if (packComposition.has(extraId)) {
        return showToast("⚠️ Extra ya añadido.");
    }

    packComposition.set(extraId, { id: extraId, name: extraName, qty: qty });
    
    // ⚡ ACTUALIZAR NOMBRE AL AÑADIR
    updatePackName();
    
    renderCompositionList();
    
    hiddenInput.value = '';
    extraSearchInput.value = '';
    qtyInput.value = 1;
    qtyInput.style.display = 'none';
    addBtn.disabled = true;
    
    showToast(`✅ Añadido.`);
    setupExtraDropdown(); 
}

function removeExtraFromComposition(extraId) {
    packComposition.delete(extraId);
    
    // ⚡ ACTUALIZAR NOMBRE AL ELIMINAR (Esto arregla el problema que mencionaste)
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
        itemEl.dataset.extraId = id;
        
        itemEl.innerHTML = `
            <div class="item-info">
                <span style="font-size: 1.2em;">${item.qty}x</span>
                <span>${item.name}</span>
            </div>
            <button type="button" class="remove-component-btn" data-id="${id}">
                &times;
            </button>
        `;
        
        itemEl.querySelector('.remove-component-btn').addEventListener('click', (e) => {
            const removeId = parseInt(e.currentTarget.dataset.id);
            removeExtraFromComposition(removeId);
        });
        
        listContainer.appendChild(itemEl);
    });
}

// --- IMAGEN Y CROPPER ---
// (Código igual al anterior, mantenido por completitud)
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
        if (cropper) cropper.destroy();
        // eslint-disable-next-line no-undef
        cropper = new Cropper(imageElement, { aspectRatio: 1, viewMode: 1, autoCropArea: 0.8, movable: true, zoomable: true, scalable: false, background: false });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
}

function cropAndSave() {
    if (!cropper) return;
    let canvas = cropper.getCroppedCanvas({ width: 800, height: 800, fillColor: '#fff' });
    const removeBg = document.getElementById('remove-bg-check').checked;
    if (removeBg) {
        canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });
        canvas = removeWhiteBackground(canvas);
    }
    canvas.toBlob((blob) => {
        if (!blob) return showToast("❌ Error al procesar imagen");
        processedImageFile = new File([blob], "imagen_pack.webp", { type: 'image/webp' });
        const previewContainer = document.getElementById('image-preview');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        previewContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(processedImageFile);
        img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain';
        img.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)';
        img.style.backgroundSize = '20px 20px'; img.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        previewContainer.appendChild(img);
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        showToast(removeBg ? "✂️ Recortado y sin fondo!" : "✂️ Recortado!");
        closeCropModal();
    }, 'image/webp', 0.85); 
}

function removeWhiteBackground(originalCanvas) {
    const ctx = originalCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        if (r > 230 && g > 230 && b > 230) data[i+3] = 0; 
    }
    ctx.putImageData(imageData, 0, 0);
    return originalCanvas;
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.remove('visible');
    if (cropper) { cropper.destroy(); cropper = null; }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const productId = parseInt(document.getElementById('product_id').value); 
    const isActive = document.getElementById('is_active').checked;
    
    if (!categoriaId) return showToast("⚠️ Selecciona una categoría.");
    if (!productId) return showToast("⚠️ Selecciona el Producto Base.");
    if (packComposition.size === 0) return showToast("⚠️ Añade al menos un Extra.");
    if (!processedImageFile) return showToast("⚠️ Sube una imagen.");

    try {
        const saveBtn = document.getElementById('save-pack-btn');
        saveBtn.disabled = true; saveBtn.textContent = 'Subiendo...';
        const imageUrl = await uploadImage(processedImageFile);
        
        const packData = { name: name, price: price, categoria_id: categoriaId, is_active: isActive, image_url: imageUrl };
        const compositionData = Array.from(packComposition.values()).map(item => ({ extra_id: item.id, quantity: item.qty }));
        
        await createPack(packData, compositionData);
        showToast(`✅ Pack agregado!`);
        setTimeout(() => { window.location.href = '../list-packs/list-packs.html'; }, 1500);
    } catch (error) {
        console.error(error); showToast(`❌ Error: ${error.message}`);
        document.getElementById('save-pack-btn').disabled = false;
    }
}

function setupSwitch() {
    const sw = document.getElementById('is_active');
    const txt = document.getElementById('status-text');
    if (sw && txt) {
        sw.addEventListener('change', () => {
            txt.textContent = sw.checked ? 'Pack Activo' : 'Pack Inactivo';
            txt.style.color = sw.checked ? '#28a745' : '#dc3545'; 
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { initAddPack('app-content'); });