/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Intentamos leer de variables de entorno, pero usamos tus credenciales provistas como FALLBACK seguro.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jmiwdasopgrdjnlqkdwm.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXdkYXNvcGdyZGpubHFrZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjI3MzIsImV4cCI6MjA4Mzk5ODczMn0.iW9rU6tGPiog1eVPEWYBHEH0_GXR8MbPgh55T73quHA";

// Si no hay credenciales, devolvemos null en lugar de explotar.
// Esto permite que el DataService detecte que debe usar modo LocalStorage.
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

if (!supabase) {
    console.log("ℹ️ Modo Offline/Local activo (Credenciales de Supabase no detectadas)");
} else {
    console.log("✅ Cliente Supabase Inicializado");
}