import type { Marketplace, TutorInput } from "./domain";
export const CERTIFICATE_LIMIT = 10 * 1024 * 1024;
export const CERTIFICATE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export function normalizeTutorPhone(value: string) {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (/^\d{9}$/.test(phone)) phone = `+998${phone}`;
  else if (/^998\d{9}$/.test(phone)) phone = `+${phone}`;
  if (!/^\+[1-9]\d{8,14}$/.test(phone))
    throw new Error(
      "Telefon raqamingizni xalqaro shaklda kiriting. Masalan, +998901234567.",
    );
  return phone;
}
export function validateTutorApplication(input: TutorInput) {
  const phone = normalizeTutorPhone(input.contactPhone || "");
  if (!input.certificateFileId)
    throw new Error(
      "Sertifikatni PDF yoki rasm shaklida yuklang (10 MB gacha).",
    );
  return phone;
}
export function validateDemoTutorApplication(
  market: Marketplace,
  actorId: string,
  input: TutorInput,
) {
  const phone = validateTutorApplication(input);
  if (
    !market.files?.some(
      (f) =>
        f.id === input.certificateFileId &&
        f.ownerId === actorId &&
        f.purpose === "verification" &&
        f.state === "ready" &&
        CERTIFICATE_MIME_TYPES.includes(f.mimeType) &&
        f.sizeBytes > 0 &&
        f.sizeBytes <= CERTIFICATE_LIMIT,
    )
  )
    throw new Error(
      "Sertifikatni PDF yoki rasm shaklida yuklang (10 MB gacha).",
    );
  return phone;
}
