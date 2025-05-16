import { NextResponse } from "next/server";
import archiver from "archiver";
import { promises as fs } from "fs";
import path from "path";

const OUTPUT_FOLDER = path.join(process.cwd(), "public", "converted-images");
const UPLOADS_FOLDER = path.join(process.cwd(), "public", "uploads");

export async function GET() {
  try {
    // Create ZIP archive
    const zipName = "converted_images.zip";
    const archive = archiver("zip", { zlib: { level: 9 } });

    // Set response headers
    const response = new NextResponse(archive as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${zipName}`,
      },
    });

    // Add files to ZIP
    const outputFiles = await fs.readdir(OUTPUT_FOLDER);
    for (const file of outputFiles) {
      const filePath = path.join(OUTPUT_FOLDER, file);
      archive.file(filePath, { name: file });
    }

    const uploadFiles = await fs.readdir(UPLOADS_FOLDER);
    for (const file of uploadFiles) {
      const filePath = path.join(UPLOADS_FOLDER, file);
      archive.file(filePath, { name: `originals/${file}` });
    }

    // Finalize archive
    archive.finalize();

    // Clean up files after ZIP is sent
    archive.on("end", async () => {
      try {
        // Clean OUTPUT_FOLDER
        const outputFiles = await fs.readdir(OUTPUT_FOLDER);
        for (const file of outputFiles) {
          await fs.unlink(path.join(OUTPUT_FOLDER, file));
        }

        // Clean UPLOADS_FOLDER
        const uploadFiles = await fs.readdir(UPLOADS_FOLDER);
        for (const file of uploadFiles) {
          await fs.unlink(path.join(UPLOADS_FOLDER, file));
        }

        console.log("✅ Fichiers temporaires supprimés après ZIP.");
      } catch (error) {
        console.error("⚠️ Erreur lors de la suppression des fichiers temporaires :", error);
      }
    });

    return response;
  } catch (error) {
    console.error("❌ Erreur lors de la création du ZIP :", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}