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
        
        // 1. Al escribir, filtrar
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = categoriesList.filter(cat => 
                cat.nombre.toLowerCase().includes(term)
            );
            renderCategoriesCustomDropdown(filtered);
            dropdownContainer.classList.add('active-dropdown');
        });

        // 2. Al enfocar, mostrar todo y abrir
        searchInput.addEventListener('focus', () => {
            // Si el input tiene valor, filtramos por ese valor, sino mostramos todo
            const term = searchInput.value.toLowerCase();
            const filtered = categoriesList.filter(cat => 
                cat.nombre.toLowerCase().includes(term)
            );
            renderCategoriesCustomDropdown(filtered);
            dropdownContainer.classList.add('active-dropdown');
        });

        // 3. Cerrar al clickear fuera
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('active-dropdown');
            }
        });
        
        // Opcional: Abrir si se clickea en el chevron
        const chevron = dropdownContainer.querySelector('.chevron-down');
        if (chevron) {
            chevron.addEventListener('click', (e) => {
                // Prevenir que el click se propague al input inmediatamente si causara cierre
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
    
    // Leemos del input oculto
    const catIdInput = document.getElementById('category_id');
    const catSearchInput = document.getElementById('category_search');

    const imgInput = document.getElementById('image_file');
    const activeInput = document.getElementById('is_active');

    const name = nameInput.value;
    const price = parseFloat(priceInput.value);
    
    // Validación: El ID debe existir y el texto debe coincidir (para evitar que escriban una categoría que no existe sin crearla)
    const categoriaId = parseInt(catIdInput.value);
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría de la lista.");
        return;
    }

    // Verificar si el usuario cambió el texto pero no seleccionó nada
    const selectedCategory = categoriesList.find(c => c.id === categoriaId);
    if (!selectedCategory || selectedCategory.nombre !== catSearchInput.value) {
        // Podríamos ser estrictos o simplemente usar el ID guardado.
        // Si el texto no coincide, es probable que el usuario haya editado el input.
        // En este caso simple, si hay ID válido, lo usamos.
    }
    
    let imageUrl = ''; 

    try {
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        if (imgInput.files[0]) {
            imageUrl = await uploadImage(imgInput.files[0]);
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
            is_active: activeInput.checked,
            image_url: imageUrl,
        };

        const result = await createProduct(productData);
        alert(`Producto ${result.name} agregado!`);
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
        // Carga inicial con toda la lista
        renderCategoriesCustomDropdown(categoriesList);
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// Acepta una lista filtrada como argumento
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
            
            // Setear valores
            hiddenInput.value = category.id;
            searchInput.value = category.nombre; // Llenamos el buscador con el nombre seleccionado
            
            // Cerrar dropdown
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
        // Volver a renderizar la lista completa (o podríamos filtrar si el usuario estaba escribiendo)
        renderCategoriesCustomDropdown(categoriesList);
        
        // Autoseleccionar la nueva categoría
        const hiddenInput = document.getElementById('category_id');
        const searchInput = document.getElementById('category_search');
        
        if(hiddenInput) hiddenInput.value = newCategory.id;
        if(searchInput) searchInput.value = newCategory.nombre;
        
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