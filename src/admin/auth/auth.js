// src/admin/auth/auth.js

import { supabase } from '../../config/supabaseClient.js'; 

// FIX: Usamos una RUTA ABSOLUTA (/src/...) para que el fetch funcione 
// sin importar desde qué carpeta se llame a este script (Productos, Perfil, etc.)
const LOGIN_FORM_HTML_PATH = '/src/admin/auth/auth.html'; 

/**
 * Carga el formulario de login y adjunta el listener de submit.
 */
export async function initAuthForm(containerId, onAuthSuccess) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 1. Cargar el HTML del formulario de login
    try {
        const response = await fetch(LOGIN_FORM_HTML_PATH);
        if (!response.ok) {
            throw new Error(`Error al obtener HTML. Status: ${response.status} URL: ${response.url}`);
        }
        const html = await response.text();
        container.innerHTML = html;
        
        // 2. Adjuntar listener
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => handleLoginSubmit(e, onAuthSuccess));
        
    } catch (error) {
        console.error("Error al cargar el formulario de autenticación:", error);
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545;">
                <p>Error crítico al cargar el login.</p>
                <small>${error.message}</small>
            </div>`;
    }
}

/**
 * Maneja el envío del formulario de login.
 */
async function handleLoginSubmit(e, onAuthSuccess) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorMsgElement = document.getElementById('auth-error-msg');
    const loginBtn = document.getElementById('login-btn');

    errorMsgElement.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = "Verificando...";

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            throw new Error("Credenciales incorrectas o error de conexión.");
        }

        // FIX: Si se pasó una función de éxito (ej. desde Perfil), la ejecutamos.
        // Si no, redirigimos a la lista de productos por defecto.
        if (typeof onAuthSuccess === 'function') {
            onAuthSuccess();
        } else {
            // Usamos ruta absoluta también aquí para evitar errores de redirección
            window.location.href = '/src/admin/products/list-products/list-products.html'; 
        }

    } catch (error) {
        errorMsgElement.textContent = error.message;
        errorMsgElement.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = "Iniciar Sesión";
    }
}

/**
 * Obtiene la sesión de usuario actual.
 */
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Realiza el cierre de sesión.
 */
export async function logout() {
    await supabase.auth.signOut();
    // Redirigir a la página de login (usamos ruta absoluta para asegurar)
    window.location.href = '/src/admin/auth/auth.html'; // O recargar la página actual para que salga el login
}