// src/admin/products/products.js

import { ProductsAdminService } from '../../services/admin/products/products.service.js';

let productsList = [];
let categoriesList = []; 
let isEditing = false;
let editingProductId = null;
let productIdToDelete = null; 
let currentFilter = 'active'; 

// Mapa para almacenar las referencias de las tarjetas DOM por ID.
let productCardElements = new Map(); 

const PRODUCT_FORM_HTML_PATH = './products/products.html'; 
const DEBOUNCE_DELAY = 300; 
let searchTimeout = null;

/**
 * Inicializa la vista de administración de productos.
 */
export async function initProductsAdmin(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch(PRODUCT_FORM_HTML_PATH);
        if (!response.ok) {
            throw new Error(`Error al obtener HTML. Status: ${response.status} URL: ${response.url}`);
        }
        const html = await response.text();
        container.innerHTML = html;
        
        await loadCategories();
        attachEventListeners();
        await loadProducts(); // Ahora loadProducts llama a createAndHydrateLists y renderProductsTable
        
        // Hacemos las funciones de control de modal globales
        window.openProductModal = openProductModal;
        window.closeProductModal = closeProductModal;
        window.openDeleteModal = openDeleteModal; 
        window.closeDeleteModal = closeDeleteModal; 
        
    } catch (error) {
        console.error("Error al inicializar el panel de productos:", error);
        container.innerHTML = `<p class="error-msg">Error al cargar la interfaz de administración.</p>`;
    }
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('image_file').addEventListener('change', handleImagePreview);
    
    // Botones del modal
    document.getElementById('open-create-modal-btn').addEventListener('click', () => openProductModal('create'));
    document.getElementById('cancel-edit-btn').addEventListener('click', closeProductModal);
    
    // AGREGA: Evento para crear nueva categoría
    const createCategoryBtn = document.getElementById('create-category-btn');
    createCategoryBtn.addEventListener('click', handleCreateCategory);
    
    // Evento de búsqueda en tiempo real (debounce para evitar recargas excesivas)
    document.getElementById('product-search-input').addEventListener('input', debounceSearch);
    
    // Delegación de eventos para las listas de tarjetas
    document.getElementById('active-products-list').addEventListener('click', handleListActions);
    document.getElementById('all-products-list').addEventListener('click', handleListActions);
    
    // Evento para el cambio de pestañas
    document.getElementById('product-view-tabs').addEventListener('click', handleTabSwitch);
    
    // Evento para confirmar eliminación (se mantiene por si se activa desde el modal de edición)
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

    // Detener la propagación de clic en el input y botón de la nueva categoría
    document.getElementById('new_category_name').addEventListener('click', (e) => e.stopPropagation());
    createCategoryBtn.addEventListener('click', (e) => e.stopPropagation()); 
}

/**
 * Maneja el clic en las pestañas (Tabs) de la lista de productos.
 */
function handleTabSwitch(e) {
    const target = e.target;
    if (!target.classList.contains('tab-button')) return;

    const newFilter = target.dataset.filter;
    
    // 1. Actualizar el estado del botón activo
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    
    if (newFilter !== currentFilter) {
        currentFilter = newFilter;
        
        // 2. Ocultar todos los contenedores de vista y mostrar el nuevo
        document.querySelectorAll('.products-grid').forEach(view => view.classList.remove('active-view'));
        
        // Mostrar el contenedor de la vista activa (active o all)
        const viewContainerId = `${newFilter}-products-list`;
        document.getElementById(viewContainerId).classList.add('active-view');

        // 3. Re-filtrar la vista con el término de búsqueda actual (usando el display: none/flex)
        const searchTerm = document.getElementById('product-search-input').value;
        renderProductsTable(searchTerm); 
    }
}


// --- Control de Modales (Resto de funciones se mantienen igual) ---

