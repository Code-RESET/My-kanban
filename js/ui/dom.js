// ============================================================
// ui/dom.js
// Utilidades pequeñas de DOM y formato compartidas por los módulos.
// ============================================================

// Todo texto que escribe el usuario pasa por aquí antes de ir a innerHTML.
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Id corto para columnas (las tarjetas y tableros usan el id de Firestore).
export function shortId() {
  if (crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

// "2026-10-25" -> "25 oct". Se interpreta como fecha local, no UTC.
export function formatShortDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function isOverdue(isoDate) {
  if (!isoDate) return false;
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return isoDate < todayIso;
}
