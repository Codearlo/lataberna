// src/admin/add-product/add-product.js

// Ruta corregida para importar las funciones del nuevo servicio local
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
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 1. Cargar datos estáticos
    await loadCategories();
    
    // 2. Adjuntar listeners
    attachEventListeners();
    
    // 3. Inicializar el switch de estado
    setupSwitch();
}

function attachEventListeners() {
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // El listener de imagen debe ser adjuntado al input file (que está en hidden-file-input)
    document.getElementById('image_file').addEventListener('change', handleImagePreview);
    document.getElementById('create-category-btn').addEventListener('click', handleCreateCategory);
    
    // Manejar el click en la tarjeta de categoría para abrir el select (en móviles)
    const categoryCard = document.querySelector('.custom-select-container');
    if (categoryCard) {
        categoryCard.addEventListener('click', () => {
            // Abrir el select nativo
            document.getElementById('category_id').focus();
        });
    }
    
    // Listener para actualizar el input visible al seleccionar una opción
    document.getElementById('category_id').addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        // Aseguramos que el input visible muestre el nombre de la categoría
        document.getElementById('category_display').value = selectedOption.value ? selectedOption.textContent : 'Categoría';
    });
}

// --- Lógica del Formulario ---

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    // No se necesita FormData para obtener los valores ya que usamos IDs
    
    const name = document.getElementById('name').value;
    const price = parseFloat(document.getElementById('price').value);
    const categoriaId = parseInt(document.getElementById('category_id').value);
    const imageFile = document.getElementById('image_file').files[0];
    const isActive = document.getElementById('is_active').checked;
    
    if (!categoriaId) {
        alert("Por favor, selecciona una categoría existente.");
        return;
    }
    
    let imageUrl = ''; 

    try {
        document.getElementById('save-product-btn').disabled = true;
        document.getElementById('save-product-btn').textContent = 'Guardando...';

        if (imageFile) {
            // Usar la función de servicio local
            imageUrl = await uploadImage(imageFile);
        } else {
            alert("Debe seleccionar una imagen para el producto.");
            document.getElementById('save-product-btn').disabled = false;
            document.getElementById('save-product-btn').textContent = 'Guardar Producto';
            return;
        }
        
        const productData = {
            name: name,
            price: price,
            categoria_id: categoriaId,
            is_active: isActive,
            image_url: imageUrl,
        };

        // Usar la función de servicio local
        const result = await createProduct(productData);
        alert(`Producto ${result.name} agregado!`);
        
        // Redirigir a la lista después de la creación exitosa
        window.location.href = '../list-products/list-products.html'; 

    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        document.getElementById('save-product-btn').disabled = false;
        document.getElementById('save-product-btn').textContent = 'Guardar Producto';
    }
}


// --- Funciones de Utilidad y Categorías ---

async function loadCategories() {
    try {
        // Usar la función de servicio local
        categoriesList = await getCategories();
        renderCategoriesSelect();
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function renderCategoriesSelect() {
    const select = document.getElementById('category_id');
    const displayInput = document.getElementById('category_display');
    select.innerHTML = '<option value="">Categoría</option>'; 
    
    categoriesList.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        select.appendChild(option);
    });
    
    // 1. Resetear el valor seleccionado del select si es necesario
    select.value = "";
    
    // 2. Inicializar el placeholder del input visible
    displayInput.value = displayInput.placeholder || 'Categoría';
}

function handleImagePreview(e) {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    const file = e ? e.target.files[0] : null;
    const imageUrl = file ? URL.createObjectURL(file) : null;
    
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Preview';
        previewContainer.appendChild(img);
        
        // Ocultar el placeholder cuando hay una imagen
        if (uploadPlaceholder) {
            uploadPlaceholder.style.display = 'none';
        }

        if (file) {
            img.onload = () => URL.revokeObjectURL(img.src);
        }
    } else {
        // Mostrar el placeholder si se borra la imagen o es nula
        if (uploadPlaceholder) {
            uploadPlaceholder.style.display = 'flex';
        }
    }
}

async function handleCreateCategory() {
    const newCategoryName = document.getElementById('new_category_name').value.trim();
    
    if (!newCategoryName) {
        alert("Por favor, introduce el nombre de la nueva categoría.");
        return;
    }

    try {
        document.getElementById('create-category-btn').disabled = true;
        document.getElementById('create-category-btn').textContent = 'Creando...';
        
        // Usar la función de servicio local
        const newCategory = await createCategory(newCategoryName);
        
        alert(`Categoría "${newCategory.nombre}" creada con éxito.`);
        
        categoriesList.push(newCategory);
        renderCategoriesSelect();
        
        document.getElementById('category_id').value = newCategory.id;
        // Actualizar el input visible para reflejar la categoría recién creada
        document.getElementById('category_display').value = newCategory.nombre;
        document.getElementById('new_category_name').value = '';

    } catch (error) {
        console.error("Error al crear categoría:", error);
        alert(`Error al crear categoría: ${error.message}`);
    } finally {
        document.getElementById('create-category-btn').disabled = false;
        document.getElementById('create-category-btn').textContent = 'Crear';
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