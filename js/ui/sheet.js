// ============================================================
// ui/sheet.js
// Hoja inferior estilo iOS (bottom sheet) y los diálogos que se
// construyen encima de ella: menú de acciones, confirmar y pedir
// un texto. Todos devuelven una Promise con lo que eligió el usuario.
// ============================================================

import { escapeHtml } from "./dom.js";

// Abre una hoja con HTML libre. onMount(sheetEl, close) conecta los eventos;
// close(valor) cierra la hoja y resuelve la Promise con ese valor.
export function openSheet({ title = "", html, onMount }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="sheet-grabber"></div>
        ${title ? `<h3 class="sheet-title">${escapeHtml(title)}</h3>` : ""}
        <div class="sheet-body">${html}</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => overlay.classList.add("open"));

    const sheet = overlay.querySelector(".sheet");
    let closed = false;

    function close(value = null) {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      overlay.classList.remove("open");
      document.body.classList.remove("no-scroll");
      setTimeout(() => overlay.remove(), 250);
      resolve(value);
    }

    function onKey(e) {
      if (e.key === "Escape") close(null);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });
    document.addEventListener("keydown", onKey);
    onMount?.(sheet, close);
  });
}

// Menú de acciones. items: [{ key, label, destructive? }]
// Resuelve con el key elegido o null si se cancela.
export function actionSheet(title, items) {
  const buttons = items
    .map(
      (it) =>
        `<button type="button" class="sheet-action ${it.destructive ? "destructive" : ""}" data-key="${escapeHtml(it.key)}">${escapeHtml(it.label)}</button>`
    )
    .join("");
  return openSheet({
    title,
    html: `<div class="sheet-group">${buttons}</div>
           <button type="button" class="sheet-action sheet-cancel" data-key="">Cancelar</button>`,
    onMount(sheet, close) {
      sheet.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-key]");
        if (btn) close(btn.dataset.key || null);
      });
    },
  });
}

// Pregunta sí/no. Resuelve true solo si confirma.
export async function confirmDialog(message, { confirmText = "Eliminar", destructive = true } = {}) {
  const key = await actionSheet(message, [{ key: "ok", label: confirmText, destructive }]);
  return key === "ok";
}

// Pide un texto corto (nombre de tablero, columna...). Resuelve con el
// texto sin espacios sobrantes, o null si cancela o lo deja vacío.
export function promptDialog(title, { value = "", placeholder = "", confirmText = "Guardar" } = {}) {
  return openSheet({
    title,
    html: `
      <form class="sheet-form">
        <input class="input" name="value" maxlength="80" required
               value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
        <div class="sheet-buttons">
          <button type="button" class="btn btn-secondary" data-cancel>Cancelar</button>
          <button type="submit" class="btn btn-primary">${escapeHtml(confirmText)}</button>
        </div>
      </form>`,
    onMount(sheet, close) {
      const form = sheet.querySelector("form");
      const input = form.elements.value;
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
      sheet.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        close(input.value.trim() || null);
      });
    },
  });
}
