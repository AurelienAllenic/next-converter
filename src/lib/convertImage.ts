import sharp from "sharp";
import { OUTPUT_FORMATS, type OutputFormat } from "./formats";

export interface ConvertOptions {
  quality: number; // 1-100
}

/**
 * Convertit un buffer image vers le format demandé. Tout se passe en mémoire :
 * aucune écriture disque, donc compatible serverless (Vercel).
 */
export async function convertImageBuffer(
  input: Buffer,
  format: OutputFormat,
  { quality }: ConvertOptions
): Promise<Buffer> {
  const q = Math.min(100, Math.max(1, Math.round(quality)));
  const image = sharp(input, { failOn: "none", animated: format === "gif" || format === "webp" })
    .rotate(); // applique l'orientation EXIF

  switch (OUTPUT_FORMATS[format].sharp) {
    case "webp":
      return image.webp({ quality: q, effort: 4 }).toBuffer();
    case "jpeg":
      // aplatit la transparence sur fond blanc plutôt que noir
      return image.flatten({ background: "#ffffff" }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    case "png":
      return image.png({ compressionLevel: 9, quality: q, palette: q < 100 }).toBuffer();
    case "avif":
      return image.avif({ quality: q, effort: 4 }).toBuffer();
    case "gif":
      return image.gif().toBuffer();
    case "tiff":
      return image.tiff({ quality: q }).toBuffer();
  }
}
