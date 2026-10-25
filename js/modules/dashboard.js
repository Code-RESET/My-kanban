// ============================================================
// modules/dashboard.js
// PLANTILLA de módulo. Copiar este archivo por cada sección nueva
// (clientes.js, cobros.js, reportes.js...) y registrarlo en
// router.js. Cada módulo es dueño de su propio HTML y su propia
// lógica de Firestore — no debe tocar el de otros módulos.
// (No está registrado en el router: se conserva solo como plantilla.)
//
// render(container, user, params) puede devolver una función de
// limpieza; el router la llama al salir de la vista.
// ============================================================

import { db } from "../firebase-config.js";
// import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function renderDashboard(container, user, params = []) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header"><h1 class="large-title">Inicio</h1></div>
      <p class="muted">Sesión activa: ${user?.email || ""}</p>
      <p>Este es el módulo de ejemplo. Duplícalo para cada sección real del proyecto.</p>
    </div>
  `;
  // return () => unsubscribe();
}
