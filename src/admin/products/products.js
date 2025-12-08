// src/admin/products/products.js

import { ProductsAdminService } from '../../services/admin/products/products.service.js';

let productsList = [];
let categoriesList = []; 
let isEditing = false;
let editingProductId = null;
let productIdToDelete = null; 
let currentFilter = 'active'; 

// Variables de estado para la paginación
let currentPage = 1;
const PRODUCTS_PER_PAGE = 10;
let totalProductsCount = 0;
let currentSearchTerm = ''; // Estado para mantener el término de búsqueda

const PRODUCT_FORM_HTML_PATH = './products/products.html'; 
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
        
        // 1. Cargar datos estáticos
        await loadCategories();
        
        // 2. Adjuntar listeners y hacer funciones globales
        attachEventListeners(); 
        window.openProductModal = openProductModal;
        window.closeProductModal = closeProductModal;
        window.openDeleteModal = openDeleteModal; 
        window.closeDeleteModal = closeDeleteModal; 
        
        // 3. Carga Inicial de Productos (Dispara la llamada al servicio que fallaba)
        // La llamada está protegida por el try/catch que ahora solo capturará el error si el *servicio* falla.
        await loadProducts(); 
        
    } catch (error) {
        console.error("Error al inicializar el panel de productos:", error);
        // Si hay un error aquí, es probable que la RPC no exista en la DB o que la URL de Supabase sea incorrecta.
        container.innerHTML = `<p class="error-msg">Error al cargar la interfaz de administración. Revise la consola para detalles.</p>`;
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
    
    // Búsqueda manual al presionar Enter
    document.getElementById('product-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            handleManualSearch();
        }
    });

    // Delegación de eventos para las listas de tarjetas
    document.getElementById('products-list-views').addEventListener('click', handleListActions);
    
    // Evento para el cambio de pestañas
    document.getElementById('product-view-tabs').addEventListener('click', handleTabSwitch);
    
    // Evento para confirmar eliminación (se mantiene por si se activa desde el modal de edición)
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

    // DELEGACIÓN DE EVENTOS PARA PAGINACIÓN: El contenedor ya existe
    document.getElementById('pagination-container').addEventListener('click', handlePaginationClick);

    // Detener la propagación de clic en el input y botón de la nueva categoría
    document.getElementById('new_category_name').addEventListener('click', (e) => e.stopPropagation());
    createCategoryBtn.addEventListener('click', (e) => e.stopPropagation()); 
}

/**
 * Dispara la búsqueda manual (al presionar Enter o al buscar).
 */
function handleManualSearch() {
    const searchTerm = document.getElementById('product-search-input').value.trim();
    currentSearchTerm = searchTerm;
    currentPage = 1; // Reiniciar siempre a la primera página al buscar
    loadProducts();
}

/**
 * Maneja el clic en los botones de paginación.
 */
function handlePaginationClick(e) {
    const target = e.target;
    let newPage = currentPage;

    if (target.id === 'prev-page-btn') {
        newPage = Math.max(1, currentPage - 1);
    } else if (target.id === 'next-page-btn') {
        const totalPages = Math.ceil(totalProductsCount / PRODUCTS_PER_PAGE);
        newPage = Math.min(totalPages, currentPage + 1);
    } else if (target.dataset.page) {
        newPage = parseInt(target.dataset.page);
    }

    if (newPage !== currentPage) {
        currentPage = newPage;
        loadProducts(); // Recarga la página
    }
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

        // 3. Simplemente manejamos la visibilidad de los mensajes de vacío
        renderProductsTable(); 
    }
}


// --- Control de Modales ---

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
            alert(`Producto ${result.name} actualizado!`);
        } else {
            result = await ProductsAdminService.createProduct(productData);
            alert(`Producto ${result.name} agregado!`);
        }

        // Recargar la lista con la página actual
        await loadProducts(); 
        closeProductModal(); 

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
    }
}


// --- Lógica de la Lista y Paginación ---

/**
 * Carga los productos filtrados y paginados desde la base de datos.
 */
