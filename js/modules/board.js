// ============================================================
// modules/board.js
// Página "Tablero" (#/tablero/{id}): columnas y tarjetas.
// Este archivo solo coordina: escucha Firestore, pinta con
// components/kanban-column.js y responde a las acciones del usuario.
// ============================================================

import { watchBoard, renameBoard, deleteBoard, saveColumns } from "../services/boards-service.js";
import { watchCards, addCard, updateCard, moveCard, deleteCard, deleteCards, orderBetween } from "../services/cards-service.js";
import { columnHtml, addColumnHtml } from "../components/kanban-column.js";
import { openCardSheet } from "../components/card-sheet.js";
import { enableDragDrop } from "../components/drag-drop.js";
import { actionSheet, confirmDialog, promptDialog } from "../ui/sheet.js";
import { shortId } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { showToast, toastError } from "../ui/toast.js";

export function renderBoard(container, user, [boardId] = []) {
  if (!boardId) {
    location.hash = "#/tableros";
    return;
  }

  container.innerHTML = `
    <div class="board-page">
      <div class="board-toolbar">
        <a href="#/tableros" class="back-link">${icons.back}<span>Tableros</span></a>
        <h1 class="board-title" data-title></h1>
        <button class="icon-btn" data-action="board-menu" aria-label="Opciones del tablero">${icons.more}</button>
      </div>
      <div class="board" data-board><p class="muted center">Cargando…</p></div>
    </div>`;

  // Los eventos van en la raíz de la página (no en container, que se
  // reutiliza entre rutas y acumularía listeners en cada visita).
  const pageEl = container.querySelector(".board-page");
  const titleEl = container.querySelector("[data-title]");
  const boardEl = container.querySelector("[data-board]");
  const uid = user.uid;

  let board = null;
  let cards = [];
  let boardLoaded = false;
  let redrawPending = false;

  // ---------- Lectura de estado ----------

  const columns = () => board?.columns || [];

  // Tarjetas de una columna, ya ordenadas. Las que apunten a una columna
  // que ya no existe se muestran en la primera para no "perderlas".
  function cardsOf(columnId) {
    const ids = new Set(columns().map((c) => c.id));
    const firstId = columns()[0]?.id;
    return cards.filter((c) => c.columnId === columnId || (!ids.has(c.columnId) && columnId === firstId));
  }

  const lastOrder = (columnId) => cardsOf(columnId).at(-1)?.order ?? null;

  // ---------- Pintado ----------

  function draw() {
    if (drag.isDragging()) {
      redrawPending = true;
      return;
    }
    if (!boardLoaded) return;
    if (!board) {
      titleEl.textContent = "";
      boardEl.innerHTML = `
        <div class="empty-state">
          <h2>Este tablero ya no existe</h2>
          <a class="btn btn-primary" href="#/tableros">Ver mis tableros</a>
        </div>`;
      return;
    }

    titleEl.textContent = board.name;
    // Se guarda el scroll de cada columna para que no salte al recibir cambios.
    const scrolls = {};
    boardEl.querySelectorAll(".column-cards").forEach((l) => (scrolls[l.dataset.columnId] = l.scrollTop));
    const scrollLeft = boardEl.scrollLeft;

    boardEl.innerHTML = columns().map((col) => columnHtml(col, cardsOf(col.id))).join("") + addColumnHtml();

    boardEl.scrollLeft = scrollLeft;
    boardEl.querySelectorAll(".column-cards").forEach((l) => (l.scrollTop = scrolls[l.dataset.columnId] || 0));
  }

  // ---------- Tarjetas ----------

  async function onAddCard(columnId) {
    const result = await openCardSheet({ columns: columns(), columnId });
    if (result?.action !== "save") return;
    const data = result.data;
    addCard(uid, boardId, { ...data, order: orderBetween(lastOrder(data.columnId), null) }).catch(toastError);
  }

  async function onOpenCard(cardId) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const result = await openCardSheet({ card, columns: columns() });
    if (!result) return;
    if (result.action === "delete") {
      deleteCard(uid, boardId, card.id).catch(toastError);
      return;
    }
    const changes = { ...result.data };
    if (changes.columnId !== card.columnId) changes.order = orderBetween(lastOrder(changes.columnId), null);
    updateCard(uid, boardId, card.id, changes).catch(toastError);
  }

  function onDrop({ cardId, columnId, prevId, nextId }) {
    const prev = cards.find((c) => c.id === prevId)?.order ?? null;
    const next = cards.find((c) => c.id === nextId)?.order ?? null;
    moveCard(uid, boardId, cardId, columnId, orderBetween(prev, next)).catch(toastError);
  }

  // ---------- Columnas ----------

  async function onAddColumn() {
    const name = await promptDialog("Nueva columna", { placeholder: "Ej. En revisión", confirmText: "Añadir" });
    if (!name) return;
    await saveColumns(uid, boardId, [...columns(), { id: shortId(), name }]).catch(toastError);
    boardEl.scrollTo({ left: boardEl.scrollWidth, behavior: "smooth" });
  }

  async function onColumnMenu(columnId) {
    const list = columns();
    const index = list.findIndex((c) => c.id === columnId);
    if (index < 0) return;
    const column = list[index];

    const items = [{ key: "rename", label: "Renombrar" }];
    if (index > 0) items.push({ key: "left", label: "Mover a la izquierda" });
    if (index < list.length - 1) items.push({ key: "right", label: "Mover a la derecha" });
    items.push({ key: "delete", label: "Eliminar columna", destructive: true });

    const choice = await actionSheet(column.name, items);

    if (choice === "rename") {
      const name = await promptDialog("Renombrar columna", { value: column.name });
      if (name) saveColumns(uid, boardId, list.map((c) => (c.id === columnId ? { ...c, name } : c))).catch(toastError);
    } else if (choice === "left" || choice === "right") {
      const target = choice === "left" ? index - 1 : index + 1;
      const reordered = [...list];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      saveColumns(uid, boardId, reordered).catch(toastError);
    } else if (choice === "delete") {
      if (list.length === 1) {
        showToast("El tablero necesita al menos una columna.");
        return;
      }
      const inColumn = cardsOf(columnId);
      const msg = inColumn.length
        ? `¿Eliminar "${column.name}" y ${inColumn.length === 1 ? "su tarjeta" : `sus ${inColumn.length} tarjetas`}?`
        : `¿Eliminar la columna "${column.name}"?`;
      if (!(await confirmDialog(msg))) return;
      try {
        await deleteCards(uid, boardId, inColumn.map((c) => c.id));
        await saveColumns(uid, boardId, list.filter((c) => c.id !== columnId));
      } catch (err) {
        toastError(err);
      }
    }
  }

  // ---------- Tablero ----------

  async function onBoardMenu() {
    if (!board) return;
    const choice = await actionSheet(board.name, [
      { key: "rename", label: "Renombrar tablero" },
      { key: "delete", label: "Eliminar tablero", destructive: true },
    ]);
    if (choice === "rename") {
      const name = await promptDialog("Renombrar tablero", { value: board.name });
      if (name) renameBoard(uid, boardId, name).catch(toastError);
    } else if (choice === "delete") {
      if (!(await confirmDialog(`¿Eliminar "${board.name}" y todas sus tarjetas?`))) return;
      location.hash = "#/tableros";
      deleteBoard(uid, boardId).catch(toastError);
    }
  }

  // ---------- Eventos ----------

  pageEl.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const { action, columnId } = actionEl.dataset;
      if (action === "add-card") onAddCard(columnId);
      if (action === "add-column") onAddColumn();
      if (action === "column-menu") onColumnMenu(columnId);
      if (action === "board-menu") onBoardMenu();
      return;
    }
    const cardEl = e.target.closest(".card");
    if (cardEl) onOpenCard(cardEl.dataset.cardId);
  });

  pageEl.addEventListener("keydown", (e) => {
    const cardEl = e.target.closest?.(".card");
    if (cardEl && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpenCard(cardEl.dataset.cardId);
    }
  });

  const drag = enableDragDrop(boardEl, {
    onDrop,
    onEnd() {
      if (redrawPending) {
        redrawPending = false;
        draw();
      }
    },
  });

  const stopBoard = watchBoard(
    uid,
    boardId,
    (b) => {
      board = b;
      boardLoaded = true;
      draw();
    },
    toastError
  );
  const stopCards = watchCards(
    uid,
    boardId,
    (list) => {
      cards = list;
      draw();
    },
    toastError
  );

  return () => {
    stopBoard();
    stopCards();
    drag.destroy();
  };
}
