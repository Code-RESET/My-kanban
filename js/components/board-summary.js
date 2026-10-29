// ============================================================
// components/board-summary.js
// Resumen de un tablero para la lista de Tableros:
// barra de progreso por colores (una sección por columna),
// % terminado y alertas (cuello de botella, tareas vencidas).
// Solo calcula y genera HTML; boards.js le pasa los datos.
// ============================================================

import { accentsFor, findBottleneck } from "./board-insights.js";
import { stageColumns, doneColumnId, leafCards, sumEstimate, formatEstimate } from "./task-tree.js";
import { escapeHtml, isOverdue } from "../ui/dom.js";

// Cuenta tareas por columna. Las huérfanas (columna borrada) van a
// la primera, igual que en la vista del tablero. Las tareas principales
// con subtareas no cuentan: su avance ya está en sus subtareas.
export function summarizeBoard(columns = [], cards = []) {
  const ids = new Set(columns.map((c) => c.id));
  const counts = Object.fromEntries(columns.map((c) => [c.id, 0]));
  const firstId = columns[0]?.id;
  const leaves = leafCards(cards);
  for (const card of leaves) {
    const colId = ids.has(card.columnId) ? card.columnId : firstId;
    if (colId) counts[colId]++;
  }

  const lastId = doneColumnId(columns);
  const total = leaves.length;
  const done = lastId ? counts[lastId] : 0;
  const bottleneckId = findBottleneck(stageColumns(columns), (id) => counts[id]);
  const pending = leaves.filter((c) => c.columnId !== lastId);
  const overdue = pending.filter((c) => isOverdue(c.dueDate)).length;
  const accents = accentsFor(columns);

  return {
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : 0,
    overdue,
    pendingMin: sumEstimate(pending),
    bottleneck: columns.find((c) => c.id === bottleneckId) || null,
    segments: columns.map((col) => ({ name: col.name, count: counts[col.id], accent: accents[col.id] })),
  };
}

export function pendingText(summary) {
  return summary.pendingMin > 0 ? ` · faltan ${formatEstimate(summary.pendingMin)}` : "";
}

// Barra apilada: cada sección mide según sus tarjetas y lleva el color de su columna.
export function progressBarHtml(summary) {
  if (!summary.total) return `<div class="progress-bar is-empty" aria-hidden="true"></div>`;
  const parts = summary.segments
    .filter((s) => s.count > 0)
    .map(
      (s) =>
        `<span class="progress-seg" data-accent="${s.accent}" style="flex-grow:${s.count}" title="${escapeHtml(s.name)}: ${s.count}"></span>`
    )
    .join("");
  return `<div class="progress-bar" role="img" aria-label="${summary.pct}% terminado">${parts}</div>`;
}

// Leyenda debajo de la barra: "● Por hacer 2  ● En curso 1 …"
export function legendHtml(summary) {
  return summary.segments
    .map(
      (s) =>
        `<span class="legend-item ${s.count ? "" : "is-zero"}"><span class="legend-dot" data-accent="${s.accent}"></span>${escapeHtml(s.name)} <strong>${s.count}</strong></span>`
    )
    .join("");
}

export function alertsHtml(summary) {
  const alerts = [];
  if (summary.bottleneck) {
    alerts.push(`<span class="pill pill-alert">cuello de botella · ${escapeHtml(summary.bottleneck.name)}</span>`);
  }
  if (summary.overdue) {
    alerts.push(`<span class="pill pill-warn">${summary.overdue} ${summary.overdue === 1 ? "vencida" : "vencidas"}</span>`);
  }
  if (!alerts.length && summary.total && summary.done === summary.total) {
    alerts.push(`<span class="pill pill-ok">todo terminado</span>`);
  }
  return alerts.join("");
}
