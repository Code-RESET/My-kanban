// ============================================================
// router.js
// Router simple por hash (#/ruta/param). No recarga la página.
// Cada módulo nuevo del proyecto se registra en MODULES abajo:
// eso es lo único que hay que tocar para agregar una sección.
//
// render(container, user, params) puede devolver una función de
// limpieza (ej. para cancelar listeners de Firestore). El router
// la llama al salir de la vista, así no quedan suscripciones vivas.
// ============================================================

import { renderBoards } from "./modules/boards.js";
import { renderBoard } from "./modules/board.js";
import { renderSettings } from "./modules/settings.js";
import { icons } from "./ui/icons.js";

// Registro de módulos: agregar aquí cada módulo nuevo del proyecto.
// path      -> primer segmento después de #/ en la URL
// label     -> texto en la barra de navegación (sin label = no sale en el menú)
// icon      -> ícono SVG de la barra de navegación
// navParent -> pestaña que se marca activa en vistas internas
// render    -> función (container, user, params) que pinta la vista
const MODULES = [
  { path: "tableros", label: "Tableros", icon: icons.boards, render: renderBoards },
  { path: "tablero", navParent: "tableros", render: renderBoard },
  { path: "ajustes", label: "Ajustes", icon: icons.settings, render: renderSettings },
];

const nav = document.getElementById("app-nav");
const content = document.getElementById("app-content");

let currentUser = null;
let cleanup = null;
let renderToken = 0;
let started = false;

function buildNav() {
  nav.innerHTML = MODULES.filter((m) => m.label)
    .map(
      (m) => `<a href="#/${m.path}" data-path="${m.path}">${m.icon}<span>${m.label}</span></a>`
    )
    .join("");
}

function setActiveLink(path) {
  nav.querySelectorAll("a").forEach((a) => {
    a.classList.toggle("active", a.dataset.path === path);
  });
}

function runCleanup() {
  if (typeof cleanup === "function") cleanup();
  cleanup = null;
}

async function renderRoute() {
  const [path, ...params] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const mod = MODULES.find((m) => m.path === path) || MODULES[0];
  if (!mod || !currentUser) return;

  runCleanup();
  const token = ++renderToken;
  setActiveLink(mod.navParent || mod.path);
  content.innerHTML = "";
  window.scrollTo(0, 0);

  const result = await mod.render(content, currentUser, params);
  // Si el usuario ya navegó a otra vista mientras ésta cargaba, se limpia de inmediato.
  if (token !== renderToken) {
    if (typeof result === "function") result();
    return;
  }
  cleanup = result;
}

export function initRouter(user) {
  currentUser = user;
  if (!started) {
    buildNav();
    window.addEventListener("hashchange", renderRoute);
    started = true;
  }
  renderRoute();
}

// Se llama al cerrar sesión: corta los listeners antes de perder permisos.
export function stopRouter() {
  runCleanup();
  renderToken++;
  currentUser = null;
  content.innerHTML = "";
}
