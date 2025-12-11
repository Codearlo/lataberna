// src/admin/packs/add-pack/add-pack.js

import { 
    getCategories, 
    createCategory, 
    uploadImage, 
    getAvailableProducts,
    getExtras,
    createPack
} from './add-pack.services.js'; 

import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];
let availableProducts = [];
let availableExtras = [];
let packComposition = new Map(); // Map<extra_id, {name, id, qty}>

let processedImageFile = null; 
let cropper = null; 

export async function initAddPack(containerId) {
    console.log("Iniciando Add Pack..."); 
    initToastNotification();

    try {
        await loadInitialData();
        // Inicializar los dropdowns y luego los otros event listeners
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
    // Cargar en paralelo categorías, productos base y extras
    const [cats, prods, extras] = await Promise.all([
        getCategories(),
        getAvailableProducts(),
        getExtras()
    ]);
    
    categoriesList = cats;
    availableProducts = prods;
    availableExtras = extras;
    
    renderCompositionList(); // Muestra el mensaje de lista vacía inicialmente
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
    
    document.getElementById('btn-confirm-crop').addEventListener('click', cropAndSave);
    document.getElementById('btn-cancel-crop').addEventListener('click', closeCropModal);
    
    // Listener específico del botón Añadir Extra
    const addBtn = document.getElementById('add-extra-btn');
    if (addBtn) addBtn.addEventListener('click', addExtraToComposition);
    
    // Función de cierre global para los dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown-container')) {
             document.querySelectorAll('.custom-dropdown-container').forEach(cont => {
                 cont.classList.remove('active-dropdown');
             });
        }
    });
}

// --- UTILIDAD DE DROPDOWN REUTILIZABLE ---

/**
 * Configura la funcionalidad de filtrado y selección para un dropdown genérico.
 * @param {string} containerId - ID del contenedor principal del dropdown.
 * @param {string} searchInputId - ID del input de búsqueda.
 * @param {string} hiddenInputId - ID del input hidden para guardar el ID seleccionado.
 * @param {string} optionsListId - ID del UL para las opciones.
 * @param {Array} sourceData - Array de objetos ({id, nombre} o {id, name}).
 * @param {boolean} isProduct - Si es verdadero, busca por 'name', si no, por 'nombre'.
 * @param {function} onSelectCallback - Función a llamar al seleccionar un ítem.
 */
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
        
        // --- CORRECCIÓN CLAVE: Cerrar otros dropdowns antes de abrir este ---
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

    // El cierre al hacer clic fuera se maneja en attachEventListeners (globalmente)
    
    const chevron = dropdownContainer.querySelector('.chevron-down');
    if (chevron) chevron.addEventListener('click', () => searchInput.focus());
}


// --- CONFIGURACIÓN DE DROPDOWNS ---

function setupCategoryDropdown() {
    setupCustomDropdown(
        'category-dropdown', 
        'category_search', 
        'category_id', 
        'dropdown-options', 
        categoriesList, 
        false,
        () => {} // No necesita callback especial
    );
}

function setupProductDropdown() {
    setupCustomDropdown(
        'product-dropdown', 
        'product_search', 
        'product_id', 
        'product-dropdown-options', 
        availableProducts, 
        true,
        () => {} // No necesita callback especial
    );
}

