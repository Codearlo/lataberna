// src/public/modules/store/desktop-sidebar/desktop-sidebar.js

const CONTAINER_ID = 'desktop-sidebar-container';

export async function initDesktopSidebar() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    renderSidebar(container);
}

function renderSidebar(container) {
    // Lista de filtros estática basada en la imagen de referencia
    const filtersList = [
        "Marca",
        "Vendido por",
        "Precio",
        "Ofertas especiales",
        "Incluye Inteligencia Artificial",
        "Conexión bluetooth",
        "Conexión Wi Fi",
        "Funcionalidad",
        "Número de entradas HDMI",
        "Rango pulgadas",
        "Resolución de imagen",
        "Sistema operativo"
    ];

    container.innerHTML = `
        <div class="sidebar-card">
            <div class="sidebar-tabs">
                <button class="sidebar-tab" data-tab="categories">Categorías</button>
                <button class="sidebar-tab active" data-tab="filters">Filtros</button>
            </div>
            
            <div id="sidebar-content-categories" class="sidebar-content">
                <p class="empty-filters">Selecciona categorías arriba.</p>
            </div>

            <div id="sidebar-content-filters" class="sidebar-content active">
                <div class="filter-header">Filtrar por:</div>
                <ul class="sidebar-list">
                    ${filtersList.map(filter => `
                        <li class="sidebar-item">
                            <span class="item-text">${filter}</span>
                            <span class="item-plus">+</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;

    attachEvents(container);
}

function attachEvents(container) {
    const tabs = container.querySelectorAll('.sidebar-tab');
    const contents = container.querySelectorAll('.sidebar-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Cambio de Tabs
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetId = `sidebar-content-${tab.dataset.tab}`;
            container.querySelector(`#${targetId}`).classList.add('active');
        });
    });
    
    // Aquí podrías agregar la lógica real de filtrado cuando tengas los datos
}