// ============================================================
// services/cards-service.js
// Acceso a Firestore para las tarjetas de un tablero.
//
// Estructura: users/{uid}/boards/{boardId}/cards/{cardId}
//   { title, notes, color, dueDate ("AAAA-MM-DD" o ""),
//     columnId, order, createdAt, updatedAt }
//
// "order" es un número: las tarjetas de una columna se pintan de
// menor a mayor. Al mover una tarjeta entre otras dos se le pone
// el promedio, así solo se escribe UN documento por movimiento.
// ============================================================

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ORDER_STEP = 1000;

const cardsCol = (uid, boardId) => collection(db, "users", uid, "boards", boardId, "cards");
const cardRef = (uid, boardId, cardId) => doc(db, "users", uid, "boards", boardId, "cards", cardId);

export function watchCards(uid, boardId, onChange, onError) {
  const q = query(cardsCol(uid, boardId), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

// Calcula el "order" para quedar entre prev y next (cualquiera puede faltar).
export function orderBetween(prev, next) {
  if (prev == null && next == null) return ORDER_STEP;
  if (prev == null) return next - ORDER_STEP;
  if (next == null) return prev + ORDER_STEP;
  return (prev + next) / 2;
}

export function addCard(uid, boardId, { title, notes = "", color = "", dueDate = "", columnId, order }) {
  const now = Date.now();
  return addDoc(cardsCol(uid, boardId), {
    title,
    notes,
    color,
    dueDate,
    columnId,
    order,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateCard(uid, boardId, cardId, changes) {
  return updateDoc(cardRef(uid, boardId, cardId), { ...changes, updatedAt: Date.now() });
}

export function moveCard(uid, boardId, cardId, columnId, order) {
  return updateCard(uid, boardId, cardId, { columnId, order });
}

export function deleteCard(uid, boardId, cardId) {
  return deleteDoc(cardRef(uid, boardId, cardId));
}

export async function deleteCards(uid, boardId, cardIds) {
  for (let i = 0; i < cardIds.length; i += 450) {
    const batch = writeBatch(db);
    cardIds.slice(i, i + 450).forEach((id) => batch.delete(cardRef(uid, boardId, id)));
    await batch.commit();
  }
}
