// ============================================================
// tests/firestore-rules.test.mjs
// Prueba las reglas de firestore.rules en el emulador local.
// Solo para desarrollo (la app NO necesita npm para correr).
//
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-kanban "node tests/firestore-rules.test.mjs"
// ============================================================

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-kanban",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});

const now = Date.now();
const board = { name: "Personal", columns: [{ id: "a1", name: "Por hacer" }], createdAt: now, updatedAt: now };
const card = { title: "Comprar pan", notes: "", color: "", dueDate: "", columnId: "a1", order: 1000, createdAt: now, updatedAt: now };

const ana = env.authenticatedContext("ana").firestore();
const beto = env.authenticatedContext("beto").firestore();
const anon = env.unauthenticatedContext().firestore();

const tests = {
  "dueño crea, lee, edita y borra su tablero": async () => {
    await assertSucceeds(setDoc(doc(ana, "users/ana/boards/b1"), board));
    await assertSucceeds(getDoc(doc(ana, "users/ana/boards/b1")));
    await assertSucceeds(updateDoc(doc(ana, "users/ana/boards/b1"), { name: "Casa", updatedAt: now }));
    await assertSucceeds(setDoc(doc(ana, "users/ana/boards/b1/cards/c1"), card));
    await assertSucceeds(updateDoc(doc(ana, "users/ana/boards/b1/cards/c1"), { order: 500, columnId: "z9" }));
    await assertSucceeds(getDocs(collection(ana, "users/ana/boards/b1/cards")));
    await assertSucceeds(deleteDoc(doc(ana, "users/ana/boards/b1/cards/c1")));
  },
  "otro usuario NO puede leer ni escribir tableros ajenos": async () => {
    await assertFails(getDoc(doc(beto, "users/ana/boards/b1")));
    await assertFails(getDocs(collection(beto, "users/ana/boards")));
    await assertFails(setDoc(doc(beto, "users/ana/boards/b2"), board));
    await assertFails(updateDoc(doc(beto, "users/ana/boards/b1"), { name: "hack" }));
    await assertFails(deleteDoc(doc(beto, "users/ana/boards/b1")));
    await assertFails(getDocs(collection(beto, "users/ana/boards/b1/cards")));
    await assertFails(setDoc(doc(beto, "users/ana/boards/b1/cards/x"), card));
  },
  "sin sesión no hay acceso": async () => {
    await assertFails(getDoc(doc(anon, "users/ana/boards/b1")));
    await assertFails(setDoc(doc(anon, "users/ana/boards/b3"), board));
  },
  "rechaza datos inválidos": async () => {
    await assertFails(setDoc(doc(ana, "users/ana/boards/b4"), { ...board, name: "" }));
    await assertFails(setDoc(doc(ana, "users/ana/boards/b4"), { ...board, admin: true }));
    await assertFails(setDoc(doc(ana, "users/ana/boards/b1/cards/c2"), { ...card, title: "" }));
    await assertFails(setDoc(doc(ana, "users/ana/boards/b1/cards/c2"), { ...card, color: "pink" }));
    await assertFails(setDoc(doc(ana, "users/ana/boards/b1/cards/c2"), { ...card, order: "1" }));
  },
  "rutas fuera de users/{uid}/boards están cerradas": async () => {
    await assertFails(setDoc(doc(ana, "users/ana"), { role: "admin" }));
    await assertFails(setDoc(doc(ana, "config/global"), { x: 1 }));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (err) {
    failed++;
    console.log(`✘ ${name}\n  ${err.message}`);
  }
}
await env.cleanup();
assert.equal(failed, 0, `${failed} prueba(s) fallaron`);
