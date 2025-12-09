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
        
        // 2. Adjuntar listeners (botones, forms y CLIC EN IMAGEN)
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
    
    // Listener estándar para cuando el archivo cambia (mostrar preview)
    const imgInput = document.getElementById('image_file');
    if (imgInput) imgInput.addEventListener('change', handleImagePreview);

    // --- SOLUCIÓN DEL CLICK ---
    // Hacemos que TODO el recuadro punteado sea clicable
    const imageBox = document.getElementById('image-preview-box');
    if (imageBox) {
        imageBox.addEventListener('click', (e) => {
            // Si el usuario clicó en el texto "Subir Imagen" (que es un label),
            // el navegador ya abre el archivo solo. No hacemos nada para no abrirlo 2 veces.
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;

            // Si clicó en el espacio vacío o en la imagen de preview, forzamos el click
            const fileInput = document.getElementById('image_file');
            if (fileInput) fileInput.click();
        });
    }

    // Listener para crear categoría
    const createCatBtn = document.getElementById('create-category-btn');
    if (createCatBtn) createCatBtn.addEventListener('click', handleCreateCategory);
    
    // Manejar el click en la tarjeta de categoría para abrir el select (Mejora UX Móvil)
    const categoryCard = document.querySelector('.custom-select-container');
    if (categoryCard) {
        categoryCard.addEventListener('click', () => {
            const select = document.getElementById('category_id');
            if(select) select.focus(); 
        });
    }
    
    // Listener para actualizar el input visible al seleccionar una opción del select
    const categorySelect = document.getElementById('category_id');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const displayInput = document.getElementById('category_display');
            if(displayInput) {
                // Si el valor es vacío, mostrar el placeholder original o texto por defecto
                displayInput.value = selectedOption.value ? selectedOption.textContent : '';
            }
        });
    }
}

// --- Lógica del Formulario ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    const catInput = document.getElementById('category_id');
    const imgInput = document.getElementById('image_file');
    const activeInput = document.getElementById('is_active');

    const name = nameInput.value;
    const price = parseFloat(priceInput.value);
    const categoriaId = parseInt(catInput.value);
    const imageFile = imgInput.files[0];
    const isActive = activeInput.checked;
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría existente.");
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
        renderCategoriesSelect();
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function renderCategoriesSelect() {
    const select = document.getElementById('category_id');
    const displayInput = document.getElementById('category_display');
    
    if (!select) return;

    select.innerHTML = '<option value="">-- Seleccionar --</option>'; 
    
    categoriesList.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        select.appendChild(option);
    });
    
    select.value = "";
    if (displayInput) displayInput.value = ""; 
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
        
        // Ocultar el texto de "Subir Imagen" cuando ya hay foto
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        
        if (file) img.onload = () => URL.revokeObjectURL(img.src);
    } else {
        // Volver a mostrar el texto si se quita la foto
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
        renderCategoriesSelect();
        
        const select = document.getElementById('category_id');
        const displayInput = document.getElementById('category_display');
        
        if(select) select.value = newCategory.id;
        if(displayInput) displayInput.value = newCategory.nombre;
        
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

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', () => {
    initAddProduct('app-content');
});