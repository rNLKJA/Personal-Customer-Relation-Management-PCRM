import { MAX_PORTRAIT_BYTES } from "./avatar";

/**
 * Turn an image file into a small square portrait data URL (browser only).
 * The original stored uploaded files as Mongo Buffers; the revival keeps an
 * optional <=180 KB data URL instead and otherwise shows generated initials.
 */
export async function fileToPortraitDataUrl(file: File, size = 256): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) {
    throw new Error("Choose a PNG, JPEG or WebP image.");
  }
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot process images.");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.55]) {
    const url = canvas.toDataURL("image/webp", quality);
    const ok = url.startsWith("data:image/webp") ? url : canvas.toDataURL("image/jpeg", quality);
    if (ok.length <= (MAX_PORTRAIT_BYTES * 4) / 3) return ok;
  }
  throw new Error("That image is too large even after resizing.");
}
