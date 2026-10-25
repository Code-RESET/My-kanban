// ============================================================
// ui/updater.js
// Registra el service worker y maneja las actualizaciones:
//
// 1. Busca versión nueva al abrir la app, al volver a ella
//    (cambiar de app y regresar) y cada 30 minutos.
// 2. Si hay una lista, muestra el aviso "Nueva versión disponible".
// 3. Al tocar "Actualizar", activa la versión nueva y recarga:
//    no hace falta cerrar ni reinstalar la app.
// 4. Después de actualizar, avisa a qué versión y enlaza a Novedades.
// ============================================================

import { APP_VERSION } from "../changelog.js";
import { showToast } from "./toast.js";

const CHECK_EVERY_MS = 30 * 60 * 1000;
const LAST_VERSION_KEY = "kanban-last-version";

let registration = null;
let waitingVersion = null;
const listeners = new Set();

// Se recarga solo cuando el usuario pidió actualizar (no en la
// primera instalación, cuando el service worker toma control solo).
let updateRequested = false;

export function getUpdateState() {
  return { current: APP_VERSION, available: !!registration?.waiting, nextVersion: waitingVersion };
}

// Avisa cuando cambia el estado (para el punto "Nueva" del menú y Ajustes).
export function onUpdateState(cb) {
  listeners.add(cb);
  cb(getUpdateState());
  return () => listeners.delete(cb);
}

function emit() {
  const state = getUpdateState();
  listeners.forEach((cb) => cb(state));
}

// Le pregunta al service worker nuevo qué versión trae.
function askVersion(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => resolve(e.data?.version || null);
    worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
    setTimeout(() => resolve(null), 1500);
  });
}

async function handleWaiting() {
  if (!registration?.waiting || !navigator.serviceWorker.controller) return;
  waitingVersion = await askVersion(registration.waiting);
  emit();
  showUpdateBanner();
}

function watchInstalls(reg) {
  reg.addEventListener("updatefound", () => {
    const worker = reg.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed") handleWaiting();
    });
  });
}

// Espera a que el service worker que se está instalando termine (o falle).
function settled(worker) {
  if (!worker) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => ["installed", "activated", "redundant"].includes(worker.state);
    if (done()) return resolve();
    worker.addEventListener("statechange", () => done() && resolve());
  });
}

// Resultado: "available" | "latest" | "offline" | "unsupported"
export async function checkForUpdate() {
  if (!registration) return "unsupported";
  if (registration.waiting) return "available";
  try {
    await registration.update();
  } catch {
    return "offline";
  }
  await settled(registration.installing);
  return registration.waiting ? "available" : "latest";
}

export function applyUpdate() {
  const worker = registration?.waiting;
  if (!worker) {
    location.reload();
    return;
  }
  updateRequested = true;
  worker.postMessage({ type: "SKIP_WAITING" });
}

// Lo que hace el botón "Actualizar app" del menú y de Ajustes.
export async function updateNow() {
  showToast("Buscando actualizaciones…");
  const result = await checkForUpdate();
  if (result === "available") {
    showToast("Instalando la versión nueva…");
    applyUpdate();
  } else if (result === "latest") {
    showToast(`Ya tienes la versión más reciente (v${APP_VERSION}).`);
  } else if (result === "offline") {
    showToast("Sin conexión. Intenta de nuevo con internet.");
  } else {
    showToast("Este navegador no permite actualizar desde aquí. Recarga la página.");
  }
}

// ---------- Avisos en pantalla ----------

function banner(html, actions) {
  document.getElementById("update-banner")?.remove();
  const el = document.createElement("div");
  el.id = "update-banner";
  el.className = "update-banner";
  el.setAttribute("role", "status");
  el.innerHTML = html;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-banner]");
    if (!btn) return;
    actions[btn.dataset.banner]?.();
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 250);
  });
}

function showUpdateBanner() {
  const label = waitingVersion ? `Versión ${waitingVersion} disponible` : "Nueva versión disponible";
  banner(
    `<span class="update-text"><strong>${label}</strong><span>Toca actualizar para usarla ya.</span></span>
     <button class="update-btn" data-banner="update">Actualizar</button>
     <button class="update-close" data-banner="close" aria-label="Más tarde">×</button>`,
    { update: applyUpdate, close: () => {} }
  );
}

// Después de actualizar: "Actualizado a v1.3.0 · Ver novedades".
function announceIfUpdated() {
  let last = null;
  try {
    last = localStorage.getItem(LAST_VERSION_KEY);
    localStorage.setItem(LAST_VERSION_KEY, APP_VERSION);
  } catch {
    return;
  }
  if (!last || last === APP_VERSION) return;
  banner(
    `<span class="update-text"><strong>Actualizado a v${APP_VERSION}</strong><span>Mira qué hay de nuevo.</span></span>
     <button class="update-btn" data-banner="news">Ver novedades</button>
     <button class="update-close" data-banner="close" aria-label="Cerrar">×</button>`,
    { news: () => (location.hash = "#/novedades"), close: () => {} }
  );
}

// ---------- Arranque ----------

if ("serviceWorker" in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      // updateViaCache "none": al revisar, siempre pide version.js fresco al servidor.
      registration = await navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" });
    } catch (err) {
      console.warn("Service worker no registrado:", err);
      return;
    }
    watchInstalls(registration);
    handleWaiting();
    checkForUpdate();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    setInterval(checkForUpdate, CHECK_EVERY_MS);
  });
}

announceIfUpdated();
