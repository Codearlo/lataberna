// src/admin/auth/auth.js

import { supabase } from '../../config/supabaseClient.js'; 

const LOGIN_FORM_HTML_PATH = '/src/admin/auth/auth.html'; 

// Esta función se mantiene por compatibilidad, pero ya no se usa en las páginas principales
export async function initAuthForm(containerId, onAuthSuccess) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch(LOGIN_FORM_HTML_PATH);
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const html = await response.text();
        container.innerHTML = html;
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => handleLoginSubmit(e, onAuthSuccess));
        }
    } catch (error) {
        console.error("Error al cargar el login:", error);
    }
}

/**
 * Maneja el envío del login. 
 * EXPORTADA para que funcione en auth.html standalone.
 */
export async function handleLoginSubmit(e, onAuthSuccess) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorMsgElement = document.getElementById('auth-error-msg');
    const loginBtn = document.getElementById('login-btn');

    if (errorMsgElement) errorMsgElement.style.display = 'none';
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Verificando...";
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            throw new Error("Credenciales incorrectas o error de conexión.");
        }

        // Si se pasó un callback, úsalo; si no, redirige al inventario
        if (typeof onAuthSuccess === 'function') {
            onAuthSuccess();
        } else {
            // Redirección absoluta para evitar problemas de ruta
            window.location.href = '/src/admin/products/list-products/list-products.html'; 
        }

    } catch (error) {
        if (errorMsgElement) {
            errorMsgElement.textContent = error.message;
            errorMsgElement.style.display = 'block';
        }
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = "Iniciar Sesión";
        }
    }
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/src/admin/auth/auth.html'; 
}