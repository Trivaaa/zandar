import { FEEDBACK_LIMITS } from "@zandar/shared-types";

/** Duža strana poslije smanjenja — snimak ekrana ostaje čitljiv, a fajl mali. */
export const IMAGE_MAX_SIDE = 1600;

/** Base64 dužina → bajtovi (približno, bez zaglavlja data-URL-a). */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.length - comma - 1 : dataUrl.length;
  return Math.floor((b64 * 3) / 4);
}

/** Dimenzije unutar `max` uz očuvan odnos; manja slika se ne uvećava. */
export function fitWithin(width: number, height: number, max: number = IMAGE_MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_decode"));
    };
    img.src = url;
  });
}

/**
 * Slika iz galerije → JPEG data-URL ≤ `IMAGE_MAX_SIDE`. Fotografija od 5 MB
 * postane ~200 KB, pa tri priloga staju u jedan zahtjev i na slaboj mreži.
 * Baca kad pregledač ne može da je pročita (npr. HEIC na webu).
 */
export async function compressImage(file: File): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // JPEG nema providnost: providni PNG bi dobio crnu pozadinu.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  for (const quality of [0.8, 0.6, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(url) <= FEEDBACK_LIMITS.imageBytesMax) return url;
  }
  throw new Error("image_too_big");
}
