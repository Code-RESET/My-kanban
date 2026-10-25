// ============================================================
// components/done-toggle.js
// Botón flotante para ocultar/mostrar la última columna ("Hecho")
// y así brincarse las tareas ya realizadas mientras se trabaja.
// La preferencia se recuerda en este dispositivo.
// ============================================================

import { icons } from "../ui/icons.js";

const STORAGE_KEY = "kanban-hide-done";

export function loadHideDone() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveHideDone(hidden) {
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
  } catch {
    // Sin almacenamiento: dura solo mientras la página esté abierta.
  }
}

export function doneToggleHtml({ hidden, count, columnName }) {
  const label = hidden ? `Mostrar ${columnName.toLowerCase()}` : `Ocultar ${columnName.toLowerCase()}`;
  return `
    <button class="fab ${hidden ? "is-active" : ""}" data-action="toggle-done" aria-pressed="${hidden}"
            aria-label="${label}" title="${label}">
      ${hidden ? icons.eye : icons.eyeOff}
      <span class="fab-label">${hidden ? "Mostrar hechas" : "Ocultar hechas"}</span>
      <span class="fab-count">${count}</span>
    </button>`;
}
