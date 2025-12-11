// src/public/landing.js

// Importamos la funcionalidad del botón de WhatsApp
import { initWhatsappButton } from './modules/whatsapp-button/whatsapp-button.js';

document.addEventListener('DOMContentLoaded', () => {
    /* --- INICIALIZAR BOTÓN DE WHATSAPP --- */
    initWhatsappButton('whatsapp-button-container');

    /* --- MODAL EDAD --- */
    const modal = document.getElementById('welcome-modal');
    const btnYes = document.getElementById('btn-age-yes');
    const btnNo = document.getElementById('btn-age-no');

    // Mostrar modal al cargar
    setTimeout(() => {
        if (modal) modal.classList.add('visible');
    }, 500);

    // Botón SÍ: Cierra modal
    if (btnYes) {
        btnYes.addEventListener('click', () => {
            modal.classList.remove('visible');
        });
    }

    // Botón NO: Redirige a Google
    if (btnNo) {
        btnNo.addEventListener('click', () => {
            window.location.href = "https://www.google.com";
        });
    }

    /* --- CARRUSEL DE BANNERS --- */
    initBannerCarousel();
});

function initBannerCarousel() {
    const banners = document.querySelectorAll('.banner-img');
    if (banners.length <= 1) return;

    let currentIndex = 0;
    const intervalTime = 3000; 

    // Asegurar inicialización
    if (!document.querySelector('.banner-img.active')) {
        banners[0].classList.add('active');
    }

    setInterval(() => {
        banners[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % banners.length;
        banners[currentIndex].classList.add('active');
    }, intervalTime);
}