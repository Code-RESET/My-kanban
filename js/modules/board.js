// ============================================================
// modules/board.js
// Página "Tablero" (#/tablero/{id}): columnas y tarjetas.
// Este archivo solo coordina: escucha Firestore, pinta con
// components/kanban-column.js y responde a las acciones del usuario.
// ============================================================

import { watchBoard, renameBoard, deleteBoard, saveColumns } from "../services/boards-service.js";
import { watchCards, addCard, addCards, updateCard, moveCard, deleteCard, deleteCards, orderBetween } from "../services/cards-service.js";
import { columnHtml, addColumnHtml } from "../components/kanban-column.js";
import { openCardSheet, openSubtasksSheet } from "../components/card-sheet.js";
import { accentsFor, findBottleneck, averageCycleTime, insightsHtml } from "../components/board-insights.js";
import {
  TASKS_KIND,
  stageColumns,
  doneColumnId,
  firstStageId,
  childrenOf,
  leafCards,
  subtaskProgress,
  sumEstimate,
} from "../components/task-tree.js";
import { enableDragDrop } from "../components/drag-drop.js";
import { flowMapHtml, visibleColumnId, markActiveChip } from "../components/flow-map.js";
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
      <div data-insights></div>
      <div data-flow></div>
      <div class="board" data-board><p class="muted center">Cargando…</p></div>
    </div>`;

  // Los eventos van en la raíz de la página (no en container, que se
  // reutiliza entre rutas y acumularía listeners en cada visita).
  const pageEl = container.querySelector(".board-page");
  const titleEl = container.querySelector("[data-title]");
  const boardEl = container.querySelector("[data-board]");
  const insightsEl = container.querySelector("[data-insights]");
  const flowEl = container.querySelector("[data-flow]");
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

  // Columna siguiente a la de la tarjeta (las huérfanas cuentan como de la primera).
  function nextColumnOf(card) {
    const cols = columns();
    const index = Math.max(0, cols.findIndex((c) => c.id === card.columnId));
    return cols[index + 1] || null;
  }

  // ---------- Pintado ----------

  function draw() {
    if (drag.isDragging()) {
      redrawPending = true;
      return;
    }
    if (!boardLoaded) return;
    if (!board) {
      titleEl.textContent = "";
      insightsEl.innerHTML = "";
      flowEl.innerHTML = "";
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

    const cols = columns();
    const accents = accentsFor(cols);
    const bottleneckId = findBottleneck(stageColumns(cols), (id) => cardsOf(id).length);
    const lastId = doneColumnId(cols);
    // Métricas con tareas reales: las principales con subtareas no cuentan.
    const leaves = leafCards(cards);
    const doneLeaves = lastId ? leaves.filter((c) => c.columnId === lastId) : [];

    insightsEl.innerHTML = insightsHtml({
      cycleMs: averageCycleTime(doneLeaves),
      doneCount: doneLeaves.length,
      bottleneck: cols.find((c) => c.id === bottleneckId) || null,
      pendingMin: sumEstimate(leaves.filter((c) => c.columnId !== lastId)),
    });

    flowEl.innerHTML = flowMapHtml(
      cols.map((col) => ({
        id: col.id,
        name: col.name,
        accent: accents[col.id],
        count: cardsOf(col.id).length,
        bottleneck: col.id === bottleneckId,
      }))
    );

    // Opciones propias de cada tarjeta: a qué tarea pertenece, su avance
    // si es principal, y si puede recibir subtareas.
    const cardOpts = (card) => {
      const children = childrenOf(cards, card.id);
      const progress = children.length ? subtaskProgress(children, lastId) : null;
      const inTasksColumn = cols.find((c) => c.id === card.columnId)?.kind === TASKS_KIND;
      const opts = {
        parent: card.parentId ? cards.find((c) => c.id === card.parentId) || null : null,
        progress,
        canSubtask: !card.parentId && (inTasksColumn || children.length > 0),
      };
      // Una tarea principal solo avanza cuando terminó todas sus subtareas.
      if (progress && progress.done < progress.total) opts.next = null;
      return opts;
    };

    boardEl.innerHTML =
      cols
        .map((col, i) =>
          columnHtml(col, cardsOf(col.id), {
            accent: accents[col.id],
            bottleneck: col.id === bottleneckId,
            done: col.id === lastId,
            next: cols[i + 1] || null,
            cardOpts,
          })
        )
        .join("") + addColumnHtml();

    boardEl.scrollLeft = scrollLeft;
    boardEl.querySelectorAll(".column-cards").forEach((l) => (l.scrollTop = scrolls[l.dataset.columnId] || 0));
    activeColumnId = null;
    updateActiveChip();
  }

  // ---------- Mapa del flujo (teléfono) ----------

  let activeColumnId = null;
  let scrollFrame = 0;

  function updateActiveChip() {
    const id = visibleColumnId(boardEl);
    if (id && id !== activeColumnId) {
      activeColumnId = id;
      markActiveChip(flowEl, id);
    }
  }

  function jumpToColumn(columnId) {
    const col = boardEl.querySelector(`.column[data-column-id="${columnId}"]`);
    if (col) boardEl.scrollTo({ left: col.offsetLeft - 16, behavior: "smooth" });
  }

  boardEl.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(updateActiveChip);
  });

  // ---------- Tarjetas ----------

  async function onAddCard(columnId) {
    const inTasksColumn = columns().find((c) => c.id === columnId)?.kind === TASKS_KIND;
    const result = await openCardSheet({ columns: columns(), columnId, allowSubtasks: inTasksColumn });
    if (result?.action !== "save") return;
    const data = result.data;
    const { id, saved } = addCard(uid, boardId, { ...data, order: orderBetween(lastOrder(data.columnId), null) });
    saved.catch(toastError);
    if (result.newSubtasks.length) addSubtasks({ id, title: data.title }, result.newSubtasks);
  }

  async function onOpenCard(cardId) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const doneId = doneColumnId(columns());
    const children = childrenOf(cards, card.id);
    const result = await openCardSheet({
      card,
      columns: columns(),
      subtasks: children.map((c) => ({ title: c.title, done: c.columnId === doneId, estimate: c.estimate })),
      allowSubtasks: !card.parentId,
    });
    if (!result) return;
    if (result.action === "delete") {
      // Al borrar una tarea principal se borran también sus subtareas.
      if (children.length) deleteCards(uid, boardId, [card.id, ...children.map((c) => c.id)]).catch(toastError);
      else deleteCard(uid, boardId, card.id).catch(toastError);
      return;
    }
    const changes = { ...result.data };
    if (changes.columnId !== card.columnId) changes.order = orderBetween(lastOrder(changes.columnId), null);
    updateCard(uid, boardId, card.id, changes).catch(toastError);
    if (result.newSubtasks.length) addSubtasks({ id: card.id, title: changes.title }, result.newSubtasks);
  }

  // Crea las subtareas al final de la primera etapa del flujo ("Por hacer").
  function addSubtasks(parent, titles) {
    const targetId = firstStageId(columns());
    const target = columns().find((c) => c.id === targetId);
    let order = lastOrder(targetId);
    const list = titles.map((title) => {
      order = orderBetween(order, null);
      return { title, columnId: targetId, order, parentId: parent.id };
    });
    addCards(uid, boardId, list).catch(toastError);
    showToast(`${titles.length} ${titles.length === 1 ? "subtarea" : "subtareas"} en "${target?.name || "la primera columna"}"`);
  }

  async function onAddSubtasksQuick(cardId) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const titles = await openSubtasksSheet(card.title);
    if (titles.length) addSubtasks(card, titles);
  }

  // Botón › de la tarjeta: la pasa al final de la siguiente columna.
  // Una animación corta de salida confirma el movimiento antes de guardar.
  function onAdvance(cardId, button) {
    const card = cards.find((c) => c.id === cardId);
    const next = card && nextColumnOf(card);
    if (!next) return;
    button.disabled = true;
    button.closest(".card")?.classList.add("card-leaving");
    setTimeout(() => {
      moveCard(uid, boardId, card.id, next.id, orderBetween(lastOrder(next.id), null)).catch(toastError);
      showToast(`→ ${next.name}`);
    }, 180);
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
    const hasTasksColumn = columns().some((c) => c.kind === TASKS_KIND);
    const items = [{ key: "rename", label: "Renombrar tablero" }];
    if (!hasTasksColumn) items.push({ key: "tasks-column", label: "Agregar columna «Tareas del día»" });
    items.push({ key: "delete", label: "Eliminar tablero", destructive: true });
    const choice = await actionSheet(board.name, items);
    if (choice === "tasks-column") {
      // Va al inicio: ahí viven las tareas principales con sus subtareas.
      const tasksColumn = { id: shortId(), name: "Tareas del día", kind: TASKS_KIND };
      saveColumns(uid, boardId, [tasksColumn, ...columns()]).catch(toastError);
      boardEl.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
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
      const { action, columnId, cardId } = actionEl.dataset;
      if (action === "add-card") onAddCard(columnId);
      if (action === "add-column") onAddColumn();
      if (action === "column-menu") onColumnMenu(columnId);
      if (action === "board-menu") onBoardMenu();
      if (action === "advance") onAdvance(cardId, actionEl);
      if (action === "jump") jumpToColumn(columnId);
      if (action === "add-subtasks") onAddSubtasksQuick(cardId);
      return;
    }
    const cardEl = e.target.closest(".card");
    if (cardEl) onOpenCard(cardEl.dataset.cardId);
  });

  pageEl.addEventListener("keydown", (e) => {
    const cardEl = e.target.closest?.(".card");
    if (e.target.closest?.("button")) return; // el botón › maneja su propio Enter
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
