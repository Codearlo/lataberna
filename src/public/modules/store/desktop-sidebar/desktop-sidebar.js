// src/public/modules/store/desktop-sidebar/desktop-sidebar.js

import { getMenuCategories } from '../../../../services/store/products.service.js';

const CONTAINER_ID = 'desktop-sidebar-container';

export async function initDesktopSidebar() {
    // Solo ejecutar si existe el contenedor (que está en el HTML)
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    try {
        const categories = await getMenuCategories();
        renderSidebar(container, categories);
    } catch (error) {
        console.error("Error loading desktop sidebar:", error);
    }
}

function renderSidebar(container, categories) {
    // Estructura basada en la imagen de referencia (Tabs + Lista)
    container.innerHTML = `
        <div class="sidebar-card">
            <div class="sidebar-tabs">
                <button class="sidebar-tab active" data-tab="categories">Categorías</button>
                <button class="sidebar-tab" data-tab="filters">Filtros</button>
            </div>
            
            <div id="sidebar-content-categories" class="sidebar-content active">
                <div class="filter-header">Filtrar por:</div>
                <ul class="sidebar-list">
                    <li class="sidebar-item" data-id="all">
                        <span class="item-text">Ver Todo</span>
                        <span class="item-plus">+</span>
                    </li>
                    ${categories.map(cat => `
                        <li class="sidebar-item" data-id="${cat.id}">
                            <span class="item-text">${cat.nombre}</span>
                            <span class="item-plus">+</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div id="sidebar-content-filters" class="sidebar-content">
                <p class="empty-filters">Filtros avanzados próximamente...</p>
            </div>
        </div>
    `;

    attachEvents(container);
}

function attachEvents(container) {
    // 1. Manejo de Tabs
    const tabs = container.querySelectorAll('.sidebar-tab');
    const contents = container.querySelectorAll('.sidebar-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover activo de todos
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Activar clickeado
            tab.classList.add('active');
            const targetId = `sidebar-content-${tab.dataset.tab}`;
            container.querySelector(`#${targetId}`).classList.add('active');
        });
    });

    // 2. Manejo de Selección de Categoría
    const items = container.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            // Visualmente marcar seleccionado
            items.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');

            const catId = item.dataset.id;
            
            // Disparar evento global (el mismo que usa el sidebar móvil y la barra horizontal)
            const eventPayload = (catId === 'all') 
                ? { categoryId: 'all' } 
                : { categoryId: Number(catId) };

            window.dispatchEvent(new CustomEvent('category-selected', { 
                detail: eventPayload 
            }));
            
            // Scroll suave arriba en PC
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // Escuchar eventos externos para sincronizar (ej: si buscan en el header)
    window.addEventListener('category-selected', (e) => {
        const id = e.detail.categoryId;
        items.forEach(i => i.classList.remove('selected'));
        
        let targetItem;
        if(id === 'all') {
            targetItem = container.querySelector(`.sidebar-item[data-id="all"]`);
        } else {
            targetItem = container.querySelector(`.sidebar-item[data-id="${id}"]`);
        }
        
        if(targetItem) targetItem.classList.add('selected');
    });
}