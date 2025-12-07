// src/public/modules/store/product-grid/product-grid.utils.js

// Importamos el CartService, que aún no hemos creado, pero que usaremos para el botón.
import { CartService } from '../../../../services/store/cart.service.js'; 

// --- Funciones de Renderizado y Manipulación del DOM ---

/**
 * Crea el elemento HTML de una tarjeta de producto.
 * @param {object} product - Objeto producto de la base de datos.
 * @returns {HTMLElement} La tarjeta del producto.
 */
export function renderProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    card.setAttribute('data-id', product.id); // ID crucial para las actualizaciones Realtime

    const priceFormatted = `S/ ${product.price.toFixed(2)}`; 

    card.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}" loading="lazy">
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <span class="product-price">${priceFormatted}</span>
        </div>
        <button class="add-to-cart-btn">
            AGREGAR +
        </button>
    `;

    // ⚡ Attach Event Listener: Llama al CartService al hacer clic
    const addButton = card.querySelector('.add-to-cart-btn');
    addButton.addEventListener('click', () => {
        // Le pasamos el objeto producto completo al servicio del carrito
        CartService.addToCart(product); 
        // Feedback visual rápido al cliente
        alert(`¡${product.name} añadido!`); 
    });

    return card;
}


/**
 * Actualiza los datos de una tarjeta existente sin recargar la página (Realtime UPDATE).
 * @param {object} updatedProduct - Objeto producto actualizado.
 */
export function updateProductCard(updatedProduct) {
    const card = document.querySelector(`.product-card[data-id="${updatedProduct.id}"]`);
    if (card) {
        // Actualiza el precio y el nombre en el DOM
        card.querySelector('.product-name').textContent = updatedProduct.name;
        card.querySelector('.product-price').textContent = `S/ ${updatedProduct.price.toFixed(2)}`;
    }
}


/**
 * Elimina una tarjeta de producto de la vista (Realtime DELETE).
 * @param {number} productId - ID del producto a eliminar.
 */
export function removeProductCard(productId) {
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
        card.remove(); // Remueve el elemento del DOM
    }
}