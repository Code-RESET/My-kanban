// ============================================================
// changelog.js
// Historial de versiones que se muestra en "Novedades".
// La más reciente va PRIMERO y debe coincidir con js/version.js
// (tests/version.test.mjs lo revisa).
// ============================================================

import "./version.js";

export const APP_VERSION = globalThis.APP_VERSION;

export const CHANGELOG = [
  {
    version: "1.3.0",
    date: "2026-10-25",
    title: "Actualizaciones sin reinstalar",
    items: [
      "Botón «Actualizar app» en el menú y en Ajustes.",
      "Aviso automático cuando hay una versión nueva: un toque y listo.",
      "Página de Novedades con el historial de mejoras.",
      "La app funciona mejor sin conexión.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-25",
    title: "Flujo visual",
    items: [
      "Cada columna con su color y tarjetas terminadas con ✓.",
      "Detector de cuello de botella.",
      "Panel «tiempo por tarea».",
      "Botón flotante para ocultar las tareas hechas.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-10-25",
    title: "Personalización",
    items: [
      "Menú hamburguesa.",
      "Modo oscuro.",
      "Ícono de la app con tu propia foto.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-25",
    title: "Primera versión",
    items: [
      "Tableros, columnas y tarjetas con notas, fecha y color.",
      "Arrastrar tarjetas con el dedo o el mouse.",
      "Sincronización en tiempo real con Firebase.",
    ],
  },
];
