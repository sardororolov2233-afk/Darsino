export const MATERIAL_LIMIT = 20 * 1024 * 1024;
export const materialMimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp4: "video/mp4",
  webm: "video/webm",
};
export function validateMaterial(
  name: string,
  size: number,
  mimeType?: string | null,
) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const mime =
    mimeType && mimeType !== "application/octet-stream"
      ? mimeType.toLowerCase()
      : materialMimeTypes[extension];
  if (!mime || !Object.values(materialMimeTypes).includes(mime))
    throw new Error("PDF, Office hujjati, rasm, MP4 yoki WebM tanlang.");
  if (!Number.isFinite(size) || size <= 0 || size > MATERIAL_LIMIT)
    throw new Error("Fayl hajmi 1 baytdan 20 MB gacha bo‘lsin.");
  return mime;
}
