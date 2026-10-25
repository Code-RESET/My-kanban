// ============================================================
// ui/theme.js
// Modo claro / oscuro. El tema se aplica con <html data-theme="...">
// y el CSS cambia los colores con [data-theme="dark"].
//
// - Si el usuario nunca eligió, se sigue el tema del teléfono/PC.
// - Si lo eligió con el botón, se recuerda en este dispositivo.
// (index.html tiene una copia mínima de applyInitial para que no
//  haya un "parpadeo" blanco antes de que cargue este módulo.)
// ============================================================

const STORAGE_KEY = "kanban-theme";
const META_COLORS = { light: "#f2f2f7", dark: "#0b0a17" };
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();

function savedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLORS[theme]);
  listeners.forEach((cb) => cb(theme));
}

export function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sin almacenamiento (modo privado): el cambio dura solo esta sesión.
  }
  apply(theme);
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

// Avisa cada vez que cambia el tema. Devuelve la función para dejar de escuchar.
export function onThemeChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Mientras el usuario no elija, el tema sigue al sistema en vivo.
systemDark.addEventListener("change", (e) => {
  if (!savedTheme()) apply(e.matches ? "dark" : "light");
});

apply(savedTheme() || (systemDark.matches ? "dark" : "light"));
