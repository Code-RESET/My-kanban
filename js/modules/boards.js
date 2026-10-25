// ============================================================
// modules/boards.js
// Página "Tableros": lista de tableros del usuario. Desde aquí se
// crean, renombran y eliminan. Tocar un tablero abre #/tablero/{id}.
// ============================================================

import { watchBoards, createBoard, renameBoard, deleteBoard } from "../services/boards-service.js";
import { actionSheet, confirmDialog, promptDialog } from "../ui/sheet.js";
import { escapeHtml } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { toastError } from "../ui/toast.js";

export function renderBoards(container, user) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="large-title">Tableros</h1>
        <button class="icon-btn" data-action="new" aria-label="Nuevo tablero">${icons.plus}</button>
      </div>
      <div data-list><p class="muted center">Cargando…</p></div>
    </div>`;

  // Los eventos van en la raíz de la página (no en container, que se
  // reutiliza entre rutas y acumularía listeners en cada visita).
  const pageEl = container.querySelector(".page");
  const listEl = container.querySelector("[data-list]");
  let boards = [];

  function draw() {
    if (!boards.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icons.boards}</div>
          <h2>Aún no tienes tableros</h2>
          <p class="muted">Un tablero agrupa tus tareas en columnas:<br/>Por hacer → En curso → Hecho.</p>
          <button class="btn btn-primary" data-action="new">Crear mi primer tablero</button>
        </div>`;
      return;
    }
    listEl.innerHTML = `
      <ul class="list">
        ${boards
          .map(
            (b) => `
          <li class="list-row">
            <a class="list-link" href="#/tablero/${encodeURIComponent(b.id)}">
              <span class="list-icon">${icons.boards}</span>
              <span class="list-text">
                <span class="list-title">${escapeHtml(b.name)}</span>
                <span class="list-subtitle">${b.columns?.length || 0} columnas</span>
              </span>
              <span class="list-chevron">${icons.chevron}</span>
            </a>
            <button class="icon-btn small" data-action="menu" data-id="${b.id}" aria-label="Opciones">${icons.more}</button>
          </li>`
          )
          .join("")}
      </ul>`;
  }

  async function onNew() {
    const name = await promptDialog("Nuevo tablero", { placeholder: "Ej. Personal, Casa, Trabajo", confirmText: "Crear" });
    if (!name) return;
    try {
      const id = await createBoard(user.uid, name);
      location.hash = `#/tablero/${id}`;
    } catch (err) {
      toastError(err);
    }
  }

  async function onMenu(board) {
    const choice = await actionSheet(board.name, [
      { key: "rename", label: "Renombrar" },
      { key: "delete", label: "Eliminar tablero", destructive: true },
    ]);
    if (choice === "rename") {
      const name = await promptDialog("Renombrar tablero", { value: board.name });
      if (name) renameBoard(user.uid, board.id, name).catch(toastError);
    } else if (choice === "delete") {
      const ok = await confirmDialog(`¿Eliminar "${board.name}" y todas sus tarjetas?`);
      if (ok) deleteBoard(user.uid, board.id).catch(toastError);
    }
  }

  pageEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "new") onNew();
    if (btn.dataset.action === "menu") {
      const board = boards.find((b) => b.id === btn.dataset.id);
      if (board) onMenu(board);
    }
  });

  const unsubscribe = watchBoards(
    user.uid,
    (list) => {
      boards = list;
      draw();
    },
    toastError
  );

  return unsubscribe;
}
