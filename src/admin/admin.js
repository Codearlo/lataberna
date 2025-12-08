// src/admin/admin.js

import { initProductsAdmin } from './products/products.js';
import { initProfileView } from './profile/profile.js'; 
import { initAuthForm, getSession } from './auth/auth.js'; 
import { initBottomNav } from './modules/bottom-nav/bottom-nav.js'; // Descomentada

const ADMIN_CONTENT_ID = 'app-content';
const ADMIN_NAV_CONTAINER_ID = 'admin-nav-container'; // Contenedor para la barra de navegación

// Contenedores para las vistas modulares
const VIEW_CONTAINERS = {
    products: 'admin-products-panel',
    profile: 'admin-profile-panel' 
};

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
        // Llama a initProductsAdmin que a su vez llama a loadProducts
        await initProductsAdmin(VIEW_CONTAINERS.products); // Usamos await para asegurar que el contenido se inyecte
        await initProfileView(VIEW_CONTAINERS.profile);

        // 3. Inicializar la barra de navegación inferior (Si el módulo bottom-nav.js existe)
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
 * @param {string} newView - La vista a mostrar ('products' o 'profile').
 */
export function handleViewChange(newView) {
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
    } else {
         console.error(`Contenedor para la vista '${newView}' no encontrado.`);
    }
}

// Inicializar el panel al cargar el DOM de admin.html
document.addEventListener('DOMContentLoaded', initAdminPanel);