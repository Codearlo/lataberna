// src/config/supabaseClient.js

// Accedemos a la función global 'createClient'
const createClient = window.supabase.createClient;

// Coloca aquí tus credenciales
const SUPABASE_URL = 'https://twawtvmxndjkkmnpquvp.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YXd0dm14bmRqa2ttbnBxdXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDk1MzksImV4cCI6MjA4NjgyNTUzOX0.nF_3MCGAu2vE7rQOnQFsVHQ9PkBZpeIjbLkMy2xhXx0'; 

// --- CONFIGURACIÓN DE STORAGE ---
export const PRODUCTS_BUCKET = 'product-images'; 
export const CATEGORIES_BUCKET = 'category-images'; // NUEVO BUCKET

// Creamos la instancia del cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);