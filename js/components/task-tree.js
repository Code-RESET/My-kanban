// ============================================================
// components/task-tree.js
// Tareas principales y subtareas, y tiempo estimado.
//
// - Una subtarea es una tarjeta con parentId = id de su tarea
//   principal. Solo hay un nivel (las subtareas no tienen hijas).
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

// ---------- Reiniciar ("↺ Repetir") ----------

// Planea regresar tarjetas al inicio para repetir un trabajo:
//   - las tareas normales y subtareas -> primera etapa ("Por hacer")
//   - las tareas principales          -> "Tareas del día" (o la primera etapa)
// Todas las del grupo quedan en el orden en que se crearon (aunque alguna
// nunca se haya movido), después de lo que ya había en el destino.
// Devuelve [{ id, columnId, order, changed }]; changed = cambió de columna.
// Si ninguna cambia de columna devuelve [] (no hay nada que repetir).
export function planReset(columns, allCards, targets) {
  const stageId = firstStageId(columns);
  const tasksId = columns.find((c) => c.kind === TASKS_KIND)?.id || stageId;
  const parents = new Set(allCards.map((c) => c.parentId).filter(Boolean));
  const destOf = (card) => (parents.has(card.id) ? tasksId : stageId);
  if (!targets.some((c) => c.columnId !== destOf(c))) return [];

  const group = new Set(targets.map((c) => c.id));
  const sorted = [...targets].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.order - b.order);

  const lastOrder = {};
  for (const card of allCards) {
    if (group.has(card.id)) continue;
    lastOrder[card.columnId] = Math.max(lastOrder[card.columnId] ?? -Infinity, card.order);
  }
  return sorted.map((card) => {
    const dest = destOf(card);
    const order = (Number.isFinite(lastOrder[dest]) ? lastOrder[dest] : 0) + 1000;
    lastOrder[dest] = order;
    return { id: card.id, columnId: dest, order, changed: card.columnId !== dest };
  });
}
