// src/admin/admin.js

import { initProductsAdmin } from './products/products.js';
import { initAuthForm, getSession, logout } from './auth/auth.js'; 

const ADMIN_CONTENT_ID = 'app-content';

/**
 * Carga la interfaz de administración (login o panel de productos).
 */
export async function initAdminPanel() {
    const mainContainer = document.getElementById(ADMIN_CONTENT_ID);
    const headerElement = document.getElementById('main-header'); 
    
    if (!mainContainer) return;

    // 1. Insertar el layout base del admin DENTRO del <header> y <main>
    headerElement.innerHTML = `
        <div id="admin-header-bar"></div>
    `;
    
    // 2. Verificar sesión
    await checkAuthAndRender();
}

/**
 * Verifica si hay una sesión activa y renderiza la vista correspondiente.
 */
async function checkAuthAndRender() {
    const session = await getSession();
    const contentContainer = document.getElementById(ADMIN_CONTENT_ID);
    const adminHeaderBar = document.getElementById('admin-header-bar');
    
    // Limpiamos el contenido anterior antes de renderizar
    contentContainer.innerHTML = '';
    
    if (session) {
        // Logueado: Cargar panel de productos
        
        // Renderizar barra de título y logout
        adminHeaderBar.innerHTML = `
            <div class="admin-title">Panel de Administración LA TABERNA</div>
            <button id="logout-btn" class="logout-btn">Cerrar Sesión</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
        
        // <div> temporal para que initProductsAdmin cargue su HTML
        contentContainer.innerHTML = `<div id="admin-products-panel"></div>`;
        initProductsAdmin('admin-products-panel'); 
    } else {
        // No logueado: Cargar formulario de login
        adminHeaderBar.innerHTML = ''; // Limpiar la cabecera si no está logueado
        initAuthForm(ADMIN_CONTENT_ID, () => {
            // Callback al iniciar sesión exitosamente
            checkAuthAndRender(); 
        });
    }
}

// Inicializar el panel al cargar el DOM de admin.html
document.addEventListener('DOMContentLoaded', initAdminPanel);