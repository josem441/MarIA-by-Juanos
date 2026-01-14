import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE BASE DE DATOS ---
// 1. Crea un proyecto en https://supabase.com
// 2. Copia la URL y la ANON KEY de los ajustes del proyecto
// 3. Pégalos aquí abajo:

const SUPABASE_URL = 'https://jmiwdasopgrdjnlqkdwm.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXdkYXNvcGdyZGpubHFrZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjI3MzIsImV4cCI6MjA4Mzk5ODczMn0.iW9rU6tGPiog1eVPEWYBHEH0_GXR8MbPgh55T73quHA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);