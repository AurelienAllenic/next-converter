import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const OUTPUT_FOLDER = path.join(process.cwd(), "public", "converted-images");
const UPLOADS_FOLDER = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  try {
    // Create folders if they don't exist
    await fs.mkdir(OUTPUT_FOLDER, { recursive: true });
    await fs.mkdir(UPLOADS_FOLDER, { recursive: true });

    // Parse form data
    const formData = await req.formData();
    const images = formData.getAll("images") as File[];
    const format = formData.get("format") as string;

    if (!images || images.length === 0 || !format) {
      return NextResponse.json({ error: "Images et format requis" }, { status: 400 });
    }

    const validFormats = ["webp", "jpg", "png", "gif"];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
    }

    // Clean OUTPUT_FOLDER before new conversions
    const existingFiles = await fs.readdir(OUTPUT_FOLDER);
    for (const file of existingFiles) {
      await fs.unlink(path.join(OUTPUT_FOLDER, file));
    }

    const convertedFiles: string[] = [];

    for (const image of images) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const fileName = image.name;
      const cleanFileName = path.parse(fileName).name;
      const outputFileName = `${cleanFileName}.${format}`;
      const outputPath = path.join(OUTPUT_FOLDER, outputFileName);

      // Save uploaded file temporarily
      const inputPath = path.join(UPLOADS_FOLDER, fileName);
      await fs.writeFile(inputPath, buffer);

      // Convert image
      await sharp(inputPath).toFormat(format as any).toFile(outputPath);

      convertedFiles.push(`/converted-images/${outputFileName}`);
    }

    return NextResponse.json(
      { message: "Conversion réussie", files: convertedFiles },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Erreur de conversion :", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}