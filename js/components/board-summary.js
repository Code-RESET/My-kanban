// ============================================================
// components/board-summary.js
// Resumen de un tablero para la lista de Tableros:
// barra de progreso por colores (una sección por columna),
// % terminado y alertas (cuello de botella, tareas vencidas).
// Solo calcula y genera HTML; boards.js le pasa los datos.
// ============================================================

import { columnAccent, findBottleneck } from "./board-insights.js";
import { escapeHtml, isOverdue } from "../ui/dom.js";

// Cuenta tarjetas por columna. Las huérfanas (columna borrada) van a
// la primera, igual que en la vista del tablero.
export function summarizeBoard(columns = [], cards = []) {
  const ids = new Set(columns.map((c) => c.id));
  const counts = Object.fromEntries(columns.map((c) => [c.id, 0]));
  const firstId = columns[0]?.id;
  for (const card of cards) {
    const colId = ids.has(card.columnId) ? card.columnId : firstId;
    if (colId) counts[colId]++;
  }

  const lastId = columns.length > 1 ? columns.at(-1).id : null;
  const total = cards.length;
  const done = lastId ? counts[lastId] : 0;
  const bottleneckId = findBottleneck(columns, (id) => counts[id]);
  const overdue = cards.filter((c) => c.columnId !== lastId && isOverdue(c.dueDate)).length;

  return {
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : 0,
    overdue,
    bottleneck: columns.find((c) => c.id === bottleneckId) || null,
    segments: columns.map((col, i) => ({
      name: col.name,
      count: counts[col.id],
      accent: columnAccent(i, columns.length),
    })),
  };
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
