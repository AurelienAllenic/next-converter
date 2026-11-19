/**
 * Formats de sortie supportés par le convertisseur d'images.
 * Partagé entre le client (select) et le serveur (validation + sharp).
 */
export const OUTPUT_FORMATS = {
  webp: { label: "WebP", ext: "webp", mime: "image/webp", sharp: "webp" },
  jpg: { label: "JPG", ext: "jpg", mime: "image/jpeg", sharp: "jpeg" },
  png: { label: "PNG", ext: "png", mime: "image/png", sharp: "png" },
  avif: { label: "AVIF", ext: "avif", mime: "image/avif", sharp: "avif" },
  gif: { label: "GIF", ext: "gif", mime: "image/gif", sharp: "gif" },
  tiff: { label: "TIFF", ext: "tiff", mime: "image/tiff", sharp: "tiff" },
} as const;

export type OutputFormat = keyof typeof OUTPUT_FORMATS;

export const OUTPUT_FORMAT_KEYS = Object.keys(OUTPUT_FORMATS) as OutputFormat[];

export function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && value in OUTPUT_FORMATS;
}

/** Taille max d'un fichier envoyé (limite body Vercel ≈ 4,5 Mo par requête). */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Types MIME acceptés en entrée. */
export const ACCEPTED_INPUT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
  "image/svg+xml",
  "image/bmp",
  "image/heic",
  "image/heif",
];

/** Nettoie un nom de fichier pour l'utiliser dans un header / un téléchargement. */
export function sanitizeBaseName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "image";
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const clean = withoutExt
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return clean || "image";
}

export function outputFileName(originalName: string, format: OutputFormat): string {
  return `${sanitizeBaseName(originalName)}.${OUTPUT_FORMATS[format].ext}`;
}
