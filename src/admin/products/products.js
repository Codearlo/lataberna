// src/admin/products/products.js

import { ProductsAdminService } from '../../services/admin/products/products.service.js';

let productsList = [];
let categoriesList = []; 
let isEditing = false;
let editingProductId = null;
let productIdToDelete = null; 

// RUTA DE FETCH: Es relativa al archivo HTML base (src/admin/admin.html)
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
        await loadProducts();
        
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
    
    // Evento de búsqueda en tiempo real
    document.getElementById('product-search-input').addEventListener('input', debounceSearch);
    
    // Delegación de eventos para las listas de tarjetas
    document.getElementById('active-products-list').addEventListener('click', handleListActions);
    document.getElementById('all-products-list').addEventListener('click', handleListActions);
    
    // NUEVO: Evento para confirmar eliminación
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

    // Detener la propagación de clic en el input y botón de la nueva categoría
    document.getElementById('new_category_name').addEventListener('click', (e) => e.stopPropagation());
    createCategoryBtn.addEventListener('click', (e) => e.stopPropagation()); 
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

/**
 * Muestra el modal de confirmación de eliminación.
 */
function openDeleteModal(id) {
    const product = productsList.find(p => p.id === id);
    if (!product) return;
    
    productIdToDelete = id;
    document.getElementById('product-to-delete-name').textContent = product.name;
    document.getElementById('delete-modal-container').classList.add('visible');
}

/**
 * Oculta el modal de confirmación de eliminación.
 */
function closeDeleteModal() {
    productIdToDelete = null;
    document.getElementById('product-to-delete-name').textContent = '';
    document.getElementById('delete-modal-container').classList.remove('visible');
}


// --- Lógica de Búsqueda ---

function debounceSearch(e) {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.toLowerCase().trim();
    
    searchTimeout = setTimeout(() => {
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
            // Cuando actualizamos, el producto ya no tiene el nombre de la categoría, lo añadimos temporalmente
            const categoryName = categoriesList.find(c => c.id === result.categoria_id)?.nombre || 'Sin Categoría';
            Object.assign(result, { category_name: categoryName });
            
            // Actualizamos la lista local
            const index = productsList.findIndex(p => p.id === result.id);
            if (index !== -1) {
                productsList[index] = result;
            }
            alert(`Producto ${result.name} actualizado!`);
        } else {
            result = await ProductsAdminService.createProduct(productData);
            alert(`Producto ${result.name} agregado!`);
            await loadProducts(); // Recarga completa si es un nuevo producto para obtener la metadata
        }

        renderProductsTable(document.getElementById('product-search-input').value); // Refresca la vista
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
        renderProductsTable();
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

/**
 * Renderiza la lista de productos filtrada por un término de búsqueda.
 * @param {string} searchTerm - Término de búsqueda.
 */
function renderProductsTable(searchTerm = '') {
    const activeList = document.getElementById('active-products-list');
    const allList = document.getElementById('all-products-list');
    const activeEmptyMsg = document.getElementById('active-empty-msg');
    const allEmptyMsg = document.getElementById('all-empty-msg');
    
    activeList.innerHTML = '';
    allList.innerHTML = '';
    
    const filteredProducts = productsList.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = product.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || categoryMatch;
    });
    
    let activeCount = 0;
    
    filteredProducts.forEach(product => {
        const card = createProductCard(product);
        
        // 1. Añadir a la lista de "Todos"
        allList.appendChild(card.cloneNode(true)); // Clonamos el nodo para las dos secciones
        
        // 2. Añadir a la lista de "Activos" si corresponde
        if (product.is_active) {
            activeList.appendChild(card);
            activeCount++;
        }
    });
    
    // Manejar mensajes de vacío
    if (activeCount === 0) {
        activeEmptyMsg.style.display = 'block';
    } else {
        activeEmptyMsg.style.display = 'none';
    }

    if (filteredProducts.length === 0) {
        allEmptyMsg.style.display = 'block';
    } else {
        allEmptyMsg.style.display = 'none';
    }
}

/**
 * Crea la tarjeta visual de un producto para la lista de administración. (ESTRUCTURA VERTICAL)
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card-admin');
    if (!product.is_active) {
        card.classList.add('inactive');
    }
    card.dataset.id = product.id; 

    const imageUrl = product.image_url || 'https://via.placeholder.com/150x150?text=No+Img';
    const activeIcon = product.is_active ? '✅' : '❌';
    const categoryName = product.category_name || 'Sin Categoría';
    
    // Nueva estructura vertical (Image - Details - Footer/Actions)
    card.innerHTML = `
        <div class="product-image-container">
            <img src="${imageUrl}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-details">
            <h5 class="product-name-title">${product.name}</h5>
            <p class="product-category">Categoría: <span>${categoryName}</span></p>
            <p class="product-status">Activo: <span>${activeIcon}</span></p>
        </div>
        <div class="card-footer-actions">
            <p class="price">S/ ${product.price.toFixed(2)}</p>
            <div class="actions-group">
                <button class="action-btn info-btn" data-action="info">Ver/Editar</button>
                <button class="action-btn delete-btn" data-action="delete">🗑</button>
            </div>
        </div>
    `;

    return card;
}

function handleListActions(e) {
    const target = e.target;
    if (target.tagName !== 'BUTTON') return;
    
    const card = target.closest('.product-card-admin');
    const productId = parseInt(card.dataset.id);
    const action = target.dataset.action;
    
    if (action === 'info') {
        // En este caso, 'info' abre el modal para ver/editar
        openProductModal('edit', productId);
    } else if (action === 'delete') {
        // Abre el modal de confirmación de eliminación
        openDeleteModal(productId);
    }
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
        // Bloqueamos los botones y cerramos el modal de confirmación antes de la operación
        document.getElementById('confirm-delete-btn').disabled = true;
        closeDeleteModal(); 
        
        await ProductsAdminService.deleteProduct(id, product.image_url);
        
        // Eliminamos el producto de la lista local
        productsList = productsList.filter(p => p.id !== id);
        
        alert(`Producto ${product.name} eliminado.`);
        
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