import { createClient } from '@supabase/supabase-js';

// Usamos acceso seguro a import.meta.env
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

// Si no hay credenciales, devolvemos null en lugar de explotar.
// Esto permite que el DataService detecte que debe usar modo LocalStorage.
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

if (!supabase) {
    console.log("ℹ️ Modo Offline/Local activo (Credenciales de Supabase no detectadas)");
}