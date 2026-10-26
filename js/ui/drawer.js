// ============================================================
// ui/drawer.js
// Menú hamburguesa: panel lateral con la navegación (la pinta
// router.js dentro de #app-nav), el interruptor de modo oscuro
// "Actualizar app" y cerrar sesión. También conecta el botón de
// tema del header.
// ============================================================

import { auth } from "../firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getTheme, toggleTheme, setTheme, onThemeChange } from "./theme.js";
import { confirmDialog } from "./sheet.js";
import { icons } from "./icons.js";
import { onUpdateState, updateNow } from "./updater.js";

const drawer = document.getElementById("app-drawer");
const overlay = document.getElementById("drawer-overlay");
const menuBtn = document.getElementById("menu-btn");
const themeBtn = document.getElementById("theme-btn");
const themeSwitch = document.getElementById("drawer-theme-switch");
const emailEl = document.getElementById("drawer-email");

export function openDrawer() {
  drawer.classList.add("open");
  overlay.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  menuBtn.setAttribute("aria-expanded", "true");
  document.body.classList.add("no-scroll");
}

export function closeDrawer() {
  if (!drawer.classList.contains("open")) return;
  drawer.classList.remove("open");
  overlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  menuBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("no-scroll");
}

function syncTheme(theme) {
  themeSwitch.checked = theme === "dark";
  themeBtn.innerHTML = theme === "dark" ? icons.sun : icons.moon;
  themeBtn.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
}

menuBtn.innerHTML = icons.menu;
menuBtn.addEventListener("click", openDrawer);
overlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});
// Al elegir una opción del menú (o navegar de cualquier forma) se cierra.
window.addEventListener("hashchange", closeDrawer);
drawer.addEventListener("click", (e) => {
  if (e.target.closest("a")) closeDrawer();
});

themeBtn.addEventListener("click", toggleTheme);
themeSwitch.addEventListener("change", () => setTheme(themeSwitch.checked ? "dark" : "light"));
onThemeChange(syncTheme);
syncTheme(getTheme());

// Actualizar app: muestra la versión instalada y un punto si hay una nueva.
document.getElementById("drawer-update-icon").innerHTML = icons.refresh;
document.getElementById("drawer-update").addEventListener("click", () => {
  closeDrawer();
  updateNow();
});
onUpdateState((s) => {
  document.getElementById("drawer-version").textContent = s.available ? `v${s.nextVersion || "nueva"}` : `v${s.current}`;
  document.getElementById("drawer-update-dot").hidden = !s.available;
  menuBtn.classList.toggle("has-update", s.available);
});

document.getElementById("drawer-logout").addEventListener("click", async () => {
  closeDrawer();
  if (await confirmDialog("¿Cerrar sesión?", { confirmText: "Cerrar sesión" })) {
    await signOut(auth);
  }
});

onAuthStateChanged(auth, (user) => {
  emailEl.textContent = user?.email || "";
  if (!user) closeDrawer();
});
