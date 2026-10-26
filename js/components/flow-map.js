// ============================================================
// components/flow-map.js
// "Mapa del flujo" para el teléfono: una fila de pastillas con
// cada columna y su número de tarjetas. Marca la columna que se
// está viendo y al tocar una salta a esa columna.
// (En PC se ven todas las columnas, así que el CSS lo oculta.)
// ============================================================

import { escapeHtml } from "../ui/dom.js";

// columns: [{ id, name, accent, count, bottleneck }]
export function flowMapHtml(columns) {
  return `
    <nav class="flow-map" aria-label="Columnas del tablero">
      ${columns
        .map(
          (c, i) => `
        ${i ? `<span class="flow-arrow" aria-hidden="true">›</span>` : ""}
        <button class="flow-chip ${c.bottleneck ? "is-bottleneck" : ""}" data-action="jump"
                data-column-id="${c.id}" data-accent="${c.accent}">
          <span class="flow-dot"></span>
          <span class="flow-name">${escapeHtml(c.name)}</span>
          <span class="flow-count">${c.count}</span>
        </button>`
        )
        .join("")}
    </nav>`;
}

// Columna que está a la vista: la más cercana al borde izquierdo del tablero.
export function visibleColumnId(boardEl) {
  const left = boardEl.getBoundingClientRect().left;
  let best = null;
  let bestDist = Infinity;
  boardEl.querySelectorAll(".column").forEach((col) => {
    const dist = Math.abs(col.getBoundingClientRect().left - left);
    if (dist < bestDist) {
      bestDist = dist;
      best = col.dataset.columnId;
    }
  });
  return best;
}

// Resalta la pastilla activa y la mantiene visible si la fila hace scroll.
export function markActiveChip(flowEl, columnId) {
  flowEl.querySelectorAll(".flow-chip").forEach((chip) => {
    const active = chip.dataset.columnId === columnId;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-current", active ? "true" : "false");
    if (active) {
      const nav = chip.parentElement;
      const target = chip.offsetLeft - (nav.clientWidth - chip.clientWidth) / 2;
      nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
  });
}
