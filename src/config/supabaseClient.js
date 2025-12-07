// src/config/supabaseClient.js

// Importamos la librería de Supabase (la versión ES Module para usarla con "type='module'")
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Coloca aquí tus credenciales
const SUPABASE_URL = 'https://gadmnciaxbomkyzqhttb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZG1uY2lheGJvbWt5enFodHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNjUyMDcsImV4cCI6MjA4MDY0MTIwN30.0SfE7TylNqhkBeKM8qWX274WtxEksHfMNoZ7X-oga10'; 

// Creamos la instancia del cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Exportamos 'supabase' para que cualquier archivo que necesite datos
// (como products.service.js o cart.service.js) pueda importarlo.