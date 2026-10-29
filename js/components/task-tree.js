// ============================================================
// components/task-tree.js
// Tareas principales con tareas en orden, y tiempo estimado.
//
// - Una tarea en orden ("paso") es una tarjeta con parentId = id de
//   su tarea principal. Solo hay un nivel.
// - Los pasos se hacen EN ORDEN (según createdAt): solo el primero
//   que no está en "Hecho" puede avanzar; los demás esperan.
// - En la columna se pintan en fila debajo de su tarea principal.
// - "estimate" son minutos estimados (0 o ausente = sin estimar).
// - La columna con kind: "tasks" ("Tareas del día") guarda las
//   tareas principales y no cuenta como etapa del flujo.
// Solo cálculos; no toca el DOM ni Firestore.
// ============================================================

export const TASKS_KIND = "tasks";

// Columnas que son etapas del flujo (todas menos "Tareas del día").
export function stageColumns(columns) {
  return columns.filter((c) => c.kind !== TASKS_KIND);
}

// Última etapa = "Hecho" (si hay al menos dos etapas).
export function doneColumnId(columns) {
  const stages = stageColumns(columns);
  return stages.length > 1 ? stages.at(-1).id : null;
}

// Primera etapa: ahí caen las subtareas nuevas ("Por hacer").
export function firstStageId(columns) {
  return stageColumns(columns)[0]?.id || columns[0]?.id || null;
}

export function childrenOf(cards, parentId) {
  return cards.filter((c) => c.parentId === parentId);
}

// Tareas "reales" para las métricas: todo menos las principales que
// tienen subtareas (su avance ya se cuenta con las subtareas).
export function leafCards(cards) {
  const parents = new Set(cards.map((c) => c.parentId).filter(Boolean));
  return cards.filter((c) => !parents.has(c.id));
}

// Avance de una tarea principal.
export function subtaskProgress(children, doneId) {
  const done = children.filter((c) => c.columnId === doneId);
  return {
    total: children.length,
    done: done.length,
    estTotal: sumEstimate(children),
    estLeft: sumEstimate(children.filter((c) => c.columnId !== doneId)),
  };
}

export function sumEstimate(cards) {
  return cards.reduce((sum, c) => sum + (Number(c.estimate) > 0 ? Number(c.estimate) : 0), 0);
}

// "Cableado, fusibles\nencintado" -> ["Cableado", "Fusibles", "Encintado"]
export function parseSubtasks(text) {
  return String(text || "")
    .split(/[,\n;]+/)
    .map((t) => t.trim().replace(/\.+$/, "").trim())
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .slice(0, 30);
}

// Horas escritas por el usuario (admite "1,5") -> minutos enteros.
export function hoursToMinutes(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(Math.min(n, 999) * 60) : 0;
}

export function minutesToHours(min) {
  return min > 0 ? String(Math.round((min / 60) * 100) / 100) : "";
}

