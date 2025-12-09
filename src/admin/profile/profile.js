// src/admin/profile/profile.js

import { initBottomNav } from '../modules/bottom-nav/bottom-nav.js';
import { getSession, initAuthForm } from '../auth/auth.js'; 
import { ProfileAdminService } from './profile.service.js';

const ADMIN_CONTENT_ID = 'app-content';
const ADMIN_NAV_CONTAINER_ID = 'admin-nav-container';
const CURRENT_VIEW = 'profile';


/**
 * Inicializa la vista del perfil (Full Page).
 */
export async function initProfilePage() {
    const session = await getSession();
    const contentContainer = document.getElementById(ADMIN_CONTENT_ID);
    const navContainer = document.getElementById(ADMIN_NAV_CONTAINER_ID);

    if (!session) {
        // No logueado: Cargar formulario de login
        initAuthForm(ADMIN_CONTENT_ID, () => {
            // Callback al iniciar sesión exitosamente
            window.location.href = './profile.html'; 
        });

        if (navContainer) navContainer.style.display = 'none';
        return;
    }

    // Logueado: Cargar contenido y navegación
    try {
        // Asumiendo que el HTML del perfil ya está en el DOM (en profile.html)
        
        // 1. Adjuntar listener de Cerrar Sesión
        document.getElementById('profile-logout-btn').addEventListener('click', () => {
             ProfileAdminService.handleLogout();
        });

        // 2. Inicializar la barra de navegación inferior
        initBottomNav(CURRENT_VIEW);
        
        // 3. Asegurar que el nav sea visible
        if (navContainer) navContainer.style.display = 'block';

    } catch (error) {
        console.error("Error al inicializar el panel de perfil:", error);
        contentContainer.innerHTML = `<p class="error-msg">Error al cargar la interfaz de perfil.</p>`;
    }
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', initProfilePage);