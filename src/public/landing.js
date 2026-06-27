// src/public/landing.js

import { initWhatsappButton } from './modules/whatsapp-button/whatsapp-button.js';
import { initAgeModal } from './modules/age-modal/age-modal.js';

document.addEventListener('DOMContentLoaded', () => {
    initAgeModal();
    initWhatsappButton('whatsapp-button-container');

    /* --- CARRUSEL DE BANNERS --- */
    initBannerCarousel();
});

function initBannerCarousel() {
    // Busca los contenedores <picture>
    const banners = document.querySelectorAll('.banner-slide');
    
    if (banners.length <= 1) return;

    let currentIndex = 0;
    const intervalTime = 3000; 

    // Asegurar inicialización
    if (!document.querySelector('.banner-slide.active')) {
        banners[0].classList.add('active');
    }

    setInterval(() => {
        banners[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % banners.length;
        banners[currentIndex].classList.add('active');
    }, intervalTime);
}