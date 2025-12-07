// src/services/store/cart.service.js

// 1. Importación CORREGIDA: Traemos la función del Header (subiendo dos niveles)
import { updateCartCount } from '../../public/modules/layout/header/header.js'; 

const CART_KEY = 'lataberna_cart';

// --- Core Cart Logic (State Management) ---

const CartService = {
    // ... (El resto del código de getCart, _saveCart, addToCart, getCartTotal es el mismo)
    getCart: () => JSON.parse(localStorage.getItem(CART_KEY)) || [],

    _saveCart: (cart) => {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount(); // Se asegura de llamar a la función del Header.
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
    
    getCartTotal: () => {
        const cart = CartService.getCart();
        return cart.reduce((total, item) => total + (item.price * item.qty), 0);
    },

    // ... (El resto de sendOrderToWhatsapp y clearCart es el mismo)
    sendOrderToWhatsapp: () => {
        const cart = CartService.getCart();
        const total = CartService.getCartTotal();
        const phoneNumber = "51999999999"; 

        if (cart.length === 0) {
            alert("Tu carrito está vacío. ¡Agrega unos tragos primero!");
            return;
        }

        let message = "Hola La Taberna 🍻, quiero pedir:%0A%0A";
        cart.forEach(item => {
            let subtotal = item.price * item.qty;
            message += `▪️ ${item.qty}x ${item.name} (S/ ${subtotal.toFixed(2)})%0A`;
        });
        message += `%0A💰 *TOTAL A PAGAR: S/ ${total.toFixed(2)}*`;
        message += "%0A🛵 *Mi dirección de envío es:* "; 

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
        
        CartService.clearCart(); 
    },
    
    clearCart: () => {
        CartService._saveCart([]);
        alert("¡Pedido enviado! El carrito ha sido vaciado.");
    }
};

export { CartService };