function openProductModal(mode, productId = null) {
    const modalContainer = document.getElementById('product-modal-container');
    const modalTitle = document.getElementById('modal-title');
    
    resetForm(); 
    
    if (mode === 'edit' && productId !== null) {
        modalTitle.textContent = 'Editar Producto';
        document.getElementById('save-product-btn').textContent = 'Actualizar Producto';
        document.getElementById('cancel-edit-btn').style.display = 'inline-block';
        startEditing(productId);
    } else {
        modalTitle.textContent = 'Agregar Nuevo Producto';
        document.getElementById('save-product-btn').textContent = 'Guardar Producto';
        document.getElementById('cancel-edit-btn').style.display = 'none';
        isEditing = false;
    }
    
    modalContainer.classList.add('visible');
    window.scrollTo(0, 0); 
}

function closeProductModal() {
    document.getElementById('product-modal-container').classList.remove('visible');
    resetForm();
}

function openDeleteModal(id) {
    const product = productsList.find(p => p.id === id);
    if (!product) return;
    
    productIdToDelete = id;
    document.getElementById('product-to-delete-name').textContent = product.name;
    document.getElementById('delete-modal-container').classList.add('visible');
}

function closeDeleteModal() {
    productIdToDelete = null;
    document.getElementById('product-to-delete-name').textContent = '';
    document.getElementById('delete-modal-container').classList.remove('visible');
}


// --- Lógica de Búsqueda (Mejorada para evitar recargas visuales) ---

function debounceSearch(e) {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.toLowerCase().trim();
    
    searchTimeout = setTimeout(() => {
        // Llama a la función de renderizado/filtrado SÓLO para ocultar/mostrar, no para reconstruir DOM
        renderProductsTable(searchTerm); 
    }, DEBOUNCE_DELAY);
}

// --- Manejo del Formulario (Submit) ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const id = document.getElementById('product-id').value;
    const name = formData.get('name'); 
    const price = parseFloat(formData.get('price'));
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const imageFile = document.getElementById('image_file').files[0];
    const currentImageUrl = document.getElementById('current_image_url').value;
    const isActive = document.getElementById('is_active').checked;
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría existente.");
        return;
    }
    
    let imageUrl = currentImageUrl; 

    try {
        document.getElementById('save-product-btn').disabled = true;

        if (imageFile) {
            imageUrl = await ProductsAdminService.uploadImage(imageFile);
            
            if (isEditing && currentImageUrl && currentImageUrl !== imageUrl) {
                // Eliminar la imagen antigua solo si estamos editando y la URL ha cambiado.
                await ProductsAdminService.deleteImage(currentImageUrl);
            }
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        let result;
        if (isEditing) {
            result = await ProductsAdminService.updateProduct(parseInt(id), productData);
            
            // Actualizamos la lista local y la metadata de categoría
            const categoryName = categoriesList.find(c => c.id === result.categoria_id)?.nombre || 'Sin Categoría';
            Object.assign(result, { category_name: categoryName });
            
            const index = productsList.findIndex(p => p.id === result.id);
            if (index !== -1) {
                productsList[index] = result;
            }
            
            // Actualizar el DOM del producto editado
            updateCardElements(result); 
            
            alert(`Producto ${result.name} actualizado!`);
        } else {
            result = await ProductsAdminService.createProduct(productData);
            alert(`Producto ${result.name} agregado!`);
            await loadProducts(); // Recarga COMPLETA para un nuevo producto
        }

        renderProductsTable(document.getElementById('product-search-input').value); // Refresca la vista (filtra)
        closeProductModal(); 

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
    }
}


// --- Lógica de la Lista (Cards) ---

