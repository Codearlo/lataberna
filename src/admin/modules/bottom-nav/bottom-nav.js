// src/admin/modules/bottom-nav/bottom-nav.js

const NAV_CONTAINER_ID = 'admin-nav-container';

// NO SE PUEDE DEFINIR VIEW_ROUTES AQUÍ porque las rutas cambian dependiendo de la página que llama.

/**
 * Inicializa la barra de navegación inferior.
 * @param {string} currentViewName - Nombre de la vista actual ('products', 'packs' o 'profile').
 * @param {string} navHtmlPath - La RUTA RELATIVA CORRECTA para el FETCH de HTML de la barra (ej: '../modules/bottom-nav/bottom-nav.html').
 * @param {object} viewRoutes - El OBJETO DE RUTAS DE NAVEGACIÓN RELATIVAS para la página actual.
 */
export async function initBottomNav(currentViewName, navHtmlPath, viewRoutes) {
    const container = document.getElementById(NAV_CONTAINER_ID);
    if (!container) return;
    
    // Usamos la ruta y el objeto de rutas pasados como argumento

    try {
        // 1. Cargar el HTML de la barra de navegación
        const response = await fetch(navHtmlPath);
        if (!response.ok) {
            throw new Error(`Error al obtener HTML de navegación. Status: ${response.status}`);
        }
        const html = await response.text();
        container.innerHTML = html;

        // 2. Adjuntar listener de delegación para la navegación (HARD JUMP)
        const nav = document.getElementById('admin-bottom-nav');
        nav.addEventListener('click', (e) => {
            const listItem = e.target.closest('li[data-view]');
            if (!listItem) return;
            
            e.preventDefault();
            const targetView = listItem.dataset.view;
            
            // 3. Navegar usando el objeto de rutas DINÁMICO
            if (viewRoutes[targetView]) {
                window.location.href = viewRoutes[targetView];
            }
        });

        // 4. Seleccionar vista inicial (solo para resaltar)
        setActiveView(currentViewName);

    } catch (error) {
        console.error("Error al cargar la barra de navegación inferior:", error);
    }
}

/**
 * Establece la clase 'active' en el ítem de navegación actual.
 * @param {string} viewName - El nombre de la vista activa ('products', 'packs' o 'profile').
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