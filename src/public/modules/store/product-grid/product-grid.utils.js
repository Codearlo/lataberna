// src/public/modules/store/product-grid/product-grid.utils.js

import { CartService } from '../../../../services/store/cart.service.js'; 
import { showToast } from '../toast-notification/toast.js';

export function renderProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    card.setAttribute('data-id', product.id); 

    const priceFormatted = `S/ ${product.price.toFixed(2)}`; 

    // --- LÓGICA DE DESCUENTOS REALES ---
    let priceHtml = `<span class="product-price">${priceFormatted}</span>`;
    let discountBadgeHtml = '';

    // Usamos los campos reales de la BD: has_discount y discount_percentage
    if (product.has_discount && product.discount_percentage > 0) {
        // Cálculo Inverso: Precio Original = Precio Venta / (1 - Porcentaje/100)
        // Ejemplo: Venta 80, Descuento 20%. Original = 80 / 0.8 = 100.
        const originalPrice = product.price / (1 - (product.discount_percentage / 100));
        const originalPriceFormatted = `S/ ${originalPrice.toFixed(2)}`;
        
        priceHtml = `
            <div class="price-container">
                <span class="original-price-crossed">${originalPriceFormatted}</span>
                <span class="product-price discount-price">${priceFormatted}</span>
            </div>
        `;
        
        discountBadgeHtml = `<span class="discount-badge">-${product.discount_percentage}%</span>`;
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

    const addButton = card.querySelector('.add-to-cart-btn');
    addButton.addEventListener('click', () => {
        CartService.addToCart(product); 
        showToast(`✅ ${product.name} añadido al carrito.`); 
    });

    return card;
}

export function updateProductCard(updatedProduct) {
    // Si necesitas actualizar la tarjeta en tiempo real sin recargar, 
    // podrías volver a llamar a renderProductCard y reemplazar el nodo.
    // Por simplicidad, aquí solo actualizamos nombre y precio base.
    const card = document.querySelector(`.product-card[data-id="${updatedProduct.id}"]`);
    if (card) {
        card.querySelector('.product-name').textContent = updatedProduct.name;
        const priceEl = card.querySelector('.product-price');
        if (priceEl && !updatedProduct.has_discount) {
             // Si quitamos el descuento, deberíamos limpiar la estructura compleja, 
             // pero para actualizaciones rápidas esto basta.
             priceEl.textContent = `S/ ${updatedProduct.price.toFixed(2)}`;
        }
    }
}

export function removeProductCard(productId) {
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
        card.remove(); 
    }
}