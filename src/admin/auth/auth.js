// src/admin/auth/auth.js

import { supabase } from '../../config/supabaseClient.js'; 

/**
 * Maneja el envío del formulario de login.
 * Esta función es llamada por el script dentro de auth.html
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

        // Login Exitoso
        if (typeof onAuthSuccess === 'function') {
            onAuthSuccess();
        } else {
            // Redirigir a la lista de productos
            // Usamos ruta absoluta desde la raíz para evitar errores
            window.location.href = '/src/admin/products/list-products/list-products.html'; 
        }

    } catch (error) {
        if (errorMsgElement) {
            errorMsgElement.textContent = error.message;
            errorMsgElement.style.display = 'block';
        }
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = "ACCEDER A LA TABERNA";
        }
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
 * Realiza el cierre de sesión y redirige al login.
 */
export async function logout() {
    await supabase.auth.signOut();
    // Redirigir a auth.html usando ruta absoluta
    window.location.href = '/src/admin/auth/auth.html'; 
}