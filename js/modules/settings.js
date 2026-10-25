// ============================================================
// modules/settings.js
// Página "Ajustes": cuenta, cerrar sesión y créditos de la app.
// ============================================================

import { auth } from "../firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { confirmDialog } from "../ui/sheet.js";
import { escapeHtml } from "../ui/dom.js";

export const APP_VERSION = "1.0.0";

export function renderSettings(container, user) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="large-title">Ajustes</h1>
      </div>

      <p class="list-caption">Cuenta</p>
      <ul class="list">
        <li class="list-row static">
          <span class="list-text"><span class="list-title">Correo</span></span>
          <span class="list-value">${escapeHtml(user?.email || "")}</span>
        </li>
      </ul>
      <ul class="list">
        <li class="list-row">
          <button class="list-button destructive" data-action="logout">Cerrar sesión</button>
        </li>
      </ul>

      <p class="list-caption">Acerca de</p>
      <ul class="list">
        <li class="list-row static"><span class="list-title">App</span><span class="list-value">Mi Kanban</span></li>
        <li class="list-row static"><span class="list-title">Versión</span><span class="list-value">${APP_VERSION}</span></li>
        <li class="list-row static"><span class="list-title">Desarrollado por</span><span class="list-value">Ing. Luis Ángel Díaz Bernal</span></li>
        <li class="list-row static"><span class="list-title">Compañía</span><span class="list-value">CODE-RESET</span></li>
      </ul>

      <p class="list-caption">Cómo se usa</p>
      <ul class="list help">
        <li class="list-row static">Toca <strong>+</strong> en Tableros para crear uno.</li>
        <li class="list-row static">Toca una tarjeta para editarla o moverla de columna.</li>
        <li class="list-row static">Arrastra una tarjeta para moverla. En el teléfono: mantenla presionada y luego arrastra.</li>
      </ul>
    </div>`;

  container.querySelector('[data-action="logout"]').addEventListener("click", async () => {
    if (await confirmDialog("¿Cerrar sesión?", { confirmText: "Cerrar sesión" })) {
      await signOut(auth);
    }
  });
}
