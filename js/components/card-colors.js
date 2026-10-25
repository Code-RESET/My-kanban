// ============================================================
// components/card-colors.js
// Etiquetas de color para las tarjetas (colores de sistema iOS).
// Se guarda la "key" en Firestore, no el hex, para poder ajustar
// el tono en CSS sin migrar datos.
// ============================================================

export const CARD_COLORS = [
  { key: "", label: "Sin color" },
  { key: "red", label: "Rojo" },
  { key: "orange", label: "Naranja" },
  { key: "yellow", label: "Amarillo" },
  { key: "green", label: "Verde" },
  { key: "blue", label: "Azul" },
  { key: "purple", label: "Morado" },
];

export function isValidColor(key) {
  return CARD_COLORS.some((c) => c.key === key);
}
