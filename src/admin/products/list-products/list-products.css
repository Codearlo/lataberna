/* src/admin/list-products/list-products.css */

/* --- Estilos Generales de Admin --- */
#products-subview-container {
    background-color: #ffffff; 
    padding: 30px;
    color: #343a40; 
    padding-bottom: 30px; 
}


.admin-panel-header h3 {
    font-size: 2em;
    color: #343a40;
    margin-bottom: 20px;
}

.admin-card {
    /* Fondo BLANCO para la tarjeta principal (similar a la imagen de ejemplo) */
    background-color: #ffffff; 
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 30px;
}

/* --- ESTILO PARA BÚSQUEDA RÁPIDA (FEEDBACK VISUAL SUTIL) --- */
.admin-panel-list.admin-card.is-searching {
    opacity: 0.7; 
    pointer-events: none; 
    transition: opacity 0.05s ease-out; 
}
/* --- FIN ESTILO --- */


/* --- Lista de Productos, Buscador y Botón de Agregar --- */
.list-header-top {
    margin-bottom: 10px;
}

#product-search-input {
    width: 100%; /* Ocupa todo el ancho */
    padding: 12px;
    border: 1px solid #ced4da;
    border-radius: 8px; /* Más redondeado */
    font-size: 1em;
    box-sizing: border-box;
}

.add-product-container {
    margin-bottom: 20px;
}

.primary-btn.full-width-btn {
    width: 100%;
    /* Estilo del botón principal de AGREGAR: Dorado/Negro */
    background-color: #FFC107; 
    color: #343a40;
    font-size: 1.1em;
    padding: 12px;
    border-radius: 8px;
    transition: background-color 0.2s;
    font-weight: bold;
}
.primary-btn.full-width-btn:hover {
    background-color: #e0a800; /* Dorado más oscuro */
}


/* --- TAB STYLES (DORADO) --- */
.tabs-container {
    display: flex;
    gap: 0;
    margin-bottom: 20px;
    padding-bottom: 5px;
    overflow-x: auto; 
    /* Borde inferior suave para separación, similar al ejemplo de la imagen */
    border-bottom: 1px solid #e9ecef;
}

.tab-button {
    background-color: transparent;
    color: #6c757d;
    border: none;
    padding: 8px 15px;
    font-weight: 600;
    border-radius: 0; 
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap; 
}

/* Estilo activo: Dorado */
.tab-button.active {
    background-color: transparent; 
    color: #FFC107; /* Color del texto Dorado */
    font-weight: 700;
    /* Subrayado con borde inferior dorado (más grueso y visible) */
    border-bottom: 3px solid #FFC107; 
    padding-bottom: 5px; /* Ajustamos padding para compensar el borde más grueso */
}

.tab-button:hover:not(.active) {
    background-color: #f7f7f7; /* Fondo muy claro al pasar el mouse */
}

/* VISIBILIDAD DE LAS VISTAS DE LISTA */
#products-list-views .products-grid {
    display: none;
}
#products-list-views .products-grid.active-view {
    display: grid;
}

/* --- GRID DE TARJETAS (Formato Lista) --- */
.products-grid {
    display: flex; /* Cambiado a flex para un listado vertical simple */
    flex-direction: column;
    gap: 10px; /* Reducimos el espacio entre ítems para un aspecto más de lista */
}

/* ESTILO: Formato de lista simple y horizontal (IMAGEN | INFO | PRECIO/STATUS) */
.product-list-item {
    background-color: #f8f9fa; /* Fondo ligeramente gris para los ítems */
    border-radius: 8px; /* Ligeramente menos redondeado */
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05); /* Sombra más sutil */
    display: flex; 
    align-items: center;
    padding: 12px 15px;
    cursor: pointer;
    transition: background-color 0.2s, border-left 0.2s;
    border: 1px solid #e9ecef; /* Borde más claro */
}
.product-list-item:hover {
    background-color: #ffffff; /* Blanco al pasar el mouse */
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.product-list-item.inactive {
    opacity: 0.8; 
    border-left: 5px solid #6c757d; /* Gris para inactivo */
}

.product-list-item.active-item {
    border-left: 5px solid #FFC107; /* Dorado para activo (opcional, si se quiere más énfasis) */
}


.product-image-container {
    flex-shrink: 0; 
    width: 50px; /* Reducido un poco */
    height: 65px; /* Aumentado un poco para mejor visualización de botellas */
    margin-right: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.product-list-item img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
}

.product-info-minimal {
    flex-grow: 1; 
    display: flex;
    flex-direction: column;
    min-width: 0;
}

/* Título */
.product-info-minimal .product-name-title {
    font-size: 1.1em; /* Un poco más grande */
    font-weight: 700;
    margin: 0;
    color: #343a40;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ID y Categoría */
.product-info-minimal .product-id,
.product-info-minimal .product-category {
    font-size: 0.8em; 
    color: #888; /* Gris más claro para subtítulos */
    margin: 2px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Contenedor de Precio y Estado (Alineado a la derecha) */
.product-status-price-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end; 
    justify-content: center;
    flex-shrink: 0;
    margin-left: 15px;
    height: 60px; 
}

/* Estilo de Badge (Pastilla) */
.status-badge {
    font-size: 0.7em; /* Ligeramente más grande */
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 15px; /* Más redondo */
    margin-bottom: 5px;
    text-transform: uppercase;
    transition: all 0.2s;
}

.active-badge {
    background-color: #d4edda; /* Verde claro */
    color: #155724; /* Verde oscuro */
}

.inactive-badge {
    background-color: #e9ecef; /* Gris muy claro */
    color: #6c757d; /* Gris oscuro */
}


.product-price-minimal {
    margin-top: auto; 
    font-weight: bold;
}

/* Precio */
.product-price-minimal .price {
    color: #343a40; /* Precio oscuro */
    font-size: 1.1em; 
}

/* --- ESTILOS DE PAGINACIÓN --- */
.pagination-area {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #e9ecef;
    text-align: center;
}

.pagination-content {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
}

.pagination-content button {
    padding: 8px 12px;
    border: 1px solid #ced4da;
    background-color: #ffffff;
    border-radius: 4px;
    font-size: 0.9em;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
}

.pagination-content button:hover:not(:disabled):not(.active) {
    background-color: #f0f0f0;
}

.pagination-content button.active {
    background-color: #FFC107; /* Dorado */
    color: #343a40; /* Texto oscuro */
    border-color: #FFC107;
}

.pagination-content button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.pagination-info {
    font-size: 0.9em;
    color: #6c757d;
    margin-left: 15px;
    white-space: nowrap;
}


/* --- Responsive para Móviles (Max-width: 767px) --- */
@media (max-width: 767px) {
    /* Lista de productos */
    .products-grid {
        /* No usamos grid-template-columns: 1fr; porque la hemos cambiado a flex-direction: column */
    }
    
    .product-list-item {
        padding: 10px 12px;
    }
    
    .product-image-container {
        width: 45px;
        height: 60px;
        margin-right: 10px;
    }
    
    .product-info-minimal .product-name-title {
        font-size: 1.0em; 
    }
    
    .pagination-content {
        flex-direction: row;
        gap: 5px;
    }
    .pagination-info {
        margin-left: 0;
        margin-top: 5px;
        width: 100%;
    }
}