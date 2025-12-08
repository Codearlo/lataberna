// src/admin/profile/profile.js

import { ProfileAdminService } from '../../services/admin/profile/profile.service.js';

/**
 * Inicializa la vista del perfil.
 * @param {string} containerId - ID del contenedor donde inyectar el HTML.
 */
export async function initProfileView(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // RUTA DE FETCH: Es relativa al archivo HTML base (src/admin/admin.html)
    const PROFILE_HTML_PATH = './profile/profile.html'; 

    try {
        const response = await fetch(PROFILE_HTML_PATH);
        if (!response.ok) {
            throw new Error(`Error al obtener HTML de perfil. Status: ${response.status}`);
        }
        const html = await response.text();
        container.innerHTML = html;

        // 1. Adjuntar listener de Cerrar Sesión
        document.getElementById('profile-logout-btn').addEventListener('click', () => {
             if (confirm('¿Estás seguro que quieres cerrar sesión?')) {
                // Llama al servicio centralizado para manejar el logout
                ProfileAdminService.handleLogout();
            }
        });

    } catch (error) {
        console.error("Error al inicializar el panel de perfil:", error);
        container.innerHTML = `<p class="error-msg">Error al cargar la interfaz de perfil.</p>`;
    }
}