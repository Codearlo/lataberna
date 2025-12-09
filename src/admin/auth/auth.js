// src/admin/auth/auth.js

// RUTA A CONFIG: Subir de auth/ a admin/, luego a src/, luego bajar a config/
import { supabase } from '../../config/supabaseClient.js'; 

// RUTA DE FETCH: Es relativa al archivo HTML base (src/admin/auth/auth.html)
const LOGIN_FORM_HTML_PATH = './auth.html'; 

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
            // Se lanza un error específico si la carga falla
            throw new Error(`Error al obtener HTML. Status: ${response.status} URL: ${response.url}`);
        }
        const html = await response.text();
        container.innerHTML = html;
        
        // 2. Adjuntar listener
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => handleLoginSubmit(e, onAuthSuccess));
        
    } catch (error) {
        console.error("Error al cargar el formulario de autenticación:", error);
        container.innerHTML = `<p class="error-msg">Error al cargar la interfaz de login. Revise la consola para detalles de la URL fallida.</p>`;
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

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            throw new Error(error.message);
        }

        // Si la autenticación es exitosa
        // REDIRECCIÓN A LA NUEVA PÁGINA DE PRODUCTOS
        window.location.href = '../list-products/list-products.html'; 

    } catch (error) {
        errorMsgElement.textContent = `Error: ${error.message}`;
        errorMsgElement.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
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
    // Redirigir a la página de login
    window.location.href = './auth.html'; 
}