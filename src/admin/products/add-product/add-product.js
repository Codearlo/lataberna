// src/admin/products/add-product/add-product.js

import { 
    getCategories, 
    createCategory, 
    uploadImage, 
    createProduct 
} from './add-product.services.js'; 

let categoriesList = [];

/**
 * Inicializa la página de agregar producto.
 */
export async function initAddProduct(containerId) {
    console.log("Iniciando Add Product..."); 
    const container = document.getElementById(containerId);
    
    try {
        // 1. Cargar datos estáticos (Categorías)
        await loadCategories();
        
        // 2. Adjuntar listeners (botones, forms, imagen y dropdown)
        attachEventListeners();
        
        // 3. Inicializar el switch de estado visual
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
    
    // Listener para imagen
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImagePreview);

    // SOLUCIÓN CLICK IMAGEN (Recuadro completo clicable)
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            const fileInput = document.getElementById('image_file');
            if (fileInput) fileInput.click();
        });
    }

    // Listener crear categoría
    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);
    
    // --- LÓGICA DEL CUSTOM DROPDOWN ---
    const dropdownContainer = document.getElementById('category-dropdown');
    
    if (dropdownContainer) {
        // Toggle abrir/cerrar
        dropdownContainer.addEventListener('click', (e) => {
            // Evitar que se cierre si clickeamos dentro (propagación), 
            // pero sí queremos que se cierre si seleccionamos algo (manejado abajo).
            // Lo más simple: toggle class
            dropdownContainer.classList.toggle('active-dropdown');
        });

        // Cerrar si clickeamos fuera
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('active-dropdown');
            }
        });
    }
}

// --- Lógica del Formulario ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    
    // OJO: Ahora leemos del input hidden
    const catInput = document.getElementById('category_id');
    
    const imgInput = document.getElementById('image_file');
    const activeInput = document.getElementById('is_active');

    const name = nameInput.value;
    const price = parseFloat(priceInput.value);
    const categoriaId = parseInt(catInput.value);
    const imageFile = imgInput.files[0];
    const isActive = activeInput.checked;
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría.");
        return;
    }
    
    let imageUrl = ''; 

    try {
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        } else {
            alert("Debe seleccionar una imagen para el producto.");
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Producto';
            return;
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        const result = await createProduct(productData);
        alert(`Producto ${result.name} agregado!`);
        
        // Redirigir a la lista
        window.location.href = '../list-products/list-products.html'; 

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
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
        renderCategoriesCustomDropdown();
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function renderCategoriesCustomDropdown() {
    const optionsList = document.getElementById('dropdown-options');
    const hiddenInput = document.getElementById('category_id');
    const displayText = document.getElementById('dropdown-text');
    
    if (!optionsList) return;

    optionsList.innerHTML = ''; // Limpiar
    
    // Resetear selección
    hiddenInput.value = "";
    displayText.textContent = "Categoría";
    displayText.classList.add('placeholder');
    
    categoriesList.forEach(category => {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.textContent = category.nombre;
        li.dataset.value = category.id;
        
        // Evento al seleccionar opción
        li.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar burbujeo inmediato
            
            // Setear valores
            hiddenInput.value = category.id;
            displayText.textContent = category.nombre;
            displayText.classList.remove('placeholder');
            
            // Cerrar dropdown visualmente
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
        alert("Por favor, introduce el nombre de la nueva categoría.");
        return;
    }

    try {
        const createBtn = document.getElementById('create-category-btn');
        createBtn.disabled = true;
        createBtn.textContent = '...';
        
        const newCategory = await createCategory(newCategoryName);
        
        alert(`Categoría "${newCategory.nombre}" creada.`);
        
        categoriesList.push(newCategory);
        renderCategoriesCustomDropdown();
        
        // Autoseleccionar la nueva categoría
        const hiddenInput = document.getElementById('category_id');
        const displayText = document.getElementById('dropdown-text');
        
        if(hiddenInput) hiddenInput.value = newCategory.id;
        if(displayText) {
            displayText.textContent = newCategory.nombre;
            displayText.classList.remove('placeholder');
        }
        
        newCatInput.value = '';

    } catch (error) {
        console.error("Error al crear categoría:", error);
        alert(`Error: ${error.message}`);
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