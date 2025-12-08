// src/admin/modules/bottom-nav/bottom-nav.js

const NAV_CONTAINER_ID = 'admin-nav-container';
const BOTTOM_NAV_HTML_PATH = './modules/bottom-nav/bottom-nav.html';

/**
 * Inicializa la barra de navegación inferior.
 * @param {function} onNavClick - Función de callback para manejar el cambio de vista (ej: admin.js's router).
 */
export async function initBottomNav(onNavClick) {
    const container = document.getElementById(NAV_CONTAINER_ID);
    if (!container) return;

    try {
        // 1. Cargar el HTML de la barra de navegación
        const response = await fetch(BOTTOM_NAV_HTML_PATH);
        if (!response.ok) {
            throw new Error(`Error al obtener HTML de navegación. Status: ${response.status}`);
        }
        const html = await response.text();
        container.innerHTML = html;

        // 2. Adjuntar listener de delegación para la navegación
        const nav = document.getElementById('admin-bottom-nav');
        nav.addEventListener('click', (e) => {
            const listItem = e.target.closest('li[data-view]');
            if (!listItem) return;
            
            e.preventDefault();
            const targetView = listItem.dataset.view;
            
            // 3. Resalta la vista activa y llama al router
            setActiveView(targetView);
            onNavClick(targetView); 
        });

        // 4. Seleccionar vista inicial
        setActiveView('products');

    } catch (error) {
        console.error("Error al cargar la barra de navegación inferior:", error);
    }
}

/**
 * Establece la clase 'active' en el ítem de navegación actual.
 * @param {string} viewName - El nombre de la vista activa ('products' o 'profile').
 */
function setActiveView(viewName) {
    const navItems = document.querySelectorAll('#admin-bottom-nav li[data-view]');
    navItems.forEach(item => {
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

export { setActiveView };