// src/public/modules/store/product-grid/product-grid.utils.js

import { CartService } from '../../../../services/store/cart.service.js'; 
import { showToast } from '../toast-notification/toast.js';

// --- Funciones de Renderizado y Manipulación del DOM ---

export function renderProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    card.setAttribute('data-id', product.id); 

    const priceFormatted = `S/ ${product.price.toFixed(2)}`; 

    // --- LÓGICA DE DESCUENTOS VISUALES ---
    let priceHtml = `<span class="product-price">${priceFormatted}</span>`;
    let discountBadgeHtml = '';

    // Si el producto tiene un "descuento simulado" (flag hasDiscount)
    if (product.hasDiscount && product.fakeOriginalPrice) {
        const fakePriceFormatted = `S/ ${product.fakeOriginalPrice.toFixed(2)}`;
        
        // Calculamos el porcentaje de ahorro para el badge
        const discountPercent = Math.round(((product.fakeOriginalPrice - product.price) / product.fakeOriginalPrice) * 100);

        priceHtml = `
            <div class="price-container">
                <span class="original-price-crossed">${fakePriceFormatted}</span>
                <span class="product-price discount-price">${priceFormatted}</span>
            </div>
        `;
        
        discountBadgeHtml = `<span class="discount-badge">-${discountPercent}%</span>`;
    }

    card.innerHTML = `
        <div class="card-image-wrapper">
            ${discountBadgeHtml}
            <img src="${product.image_url}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            ${priceHtml}
        </div>
        <button class="add-to-cart-btn">AGREGAR +</button>
    `;

    // Event Listener del carrito
    const addButton = card.querySelector('.add-to-cart-btn');
    addButton.addEventListener('click', () => {
        CartService.addToCart(product); 
        showToast(`✅ ${product.name} añadido al carrito.`); 
    });

    return card;
}

export function updateProductCard(updatedProduct) {
    const card = document.querySelector(`.product-card[data-id="${updatedProduct.id}"]`);
    if (card) {
        card.querySelector('.product-name').textContent = updatedProduct.name;
        // Nota: Para actualizaciones completas de precio con descuento, sería mejor rerenderizar la tarjeta,
        // pero por ahora actualizamos el precio base.
        const priceEl = card.querySelector('.product-price');
        if (priceEl) priceEl.textContent = `S/ ${updatedProduct.price.toFixed(2)}`;
    }
}

export function removeProductCard(productId) {
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
        card.remove(); 
    }
}