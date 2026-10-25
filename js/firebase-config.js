// ============================================================
// firebase-config.js
// Reemplazar DEFAULT_FB_CONFIG con las credenciales del proyecto
// Firebase de este cliente específico. Se deja embebido directo
// en el código (no solo en localStorage) porque en HD Crédit se
// detectó que localStorage se puede perder con actualizaciones
// del sistema operativo del teléfono.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULT_FB_CONFIG = {
  apiKey: "AIzaSyDqj1kQ9a_IaTalK2bNOAbEdNnSBfb-NHE",
  authDomain: "kanban-bdc28.firebaseapp.com",
  projectId: "kanban-bdc28",
  storageBucket: "kanban-bdc28.firebasestorage.app",
  messagingSenderId: "586850156917",
  appId: "1:586850156917:web:39979017beaf96a241133c"
};

const app = initializeApp(DEFAULT_FB_CONFIG);

// Persistencia de almacenamiento local (evita que iOS/Android
// limpien datos en bajo almacenamiento).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

export const auth = getAuth(app);
// Caché local de Firestore (IndexedDB): el tablero abre al instante,
// funciona sin señal y sincroniza solo al volver la conexión.
// Si el navegador no tiene IndexedDB, Firebase cae solo a memoria.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
