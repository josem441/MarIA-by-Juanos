import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
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

try {
    // Validar que la configuración no sea la de ejemplo
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("TU_API_KEY")) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("✅ Firebase inicializado correctamente. Base de datos conectada.");
    } else {
        console.warn("⚠️ Firebase no configurado: Se detectaron credenciales de ejemplo.");
    }
} catch (error) {
    console.error("❌ Error crítico inicializando Firebase:", error);
    db = null;
}

export { db };