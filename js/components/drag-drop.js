// ============================================================
// components/drag-drop.js
// Arrastrar tarjetas entre columnas con Pointer Events, para que
// funcione igual con mouse y con dedo (iOS / Android):
//   - Mouse: se arrastra al mover más de 5px con el botón presionado.
//   - Táctil: mantener presionada la tarjeta ~0.35s y luego arrastrar
//     (así deslizar el dedo sigue sirviendo para hacer scroll).
// No se usa la API HTML5 drag & drop porque en móviles es inconsistente.
//
// onDrop({ cardId, columnId, prevId, nextId }) se llama solo si la
// tarjeta cambió de lugar. prevId/nextId = tarjetas vecinas en destino.
// Devuelve { destroy, isDragging }.
// ============================================================

const LONG_PRESS_MS = 350;
const MOUSE_THRESHOLD = 5;
const TOUCH_TOLERANCE = 8;
const EDGE = 48;
const SCROLL_SPEED = 14;

export function enableDragDrop(root, { onDrop, onEnd }) {
  let pending = null;
  let drag = null;
  let suppressClick = false;

  function onPointerDown(e) {
    if (drag || pending || e.button !== 0) return;
    const card = e.target.closest(".card");
    if (!card || !root.contains(card)) return;
    if (e.target.closest("button")) return; // el botón › de la tarjeta no inicia arrastre

    pending = { card, pointerId: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType };
    if (e.pointerType !== "mouse") {
      pending.timer = setTimeout(() => startDrag(pending.x, pending.y), LONG_PRESS_MS);
      card.classList.add("pressing");
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  }

  function onPointerMove(e) {
    if (pending && e.pointerId === pending.pointerId && !drag) {
      const dist = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      if (pending.type === "mouse") {
        if (dist > MOUSE_THRESHOLD) startDrag(e.clientX, e.clientY);
      } else if (dist > TOUCH_TOLERANCE) {
        // El dedo se movió antes del long-press: es scroll, no arrastre.
        reset();
        return;
      } else {
        pending.x = e.clientX;
        pending.y = e.clientY;
      }
    }
    if (drag && e.pointerId === drag.pointerId) {
      drag.x = e.clientX;
      drag.y = e.clientY;
      positionGhost();
      updateTarget();
    }
  }

  function onPointerUp(e) {
    if (drag && e.pointerId === drag.pointerId) finishDrag(true);
    else reset();
  }

  function onPointerCancel() {
    if (drag) finishDrag(false);
    else reset();
  }

  // Mientras se arrastra con el dedo, evita que la página haga scroll.
  function onTouchMove(e) {
    if (drag) e.preventDefault();
  }

  // Evita que el arrastre termine abriendo la tarjeta como si fuera un tap.
  function onClickCapture(e) {
    if (suppressClick) {
      e.stopPropagation();
      e.preventDefault();
      suppressClick = false;
    }
  }

  // Evita el menú contextual de Android/escritorio sobre la tarjeta presionada.
  function onContextMenu(e) {
    if (pending || drag) e.preventDefault();
  }

  function startDrag(x, y) {
    const { card, pointerId } = pending;
    clearTimeout(pending.timer);
    card.classList.remove("pressing");
    pending = null;

    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add("card-ghost");
    ghost.style.width = `${rect.width}px`;
    document.body.appendChild(ghost);

    const placeholder = document.createElement("div");
    placeholder.className = "card-placeholder";
    placeholder.style.height = `${rect.height}px`;
    card.after(placeholder);
    card.classList.add("dragging");

    drag = {
      card,
      pointerId,
      ghost,
      placeholder,
      originList: card.parentElement,
      originPrev: siblingCard(card, "previousElementSibling"),
      originNext: siblingCard(card, "nextElementSibling"),
      dx: x - rect.left,
      dy: y - rect.top,
      x,
      y,
    };
    root.classList.add("is-dragging");
    document.body.classList.add("no-select");
    navigator.vibrate?.(10);
    positionGhost();
    autoScroll();
  }

  function positionGhost() {
    drag.ghost.style.transform = `translate(${drag.x - drag.dx}px, ${drag.y - drag.dy}px) rotate(2deg)`;
  }

  // Busca la columna bajo el dedo/mouse y mueve el hueco (placeholder) ahí.
  function updateTarget() {
    const el = document.elementFromPoint(drag.x, drag.y);
    // Si el puntero está en el espacio vacío bajo una columna, se usa la columna de esa X.
    const column =
      el?.closest(".column") ||
      [...root.querySelectorAll(".column")].find((c) => {
        const r = c.getBoundingClientRect();
        return drag.x >= r.left && drag.x <= r.right;
      });
    if (!column || !root.contains(column)) return;
    const list = column.querySelector(".column-cards");
    const cards = [...list.querySelectorAll(".card:not(.dragging)")];
    const before = cards.find((c) => {
      const r = c.getBoundingClientRect();
      return drag.y < r.top + r.height / 2;
    });
    if (before) {
      if (before.previousElementSibling !== drag.placeholder) list.insertBefore(drag.placeholder, before);
    } else if (list.lastElementChild !== drag.placeholder) {
      list.appendChild(drag.placeholder);
    }
  }

  // Si el puntero está cerca de un borde, desplaza el tablero o la columna.
  function autoScroll() {
    if (!drag) return;
    const r = root.getBoundingClientRect();
    let moved = false;
    if (drag.x < r.left + EDGE && root.scrollLeft > 0) {
      root.scrollLeft -= SCROLL_SPEED;
      moved = true;
    } else if (drag.x > r.right - EDGE && root.scrollLeft < root.scrollWidth - root.clientWidth) {
      root.scrollLeft += SCROLL_SPEED;
      moved = true;
    }
    const list = drag.placeholder.parentElement;
    if (list) {
      const lr = list.getBoundingClientRect();
      if (drag.y < lr.top + EDGE && list.scrollTop > 0) {
        list.scrollTop -= SCROLL_SPEED;
        moved = true;
      } else if (drag.y > lr.bottom - EDGE && list.scrollTop < list.scrollHeight - list.clientHeight) {
        list.scrollTop += SCROLL_SPEED;
        moved = true;
      }
    }
    if (moved) updateTarget();
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function finishDrag(commit) {
    const { card, ghost, placeholder, originList, originPrev, originNext, raf } = drag;
    cancelAnimationFrame(raf);
    const list = placeholder.parentElement;
    const prev = siblingCard(placeholder, "previousElementSibling");
    const next = siblingCard(placeholder, "nextElementSibling");
    const changed = list !== originList || prev !== originPrev || next !== originNext;

    // Se deja la tarjeta donde cayó para que no "brinque" mientras llega el snapshot.
    if (commit && changed) placeholder.replaceWith(card);
    else placeholder.remove();
    card.classList.remove("dragging");
    ghost.remove();
    root.classList.remove("is-dragging");
    document.body.classList.remove("no-select");
    drag = null;
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    removeWindowListeners();

    if (commit && changed) {
      onDrop({
        cardId: card.dataset.cardId,
        columnId: list.dataset.columnId,
        prevId: prev?.dataset.cardId || null,
        nextId: next?.dataset.cardId || null,
      });
    }
    onEnd?.();
  }

  function reset() {
    if (pending) {
      clearTimeout(pending.timer);
      pending.card.classList.remove("pressing");
    }
    pending = null;
    removeWindowListeners();
  }

  function removeWindowListeners() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  }

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("touchmove", onTouchMove, { passive: false });

  return {
    isDragging: () => !!drag,
    destroy() {
      if (drag) finishDrag(false);
      reset();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("click", onClickCapture, true);
      root.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("touchmove", onTouchMove);
    },
  };
}

// Tarjeta vecina, saltando la que se arrastra y el hueco.
function siblingCard(el, dir) {
  let s = el[dir];
  while (s && (!s.classList.contains("card") || s.classList.contains("dragging"))) s = s[dir];
  return s;
}
