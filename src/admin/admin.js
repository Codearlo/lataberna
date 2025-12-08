// src/admin/admin.js

import { initProductsAdmin } from './products/products.js';
import { initProfileView } from './profile/profile.js'; 
import { initAuthForm, getSession } from './auth/auth.js'; 
import { initBottomNav } from './modules/bottom-nav/bottom-nav.js'; 

const ADMIN_CONTENT_ID = 'app-content';
const ADMIN_NAV_CONTAINER_ID = 'admin-nav-container';

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
    const footerElement = document.getElementById('main-footer');
    
    // Limpiamos el contenido anterior antes de renderizar
    contentContainer.innerHTML = '';
    navContainer.innerHTML = ''; 
    
    if (session) {
        // Logueado: Cargar layout y views
        
        // 1. Configurar los contenedores de vista
        contentContainer.innerHTML = `
            <div id="${VIEW_CONTAINERS.products}" style="display: none;"></div>
            <div id="${VIEW_CONTAINERS.profile}" style="display: none;"></div>
        `;

        // 2. Inicializar componentes
        await initBottomNav(handleViewChange); // Pasa la función de enrutamiento
        
        // 3. Inicializar las vistas (se renderizan en sus contenedores ocultos)
        initProductsAdmin(VIEW_CONTAINERS.products); 
        initProfileView(VIEW_CONTAINERS.profile);

        // 4. Mostrar la vista por defecto (Products)
        handleViewChange('products');

        // El margen ya es manejado por el CSS de bottom-nav (margin-bottom: 90px)
        footerElement.style.marginBottom = ''; 
        
    } else {
        // No logueado: Cargar formulario de login
        footerElement.style.marginBottom = '0'; 
        initAuthForm(ADMIN_CONTENT_ID, () => {
            // Callback al iniciar sesión exitosamente
            checkAuthAndRender(); 
        });
    }
}

/**
 * Gestiona el cambio entre las vistas de administración.
 * @param {string} newView - La vista a mostrar ('products' o 'profile').
 */
function handleViewChange(newView) {
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