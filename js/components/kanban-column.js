// ============================================================
// components/kanban-column.js
// Solo genera HTML de columnas y tarjetas (sin eventos ni Firestore).
// Los eventos los conecta modules/board.js por delegación.
// ============================================================

import { escapeHtml, formatShortDate, isOverdue } from "../ui/dom.js";
import { isValidColor } from "./card-colors.js";
import { icons } from "../ui/icons.js";

export function cardHtml(card, { done = false } = {}) {
  const color = isValidColor(card.color) ? card.color : "";
  const due = card.dueDate
    ? `<span class="card-due ${isOverdue(card.dueDate) ? "overdue" : ""}">${icons.calendar}${formatShortDate(card.dueDate)}</span>`
    : "";
  const notes = card.notes ? `<p class="card-notes">${escapeHtml(card.notes)}</p>` : "";

  return `
    <article class="card" tabindex="0" role="button" data-card-id="${card.id}" ${color ? `data-color="${color}"` : ""}>
      <p class="card-title">${escapeHtml(card.title)}${done ? `<span class="card-check" aria-label="Terminada">${icons.check}</span>` : ""}</p>
      ${notes}
      ${due ? `<div class="card-meta">${due}</div>` : ""}
    </article>`;
}

// opts: { accent, bottleneck, done } — los calcula components/board-insights.js
export function columnHtml(column, cards, { accent = "slate", bottleneck = false, done = false } = {}) {
  return `
    <section class="column ${bottleneck ? "is-bottleneck" : ""}" data-column-id="${column.id}" data-accent="${accent}">
      <header class="column-header">
        <h2 class="column-title">${escapeHtml(column.name)}</h2>
        <span class="column-count">${cards.length}</span>
        <button class="icon-btn small" data-action="column-menu" data-column-id="${column.id}" aria-label="Opciones de columna">${icons.more}</button>
      </header>
      <div class="column-cards" data-column-id="${column.id}">
        ${cards.map((c) => cardHtml(c, { done })).join("")}
      </div>
      <button class="add-card-btn" data-action="add-card" data-column-id="${column.id}">${icons.plus}<span>Añadir tarjeta</span></button>
    </section>`;
}

export function addColumnHtml() {
  return `
    <button class="add-column" data-action="add-column">
      ${icons.plus}<span>Añadir columna</span>
    </button>`;
}
