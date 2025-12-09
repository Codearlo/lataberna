// src/admin/admin.js

import { initProfileView } from './profile/profile.js'; 
import { initAuthForm, getSession } from './auth/auth.js'; 
import { initBottomNav } from './modules/bottom-nav/bottom-nav.js'; 
// Importamos las nuevas funciones de inicialización
import { initListProducts } from './list-products/list-products.js';
import { initAddProduct } from './add-product/add-product.js';
import { initEditProduct } from './edit-product/edit-product.js';


const ADMIN_CONTENT_ID = 'app-content';
const ADMIN_NAV_CONTAINER_ID = 'admin-nav-container'; 

// Contenedores para las vistas modulares
const VIEW_CONTAINERS = {
    products: 'admin-products-panel', // Se mantiene 'products' para el bottom-nav
    profile: 'admin-profile-panel' 
};

/**
 * Función que actúa como router para la vista de productos.
 * Carga el HTML y el JS de la sub-vista apropiada (Listar, Agregar, Editar).
 */
async function initProductsRouter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Crear un contenedor intermedio para la sub-vista
    container.innerHTML = `<div id="products-subview-container"></div>`;
    const subviewContainer = document.getElementById('products-subview-container');

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action') || 'list';

    let htmlPath, initFunc;
    
    switch (action) {
        case 'add':
            htmlPath = './add-product/add-product.html';
            initFunc = initAddProduct;
            break;
        case 'edit':
            htmlPath = './edit-product/edit-product.html';
            initFunc = initEditProduct;
            break;
        case 'list':
        default:
            htmlPath = './list-products/list-products.html';
            initFunc = initListProducts;
            break;
    }
    
    try {
        const response = await fetch(htmlPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        subviewContainer.innerHTML = html;
        
        // Llamar a la función de inicialización, pasándole el ID del sub-contenedor
        await initFunc('products-subview-container');

    } catch (error) {
        console.error(`Error al cargar la sub-vista ${htmlPath}:`, error);
        subviewContainer.innerHTML = `<p class="error-msg">Error al cargar la vista: ${error.message}</p>`;
    }
}


/**
 * Carga la interfaz de administración (login o panel de la vista activa).
 */
export async function initAdminPanel() {
    await checkAuthAndRender();
}

/**
 * Verifica si hay una sesión activa y renderiza la vista correspondiente.
 */
async function checkAuthAndRender() {
    const session = await getSession();
    const contentContainer = document.getElementById(ADMIN_CONTENT_ID);
    const navContainer = document.getElementById(ADMIN_NAV_CONTAINER_ID);
    
    // Limpiamos el contenido anterior antes de renderizar
    contentContainer.innerHTML = '';
    
    if (session) {
        // Logueado: Cargar layout y views
        
        // 1. Configurar los contenedores de vista
        contentContainer.innerHTML = `
            <div id="${VIEW_CONTAINERS.products}"></div>
            <div id="${VIEW_CONTAINERS.profile}" style="display: none;"></div>
        `;

        // 2. Inicializar las vistas 
        await initProductsRouter(VIEW_CONTAINERS.products); // Router para productos
        await initProfileView(VIEW_CONTAINERS.profile);

        // 3. Inicializar la barra de navegación inferior
        initBottomNav(handleViewChange);

        // 4. Mostrar la vista por defecto (Products)
        handleViewChange('products');

        // Mostrar el nav container
        navContainer.style.display = 'block';
        
    } else {
        // No logueado: Cargar formulario de login
        initAuthForm(ADMIN_CONTENT_ID, () => {
            // Callback al iniciar sesión exitosamente
            checkAuthAndRender(); 
        });

        // Ocultar el nav container
        navContainer.style.display = 'none';
    }
}

/**
 * Gestiona el cambio entre las vistas de administración (llamada por la barra de navegación inferior).
 */
export function handleViewChange(newView) {
    // Limpiar los parámetros de la URL al cambiar de vista principal
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url);

    // Ocultar todas las vistas
    Object.values(VIEW_CONTAINERS).forEach(id => {
        const viewElement = document.getElementById(id);
        if (viewElement) {
            viewElement.style.display = 'none';
        }
    });

    // Mostrar la vista seleccionada
    const activeViewElement = document.getElementById(VIEW_CONTAINERS[newView]);
    if (activeViewElement) {
        activeViewElement.style.display = 'block';
        
        // Si la vista es 'products', la re-inicializamos para que el router cargue 'list' por defecto.
        if (newView === 'products') {
             initProductsRouter(VIEW_CONTAINERS.products);
        }
        
    } else {
         console.error(`Contenedor para la vista '${newView}' no encontrado.`);
    }
}

// Inicializar el panel al cargar el DOM de admin.html
document.addEventListener('DOMContentLoaded', initAdminPanel);