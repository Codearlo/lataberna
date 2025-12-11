// src/admin/profile/profile.js

import { initBottomNav } from '../modules/bottom-nav/bottom-nav.js';
// CORRECCIÓN: Solo importamos getSession, YA NO initAuthForm
import { getSession } from '../auth/auth.js'; 
import { ProfileAdminService } from './profile.service.js';

// Rutas de navegación
const PROFILE_VIEW_ROUTES = {
    'products': '../products/list-products/list-products.html', 
    'packs': '../packs/list-packs/list-packs.html', // NUEVA RUTA
    'profile': './profile.html'                                 
};

const ADMIN_CONTENT_ID = 'app-content';
const ADMIN_NAV_CONTAINER_ID = 'admin-nav-container';
const CURRENT_VIEW = 'profile';

/**
 * Inicializa la vista del perfil.
 */
export async function initProfilePage() {
    const session = await getSession();
    const navContainer = document.getElementById(ADMIN_NAV_CONTAINER_ID);

    if (!session) {
        // --- CORRECCIÓN CRÍTICA ---
        // Si no hay sesión, REDIRIGIMOS (navegamos) a la página de login.
        // No inyectamos nada.
        window.location.href = '../auth/auth.html'; 
        return; 
    }

    // Si hay sesión, cargar datos
    try {
        // 1. Mostrar email del usuario logueado
        const emailDisplay = document.getElementById('profile-email-display');
        if (emailDisplay && session.user) {
            emailDisplay.textContent = session.user.email;
        }

        // 2. Listener de Cerrar Sesión
        const logoutBtn = document.getElementById('profile-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logoutBtn.textContent = 'Cerrando...';
                ProfileAdminService.handleLogout();
            });
        }

        // 3. Inicializar navegación inferior
        initBottomNav(CURRENT_VIEW, '../modules/bottom-nav/bottom-nav.html', PROFILE_VIEW_ROUTES);
        
        if (navContainer) navContainer.style.display = 'block';

    } catch (error) {
        console.error("Error al inicializar perfil:", error);
    }
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', initProfilePage);