// ============================================================
// version.js
// ÚNICO lugar donde se define la versión de la app.
//
// Es un script "clásico" a propósito: lo usan tanto el service
// worker (importScripts) como la app (import "./version.js").
// Al cambiar este número, el service worker cambia su caché y
// los teléfonos ven el aviso "Nueva versión disponible".
//
// Al publicar una mejora:
//   1. Subir el número aquí (1.3.0 -> 1.4.0).
//   2. Agregar arriba en js/changelog.js qué cambió.
// ============================================================

self.APP_VERSION = "1.6.0";
