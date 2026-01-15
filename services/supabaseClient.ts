import { createClient } from '@supabase/supabase-js';

// Intentamos leer de variables de entorno, pero usamos tus credenciales provistas como FALLBACK seguro.
// Se usa process.env en lugar de import.meta.env para compatibilidad de tipos, asegurado por vite.config.ts
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jmiwdasopgrdjnlqkdwm.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXdkYXNvcGdyZGpubHFrZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjI3MzIsImV4cCI6MjA4Mzk5ODczMn0.iW9rU6tGPiog1eVPEWYBHEH0_GXR8MbPgh55T73quHA";

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