// src/admin/products/add-product/add-product.js

import { 
    getCategories, 
    createCategory, 
    uploadImage, 
    createProduct 
} from './add-product.services.js'; 

// IMPORTANTE: Importamos el módulo de notificación flotante (Toast)
import { initToastNotification, showToast } from '../../../public/modules/store/toast-notification/toast.js';

let categoriesList = [];

/**
 * Inicializa la página de agregar producto.
 */
export async function initAddProduct(containerId) {
    console.log("Iniciando Add Product..."); 
    
    // Inicializar el sistema de notificaciones
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
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImagePreview);

    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            const fileInput = document.getElementById('image_file');
            if (fileInput) fileInput.click();
        });
    }

    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);
    
    // --- LÓGICA DEL BUSCADOR DE CATEGORÍAS ---
    const dropdownContainer = document.getElementById('category-dropdown');
    const searchInput = document.getElementById('category_search');
    
    if (searchInput && dropdownContainer) {
        
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = categoriesList.filter(cat => 
                cat.nombre.toLowerCase().includes(term)
            );
            renderCategoriesCustomDropdown(filtered);
            dropdownContainer.classList.add('active-dropdown');
        });

        searchInput.addEventListener('focus', () => {
            const term = searchInput.value.toLowerCase();
            const filtered = categoriesList.filter(cat => 
                cat.nombre.toLowerCase().includes(term)
            );
            renderCategoriesCustomDropdown(filtered);
            dropdownContainer.classList.add('active-dropdown');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('active-dropdown');
            }
        });
        
        const chevron = dropdownContainer.querySelector('.chevron-down');
        if (chevron) {
            chevron.addEventListener('click', (e) => {
                searchInput.focus();
            });
        }
    }
}

// --- Lógica del Formulario ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    
    const catIdInput = document.getElementById('category_id');
    const imgInput = document.getElementById('image_file');
    const activeInput = document.getElementById('is_active');

    const name = nameInput.value;
    const price = parseFloat(priceInput.value);
    
    const categoriaId = parseInt(catIdInput.value);
    
    if (!categoriaId) {
        // Usamos Toast para errores también
        showToast("⚠️ Por favor, selecciona una categoría.");
        return;
    }

    let imageUrl = ''; 

    try {
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        if (imgInput.files[0]) {
            imageUrl = await uploadImage(imgInput.files[0]);
        } else {
            showToast("⚠️ Debe seleccionar una imagen.");
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Producto';
            return;
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: activeInput.checked,
            image_url: imageUrl,
        };

        const result = await createProduct(productData);
        
        // --- AQUÍ EL CAMBIO CLAVE ---
        // Mostramos la notificación flotante en lugar del alert
        showToast(`✅ Producto "${result.name}" agregado con éxito!`);
        
        // Esperamos un momento antes de redirigir para que el usuario vea el mensaje
        setTimeout(() => {
            window.location.href = '../list-products/list-products.html'; 
        }, 1500);

    } catch (error) {
        console.error("Error al guardar producto:", error);
        showToast(`❌ Error al guardar: ${error.message}`);
    } finally {
        const saveBtn = document.getElementById('save-product-btn');
        if(saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Producto';
        }
    }
}

// --- Funciones de Utilidad y Categorías ---

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
        li.style.cursor = "default";
        optionsList.appendChild(li);
        return;
    }
    
    listToRender.forEach(category => {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.textContent = category.nombre;
        li.dataset.value = category.id;
        
        li.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            hiddenInput.value = category.id;
            searchInput.value = category.nombre; 
            
            const container = document.getElementById('category-dropdown');
            if(container) container.classList.remove('active-dropdown');
        });
        
        optionsList.appendChild(li);
    });
}

function handleImagePreview(e) {
    const previewContainer = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = file ? URL.createObjectURL(file) : null;
    
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
        createBtn.textContent = '...';
        
        const newCategory = await createCategory(newCategoryName);
        
        // Notificación flotante para categoría creada
        showToast(`✅ Categoría "${newCategory.nombre}" creada.`);
        
        categoriesList.push(newCategory);
        renderCategoriesCustomDropdown(categoriesList);
        
        const hiddenInput = document.getElementById('category_id');
        const searchInput = document.getElementById('category_search');
        
        if(hiddenInput) hiddenInput.value = newCategory.id;
        if(searchInput) searchInput.value = newCategory.nombre;
        
        newCatInput.value = '';

    } catch (error) {
        console.error("Error al crear categoría:", error);
        showToast(`❌ Error: ${error.message}`);
    } finally {
        const createBtn = document.getElementById('create-category-btn');
        if(createBtn) {
            createBtn.disabled = false;
            createBtn.textContent = 'Crear';
        }
    }
}

function setupSwitch() {
    const sw = document.getElementById('is_active');
    const txt = document.getElementById('status-text');
    
    if (sw && txt) {
        const updateStatusText = () => {
            txt.textContent = sw.checked ? 'Producto Activo' : 'Producto Inactivo';
            txt.style.color = sw.checked ? '#28a745' : '#dc3545'; 
        };
        updateStatusText(); 
        sw.addEventListener('change', updateStatusText);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAddProduct('app-content');
});