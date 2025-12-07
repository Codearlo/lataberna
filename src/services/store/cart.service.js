// src/services/store/cart.service.js

// 1. IMPORTACIÓN: Traemos la función del Header para mantener el contador visible
import { updateCartCount } from '../../public/modules/layout/header/header.js'; 

const CART_KEY = 'lataberna_cart';

// --- Core Cart Logic (State Management) ---

const CartService = {
    // 1. Obtiene el carrito del Local Storage
    getCart: () => JSON.parse(localStorage.getItem(CART_KEY)) || [],

    /**
     * Guarda el carrito en el Local Storage y llama a la actualización visual.
     */
    _saveCart: (cart) => {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount(); // ⚡ ¡AQUÍ se actualiza el contador del Header!
    },

    /**
     * Añade un producto al carrito (o incrementa su cantidad).
     */
    addToCart: (product) => {
        let cart = CartService.getCart();
        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].qty += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                qty: 1
            });
        }
        
        CartService._saveCart(cart);
    },
    
    /**
     * Calcula el monto total del pedido.
     */
    getCartTotal: () => {
        const cart = CartService.getCart();
        return cart.reduce((total, item) => total + (item.price * item.qty), 0);
    },

    /**
     * Genera la orden preescrita y la envía al WhatsApp del cliente.
     */
    sendOrderToWhatsapp: () => {
        const cart = CartService.getCart();
        const total = CartService.getCartTotal();
        const phoneNumber = "51999999999"; // ⚠️ ¡IMPORTANTE! Reemplazar con el número del negocio

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
        message += "%0A🛵 *Mi dirección de envío es:* "; // El cliente escribe su dirección

        const encodedMessage = encodeURIComponent(message);
        
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
        
        // Limpiamos el carrito después de que el pedido ha sido enviado
        CartService.clearCart(); 
    },
    
    /**
     * Vacía el carrito completamente.
     */
    clearCart: () => {
        CartService._saveCart([]);
        alert("¡Pedido enviado! El carrito ha sido vaciado.");
    }
};

export { CartService };