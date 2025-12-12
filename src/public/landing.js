// src/public/landing.js

import { initWhatsappButton } from './modules/whatsapp-button/whatsapp-button.js';

document.addEventListener('DOMContentLoaded', () => {
    initWhatsappButton('whatsapp-button-container');

    /* --- MODAL EDAD --- */
    const modal = document.getElementById('welcome-modal');
    const btnYes = document.getElementById('btn-age-yes');
    const btnNo = document.getElementById('btn-age-no');

    setTimeout(() => {
        if (modal) modal.classList.add('visible');
    }, 500);

    if (btnYes) {
        btnYes.addEventListener('click', () => {
            modal.classList.remove('visible');
        });
    }

    if (btnNo) {
        btnNo.addEventListener('click', () => {
            window.location.href = "https://www.google.com";
        });
    }

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