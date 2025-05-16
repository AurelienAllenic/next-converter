import { NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  console.log("===== 📁 Dossier Conversion Start =====");
  console.log("[LOG] PID:", process.pid);
  console.log("[LOG] Memory (initial):", process.memoryUsage());

  try {
    const formData = await req.formData();
    const files = formData.getAll("images");
    const formatInput = (formData.get("format") as string) || "webp";

    if (files.length === 0) {
      console.error("[ERROR] Aucun fichier reçu");
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }

    const validFormats = ["webp", "jpg", "png", "gif"] as const;
    type ValidFormat = typeof validFormats[number];
    if (!validFormats.includes(formatInput as ValidFormat)) {
      console.error("[ERROR] Format non supporté:", formatInput);
      return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
    }

    const format: keyof sharp.FormatEnum = formatInput === "jpg" ? "jpeg" : formatInput;

    const outputDir = path.join(process.cwd(), "public", "converted-images");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    } else {
      const existingFiles = await readdir(outputDir);
      for (const fileName of existingFiles) {
        await unlink(path.join(outputDir, fileName));
      }
      console.log("[LOG] 🧹 Dossier vidé");
    }

    const outputFiles: { path: string; name: string }[] = [];

    for (const file of files) {
      if (!(file instanceof Blob)) {
        console.warn("[WARN] Fichier ignoré (type invalide)");
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        console.warn("[WARN] Fichier ignoré (trop volumineux):", file.size);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const sharpInstance = sharp(buffer, { failOn: "none" });

      const originalName = (file as any).name || `image-${Date.now()}`;
      const baseName = path.parse(originalName).name;
      const outputFilename = `${baseName}.${format}`;
      const outputPath = path.join(outputDir, outputFilename);

      const outputBuffer = await sharpInstance.toFormat(format, { quality: 80 }).toBuffer();
      await writeFile(outputPath, outputBuffer);

      outputFiles.push({
        path: `/converted-images/${outputFilename}`,
        name: outputFilename,
      });
    }

    console.log("[LOG] ✅ Conversion terminée pour", outputFiles.length, "fichiers");
    console.log("[LOG] Memory (final):", process.memoryUsage());
    console.log("===== 📁 Dossier Conversion End =====");

    return NextResponse.json({
      message: "Conversion réussie",
      files: outputFiles,
    });
  } catch (error) {
    console.error("[ERROR] Échec de la conversion dossier:", error);
    return NextResponse.json(
      {
        error: "Échec de la conversion dossier",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
