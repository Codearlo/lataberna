// src/admin/packs/edit-pack/edit-pack.js

import { 
    getPackById,
    getCategories, 
    createCategory, 
    uploadImage, 
    updatePack,
    deletePack,
    deleteImage,
    getExtras,
    createExtra
} from './edit-pack.services.js'; 

import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];
let availableExtras = [];
let packId = null;
let currentPack = null;
let packComposition = new Map(); 
let baseProductName = "";
let processedImageFile = null; 
let cropper = null; 

window.openDeleteModal = () => document.getElementById('delete-modal-container').classList.add('visible');
window.closeDeleteModal = () => document.getElementById('delete-modal-container').classList.remove('visible');

function getPackIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

export async function initEditPack(containerId) {
    packId = getPackIdFromUrl();
    initToastNotification();

    if (!packId) {
        showToast("❌ Error: ID de pack no especificado.");
        return;
    }
    
    try {
        await loadInitialData();
        setupCategoryDropdown();
        setupExtraDropdown();
        attachEventListeners();
        setupSwitch();
        setupDiscountSwitch(); // Nuevo
    } catch (error) {
        console.error("Error al inicializar:", error);
        showToast(`❌ Error: ${error.message}`);
    }
}

async function loadInitialData() {
    const [cats, extras, pack] = await Promise.all([
        getCategories(),
        getExtras(),
        getPackById(parseInt(packId))
    ]);
    categoriesList = cats;
    availableExtras = extras;
    currentPack = pack;
    populateForm(pack);
}

