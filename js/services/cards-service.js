// ============================================================
// services/cards-service.js
// Acceso a Firestore para las tarjetas de un tablero.
//
// Estructura: users/{uid}/boards/{boardId}/cards/{cardId}
//   { title, notes, color, dueDate ("AAAA-MM-DD" o ""),
//     columnId, order, createdAt, updatedAt,
//     estimate?  (minutos estimados; se omite si no hay),
//     parentId?  (id de la tarea principal si es subtarea) }
//
// "order" es un número: las tarjetas de una columna se pintan de
// menor a mayor. Al mover una tarjeta entre otras dos se le pone
// el promedio, así solo se escribe UN documento por movimiento.
// ============================================================

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteField,
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

// Arma el documento de una tarjeta nueva. Los campos opcionales solo se
// escriben si tienen valor (así las tarjetas simples no los necesitan).
function newCardData({ title, notes = "", color = "", dueDate = "", columnId, order, estimate = 0, parentId = "" }) {
  const now = Date.now();
  const data = { title, notes, color, dueDate, columnId, order, createdAt: now, updatedAt: now };
  if (estimate > 0) data.estimate = estimate;
  if (parentId) data.parentId = parentId;
  return data;
}

// El id se genera en el teléfono, así funciona igual sin conexión
// (addDoc esperaría a que el servidor confirme).
// Devuelve { id, saved } — saved es la Promise de la escritura.
export function addCard(uid, boardId, card) {
  const ref = doc(cardsCol(uid, boardId));
  return { id: ref.id, saved: setDoc(ref, newCardData(card)) };
}

// Varias tarjetas en una sola escritura (ej. subtareas).
export function addCards(uid, boardId, list) {
  const batch = writeBatch(db);
  list.forEach((card) => batch.set(doc(cardsCol(uid, boardId)), newCardData(card)));
  return batch.commit();
}

export function updateCard(uid, boardId, cardId, changes) {
  const data = { ...changes, updatedAt: Date.now() };
  // Estimado en 0 = quitar el campo.
  if ("estimate" in data && !(data.estimate > 0)) data.estimate = deleteField();
  return updateDoc(cardRef(uid, boardId, cardId), data);
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
