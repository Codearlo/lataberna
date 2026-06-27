// src/public/modules/age-modal/age-modal.js

const STORAGE_KEY = 'taberna_age_verified';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

const MODAL_HTML = `
<div id="welcome-modal" class="welcome-modal-container" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <div class="welcome-overlay"></div>
    <div class="welcome-modal">
        <h2 id="welcome-title" class="welcome-title">Verificación de Edad 🔞</h2>
        <p class="welcome-text">El contenido de este sitio es para mayores de 18 años.</p>
        <div class="welcome-actions">
            <button type="button" id="btn-age-yes" class="btn-go-store">SÍ, SOY MAYOR</button>
            <button type="button" id="btn-age-no" class="btn-stay">No, salir de aquí</button>
        </div>
    </div>
</div>
`;

const MODAL_CSS = `
.welcome-modal-container { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; }
.welcome-modal-container.visible { display: flex; justify-content: center; align-items: center; }
.welcome-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.9); backdrop-filter: blur(5px); }
.welcome-modal { position: relative; background-color: #ffffff; width: 90%; max-width: 400px; padding: 40px 30px; border-radius: 20px; text-align: center; border: 3px solid #FFC107; animation: slideUp 0.4s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.welcome-title { font-size: 1.6rem; color: #343a40; margin-bottom: 10px; font-weight: 800; }
.welcome-text { color: #6c757d; margin-bottom: 25px; font-weight: 500; }
.welcome-actions { display: flex; flex-direction: column; gap: 10px; }
.btn-go-store, .btn-stay { padding: 12px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; font-family: inherit; border: none; }
.btn-go-store { background: #FFC107; color: #343a40; }
.btn-go-store:hover { background: #e0a800; }
.btn-stay { background: transparent; color: #6c757d; border: 1px solid #ced4da; }
.btn-stay:hover { background: #f1f3f5; }
`;

function isVerified() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const ts = JSON.parse(raw).ts;
        return typeof ts === 'number' && Date.now() - ts < TTL_MS;
    } catch {
        return false;
    }
}

function markVerified() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now() }));
}

/**
 * Inicializa el age gate. Si ya pasó la verificación (TTL 24h), no hace nada.
 * Llamar una vez en cada página pública (index.html, store.html). No usar en admin.
 */
export function initAgeModal() {
    if (isVerified()) return;

    // CSS una sola vez
    if (!document.getElementById('age-modal-style')) {
        const style = document.createElement('style');
        style.id = 'age-modal-style';
        style.textContent = MODAL_CSS;
        document.head.appendChild(style);
    }

    // HTML
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);

    const modal = document.getElementById('welcome-modal');
    const btnYes = document.getElementById('btn-age-yes');
    const btnNo = document.getElementById('btn-age-no');

    setTimeout(() => modal && modal.classList.add('visible'), 300);

    btnYes && btnYes.addEventListener('click', () => {
        markVerified();
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 400);
    });

    btnNo && btnNo.addEventListener('click', () => {
        window.location.href = 'https://www.google.com';
    });
}