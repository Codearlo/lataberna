// src/services/admin/profile/profile.service.js

import { logout } from '../../../admin/auth/auth.js'; 

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