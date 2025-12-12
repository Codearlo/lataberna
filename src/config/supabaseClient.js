// src/config/supabaseClient.js

// Accedemos a la función global 'createClient'
const createClient = window.supabase.createClient;

// Coloca aquí tus credenciales
const SUPABASE_URL = 'https://gadmnciaxbomkyzqhttb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZG1uY2lheGJvbWt5enFodHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNjUyMDcsImV4cCI6MjA4MDY0MTIwN30.0SfE7TylNqhkBeKM8qWX274WtxEksHfMNoZ7X-oga10'; 

// --- CONFIGURACIÓN DE STORAGE ---
export const PRODUCTS_BUCKET = 'product-images'; 
export const CATEGORIES_BUCKET = 'category-images'; // NUEVO BUCKET

// Creamos la instancia del cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);