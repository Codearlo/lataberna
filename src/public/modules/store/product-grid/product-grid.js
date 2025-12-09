// src/public/modules/store/product-grid/product-grid.js

import { getActiveProducts } from '../../../../services/store/products.service.js'; 
import { renderProductCard } from './product-grid.utils.js'; 

export async function initProductGrid(containerId) {
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) return;

    // Limpiamos el contenedor y mostramos carga (opcional)
    mainContainer.innerHTML = '<div style="text-align:center; padding:40px;">Cargando catálogo...</div>';

    try {
        const allProducts = await getActiveProducts();
        
        if (!allProducts || allProducts.length === 0) {
            mainContainer.innerHTML = '<p class="empty-grid-msg">No hay productos disponibles por ahora.</p>';
            return;
        }

        // 1. Agrupar productos por categoría
        const productsByCategory = allProducts.reduce((acc, product) => {
            const catName = product.category || 'Otros';
            // Excluimos explícitamente "SIN CATEGORIA" si aparece
            if (catName.toUpperCase() === 'SIN CATEGORIA') return acc;
            
            if (!acc[catName]) {
                acc[catName] = [];
            }
            acc[catName].push(product);
            return acc;
        }, {});

        // Limpiamos el loader
        mainContainer.innerHTML = '';

        // 2. Iterar sobre cada categoría y crear la sección
        // Ordenamos las categorías alfabéticamente
        const sortedCategories = Object.keys(productsByCategory).sort();

        sortedCategories.forEach(categoryName => {
            const products = productsByCategory[categoryName];
            
            // Solo renderizamos si hay productos
            if (products.length > 0) {
                createCategorySection(mainContainer, categoryName, products);
            }
        });

    } catch (error) {
        console.error("Error cargando productos:", error);
        mainContainer.innerHTML = '<p class="empty-grid-msg">Error al cargar el catálogo.</p>';
    }
}

/**
 * Crea la estructura visual para una categoría: Título, Grid de 5 items, Botón Ver Todo.
 */
function createCategorySection(container, categoryName, products) {
    // Tomamos solo los primeros 5 productos
    const displayedProducts = products.slice(0, 5);

    // 1. Contenedor de la Sección
    const section = document.createElement('section');
    section.className = 'category-section';

    // 2. Título de la Categoría
    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = `COLECCIÓN DE ${categoryName.toUpperCase()}`;
    section.appendChild(title);

    // 3. Grid de Productos (Reutilizamos lógica visual)
    const grid = document.createElement('div');
    grid.className = 'category-products-grid'; // Nueva clase para CSS

    displayedProducts.forEach(product => {
        const card = renderProductCard(product);
        grid.appendChild(card);
    });
    section.appendChild(grid);

    // 4. Botón "IR A [CATEGORIA]"
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'category-footer';
    
    const btn = document.createElement('button');
    btn.className = 'view-all-cat-btn';
    btn.textContent = `IR A ${categoryName.toUpperCase()}`;
    
    // Aquí podrías agregar lógica para filtrar la vista, por ahora solo es visual o link
    btn.addEventListener('click', () => {
        // Ejemplo: Filtrar la vista actual para mostrar solo esta categoría
        // O navegar a una página de categoría específica
        alert(`Navegando a ver todos los ${categoryName}... (Lógica pendiente de implementación)`);
    });

    buttonContainer.appendChild(btn);
    section.appendChild(buttonContainer);

    // Agregar todo al contenedor principal
    container.appendChild(section);
}