function populateForm(pack) {
    document.getElementById('pack-id').value = pack.id;
    document.getElementById('name').value = pack.name;
    document.getElementById('price').value = pack.price;
    document.getElementById('is_active').checked = pack.is_active;
    document.getElementById('current_image_url').value = pack.image_url || '';
    
    document.getElementById('category_id').value = pack.categoria_id;
    document.getElementById('category_search').value = pack.category || ''; 

    // Cargar descuento
    document.getElementById('has_discount').checked = !!pack.has_discount;
    document.getElementById('discount_percentage').value = pack.discount_percentage || '';
    document.getElementById('has_discount').dispatchEvent(new Event('change'));
    
    updateStatusText(pack.is_active);
    renderImagePreview(pack.image_url);
    document.getElementById('product-to-delete-name').textContent = pack.name;

    pack.composition.forEach(item => {
        packComposition.set(item.id, { id: item.id, name: item.name, qty: item.qty });
    });
    
    let deducedName = pack.name.replace(/^(Pack|Combo)\s+/i, ""); 
    pack.composition.forEach(item => {
        const regex = new RegExp(`\\s*\\+\\s*${escapeRegExp(item.name)}`, 'gi');
        deducedName = deducedName.replace(regex, "");
    });
    baseProductName = deducedName.trim();
    document.getElementById('product_search').value = baseProductName;
    renderCompositionList();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updatePackName() {
    const nameInput = document.getElementById('name');
    if (!baseProductName) return; 
    let generatedName = `Combo ${baseProductName}`;
    packComposition.forEach(extra => { generatedName += ` + ${extra.name}`; });
    nameInput.value = generatedName;
}

function attachEventListeners() {
    const form = document.getElementById('pack-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImageSelection);
    document.addEventListener('paste', handlePaste);

    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) imageBox.addEventListener('click', (e) => { if (e.target.tagName !== 'LABEL') imgInput.click(); });

    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    document.getElementById('create-extra-btn').addEventListener('click', handleCreateExtra); 
    
    document.getElementById('delete-product-btn').addEventListener('click', openDeleteModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);
    document.getElementById('add-extra-btn').addEventListener('click', addExtraToComposition);

    document.addEventListener('click', (e) => {
        const dropdownContainers = document.querySelectorAll('.custom-dropdown-container');
        let clickedInside = false;
        dropdownContainers.forEach(cont => { if (cont.contains(e.target)) clickedInside = true; });
        if (!clickedInside) dropdownContainers.forEach(cont => cont.classList.remove('active-dropdown'));
    });
}

// --- DROPDOWNS ---
function setupCustomDropdown(containerId, searchInputId, hiddenInputId, optionsListId, sourceData, onSelectCallback = () => {}) {
    const dropdownContainer = document.getElementById(containerId);
    const searchInput = document.getElementById(searchInputId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const optionsList = document.getElementById(optionsListId);
    if (!searchInput) return;
    const filterFn = (term) => {
        const filtered = sourceData.filter(item => 
            !packComposition.has(item.id) && item.nombre.toLowerCase().includes(term)
        );
        optionsList.innerHTML = ''; 
        if (filtered.length === 0) {
            optionsList.innerHTML = `<li class="dropdown-item" style="color:#999; cursor:default;">Sin resultados</li>`;
        } else {
            filtered.forEach(item => {
                const li = document.createElement('li');
                li.className = 'dropdown-item'; li.textContent = item.nombre;
                li.addEventListener('click', (e) => {
                    e.stopPropagation(); hiddenInput.value = item.id; searchInput.value = item.nombre; 
                    dropdownContainer.classList.remove('active-dropdown');
                    onSelectCallback(item.id, item.nombre);
                });
                optionsList.appendChild(li);
            });
        }
        document.querySelectorAll('.custom-dropdown-container').forEach(c => { if(c.id!==containerId) c.classList.remove('active-dropdown'); });
        dropdownContainer.classList.add('active-dropdown');
    };
    const inputHandler = (e) => filterFn(e.target.value ? e.target.value.toLowerCase() : '');
    searchInput.addEventListener('input', inputHandler); searchInput.addEventListener('focus', inputHandler);
    const chevron = dropdownContainer.querySelector('.chevron-down'); if (chevron) chevron.addEventListener('click', () => searchInput.focus());
}

function setupCategoryDropdown() { setupCustomDropdown('category-dropdown', 'category_search', 'category_id', 'dropdown-options', categoriesList); }
function setupExtraDropdown() {
    const qtyInput = document.getElementById('extra_qty'); const addBtn = document.getElementById('add-extra-btn'); const searchInput = document.getElementById('extra_search'); const hiddenInput = document.getElementById('extra_id');
    const onSelectExtra = () => { qtyInput.style.display = 'inline-block'; qtyInput.value = 1; addBtn.disabled = false; };
    setupCustomDropdown('extra-dropdown', 'extra_search', 'extra_id', 'extra-dropdown-options', availableExtras, onSelectExtra);
    searchInput.addEventListener('input', () => {
        const selectedId = parseInt(hiddenInput.value); const nameMatch = availableExtras.find(e => e.id === selectedId)?.nombre;
        if (searchInput.value !== nameMatch) { hiddenInput.value = ''; qtyInput.style.display = 'none'; addBtn.disabled = true; }
    });
}

// --- CREACIÓN ---
async function handleCreateCategory() {
    const input = document.getElementById('new_category_name');
    const name = input.value.trim();
    if (!name) return showToast("⚠️ Escribe un nombre.");
    try {
        document.getElementById('create-category-btn').disabled = true;
        const newCat = await createCategory(name);
        showToast("✅ Categoría creada.");
        categoriesList.push(newCat);
        document.getElementById('category_id').value = newCat.id; document.getElementById('category_search').value = newCat.nombre;
        setupCategoryDropdown(); input.value = ''; document.getElementById('create-category-btn').disabled = false;
    } catch (e) { showToast(`❌ Error: ${e.message}`); }
}

async function handleCreateExtra() {
    const input = document.getElementById('new_extra_name');
    const name = input.value.trim();
    if (!name) return showToast("⚠️ Escribe un nombre.");
    try {
        document.getElementById('create-extra-btn').disabled = true;
        const newExtra = await createExtra(name);
        showToast(`✅ Extra creado: ${newExtra.nombre}`);
        availableExtras.push(newExtra);
        document.getElementById('extra_id').value = newExtra.id; document.getElementById('extra_search').value = newExtra.nombre;
        document.getElementById('extra_qty').style.display = 'inline-block'; document.getElementById('add-extra-btn').disabled = false;
        setupExtraDropdown(); input.value = ''; document.getElementById('create-extra-btn').disabled = false;
    } catch (e) { showToast(`❌ Error: ${e.message}`); }
}

// --- COMPOSICIÓN ---
function addExtraToComposition() {
    const id = parseInt(document.getElementById('extra_id').value);
    const name = document.getElementById('extra_search').value;
    const qty = parseInt(document.getElementById('extra_qty').value);
    if (!id || isNaN(qty) || qty <= 0) return showToast("⚠️ Selección inválida.");
    if (packComposition.has(id)) return showToast("⚠️ Extra ya añadido.");
    packComposition.set(id, { id, name, qty });
    updatePackName(); renderCompositionList();
    document.getElementById('extra_id').value = ''; document.getElementById('extra_search').value = '';
    document.getElementById('extra_qty').style.display = 'none'; document.getElementById('add-extra-btn').disabled = true;
    showToast(`✅ Añadido.`); setupExtraDropdown();
}

function removeExtraFromComposition(id) {
    packComposition.delete(id); updatePackName(); renderCompositionList(); showToast("🗑️ Eliminado."); setupExtraDropdown();
}

function renderCompositionList() {
    const container = document.getElementById('composition-list'); container.innerHTML = '';
    if (packComposition.size === 0) { container.innerHTML = '<p style="color:#6c757d; text-align:center;">Sin extras.</p>'; return; }
    packComposition.forEach((item, id) => {
        const el = document.createElement('div'); el.className = 'composition-item';
        el.innerHTML = `<div class="item-info"><span>${item.qty}x</span><span>${item.name}</span></div><button type="button" class="remove-component-btn" data-id="${id}">&times;</button>`;
        el.querySelector('button').addEventListener('click', () => removeExtraFromComposition(id));
        container.appendChild(el);
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
function handleImageSelection(e) { const file = e.target.files[0]; if (file) { openCropper(file); e.target.value = ''; } }
function openCropper(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById('image-to-crop').src = ev.target.result;
        document.getElementById('remove-bg-check').checked = false;
        document.getElementById('crop-modal').classList.add('visible');
        if(cropper) cropper.destroy();
        // eslint-disable-next-line no-undef
        cropper = new Cropper(document.getElementById('image-to-crop'), { aspectRatio: 1, viewMode: 1, autoCropArea: 0.8, background: false });
    };
    reader.readAsDataURL(file);
}
function cropAndSave() {
    if (!cropper) return;
    let canvas = cropper.getCroppedCanvas({ width:800, height:800, fillColor:'#fff' });
    if (document.getElementById('remove-bg-check').checked) {
        canvas = cropper.getCroppedCanvas({ width:800, height:800 });
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0,0,800,800);
        const d = imgData.data;
        for(let i=0; i<d.length; i+=4) if(d[i]>230 && d[i+1]>230 && d[i+2]>230) d[i+3]=0;
        ctx.putImageData(imgData,0,0);
    }
    canvas.toBlob(blob => {
        processedImageFile = new File([blob], "pack.webp", { type:'image/webp' });
        renderImagePreview(URL.createObjectURL(processedImageFile));
        closeCropModal(); showToast("✂️ Imagen lista!");
    }, 'image/webp', 0.85);
}
function closeCropModal() { document.getElementById('crop-modal').classList.remove('visible'); if(cropper) { cropper.destroy(); cropper=null; } }
function renderImagePreview(url) {
    const prev = document.getElementById('image-preview');
    if(url) {
        const img = document.createElement('img'); img.src=url;
        img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain';
        prev.innerHTML=''; prev.appendChild(img);
        document.getElementById('upload-placeholder').style.display='none';
    }
}

// --- SUBMIT ---
async function handleFormSubmit(e) {
    e.preventDefault();
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
        btn.disabled = true; btn.textContent = 'Actualizando...';
        
        let finalUrl = currentImg;
        if (processedImageFile) {
            finalUrl = await uploadImage(processedImageFile);
            if (currentImg && currentImg !== finalUrl) await deleteImage(currentImg);
        }
        
        const packData = { 
            name, price, categoria_id: catId, is_active: active, image_url: finalUrl,
            has_discount: hasDiscount, discount_percentage: discountPercentage 
        };
        const compData = Array.from(packComposition.values()).map(i => ({ extra_id: i.id, quantity: i.qty }));
        
        await updatePack(packId, packData, compData);
        showToast("✅ Pack actualizado!");
        setTimeout(() => window.location.href = '../list-packs/list-packs.html', 1500);
    } catch (e) {
        console.error(e); showToast(`❌ Error: ${e.message}`);
        document.getElementById('save-product-btn').disabled = false;
    }
}

async function confirmDelete() {
    try {
        document.getElementById('confirm-delete-btn').disabled = true;
        if (currentPack.image_url) await deleteImage(currentPack.image_url);
        await deletePack(currentPack.id);
        showToast("🗑️ Pack eliminado.");
        setTimeout(() => window.location.href = '../list-packs/list-packs.html', 1500);
    } catch (e) { showToast(`❌ Error: ${e.message}`); closeDeleteModal(); }
}

function setupSwitch() {
    document.getElementById('is_active').addEventListener('change', (e) => updateStatusText(e.target.checked));
}

function updateStatusText(active) {
    const txt = document.getElementById('status-text');
    txt.textContent = active ? 'Pack Activo' : 'Pack Inactivo';
    txt.style.color = active ? '#28a745' : '#dc3545';
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

document.addEventListener('DOMContentLoaded', () => initEditPack('app-content'));