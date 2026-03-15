// src/public/modules/store/product-modal/product-modal.js

import { CartService } from '../../../../services/store/cart.service.js';
import { showToast } from '../toast-notification/toast.js';

let currentProduct = null;
let quantity = 1;

function createModalContainer() {
    const container = document.getElementById('product-modal-container');
    
    if (container && container.querySelector('.product-modal')) {
        return container;
    }

    if (!container) {
        const div = document.createElement('div');
        div.id = 'product-modal-container';
        document.body.appendChild(div);
        div.innerHTML = `
            <div class="product-modal-overlay"></div>
            <div class="product-modal">
                <button class="product-modal-close" aria-label="Cerrar">&times;</button>
                <div class="product-modal-content">
                    <div class="product-modal-image">
                        <img src="" alt="" id="modal-product-image">
                    </div>
                    <div class="product-modal-details">
                        <span class="product-modal-category" id="modal-product-category"></span>
                        <h2 class="product-modal-name" id="modal-product-name"></h2>
                        <div class="product-modal-brand" id="modal-product-brand">
                            <i class="fas fa-tag"></i>
                            <span></span>
                        </div>
                        
                        <div class="product-modal-price-section">
                            <span class="product-modal-original-price" id="modal-original-price" style="display: none;"></span>
                            <span class="product-modal-price" id="modal-product-price"></span>
                            <span class="product-modal-discount-badge" id="modal-discount-badge" style="display: none;"></span>
                        </div>

                        <div class="product-modal-description" id="modal-product-description" style="display: none;">
                        </div>

                        <div class="product-modal-actions">
                            <div class="product-modal-quantity">
                                <button id="modal-qty-minus">-</button>
                                <span id="modal-qty-value">1</span>
                                <button id="modal-qty-plus">+</button>
                            </div>
                            <button class="product-modal-add-btn" id="modal-add-to-cart">
                                <i class="fas fa-shopping-cart"></i>
                                Agregar al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        attachEventListeners(div);
        return div;
    }

    container.innerHTML = `
        <div class="product-modal-overlay"></div>
        <div class="product-modal">
            <button class="product-modal-close" aria-label="Cerrar">&times;</button>
            <div class="product-modal-content">
                <div class="product-modal-image">
                    <img src="" alt="" id="modal-product-image">
                </div>
                <div class="product-modal-details">
                    <span class="product-modal-category" id="modal-product-category"></span>
                    <h2 class="product-modal-name" id="modal-product-name"></h2>
                    <div class="product-modal-brand" id="modal-product-brand">
                        <i class="fas fa-tag"></i>
                        <span></span>
                    </div>
                    
                    <div class="product-modal-price-section">
                        <span class="product-modal-original-price" id="modal-original-price" style="display: none;"></span>
                        <span class="product-modal-price" id="modal-product-price"></span>
                        <span class="product-modal-discount-badge" id="modal-discount-badge" style="display: none;"></span>
                    </div>

                    <div class="product-modal-description" id="modal-product-description" style="display: none;">
                    </div>

                    <div class="product-modal-actions">
                        <div class="product-modal-quantity">
                            <button id="modal-qty-minus">-</button>
                            <span id="modal-qty-value">1</span>
                            <button id="modal-qty-plus">+</button>
                        </div>
                        <button class="product-modal-add-btn" id="modal-add-to-cart">
                            <i class="fas fa-shopping-cart"></i>
                            Agregar al Carrito
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    attachEventListeners(container);
    return container;
}

function attachEventListeners(container) {
    const overlay = container.querySelector('.product-modal-overlay');
    const closeBtn = container.querySelector('.product-modal-close');
    const qtyMinus = container.querySelector('#modal-qty-minus');
    const qtyPlus = container.querySelector('#modal-qty-plus');
    const addToCartBtn = container.querySelector('#modal-add-to-cart');

    overlay.addEventListener('click', closeProductModal);
    closeBtn.addEventListener('click', closeProductModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && container.classList.contains('visible')) {
            closeProductModal();
        }
    });

    qtyMinus.addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            updateQuantityDisplay();
        }
    });

    qtyPlus.addEventListener('click', () => {
        quantity++;
        updateQuantityDisplay();
    });

    addToCartBtn.addEventListener('click', handleAddToCart);
}

