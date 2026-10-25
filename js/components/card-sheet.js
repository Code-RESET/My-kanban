// ============================================================
// components/card-sheet.js
// Hoja para crear o editar una tarjeta. No guarda nada por sí
// misma: devuelve lo que el usuario capturó y board.js decide.
//
// Resuelve con:
//   { action: "save", data: { title, notes, color, dueDate, columnId } }
//   { action: "delete" }
//   null  (canceló)
// ============================================================

import { openSheet, confirmDialog } from "../ui/sheet.js";
import { escapeHtml } from "../ui/dom.js";
import { CARD_COLORS } from "./card-colors.js";

export async function openCardSheet({ card = null, columns, columnId }) {
  const current = card || { title: "", notes: "", color: "", dueDate: "", columnId };

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
            <span>Fecha límite</span>
            <input type="date" name="dueDate" class="date-input" value="${escapeHtml(current.dueDate)}" />
          </div>
          <div class="form-row">
            <span>Color</span>
            <div class="swatches">${colorOptions}</div>
          </div>
        </div>

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
          },
        });
      });
    },
  });

  // La confirmación se pide después de cerrar la hoja para no apilar dos hojas.
  if (result?.action === "delete") {
    const ok = await confirmDialog(`¿Eliminar "${current.title}"?`);
    return ok ? result : null;
  }
  return result;
}
