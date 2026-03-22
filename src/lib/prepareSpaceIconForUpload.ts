import { readFileAsDataUrl } from "@/lib/readFileAsDataUrl";

/**
 * Re-encode as JPEG so uploads match `space_icons` bucket MIME allow-list and
 * stay well under typical size limits (phone photos are often huge / HEIC).
 */
export async function prepareSpaceIconForUpload(file: File): Promise<File> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = dataUrl;
  });

  const maxEdge = 512;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("Invalid image dimensions");

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image");

  ctx.drawImage(img, 0, 0, cw, ch);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.88));
  if (!blob) throw new Error("Could not encode image");

  return new File([blob], "space-icon.jpg", { type: "image/jpeg" });
}
