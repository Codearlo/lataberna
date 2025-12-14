// src/services/store/cart.service.js

import { updateCartCount } from '../../public/modules/layout/header/header.js'; 
import { renderCartItems } from '../../public/modules/store/cart-modal/cart-modal.js'; 

const CART_KEY = 'lataberna_cart';

const CartService = {
    getCart: () => JSON.parse(localStorage.getItem(CART_KEY)) || [],

    _saveCart: (cart) => {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount(); 
        renderCartItems(); 
    },
    
    addToCart: (product) => {
        let cart = CartService.getCart();
        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].qty += 1;
        } else {
            cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
        }
        
        CartService._saveCart(cart);
    },
    
    updateQuantity: (productId, change) => {
        let cart = CartService.getCart();
        const existingItemIndex = cart.findIndex(item => item.id === productId);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].qty += change;

            if (cart[existingItemIndex].qty <= 0) {
                cart.splice(existingItemIndex, 1);
            }
            
            CartService._saveCart(cart);
        }
    },

    removeFromCart: (productId) => {
        let cart = CartService.getCart();
        const newCart = cart.filter(item => item.id !== productId);
        CartService._saveCart(newCart);
    },
    
    getCartTotal: () => {
        const cart = CartService.getCart();
        return cart.reduce((total, item) => total + (item.price * item.qty), 0);
    },

    sendOrderToWhatsapp: (paymentMethod) => {
        const cart = CartService.getCart();
        const total = CartService.getCartTotal();
        const phoneNumber = "51961367961"; 
        
        if (cart.length === 0) {
            alert("Tu carrito está vacío. ¡Agrega unos tragos primero!");
            return;
        }

        // --- CONSTRUCCIÓN DEL MENSAJE CORREGIDA ---
        let message = `Hola La Taberna, quiero pedir:\n\n`; 
        
        cart.forEach(item => {
            let subtotal = item.price * item.qty;
            // Salto de línea doble para separar productos visualmente
            message += `${item.qty}x ${item.name} (S/ ${subtotal.toFixed(2)})\n\n`;
        });
        
        message += `*TOTAL A PAGAR: S/ ${total.toFixed(2)}*\n`; 
        message += `Método de Pago: ${paymentMethod}\n`;

        // Frase corregida y amigable
        message += `Mi dirección de envío es: 👇🏻 (Enviaré mi ubicación actual a continuación)`; 
        
        const encodedMessage = encodeURIComponent(message);
        
        window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`, '_blank');
        
        CartService.clearCart(); 
    },
    
    clearCart: () => {
        CartService._saveCart([]);
    }
};

export { CartService };