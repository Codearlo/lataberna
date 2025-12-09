// src/admin/admin-guard.js

import { getSession } from './auth/auth.js';

(async function initGuard() {
    // 1. Ocultar el contenido inmediatamente para evitar "flasheos" de información
    // Si el body aún no existe (porque el script está en el head), esperamos a que cargue
    if (document.body) {
        document.body.style.visibility = 'hidden';
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.style.visibility = 'hidden';
        });
    }

    try {
        // 2. Verificar Sesión
        const session = await getSession();

        if (!session) {
            // 3. Si no hay sesión, redirigir al login
            console.warn('⛔ Acceso denegado. Redirigiendo al login...');
            window.location.href = '/src/admin/auth/auth.html';
        } else {
            // 4. Si hay sesión, mostrar el contenido
            if (document.body) {
                document.body.style.visibility = 'visible';
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.style.visibility = 'visible';
                });
            }
        }
    } catch (error) {
        console.error("Error en el guardia de seguridad:", error);
        // Por seguridad, si falla algo, redirigir
        window.location.href = '/src/admin/auth/auth.html';
    }
})();