function updateQuantityDisplay() {
    const container = document.getElementById('product-modal-container');
    const qtyEl = container ? container.querySelector('#modal-qty-value') : document.getElementById('modal-qty-value');
    if (qtyEl) {
        qtyEl.textContent = quantity;
    }
}

function extractBrand(productName) {
    if (!productName) return 'Genérico';
    
    const cleanName = productName.replace(/Pack\s+/i, "").replace(/Botella\s+/i, "").replace(/Combo\s+/i, "");
    const generics = ["RON", "PISCO", "GIN", "VODKA", "WHISKY", "CERVEZA", "VINO", "ESPUMANTE", "LATA", "SIXPACK"];
    const words = cleanName.trim().split(" ");
    let brand = "Genérico";
    
    if (words.length > 0) {
        if (generics.includes(words[0].toUpperCase()) && words.length > 1) {
            brand = words[1];
        } else {
            brand = words[0];
        }
    }
    
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

function openProductModal(product) {
    currentProduct = product;
    quantity = 1;

    const container = createModalContainer();
    const modal = container.querySelector('.product-modal');

    // Imagen
    const imgEl = container.querySelector('#modal-product-image');
    imgEl.src = product.image_url || 'assets/images/logo.png';
    imgEl.alt = product.name;

    // Categoría
    const categoryEl = container.querySelector('#modal-product-category');
    categoryEl.textContent = product.is_pack ? 'Combo' : (product.category || 'Sin Categoría');

    // Nombre
    const nameEl = container.querySelector('#modal-product-name');
    nameEl.textContent = product.name;

    // Marca
    const brandEl = container.querySelector('#modal-product-brand');
    const brandSpan = brandEl.querySelector('span');
    brandSpan.textContent = extractBrand(product.name);

    // Precio
    const priceEl = container.querySelector('#modal-product-price');
    const originalPriceEl = container.querySelector('#modal-original-price');
    const discountBadgeEl = container.querySelector('#modal-discount-badge');

    const finalPrice = product.price;
    priceEl.textContent = `S/ ${finalPrice.toFixed(2)}`;
    priceEl.classList.remove('discount');
    originalPriceEl.style.display = 'none';
    discountBadgeEl.style.display = 'none';

    if (product.has_discount && product.discount_percentage > 0) {
        const originalPrice = finalPrice / (1 - (product.discount_percentage / 100));
        originalPriceEl.textContent = `S/ ${originalPrice.toFixed(2)}`;
        originalPriceEl.style.display = 'inline';
        
        priceEl.classList.add('discount');
        priceEl.textContent = `S/ ${finalPrice.toFixed(2)}`;
        
        discountBadgeEl.textContent = `-${product.discount_percentage}%`;
        discountBadgeEl.style.display = 'inline-block';
    }

    // Descripción
    const descEl = container.querySelector('#modal-product-description');
    if (product.description) {
        descEl.textContent = product.description;
        descEl.style.display = 'block';
    } else {
        descEl.style.display = 'none';
    }

    // Reset quantity
    updateQuantityDisplay();

    // Mostrar modal
    container.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    const container = document.getElementById('product-modal-container');
    if (container) {
        container.classList.remove('visible');
        document.body.style.overflow = '';
        currentProduct = null;
    }
}

function handleAddToCart() {
    if (!currentProduct) return;

    const productToAdd = { ...currentProduct };
    
    for (let i = 0; i < quantity; i++) {
        CartService.addToCart(productToAdd);
    }

    showToast(`✅ ${quantity > 1 ? `${quantity}x ` : ''}${currentProduct.name} añadido${quantity > 1 ? 's' : ''} al carrito.`);
    closeProductModal();
}

export function initProductModal() {
    createModalContainer();
}

export { openProductModal, closeProductModal };
