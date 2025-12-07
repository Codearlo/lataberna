// src/public/modules/store/product-grid/product-grid.utils.js

// Sube 4 niveles y baja a services/store/
import { CartService } from '../../../../services/store/cart.service.js'; 
import { showToast } from '../toast-notification/toast.js'; // NUEVO

// --- Funciones de Renderizado y Manipulación del DOM ---

export function renderProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    card.setAttribute('data-id', product.id); 

    const priceFormatted = `S/ ${product.price.toFixed(2)}`; 

    card.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}" loading="lazy">
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <span class="product-price">${priceFormatted}</span>
        </div>
        <button class="add-to-cart-btn">AGREGAR +</button>
    `;

    // ⚡ Event Listener que llama al servicio del carrito
    const addButton = card.querySelector('.add-to-cart-btn');
    addButton.addEventListener('click', () => {
        CartService.addToCart(product); 
        // REEMPLAZO DE alert() por showToast()
        showToast(`✅ ${product.name} añadido al carrito.`); 
    });

    return card;
}

export function updateProductCard(updatedProduct) {
    const card = document.querySelector(`.product-card[data-id="${updatedProduct.id}"]`);
    if (card) {
        card.querySelector('.product-name').textContent = updatedProduct.name;
        card.querySelector('.product-price').textContent = `S/ ${updatedProduct.price.toFixed(2)}`;
    }
}

export function removeProductCard(productId) {
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
        card.remove(); 
    }
}