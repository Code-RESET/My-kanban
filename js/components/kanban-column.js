// ============================================================
// components/kanban-column.js
// Solo genera HTML de columnas y tarjetas (sin eventos ni Firestore).
// Los eventos los conecta modules/board.js por delegación.
// ============================================================

import { escapeHtml, formatShortDate, isOverdue } from "../ui/dom.js";
import { isValidColor } from "./card-colors.js";
import { icons } from "../ui/icons.js";
import { formatEstimate } from "./task-tree.js";

// opts (los calcula modules/board.js):
//   done      -> está en la última etapa (lleva ✓)
//   next      -> columna siguiente ({ id, name }) o null: muestra el botón ›
//   parent    -> tarea principal de esta subtarea ({ title }) o null
//   progress  -> avance si es tarea principal ({ done, total, estLeft }) o null
//   canSubtask-> muestra el botón "+ Agregar subtareas"
export function cardHtml(card, { done = false, next = null, parent = null, progress = null, canSubtask = false } = {}) {
  const color = isValidColor(card.color) ? card.color : "";
  const due = card.dueDate
    ? `<span class="card-due ${isOverdue(card.dueDate) ? "overdue" : ""}">${icons.calendar}${formatShortDate(card.dueDate)}</span>`
    : "";
  const estimate = card.estimate > 0 ? `<span class="card-estimate">${icons.clock}${formatEstimate(card.estimate)}</span>` : "";
  const notes = card.notes ? `<p class="card-notes">${escapeHtml(card.notes)}</p>` : "";
  const parentLabel = parent ? `<p class="card-parent">↳ ${escapeHtml(parent.title)}</p>` : "";
  const isParent = progress && progress.total > 0;

  const progressBlock = isParent
    ? `<div class="subtask-progress">
         <div class="subtask-bar"><span style="width:${Math.round((progress.done / progress.total) * 100)}%"></span></div>
         <span class="subtask-text">${progress.done}/${progress.total} subtareas${
           progress.estLeft > 0 ? ` · faltan ${formatEstimate(progress.estLeft)}` : progress.done === progress.total ? " · completa" : ""
         }</span>
       </div>`
    : "";
  const addSubtasks = canSubtask
    ? `<button class="card-subtasks-btn" data-action="add-subtasks" data-card-id="${card.id}">${icons.plus}<span>${isParent ? "Subtareas" : "Agregar subtareas"}</span></button>`
    : "";

  return `
    <article class="card ${next ? "has-advance" : ""} ${isParent ? "is-parent" : ""} ${card.parentId ? "is-subtask" : ""}"
             tabindex="0" role="button" data-card-id="${card.id}" ${color ? `data-color="${color}"` : ""}>
      ${parentLabel}
      <p class="card-title">${escapeHtml(card.title)}${done ? `<span class="card-check" aria-label="Terminada">${icons.check}</span>` : ""}</p>
      ${notes}
      ${due || estimate ? `<div class="card-meta">${estimate}${due}</div>` : ""}
      ${progressBlock}
      ${addSubtasks}
      ${
        next
          ? `<button class="card-advance" data-action="advance" data-card-id="${card.id}"
                     aria-label="Pasar a ${escapeHtml(next.name)}" title="Pasar a ${escapeHtml(next.name)}">${icons.chevron}</button>`
          : ""
      }
    </article>`;
}

// opts: { accent, bottleneck, done, next, cardOpts } — los calcula modules/board.js.
// cardOpts(card) devuelve las opciones propias de cada tarjeta (parent, progress, next).
export function columnHtml(column, cards, { accent = "slate", bottleneck = false, done = false, next = null, cardOpts = () => ({}) } = {}) {
  return `
    <section class="column ${bottleneck ? "is-bottleneck" : ""} ${column.kind === "tasks" ? "is-tasks" : ""}" data-column-id="${column.id}" data-accent="${accent}">
      <header class="column-header">
        <h2 class="column-title">${escapeHtml(column.name)}</h2>
        <span class="column-count">${cards.length}</span>
        <button class="icon-btn small" data-action="column-menu" data-column-id="${column.id}" aria-label="Opciones de columna">${icons.more}</button>
      </header>
      <div class="column-cards" data-column-id="${column.id}">
        ${cards.map((c) => cardHtml(c, { done, next, ...cardOpts(c) })).join("")}
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
