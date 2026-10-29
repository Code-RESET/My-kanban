// ============================================================
// components/card-sheet.js
// Hoja para crear o editar una tarjeta. No guarda nada por sí
// misma: devuelve lo que el usuario capturó y board.js decide.
//
// subtasks: subtareas existentes [{ title, done, estimate }] (solo tareas principales)
// allowSubtasks: muestra el campo para agregar subtareas nuevas
//
// Resuelve con:
//   { action: "save", data: { title, notes, color, dueDate, columnId, estimate }, newSubtasks: [títulos] }
//   { action: "delete" }
//   null  (canceló)
// ============================================================

import { openSheet, confirmDialog } from "../ui/sheet.js";
import { escapeHtml } from "../ui/dom.js";
import { CARD_COLORS } from "./card-colors.js";
import { parseSubtasks, hoursToMinutes, minutesToHours, formatEstimate } from "./task-tree.js";

export async function openCardSheet({ card = null, columns, columnId, subtasks = [], allowSubtasks = false }) {
  const current = card || { title: "", notes: "", color: "", dueDate: "", columnId };

  const subtaskList = subtasks.length
    ? `<ul class="subtask-list">${subtasks
        .map(
          (t) => `<li class="${t.done ? "is-done" : ""}"><span class="subtask-mark">${t.done ? "✓" : "○"}</span>${escapeHtml(t.title)}${
            t.estimate > 0 ? `<span class="subtask-est">${formatEstimate(t.estimate)}</span>` : ""
          }</li>`
        )
        .join("")}</ul>`
    : "";
  const subtaskSection = allowSubtasks
    ? `<div class="form-group subtask-group">
         <div class="form-row form-row-col">
           <span>Subtareas</span>
           ${subtaskList}
           <textarea class="input subtask-input" name="subtasks" rows="2" maxlength="1500"
                     placeholder="Agregar: cableado, fusibles, encintado…"></textarea>
           <small class="form-hint">Sepáralas con coma. Caen en la primera columna del flujo.</small>
         </div>
       </div>`
    : "";

  const colorOptions = CARD_COLORS.map(
    (c) => `
      <label class="swatch" title="${c.label}">
        <input type="radio" name="color" value="${c.key}" ${c.key === (current.color || "") ? "checked" : ""} aria-label="${c.label}" />
        <span class="swatch-dot" ${c.key ? `data-color="${c.key}"` : ""}></span>
      </label>`
  ).join("");

  const columnOptions = columns
    .map((col) => `<option value="${col.id}" ${col.id === current.columnId ? "selected" : ""}>${escapeHtml(col.name)}</option>`)
    .join("");

  const result = await openSheet({
    title: card ? "Editar tarjeta" : "Nueva tarjeta",
    html: `
      <form class="sheet-form card-form">
        <input class="input" name="title" maxlength="200" required placeholder="¿Qué hay que hacer?"
               value="${escapeHtml(current.title)}" />
        <textarea class="input" name="notes" rows="3" maxlength="2000" placeholder="Notas (opcional)">${escapeHtml(current.notes)}</textarea>

        <div class="form-group">
          <div class="form-row">
            <span>Columna</span>
            <select name="columnId" class="select">${columnOptions}</select>
          </div>
          <div class="form-row">
            <span>Tiempo estimado</span>
            <span class="hours-field">
              <!-- Texto con teclado numérico: acepta "0,5" y "0.5" (type=number rechaza la coma en algunos teléfonos) -->
              <input type="text" name="estimate" class="hours-input" inputmode="decimal" maxlength="6" autocomplete="off"
                     placeholder="0" value="${minutesToHours(current.estimate)}" aria-label="Horas estimadas" />
              <span>h</span>
            </span>
          </div>
          <div class="form-row">
            <span>Fecha límite</span>
            <input type="date" name="dueDate" class="date-input" value="${escapeHtml(current.dueDate)}" />
          </div>
          <div class="form-row">
            <span>Color</span>
            <div class="swatches">${colorOptions}</div>
          </div>
        </div>

        ${subtaskSection}

        <div class="sheet-buttons">
          <button type="button" class="btn btn-secondary" data-cancel>Cancelar</button>
          <button type="submit" class="btn btn-primary">${card ? "Guardar" : "Añadir"}</button>
        </div>
        ${card ? `<button type="button" class="btn-link destructive" data-delete>Eliminar tarjeta</button>` : ""}
      </form>`,
    onMount(sheet, close) {
      const form = sheet.querySelector("form");
      if (!card) setTimeout(() => form.elements.title.focus(), 50);

      sheet.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      sheet.querySelector("[data-delete]")?.addEventListener("click", () => close({ action: "delete" }));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = form.elements.title.value.trim();
        if (!title) return;
        close({
          action: "save",
          data: {
            title,
            notes: form.elements.notes.value.trim(),
            color: form.elements.color.value,
            dueDate: form.elements.dueDate.value,
            columnId: form.elements.columnId.value,
            estimate: hoursToMinutes(form.elements.estimate.value),
          },
          newSubtasks: parseSubtasks(form.elements.subtasks?.value),
        });
      });
    },
  });

  // La confirmación se pide después de cerrar la hoja para no apilar dos hojas.
  if (result?.action === "delete") {
    const extra = subtasks.length ? ` y sus ${subtasks.length} subtareas` : "";
    const ok = await confirmDialog(`¿Eliminar "${current.title}"${extra}?`);
    return ok ? result : null;
  }
  return result;
}

// Hoja rápida para agregar subtareas a una tarea principal.
// Resuelve con la lista de títulos (vacía si cancela).
export async function openSubtasksSheet(parentTitle) {
  const titles = await openSheet({
    title: `Subtareas de "${parentTitle}"`,
    html: `
      <form class="sheet-form">
        <textarea class="input" name="subtasks" rows="4" maxlength="1500" required
                  placeholder="Cableado, fusibles, encintado, cálculo de voltaje, mediciones, armado"></textarea>
        <small class="form-hint">Sepáralas con coma o una por renglón. Caen en la primera columna del flujo.</small>
        <div class="sheet-buttons">
          <button type="button" class="btn btn-secondary" data-cancel>Cancelar</button>
          <button type="submit" class="btn btn-primary">Agregar</button>
        </div>
      </form>`,
    onMount(sheet, close) {
      const form = sheet.querySelector("form");
      setTimeout(() => form.elements.subtasks.focus(), 50);
      sheet.querySelector("[data-cancel]").addEventListener("click", () => close([]));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        close(parseSubtasks(form.elements.subtasks.value));
      });
    },
  });
  return titles || [];
}
