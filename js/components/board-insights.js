// ============================================================
// components/board-insights.js
// Métricas del flujo, calculadas con lo que ya hay en pantalla
// (no hacen lecturas extra a Firestore):
//
// - Cuello de botella: la columna intermedia (ni la primera ni la
//   última) que más tarjetas acumula, si tiene BOTTLENECK_MIN o más.
// - Tiempo por tarea: promedio desde que se creó cada tarjeta de la
//   última columna ("Hecho") hasta su última modificación, que es
//   normalmente cuando se movió ahí.
// ============================================================

import { escapeHtml } from "../ui/dom.js";
import { icons } from "../ui/icons.js";

export const BOTTLENECK_MIN = 4;

// Color de acento por posición: inicio gris, intermedias cálidas/frías, final verde.
const MIDDLE_ACCENTS = ["amber", "blue", "purple", "pink"];

export function columnAccent(index, total) {
  if (index === 0) return "slate";
  if (total > 1 && index === total - 1) return "green";
  return MIDDLE_ACCENTS[(index - 1) % MIDDLE_ACCENTS.length];
}

// Devuelve el id de la columna que frena el flujo, o null.
export function findBottleneck(columns, countOf) {
  if (columns.length < 3) return null;
  let best = null;
  let bestCount = 0;
  let tie = false;
  columns.slice(1, -1).forEach((col) => {
    const n = countOf(col.id);
    if (n > bestCount) {
      best = col.id;
      bestCount = n;
      tie = false;
    } else if (n === bestCount) {
      tie = true;
    }
  });
  return bestCount >= BOTTLENECK_MIN && !tie ? best : null;
}

export function averageCycleTime(doneCards) {
  const times = doneCards
    .filter((c) => typeof c.createdAt === "number" && typeof c.updatedAt === "number")
    .map((c) => Math.max(0, c.updatedAt - c.createdAt));
  if (!times.length) return null;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

// 5 h · 1 día · 9 días
export function formatDuration(ms) {
  const hours = ms / 3_600_000;
  if (hours < 24) return `${Math.max(1, Math.round(hours))} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 día" : `${days} días`;
}

export function insightsHtml({ cycleMs, doneCount, bottleneck }) {
  const value = cycleMs == null ? "—" : formatDuration(cycleMs);
  const hint =
    cycleMs == null
      ? "aún sin tareas terminadas"
      : `promedio de ${doneCount} ${doneCount === 1 ? "tarea terminada" : "tareas terminadas"}`;

  const status = bottleneck
    ? `<span class="pill pill-alert">cuello de botella</span>
       <span class="insight-note">aquí se frena todo: <strong>${escapeHtml(bottleneck.name)}</strong></span>`
    : `<span class="pill pill-ok">flujo estable</span>
       <span class="insight-note">sin columnas saturadas</span>`;

  return `
    <section class="insights ${bottleneck ? "is-alert" : ""}" aria-label="Métricas del tablero">
      <div class="metric">
        <span class="metric-icon">${icons.timer}</span>
        <span class="metric-text">
          <span class="metric-label">tiempo por tarea</span>
          <span class="metric-value">${value}</span>
          <span class="metric-hint">${hint}</span>
        </span>
        ${bottleneck ? `<span class="metric-trend">${icons.trend}</span>` : ""}
      </div>
      <div class="insight-status">${status}</div>
    </section>`;
}
