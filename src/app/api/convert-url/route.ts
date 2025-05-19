import { NextResponse } from "next/server";
import axios from "axios";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { readdirSync, unlinkSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_FOLDER = path.join("/tmp", "converted-images");

export async function POST(req: Request) {
  console.log("----- Image URL Conversion Start -----");
  console.log("[LOG] PID:", process.pid);
  console.log("[LOG] Memory (initial):", process.memoryUsage());

  try {
    const { imageUrl, format: formatInput } = await req.json();

    if (!imageUrl || !formatInput) {
      return NextResponse.json(
        { error: "URL et format requis" },
        { status: 400 }
      );
    }

    const validFormats = ["webp", "jpg", "png", "gif"] as const;
    type ValidFormat = (typeof validFormats)[number];

    if (!validFormats.includes(formatInput as ValidFormat)) {
      return NextResponse.json(
        { error: "Format non supporté" },
        { status: 400 }
      );
    }

    const format = formatInput === "jpg" ? "jpeg" : formatInput;

    // 🔽 Assurer que le dossier existe
    if (!fs.existsSync(OUTPUT_FOLDER)) {
      fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    } else {
      // 🔽 Vider le dossier existant
      const files = readdirSync(OUTPUT_FOLDER);
      for (const file of files) {
        unlinkSync(path.join(OUTPUT_FOLDER, file));
      }
      console.log(
        "[LOG] Dossier 'converted-images' vidé avant nouvelle conversion"
      );
    }

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024,
    });

    const buffer = Buffer.from(response.data);
    console.log("[LOG] Fichier téléchargé - taille:", buffer.length);
    console.log("[LOG] Memory (before sharp):", process.memoryUsage());

    const sharpInstance = sharp(buffer, { failOn: "none" });
    const outputBuffer = await sharpInstance
      .toFormat(format, { quality: 80 })
      .toBuffer();

    const fileName = path.basename(imageUrl).split("?")[0];
    const cleanFileName = path.parse(fileName).name;
    const outputPath = path.join(OUTPUT_FOLDER, `${cleanFileName}.${format}`);

    fs.writeFileSync(outputPath, outputBuffer);
    console.log("[LOG] Image convertie avec succès:", outputPath);

    return NextResponse.json({
      message: "Conversion réussie",
      file: `/converted-images/${cleanFileName}.${format}`,
    });
  } catch (error: any) {
    console.error("[ERROR] Conversion échouée:", error.message || error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: "Erreur lors du téléchargement de l'image" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  } finally {
    console.log("[LOG] Memory (final):", process.memoryUsage());
    console.log("----- Image URL Conversion End -----");
  }
}
