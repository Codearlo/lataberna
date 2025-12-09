// src/admin/modules/bottom-nav/bottom-nav.js

const NAV_CONTAINER_ID = 'admin-nav-container';
const BOTTOM_NAV_HTML_PATH = './modules/bottom-nav/bottom-nav.html';

// Mapeo de vistas a rutas de archivos HTML
const VIEW_ROUTES = {
    'products': '../list-products/list-products.html', // Usamos list-products como entrada
    'profile': '../profile/profile.html'
};

/**
 * Inicializa la barra de navegación inferior.
 * @param {string} currentViewName - Nombre de la vista actual ('products' o 'profile').
 */
export async function initBottomNav(currentViewName) {
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

        // 2. Adjuntar listener de delegación para la navegación (HARD JUMP)
        const nav = document.getElementById('admin-bottom-nav');
        nav.addEventListener('click', (e) => {
            const listItem = e.target.closest('li[data-view]');
            if (!listItem) return;
            
            e.preventDefault();
            const targetView = listItem.dataset.view;
            
            // 3. Navega a la nueva página
            if (VIEW_ROUTES[targetView]) {
                window.location.href = VIEW_ROUTES[targetView];
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