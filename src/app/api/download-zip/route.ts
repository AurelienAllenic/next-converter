import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const OUTPUT_FOLDER = path.join("/tmp", "converted-images");

export async function GET() {
  try {
    // Vérifie ou crée le dossier temporaire
    await fs.mkdir(OUTPUT_FOLDER, { recursive: true });

    const files = await fs.readdir(OUTPUT_FOLDER);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier à zipper." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (const filename of files) {
      const filePath = path.join(OUTPUT_FOLDER, filename);
      const fileData = await fs.readFile(filePath);
      zip.file(filename, fileData);
    }

    const zipBlob = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="converted_images.zip"`,
      },
    });
  } catch (err) {
    console.error("Erreur ZIP :", err);
    return NextResponse.json(
      { error: "Erreur lors de la création du ZIP." },
      { status: 500 }
    );
  }
}