function setupExtraDropdown() {
    const qtyInput = document.getElementById('extra_qty');
    const addBtn = document.getElementById('add-extra-btn');
    const searchInput = document.getElementById('extra_search');
    const hiddenInput = document.getElementById('extra_id');

    const onSelectExtra = (id, name) => {
        // Al seleccionar, mostramos el input de cantidad y activamos el botón de añadir
        qtyInput.style.display = 'inline-block';
        qtyInput.value = 1;
        addBtn.disabled = false;
    };
    
    setupCustomDropdown(
        'extra-dropdown', 
        'extra_search', 
        'extra_id', 
        'extra-dropdown-options', 
        availableExtras, 
        false,
        onSelectExtra
    );
    
    // Si el usuario escribe y no selecciona de la lista, limpiamos
    searchInput.addEventListener('input', () => {
        if (searchInput.value !== availableExtras.find(e => e.id === parseInt(hiddenInput.value))?.nombre) {
            hiddenInput.value = '';
            // Aseguramos que se limpien los campos si se pierde el foco sin seleccionar
            qtyInput.style.display = 'none';
            addBtn.disabled = true;
        }
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
        
        // Forzamos la actualización de la lista y selección del nuevo ítem
        document.getElementById('category_id').value = newCat.id;
        document.getElementById('category_search').value = newCat.nombre;
        
        // Re-renderizar dropdown de categorías
        setupCategoryDropdown(); 
        
        newCatInput.value = '';
        btn.disabled = false;
    } catch (error) {
        showToast(`❌ Error: ${error.message}`);
    }
}


// --- SELECCIÓN Y GESTIÓN DE EXTRAS ---

function addExtraToComposition() {
    const extraId = parseInt(document.getElementById('extra_id').value);
    const extraName = document.getElementById('extra_search').value;
    const qty = parseInt(document.getElementById('extra_qty').value);
    
    const qtyInput = document.getElementById('extra_qty');
    const addBtn = document.getElementById('add-extra-btn');
    const searchInput = document.getElementById('extra_search');
    const hiddenInput = document.getElementById('extra_id');

    if (!extraId || isNaN(qty) || qty <= 0) {
        return showToast("⚠️ Selecciona un extra y una cantidad válida.");
    }
    
    if (packComposition.has(extraId)) {
        return showToast("⚠️ Este extra ya fue añadido.");
    }

    packComposition.set(extraId, { id: extraId, name: extraName, qty: qty });
    renderCompositionList();
    
    // Limpiar campos después de añadir
    hiddenInput.value = '';
    searchInput.value = '';
    qtyInput.value = 1;
    qtyInput.style.display = 'none';
    addBtn.disabled = true;
    
    showToast(`✅ ${extraName} (${qty}x) añadido.`);
    
    // Re-renderizar el dropdown para que el item añadido se oculte de la lista de opciones
    setupExtraDropdown(); 
}

function removeExtraFromComposition(extraId) {
    packComposition.delete(extraId);
    renderCompositionList();
    showToast(`🗑️ Extra eliminado.`);
    setupExtraDropdown(); // Re-renderizar para que el item eliminado vuelva a aparecer en las opciones
}

function renderCompositionList() {
    const listContainer = document.getElementById('composition-list');
    listContainer.innerHTML = '';
    
    if (packComposition.size === 0) {
        listContainer.innerHTML = '<p style="color: #6c757d; font-size: 0.9rem; text-align: center;">Añade extras como hielo o gaseosas.</p>';
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
        
        // Usamos addEventListener, no onclick global
        itemEl.querySelector('.remove-component-btn').addEventListener('click', (e) => {
            const removeId = parseInt(e.currentTarget.dataset.id);
            removeExtraFromComposition(removeId);
        });
        
        listContainer.appendChild(itemEl);
    });
}


// --- LÓGICA DE IMAGEN Y CROPPER ---

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

    let canvas = cropper.getCroppedCanvas({
        width: 800, 
        height: 800,
        fillColor: '#fff' 
    });

    const removeBg = document.getElementById('remove-bg-check').checked;
    
    if (removeBg) {
        canvas = cropper.getCroppedCanvas({
            width: 800, 
            height: 800
        });
        canvas = removeWhiteBackground(canvas);
    }

    canvas.toBlob((blob) => {
        if (!blob) {
            showToast("❌ Error al procesar imagen");
            return;
        }

        processedImageFile = new File([blob], "imagen_pack.webp", { type: 'image/webp' });

        const previewContainer = document.getElementById('image-preview');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewUrl = URL.createObjectURL(processedImageFile);

        previewContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = previewUrl;
        img.alt = 'Pack Preview';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)';
        img.style.backgroundSize = '20px 20px';
        img.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        
        previewContainer.appendChild(img);

        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';

        const msg = removeBg ? "✂️ Recortado y fondo eliminado!" : "✂️ Imagen recortada lista!";
        showToast(msg);
        closeCropModal();

    }, 'image/webp', 0.85); 
}

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

// --- ENVÍO DEL FORMULARIO ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const productId = parseInt(document.getElementById('product_id').value); 
    const isActive = document.getElementById('is_active').checked;
    
    // Validaciones
    if (!categoriaId) {
        showToast("⚠️ Selecciona una categoría.");
        return;
    }
    if (!productId) {
        showToast("⚠️ Selecciona el Producto Principal del Pack.");
        return;
    }
    if (packComposition.size === 0) {
        showToast("⚠️ Un Pack debe tener al menos un Extra.");
        return;
    }
    if (!processedImageFile) {
        showToast("⚠️ Debes subir y recortar una imagen para el Pack.");
        return;
    }

    try {
        const saveBtn = document.getElementById('save-pack-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Subiendo...';

        const imageUrl = await uploadImage(processedImageFile);
        
        // 1. Datos para la tabla 'products'
        const packData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };
        
        // 2. Datos para la tabla 'packs_composition'
        const compositionData = Array.from(packComposition.values()).map(item => ({
            extra_id: item.id,
            quantity: item.qty
        }));
        
        await createPack(packData, compositionData);
        showToast(`✅ Pack "${name}" agregado!`);
        
        setTimeout(() => {
            window.location.href = '../list-packs/list-packs.html'; 
        }, 1500);

    } catch (error) {
        console.error(error);
        showToast(`❌ Error: ${error.message}`);
        document.getElementById('save-pack-btn').disabled = false;
        document.getElementById('save-pack-btn').textContent = 'Guardar Pack';
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

document.addEventListener('DOMContentLoaded', () => {
    initAddPack('app-content');
});