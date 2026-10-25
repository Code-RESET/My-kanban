// ============================================================
// auth.js
// Maneja login y el cambio de pantalla login <-> app-shell.
// El botón de cerrar sesión vive en modules/settings.js.
// No mezclar lógica de negocio aquí: solo autenticación.
// ============================================================

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initRouter, stopRouter } from "./router.js";

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");

function showError(msg) {
  loginError.textContent = msg;
  loginError.hidden = false;
}

function clearError() {
  loginError.hidden = true;
  loginError.textContent = "";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encarga de mostrar el app-shell
  } catch (err) {
    showError(traducirErrorFirebase(err.code));
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.hidden = true;
    appShell.hidden = false;
    initRouter(user);
  } else {
    stopRouter();
    appShell.hidden = true;
    loginScreen.hidden = false;
    loginForm.reset();
  }
});

function traducirErrorFirebase(code) {
  const mapa = {
    "auth/invalid-email": "Correo inválido.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Ese usuario no existe.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet."
  };
  return mapa[code] || "No se pudo iniciar sesión. Intenta de nuevo.";
}
