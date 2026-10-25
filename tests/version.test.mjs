// ============================================================
// tests/version.test.mjs
// Revisa que la versión de js/version.js coincida con la primera
// entrada de js/changelog.js y que el historial esté en orden.
// Correr con:  node tests/version.test.mjs
// ============================================================

import assert from "node:assert/strict";

globalThis.self = globalThis;
const { APP_VERSION, CHANGELOG } = await import("../js/changelog.js");

const toNum = (v) => v.split(".").map(Number).reduce((acc, n) => acc * 1000 + n, 0);

assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/, "version.js debe tener formato X.Y.Z");
assert.equal(CHANGELOG[0].version, APP_VERSION, "La primera entrada de changelog.js debe ser la versión de version.js");
for (let i = 1; i < CHANGELOG.length; i++) {
  assert.ok(toNum(CHANGELOG[i - 1].version) > toNum(CHANGELOG[i].version), `Orden incorrecto en ${CHANGELOG[i].version}`);
}
for (const e of CHANGELOG) {
  assert.ok(e.title && e.items.length, `Falta título o cambios en ${e.version}`);
  assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `Fecha inválida en ${e.version}`);
}
console.log(`✔ versión ${APP_VERSION} y ${CHANGELOG.length} entradas de Novedades en orden`);
