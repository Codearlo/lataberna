// src/admin/profile/profile.js

import { initBottomNav } from '../modules/bottom-nav/bottom-nav.js';
import { getSession } from '../auth/auth.js'; 
import { ProfileAdminService } from './profile.service.js';

// Rutas de navegación
const PROFILE_VIEW_ROUTES = {
    'products': '../products/list-products/list-products.html', 
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
        // CORRECCIÓN: REDIRECCIÓN COMPLETA AL LOGIN
        // Usamos path relativo desde: src/admin/profile/
        window.location.href = '../auth/auth.html'; 
        return;
    }

    // Si hay sesión, cargar datos
    try {
        const emailDisplay = document.getElementById('profile-email-display');
        if (emailDisplay && session.user) {
            emailDisplay.textContent = session.user.email;
        }

        const logoutBtn = document.getElementById('profile-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logoutBtn.textContent = 'Cerrando...';
                ProfileAdminService.handleLogout();
            });
        }

        initBottomNav(CURRENT_VIEW, '../modules/bottom-nav/bottom-nav.html', PROFILE_VIEW_ROUTES);
        
        if (navContainer) navContainer.style.display = 'block';

    } catch (error) {
        console.error("Error al inicializar perfil:", error);
    }
}

document.addEventListener('DOMContentLoaded', initProfilePage);