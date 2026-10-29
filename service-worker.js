// ============================================================
// service-worker.js
// Guarda la app en el teléfono para que abra al instante y sin
// conexión, y controla las actualizaciones.
//
// - La versión sale de js/version.js: al subirla, el navegador
//   detecta un service worker nuevo y lo instala en segundo plano.
// - El nuevo NO se activa solo: espera a que el usuario toque
//   "Actualizar" (js/ui/updater.js le manda SKIP_WAITING).
// - Al agregar archivos nuevos, súmalos a CORE_ASSETS.
// ============================================================

importScripts("./js/version.js");

const CACHE_VERSION = `mi-kanban-${self.APP_VERSION}`;
const SDK_CACHE = "firebase-sdk-10.12.2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/version.js",
  "./js/changelog.js",
  "./js/router.js",
  "./js/auth.js",
  "./js/firebase-config.js",
  "./js/modules/boards.js",
  "./js/modules/board.js",
  "./js/modules/news.js",
  "./js/modules/settings.js",
  "./js/services/boards-service.js",
  "./js/services/cards-service.js",
  "./js/services/profile-service.js",
  "./js/components/board-insights.js",
  "./js/components/board-summary.js",
  "./js/components/card-colors.js",
  "./js/components/card-sheet.js",
  "./js/components/drag-drop.js",
  "./js/components/flow-map.js",
  "./js/components/kanban-column.js",
  "./js/ui/brand.js",
  "./js/ui/dom.js",
  "./js/ui/drawer.js",
  "./js/ui/icons.js",
  "./js/ui/image-resize.js",
  "./js/ui/sheet.js",
  "./js/ui/theme.js",
  "./js/ui/toast.js",
  "./js/ui/updater.js",
  "./assets/logo.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  // cache: "reload" evita guardar copias viejas del caché HTTP del navegador.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(CORE_ASSETS.map((url) => new Request(url, { cache: "reload" })))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION && k !== SDK_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "GET_VERSION") event.ports[0]?.postMessage({ version: self.APP_VERSION });
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Archivos de la app: primero la copia guardada de esta versión.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // SDK de Firebase: su URL lleva la versión, así que nunca cambia y se puede guardar.
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    event.respondWith(
      caches.open(SDK_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
  // Todo lo demás (Firestore, login) va directo a la red.
});
