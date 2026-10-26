// ============================================================
// modules/settings.js
// Página "Ajustes": cuenta, ícono personalizado, modo oscuro,
// cerrar sesión y créditos de la app.
// ============================================================

import { auth } from "../firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { confirmDialog } from "../ui/sheet.js";
import { escapeHtml } from "../ui/dom.js";
import { getTheme, setTheme, onThemeChange } from "../ui/theme.js";
import { saveLogo } from "../services/profile-service.js";
import { fileToSquareDataUrl } from "../ui/image-resize.js";
import { DEFAULT_LOGO } from "../ui/brand.js";
import { showToast, toastError } from "../ui/toast.js";
import { APP_VERSION } from "../changelog.js";
import { onUpdateState, updateNow } from "../ui/updater.js";
import { icons } from "../ui/icons.js";


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

      <p class="list-caption">Apariencia</p>
      <ul class="list">
        <li class="list-row static logo-row">
          <img class="brand-logo logo-preview" src="${document.querySelector("img.brand-logo")?.getAttribute("src") || DEFAULT_LOGO}" alt="Ícono actual" />
          <span class="list-text">
            <span class="list-title">Ícono de la app</span>
            <span class="list-subtitle">Usa cualquier foto: se recorta cuadrada.</span>
          </span>
        </li>
        <li class="list-row logo-actions">
          <label class="list-button">
            Elegir foto
            <input type="file" accept="image/*" data-logo-input class="visually-hidden" />
          </label>
          <button class="list-button destructive" data-action="logo-reset">Quitar</button>
        </li>
        <li class="list-row static">
          <label class="list-title" for="settings-theme">Modo oscuro</label>
          <span class="switch">
            <input type="checkbox" id="settings-theme" ${getTheme() === "dark" ? "checked" : ""} />
            <span class="switch-track"></span>
          </span>
        </li>
      </ul>

      <p class="list-caption">Acerca de</p>
      <ul class="list">
        <li class="list-row static"><span class="list-title">App</span><span class="list-value">Mi Kanban</span></li>
        <li class="list-row">
          <a class="list-link" href="#/novedades">
            <span class="list-text"><span class="list-title">Versión</span></span>
            <span class="list-value">v${APP_VERSION}</span>
            <span class="list-chevron">${icons.chevron}</span>
          </a>
        </li>
        <li class="list-row">
          <button class="list-button" data-action="update" data-update-btn>Buscar actualización</button>
        </li>
        <li class="list-row static"><span class="list-title">Desarrollado por</span><span class="list-value">Ing. Luis Ángel Díaz Bernal</span></li>
        <li class="list-row static"><span class="list-title">Compañía</span><span class="list-value">CODE-RESET</span></li>
      </ul>

      <p class="list-caption">Cómo se usa</p>
      <ul class="list help">
        <li class="list-row static">Abre el menú <strong>☰</strong> para cambiar de sección o activar el modo oscuro.</li>
        <li class="list-row static">Toca <strong>+</strong> en Tableros para crear uno.</li>
        <li class="list-row static">Toca una tarjeta para editarla o moverla de columna.</li>
        <li class="list-row static">Arrastra una tarjeta para moverla. En el teléfono: mantenla presionada y luego arrastra.</li>
      </ul>
    </div>`;

  container.querySelector("[data-logo-input]").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const logo = await fileToSquareDataUrl(file);
      await saveLogo(user.uid, logo);
      showToast("Ícono actualizado.");
    } catch (err) {
      if (err.message === "not-image" || err.message === "bad-image") showToast("Ese archivo no es una imagen válida.");
      else toastError(err);
    }
  });

  container.querySelector('[data-action="logo-reset"]').addEventListener("click", async () => {
    if (await confirmDialog("¿Volver al ícono original?", { confirmText: "Quitar foto" })) {
      saveLogo(user.uid, "").catch(toastError);
    }
  });

  const themeInput = container.querySelector("#settings-theme");
  themeInput.addEventListener("change", () => setTheme(themeInput.checked ? "dark" : "light"));
  const stopTheme = onThemeChange((t) => (themeInput.checked = t === "dark"));

  container.querySelector('[data-action="logout"]').addEventListener("click", async () => {
    if (await confirmDialog("¿Cerrar sesión?", { confirmText: "Cerrar sesión" })) {
      await signOut(auth);
    }
  });

  const updateBtn = container.querySelector("[data-update-btn]");
  updateBtn.addEventListener("click", updateNow);
  const stopUpdates = onUpdateState((st) => {
    updateBtn.textContent = st.available ? `Instalar v${st.nextVersion || "nueva"}` : "Buscar actualización";
  });

  return () => {
    stopTheme();
    stopUpdates();
  };
}
