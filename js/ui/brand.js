// ============================================================
// ui/brand.js
// Ícono personalizado de la app. Pone la foto del usuario en
// todos los <img class="brand-logo">, en el favicon y en el
// apple-touch-icon (el que usa iPhone al "Agregar a inicio").
//
// Se guarda en la cuenta (profile-service.js) y además se copia
// en este dispositivo para mostrarla en el login, antes de entrar.
// ============================================================

import { auth } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { watchSettings } from "../services/profile-service.js";

export const DEFAULT_LOGO = "assets/logo.svg";
const DEFAULT_ICON = "assets/icon-192.png";
const CACHE_KEY = "kanban-logo";

let stopWatch = null;

export function applyLogo(logo) {
  document.querySelectorAll("img.brand-logo").forEach((img) => (img.src = logo || DEFAULT_LOGO));
  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
    link.href = logo || DEFAULT_ICON;
  });
  try {
    if (logo) localStorage.setItem(CACHE_KEY, logo);
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Sin almacenamiento local: el logo se verá al iniciar sesión.
  }
}

function cachedLogo() {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

const cached = cachedLogo();
if (cached) applyLogo(cached);

onAuthStateChanged(auth, (user) => {
  stopWatch?.();
  stopWatch = null;
  if (user) {
    stopWatch = watchSettings(user.uid, (s) => applyLogo(s.logo || ""), (err) => console.warn(err));
  }
});
