import { NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  console.log("----- Image Conversion Request Start -----");
  console.log("[LOG] PID:", process.pid);
  console.log("[LOG] Memory (initial):", process.memoryUsage());

  try {
    const formData = await req.formData();
    const files = formData.getAll("images");
    const formatInput = (formData.get("format") as string) || "webp";

    if (files.length === 0) {
      console.error("[ERROR] No file received");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const file = files[0];
    if (!(file instanceof Blob)) {
      console.error("[ERROR] Invalid file type");
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const validFormats = ["webp", "jpg", "png", "gif"] as const;
    type ValidFormat = typeof validFormats[number];
    if (!validFormats.includes(formatInput as ValidFormat)) {
      console.error("[ERROR] Unsupported format:", formatInput);
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    const format: keyof sharp.FormatEnum = formatInput === "jpg" ? "jpeg" : formatInput;

    if (file.size > 10 * 1024 * 1024) {
      console.error("[ERROR] File too large:", file.size);
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("[LOG] File received - size:", buffer.length);
    console.log("[LOG] Memory (before sharp):", process.memoryUsage());

    const sharpInstance = sharp(buffer, { failOn: "none" });
    const outputBuffer = await sharpInstance.toFormat(format, { quality: 80 }).toBuffer();
    console.log("[LOG] Image converted - buffer size:", outputBuffer.length);

    // 🔽 Nettoyage du dossier avant d’écrire le nouveau fichier
    const outputDir = path.join(process.cwd(), "public", "converted-images");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    } else {
      // Supprimer tous les fichiers existants dans le dossier
      const existingFiles = await readdir(outputDir);
      for (const fileName of existingFiles) {
        await unlink(path.join(outputDir, fileName));
      }
      console.log("[LOG] Dossier 'converted-images' vidé avant nouvelle conversion");
    }

    const outputPath = path.join(outputDir, `converted.${format}`);
    await writeFile(outputPath, outputBuffer);
    console.log(`[LOG] Saved file to disk: ${outputPath}`);

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": `image/${format}`,
        "Content-Disposition": `inline; filename="converted.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[ERROR] Image conversion failed:", error);
    return NextResponse.json(
      {
        error: "Image conversion failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    console.log("[LOG] Memory (final):", process.memoryUsage());
    console.log("----- Image Conversion Request End -----");
  }
}