// 30 min · 1 h · 1 h 30 min · 12 h
export function formatEstimate(min) {
  if (!(min > 0)) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ---------- Pasos en orden ----------

const bySequence = (a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.order - b.order;

// Pasos de una tarea principal, en el orden en que se deben hacer.
export function stepsOf(cards, parentId) {
  return childrenOf(cards, parentId).sort(bySequence);
}

// Estado de un paso: su número (1, 2, 3…), el paso actual de su grupo y
// si está bloqueado (le toca después de uno que no se ha terminado).
export function stepState(cards, card, doneId) {
  const steps = stepsOf(cards, card.parentId);
  const index = steps.findIndex((s) => s.id === card.id);
  const currentIndex = steps.findIndex((s) => s.columnId !== doneId);
  const current = currentIndex >= 0 ? steps[currentIndex] : null;
  return {
    number: index + 1,
    current,
    locked: currentIndex >= 0 && index > currentIndex,
  };
}

// Columna donde viven los pasos de una tarea principal que está en
// parentColumnId: la misma, salvo que sea "Tareas del día" o "Hecho"
// (entonces la primera etapa, "Por hacer").
export function stepHomeColumn(columns, parentColumnId) {
  const col = columns.find((c) => c.id === parentColumnId);
  const isStage = col && col.kind !== TASKS_KIND;
  return isStage && parentColumnId !== doneColumnId(columns) ? parentColumnId : firstStageId(columns);
}

// Acomoda las tarjetas de una columna para pintarlas:
//   - cada paso va justo debajo de su tarea principal si está en la
//     misma columna, numerado y en orden;
//   - si la principal está en otra columna, sus pasos van juntos bajo
//     un encabezado con su nombre.
// Devuelve [{ type: "card", card } | { type: "group", parent }].
export function arrangeColumn(columnCards, allCards) {
  const here = new Set(columnCards.map((c) => c.id));
  const byId = new Map(allCards.map((c) => [c.id, c]));
  const emitted = new Set();
  const items = [];
  const emitSteps = (parentId) => {
    columnCards.filter((c) => c.parentId === parentId).sort(bySequence).forEach((c) => items.push({ type: "card", card: c }));
  };
  for (const card of columnCards) {
    if (card.parentId) {
      if (here.has(card.parentId) || emitted.has(card.parentId)) continue;
      emitted.add(card.parentId);
      const parent = byId.get(card.parentId);
      if (parent) items.push({ type: "group", parent });
      emitSteps(card.parentId);
      continue;
    }
    items.push({ type: "card", card });
    if (columnCards.some((c) => c.parentId === card.id)) emitSteps(card.id);
  }
  return items;
}

// ---------- Reiniciar ("↺ Repetir") ----------

// Planea regresar tarjetas al inicio para repetir un trabajo:
//   - las tareas normales                -> primera etapa ("Por hacer")
//   - las tareas principales             -> se quedan donde están; si ya
//     estaban en "Hecho" regresan a "Tareas del día" (o la primera etapa)
//   - los pasos                          -> debajo de su tarea principal
// Todas las del grupo quedan en el orden en que se crearon (aunque alguna
// nunca se haya movido), después de lo que ya había en el destino.
// Devuelve [{ id, columnId, order, changed }]; changed = cambió de columna.
// Si ninguna cambia de columna devuelve [] (no hay nada que repetir).
export function planReset(columns, allCards, targets) {
  const stageId = firstStageId(columns);
  const tasksId = columns.find((c) => c.kind === TASKS_KIND)?.id || stageId;
  const doneId = doneColumnId(columns);
  const ids = new Set(columns.map((c) => c.id));
  const byId = new Map(allCards.map((c) => [c.id, c]));
  const parents = new Set(allCards.map((c) => c.parentId).filter(Boolean));
  const parentDest = (p) => (p.columnId === doneId || !ids.has(p.columnId) ? tasksId : p.columnId);
  const destOf = (card) => {
    if (parents.has(card.id)) return parentDest(card);
    const parent = card.parentId && byId.get(card.parentId);
    return parent ? stepHomeColumn(columns, parentDest(parent)) : stageId;
  };
  if (!targets.some((c) => c.columnId !== destOf(c))) return [];

  const group = new Set(targets.map((c) => c.id));
  const sorted = [...targets].sort(bySequence);

  const lastOrder = {};
  for (const card of allCards) {
    if (group.has(card.id)) continue;
    lastOrder[card.columnId] = Math.max(lastOrder[card.columnId] ?? -Infinity, card.order);
  }
  return sorted.map((card) => {
    const dest = destOf(card);
    // Una tarea principal que no cambia de columna conserva su lugar.
    if (parents.has(card.id) && dest === card.columnId) return { id: card.id, columnId: dest, order: card.order, changed: false };
    const order = (Number.isFinite(lastOrder[dest]) ? lastOrder[dest] : 0) + 1000;
    lastOrder[dest] = order;
    return { id: card.id, columnId: dest, order, changed: card.columnId !== dest };
  });
}
