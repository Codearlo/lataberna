// src/admin/profile/profile.service.js

// Ruta corregida: Sube un nivel (profile/) y baja a auth/
import { logout } from '../auth/auth.js'; 

const ProfileAdminService = {
    
    /**
     * Realiza el cierre de sesión.
     */
    async handleLogout() {
        // El logout está centralizado en auth.js, solo actuamos como wrapper
        await logout();
    }
    
    // Aquí irían otras funciones relacionadas con el perfil (cambiar contraseña, ver info, etc.)
};

export { ProfileAdminService };