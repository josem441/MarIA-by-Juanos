import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// --- GUÍA DE CONFIGURACIÓN ---
// 1. Ve a la consola de Firebase (vinculada a tu proyecto de Google Cloud).
// 2. Ve a Configuración del Proyecto -> General -> Tus apps.
// 3. Copia el objeto 'firebaseConfig' y reemplaza los valores de abajo.

const firebaseConfig = {
  // --- PEGA TUS DATOS REALES DE GOOGLE AQUÍ ---
  // Reemplaza todo lo que está entre comillas con tus datos copiados
  apiKey: "AIzaSyA_o5JsEmoj4nbmZzaGNZvkRi8nJnoNMCs",
  authDomain: "gen-lang-client-0503058504.firebaseapp.com",
  projectId: "gen-lang-client-0503058504",
  storageBucket: "gen-lang-client-0503058504.firebasestorage.app",
  messagingSenderId: "148924599374",
  appId: "1:148924599374:web:f964e71c08280a3756871f",
  measurementId: "G-BTVHGE4BZT"
};

let app;
let db = null;

// Validación para verificar si ya pusiste los datos reales
const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY_AQUI" && !firebaseConfig.apiKey.includes("TU_API_KEY");

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("✅ Conexión exitosa con la nube de Google Cloud (Firestore).");
  } catch (error) {
    console.error("❌ Error conectando a Google Cloud:", error);
  }
} else {
  console.warn("⚠️ MODO LOCAL: No se han detectado credenciales de Google Cloud. Usando almacenamiento del navegador.");
}

export { db };