async function loadProducts() {
    try {
        productsList = await ProductsAdminService.getAllProducts();
        createAndHydrateLists(); // Inicializa el DOM de las listas UNA SOLA VEZ
        renderProductsTable(); // Filtra la vista inicial
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

/**
 * Crea las tarjetas DOM para TODOS los productos y las añade a los contenedores
 * correspondientes. SOLO SE LLAMA AL INICIO O TRAS CREAR/ELIMINAR.
 */
function createAndHydrateLists() {
    const activeListView = document.getElementById('active-products-list');
    const allListView = document.getElementById('all-products-list');
    
    // Limpiamos todo antes de reconstruir (solo al inicio o al crear/eliminar)
    activeListView.innerHTML = '';
    allListView.innerHTML = '';
    
    productsList.forEach(product => {
        // Crear la tarjeta
        const card = createProductCard(product); 
        
        // 1. Añadir a la lista de "Todos los Productos"
        allListView.appendChild(card.cloneNode(true)); // Clonamos para que un elemento no esté en dos padres
        
        // 2. Añadir a la lista de "Productos Activos" si corresponde
        if (product.is_active) {
            activeListView.appendChild(card.cloneNode(true));
        }
    });
}

/**
 * Actualiza las tarjetas de un producto editado sin reconstruir toda la lista.
 */
function updateCardElements(product) {
    const oldProduct = productsList.find(p => p.id === product.id);
    
    if (oldProduct && oldProduct.is_active !== product.is_active) {
        // Si el estado activo cambió, reconstruimos completamente para asegurar que se mueva de lista.
        createAndHydrateLists();
    } else {
        // Si solo se cambiaron datos (nombre, precio, etc.), actualizamos las tarjetas existentes.
        const newCard = createProductCard(product);
        
        // Buscamos las tarjetas existentes por su data-id
        const allListCard = document.querySelector(`#all-products-list .product-list-item[data-id="${product.id}"]`);
        const activeListCard = document.querySelector(`#active-products-list .product-list-item[data-id="${product.id}"]`);
        
        // Reemplazamos el HTML de las tarjetas para reflejar el cambio.
        if(allListCard) allListCard.outerHTML = newCard.outerHTML;
        if(activeListCard) activeListCard.outerHTML = newCard.outerHTML;
    }
}


/**
 * Filtra los productos de la vista activa basándose en el término de búsqueda
 * SIN reconstruir el DOM, para evitar el parpadeo de las imágenes.
 */
function renderProductsTable(searchTerm = '') {
    const term = searchTerm.toLowerCase().trim();
    
    // Seleccionamos SOLO el contenedor de la vista activa actualmente
    const activeViewContainerId = currentFilter === 'active' ? 'active-products-list' : 'all-products-list';
    const activeViewContainer = document.getElementById(activeViewContainerId);
    
    // Obtenemos todos los ítems DENTRO de la vista activa (ya sea activos o todos)
    const cardsInActiveView = activeViewContainer.querySelectorAll('.product-list-item');
    
    let matchesFound = 0;
    
    cardsInActiveView.forEach(card => {
        // Usamos el dataset.searchable para hacer la búsqueda de manera eficiente
        const searchableContent = card.dataset.searchable || '';
        const isMatch = searchableContent.includes(term);
        
        // Toggling display instead of rebuilding HTML
        if (isMatch) {
            card.style.display = 'flex'; // Usamos flex porque es el display original
            matchesFound++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Manejo de mensajes de vacío
    const emptyMsgId = currentFilter === 'active' ? 'active-empty-msg' : 'all-empty-msg';
    const otherEmptyMsgId = currentFilter === 'active' ? 'all-empty-msg' : 'active-empty-msg';
    
    document.getElementById(emptyMsgId).style.display = (matchesFound === 0) ? 'block' : 'none';
    document.getElementById(otherEmptyMsgId).style.display = 'none'; // Ocultar el mensaje de la pestaña inactiva

    // Si no hay productos en la lista total, mostramos el mensaje de vacío general
    if (productsList.length === 0) {
        document.getElementById('active-empty-msg').style.display = 'block';
        document.getElementById('all-empty-msg').style.display = 'block';
    }
}


/**
 * Crea la tarjeta visual de un producto para la lista de administración.
 * Incluye un data-attribute para la búsqueda.
 */
function createProductCard(product) {
    const card = document.createElement('div');
    // Usamos 'product-list-item' para el nuevo estilo
    card.classList.add('product-list-item'); 
    if (!product.is_active) {
        card.classList.add('inactive');
    }
    card.dataset.id = product.id; 

    // NUEVO: Atributo para búsqueda eficiente en el DOM
    const searchable = `${product.name} ${product.category_name || ''}`.toLowerCase();
    card.dataset.searchable = searchable;
    
    const imageUrl = product.image_url || 'https://via.placeholder.com/60x60?text=No+Img';
    const categoryName = product.category_name || 'Sin Categoría';
    const isActive = product.is_active;

    // Estructura con nombre, ID, categoría, precio y badge de estado
    card.innerHTML = `
        <div class="product-image-container">
            <img src="${imageUrl}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info-minimal">
            <h5 class="product-name-title">${product.name}</h5>
            <p class="product-id">ID: ${product.id}</p>
            <p class="product-category">Categoría: ${categoryName}</p>
        </div>
        <div class="product-status-price-container">
             <span class="status-badge ${isActive ? 'active-badge' : 'inactive-badge'}">
                ${isActive ? 'ACTIVO' : 'INACTIVO'}
            </span>
            <div class="product-price-minimal">
                <span class="price">S/ ${product.price.toFixed(2)}</span>
            </div>
        </div>
    `;

    return card;
}

function handleListActions(e) {
    const target = e.target;
    
    // Si se hace clic en cualquier parte de la tarjeta, abrimos el modal de edición/detalle
    const card = target.closest('.product-list-item');
    if (!card) return;
    
    const productId = parseInt(card.dataset.id);
    
    // Abre el modal para ver/editar 
    openProductModal('edit', productId);
}

function startEditing(id) {
    const product = productsList.find(p => p.id === id);
    if (!product) return;
    
    // 1. Llenar el formulario
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    document.getElementById('category_id').value = product.categoria_id; 
    document.getElementById('is_active').checked = product.is_active;
    document.getElementById('current_image_url').value = product.image_url || '';
    
    // 2. Mostrar preview
    handleImagePreview(null, product.image_url);
    
    isEditing = true;
    editingProductId = id;
}

async function confirmDelete() {
    const id = productIdToDelete;
    if (!id) return;

    const product = productsList.find(p => p.id === id);

    try {
        document.getElementById('confirm-delete-btn').disabled = true;
        closeDeleteModal(); 
        
        await ProductsAdminService.deleteProduct(id, product.image_url);
        
        // Eliminamos el producto de la lista local
        productsList = productsList.filter(p => p.id !== id);
        
        alert(`Producto ${product.name} eliminado.`);
        
        createAndHydrateLists(); // Reconstruir listas después de la eliminación
        renderProductsTable(document.getElementById('product-search-input').value); // Refresca la vista
        
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(`Error al eliminar: ${error.message}`);
    } finally {
        document.getElementById('confirm-delete-btn').disabled = false;
    }
}

function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('current_image_url').value = '';
    document.getElementById('image_file').value = ''; 
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('new_category_name').value = ''; 
    
    isEditing = false;
    editingProductId = null;
    
    document.getElementById('save-product-btn').textContent = 'Guardar Producto';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('modal-title').textContent = 'Agregar Nuevo Producto';
}

// --- Utilidades ---

async function loadCategories() {
    try {
        categoriesList = await ProductsAdminService.getCategories();
        renderCategoriesSelect();
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function renderCategoriesSelect() {
    const select = document.getElementById('category_id');
    select.innerHTML = '<option value="">-- Seleccione una Categoría --</option>'; 
    
    categoriesList.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        select.appendChild(option);
    });
}

function handleImagePreview(e, url = null) {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = url || (file ? URL.createObjectURL(file) : null);
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Preview';
        previewContainer.appendChild(img);

        if (file) {
            img.onload = () => URL.revokeObjectURL(img.src);
        }
    }
}

async function handleCreateCategory() {
    const newCategoryName = document.getElementById('new_category_name').value.trim();
    
    if (!newCategoryName) {
        alert("Por favor, introduce el nombre de la nueva categoría.");
        return;
    }
    
    if (categoriesList.some(c => c.nombre.toLowerCase() === newCategoryName.toLowerCase())) {
        alert(`La categoría "${newCategoryName}" ya existe.`);
        document.getElementById('new_category_name').value = '';
        return;
    }

    try {
        document.getElementById('create-category-btn').disabled = true;
        
        const newCategory = await ProductsAdminService.createCategory(newCategoryName);
        
        alert(`Categoría "${newCategory.nombre}" creada con éxito.`);
        
        await loadCategories();
        
        document.getElementById('category_id').value = newCategory.id;
        document.getElementById('new_category_name').value = '';

    } catch (error) {
        console.error("Error al crear categoría:", error);
        alert(`Error al crear categoría: ${error.message}`);
    } finally {
        document.getElementById('create-category-btn').disabled = false;
    }
}