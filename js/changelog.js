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
    version: "1.5.0",
    date: "2026-10-29",
    title: "Tareas con subtareas y tiempo estimado",
    items: [
      "Columna inicial «Tareas del día» para tus tareas principales.",
      "Agrega subtareas separadas por coma: caen en «Por hacer» y avanzan con ›.",
      "La tarea principal muestra su avance (2/6) y las horas que faltan.",
      "Tiempo estimado en cada tarea (1 h, 5 h…) y total pendiente arriba del tablero.",
      "En tableros existentes: ••• del tablero → «Agregar columna Tareas del día».",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-10-26",
    title: "Ve tu avance de un vistazo",
    items: [
      "Tableros muestra el avance de cada uno: barra por colores y % terminado.",
      "Avisos de cuello de botella y tareas vencidas sin entrar al tablero.",
      "En el teléfono, mapa del flujo arriba del tablero: toca una columna para saltar a ella.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-26",
    title: "Mover rápido y actualizar sin reinstalar",
    items: [
      "Botón › en cada tarjeta para pasarla a la siguiente columna con un toque.",
      "Botón «Actualizar app» en el menú y en Ajustes.",
      "Aviso automático cuando hay una versión nueva: un toque y listo.",
      "Página de Novedades con el historial de mejoras.",
      "La app funciona mejor sin conexión.",
      "Se quitó el botón «Ocultar hechas».",
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
