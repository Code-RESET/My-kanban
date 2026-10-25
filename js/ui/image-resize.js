// ============================================================
// ui/image-resize.js
// Convierte la foto elegida por el usuario en un ícono cuadrado:
// recorta al centro, la reduce a `size` px y la comprime en JPEG.
// Una foto de 5 MB del teléfono queda en ~20-40 KB.
// ============================================================

export async function fileToSquareDataUrl(file, size = 256) {
  if (!file?.type.startsWith("image/")) throw new Error("not-image");

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    // Fondo blanco: si la imagen es PNG con transparencia, JPEG la pondría negra.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("bad-image"));
    img.src = src;
  });
}
