// ============================================================
// services/boards-service.js
// Acceso a Firestore para los tableros. Los módulos de UI no
// hablan con Firestore directo: pasan por este archivo.
//
// Estructura: users/{uid}/boards/{boardId}
//   { name, columns: [{ id, name, kind? }], createdAt, updatedAt }
//   kind: "tasks" marca la columna inicial "Tareas del día".
// Las tarjetas viven en la subcolección .../cards (cards-service.js).
// ============================================================

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { shortId } from "../ui/dom.js";

export const DEFAULT_COLUMNS = [
  { name: "Tareas del día", kind: "tasks" },
  { name: "Por hacer" },
  { name: "En curso" },
  { name: "Hecho" },
];

const boardsCol = (uid) => collection(db, "users", uid, "boards");
const boardRef = (uid, boardId) => doc(db, "users", uid, "boards", boardId);

// Escucha la lista de tableros en tiempo real. Devuelve la función para dejar de escuchar.
export function watchBoards(uid, onChange, onError) {
  const q = query(boardsCol(uid), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

// Escucha un tablero. onChange recibe null si no existe (o fue eliminado).
export function watchBoard(uid, boardId, onChange, onError) {
  return onSnapshot(
    boardRef(uid, boardId),
    (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  );
}

export async function createBoard(uid, name) {
  const now = Date.now();
  const ref = await addDoc(boardsCol(uid), {
    name,
    columns: DEFAULT_COLUMNS.map((col) => ({ id: shortId(), ...col })),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export function renameBoard(uid, boardId, name) {
  return updateDoc(boardRef(uid, boardId), { name, updatedAt: Date.now() });
}

export function saveColumns(uid, boardId, columns) {
  return updateDoc(boardRef(uid, boardId), { columns, updatedAt: Date.now() });
}

// Firestore no borra subcolecciones solo: primero se borran las tarjetas.
// Lotes de 450 para quedar bajo el límite de 500 operaciones por batch.
export async function deleteBoard(uid, boardId) {
  const cards = await getDocs(collection(db, "users", uid, "boards", boardId, "cards"));
  const refs = [...cards.docs.map((d) => d.ref), boardRef(uid, boardId)];
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}
