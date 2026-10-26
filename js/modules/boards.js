// ============================================================
// modules/boards.js
// Página "Tableros": tablero de control con todos los tableros.
// Cada uno muestra su avance (barra por colores, % hecho) y alertas
// (cuello de botella, vencidas). Desde aquí se crean, renombran y
// eliminan. Tocar un tablero abre #/tablero/{id}.
// ============================================================

import { watchBoards, createBoard, renameBoard, deleteBoard } from "../services/boards-service.js";
import { watchCards } from "../services/cards-service.js";
import { summarizeBoard, progressBarHtml, legendHtml, alertsHtml } from "../components/board-summary.js";
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
  // Tarjetas de cada tablero (para el resumen) y sus listeners de Firestore.
  const cardsByBoard = new Map();
  const cardWatchers = new Map();

  // Escucha las tarjetas de los tableros nuevos y suelta las de los borrados.
  function syncCardWatchers() {
    const ids = new Set(boards.map((b) => b.id));
    for (const [id, stop] of cardWatchers) {
      if (!ids.has(id)) {
        stop();
        cardWatchers.delete(id);
        cardsByBoard.delete(id);
      }
    }
    for (const id of ids) {
      if (cardWatchers.has(id)) continue;
      cardWatchers.set(
        id,
        watchCards(
          user.uid,
          id,
          (cards) => {
            cardsByBoard.set(id, cards);
            draw();
          },
          toastError
        )
      );
    }
  }

  function boardCardHtml(b) {
    const cards = cardsByBoard.get(b.id);
    const loaded = Array.isArray(cards);
    const sum = summarizeBoard(b.columns || [], cards || []);
    const sub = !loaded
      ? "Cargando…"
      : sum.total
        ? `${sum.total} ${sum.total === 1 ? "tarea" : "tareas"} · ${sum.done} ${sum.done === 1 ? "hecha" : "hechas"}`
        : "Sin tareas todavía";
    const alerts = loaded ? alertsHtml(sum) : "";
    return `
      <li class="board-card ${sum.bottleneck ? "has-alert" : sum.overdue ? "has-warn" : ""}">
        <a class="board-card-link" href="#/tablero/${encodeURIComponent(b.id)}">
          <span class="board-card-top">
            <span class="board-card-name">${escapeHtml(b.name)}</span>
            <span class="board-card-pct">${loaded && sum.total ? `${sum.pct}%` : ""}</span>
          </span>
          <span class="board-card-sub">${sub}</span>
          ${loaded ? progressBarHtml(sum) : `<div class="progress-bar is-loading" aria-hidden="true"></div>`}
          ${loaded && sum.total ? `<span class="legend">${legendHtml(sum)}</span>` : ""}
          ${alerts ? `<span class="board-card-alerts">${alerts}</span>` : ""}
        </a>
        <button class="icon-btn small board-card-menu" data-action="menu" data-id="${b.id}" aria-label="Opciones">${icons.more}</button>
      </li>`;
  }

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
    listEl.innerHTML = `<ul class="board-cards">${boards.map(boardCardHtml).join("")}</ul>`;
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
      syncCardWatchers();
      draw();
    },
    toastError
  );

  return () => {
    unsubscribe();
    cardWatchers.forEach((stop) => stop());
    cardWatchers.clear();
  };
}
