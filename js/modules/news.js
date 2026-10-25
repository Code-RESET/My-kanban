// ============================================================
// modules/news.js
// Página "Novedades" (#/novedades): historial de versiones y
// botón para buscar actualizaciones. El contenido sale de
// js/changelog.js.
// ============================================================

import { APP_VERSION, CHANGELOG } from "../changelog.js";
import { onUpdateState, updateNow } from "../ui/updater.js";
import { escapeHtml } from "../ui/dom.js";

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export function renderNews(container) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="large-title">Novedades</h1>
      </div>

      <div class="version-card">
        <span class="version-label">versión instalada</span>
        <span class="version-number">v${APP_VERSION}</span>
        <button class="btn btn-primary" data-action="update" data-update-btn>Buscar actualización</button>
      </div>

      ${CHANGELOG.map(
        (entry) => `
        <section class="release ${entry.version === APP_VERSION ? "is-current" : ""}">
          <header class="release-header">
            <span class="pill release-pill">v${escapeHtml(entry.version)}</span>
            ${entry.version === APP_VERSION ? `<span class="pill pill-ok">instalada</span>` : ""}
            <span class="release-date">${formatDate(entry.date)}</span>
          </header>
          <h2 class="release-title">${escapeHtml(entry.title)}</h2>
          <ul class="release-items">
            ${entry.items.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}
          </ul>
        </section>`
      ).join("")}
    </div>`;

  const btn = container.querySelector("[data-update-btn]");
  btn.addEventListener("click", updateNow);
  // Si ya hay una versión esperando, el botón lo dice.
  return onUpdateState((s) => {
    btn.textContent = s.available ? `Instalar v${s.nextVersion || "nueva"}` : "Buscar actualización";
  });
}