async function loadProducts() {
    const activeViewContainer = document.getElementById('active-products-list');
    const allViewContainer = document.getElementById('all-products-list');

    // Muestra un mensaje de carga o limpia la vista antes de la solicitud
    activeViewContainer.innerHTML = '';
    allViewContainer.innerHTML = '';

    try {
        // Llama a la RPC para filtrar la lista en el servidor
        const result = await ProductsAdminService.getFilteredProductsPaged({
            searchTerm: currentSearchTerm,
            itemsPerPage: PRODUCTS_PER_PAGE,
            pageNumber: currentPage
        });
        
        productsList = result.products;
        totalProductsCount = result.totalCount;
        
        createAndHydrateLists(); 
        renderPagination();
        renderProductsTable(); 

    } catch (error) {
        console.error("Error al cargar productos:", error);
        
        // Limpiar las listas y mostrar el mensaje de error en el contenedor visible
        activeViewContainer.innerHTML = '<p class="error-msg" style="text-align:center;">Error al cargar los productos. Revise la consola.</p>';
        allViewContainer.innerHTML = '<p class="error-msg" style="text-align:center;">Error al cargar los productos. Revise la consola.</p>';

        // Ocultar paginación si hay error
        document.getElementById('pagination-container').innerHTML = '';
    }
}

/**
 * Crea las tarjetas DOM para los productos de la página actual.
 */
function createAndHydrateLists() {
    const activeListView = document.getElementById('active-products-list');
    const allListView = document.getElementById('all-products-list');
    
    activeListView.innerHTML = '';
    allListView.innerHTML = '';
    
    productsList.forEach(product => {
        const card = createProductCard(product); 
        
        // 1. Añadir a la lista de "Todos los Productos"
        allListView.appendChild(card.cloneNode(true)); 
        
        // 2. Añadir a la lista de "Productos Activos" si corresponde
        if (product.is_active) {
            activeListView.appendChild(card.cloneNode(true));
        }
    });
}

/**
 * Renderiza la interfaz de paginación.
 */
function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    const totalPages = Math.ceil(totalProductsCount / PRODUCTS_PER_PAGE);
    
    paginationContainer.innerHTML = ''; 

    if (totalProductsCount === 0 || totalPages === 1) {
        return;
    }
    
    const paginationContent = document.createElement('div');
    paginationContent.classList.add('pagination-content');
    
    // Botón Anterior
    const prevBtn = `<button id="prev-page-btn" class="secondary-btn" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
    
    // Botón Siguiente
    const nextBtn = `<button id="next-page-btn" class="secondary-btn" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
    
    let pageNumbers = '';
    // Muestra hasta 5 botones de página alrededor de la página actual
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, currentPage + Math.floor(maxButtons / 2));

    // Ajuste si estamos cerca del inicio o final
    if (endPage - startPage + 1 < maxButtons) {
        if (currentPage <= Math.floor(maxButtons / 2)) {
            endPage = Math.min(totalPages, maxButtons);
        } else if (currentPage > totalPages - Math.floor(maxButtons / 2)) {
            startPage = Math.max(1, totalPages - maxButtons + 1);
        }
    }


    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        pageNumbers += `<button class="page-number-btn ${isActive}" data-page="${i}">${i}</button>`;
    }

    paginationContent.innerHTML = `
        ${prevBtn}
        ${pageNumbers}
        ${nextBtn}
        <span class="pagination-info">Página ${currentPage} de ${totalPages} (${totalProductsCount} productos)</span>
    `;

    paginationContainer.appendChild(paginationContent);
}


/**
 * Filtra los productos de la vista activa basándose en el filtro de pestaña
 * y maneja los mensajes de vacío.
 */
function renderProductsTable() {
    // Obtenemos el ID del contenedor de la vista activa actualmente
    const activeViewContainerId = currentFilter === 'active' ? 'active-products-list' : 'all-products-list';
    const activeViewContainer = document.getElementById(activeViewContainerId);
    
    // Contamos los productos en la vista activa (la paginación ya los trajo)
    const matchesFound = activeViewContainer.children.length;

    const emptyMsgId = currentFilter === 'active' ? 'active-empty-msg' : 'all-empty-msg';
    const otherEmptyMsgId = currentFilter === 'active' ? 'all-empty-msg' : 'active-empty-msg';
    
    // Manejo de mensajes de vacío
    document.getElementById(emptyMsgId).style.display = (matchesFound === 0) ? 'block' : 'none';
    document.getElementById(otherEmptyMsgId).style.display = 'none'; // Ocultar el mensaje de la pestaña inactiva
}


/**
 * Crea la tarjeta visual de un producto para la lista de administración.
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-list-item'); 
    if (!product.is_active) {
        card.classList.add('inactive');
    }
    card.dataset.id = product.id; 
    
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
    const card = target.closest('.product-list-item');
    if (!card) return;
    
    const productId = parseInt(card.dataset.id);
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
        
        alert(`Producto ${product.name} eliminado.`);
        
        // Recargar la lista después de la eliminación
        await loadProducts(); 
        
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