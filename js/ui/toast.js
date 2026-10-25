// ============================================================
// ui/toast.js
// Aviso breve flotante (errores de red, confirmaciones).
// ============================================================

let timer = null;

export function showToast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("visible"), 2800);
}

// Para usar en .catch() de llamadas a Firestore.
export function toastError(err) {
  console.error(err);
  showToast(err?.code === "permission-denied" ? "Sin permiso para esta acción." : "No se pudo guardar. Revisa tu conexión.");
}
