// ============================================================
// services/profile-service.js
// Preferencias del usuario guardadas en su cuenta (Firestore),
// para que se vean igual en todos sus dispositivos.
//
// Estructura: users/{uid}/settings/app
//   { logo: "data:image/jpeg;base64,..." | "", updatedAt }
// La foto ya llega recortada y comprimida (~20-40 KB), por eso
// cabe en un documento sin necesitar Firebase Storage.
// ============================================================

import { db } from "../firebase-config.js";
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const settingsRef = (uid) => doc(db, "users", uid, "settings", "app");

export function watchSettings(uid, onChange, onError) {
  return onSnapshot(settingsRef(uid), (snap) => onChange(snap.exists() ? snap.data() : {}), onError);
}

// logo = data URL de la imagen, o "" para volver al ícono por defecto.
export function saveLogo(uid, logo) {
  return setDoc(settingsRef(uid), { logo, updatedAt: Date.now() });
}
