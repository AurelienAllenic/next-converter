import { NextResponse } from "next/server";
import { convertImageBuffer } from "@/lib/convertImage";
import {
  MAX_FILE_BYTES,
  OUTPUT_FORMATS,
  isOutputFormat,
  outputFileName,
} from "@/lib/formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/convert
 * multipart/form-data : image (1 fichier), format, quality
 * Renvoie directement le binaire converti avec le bon nom de fichier.
 * Un fichier par requête : pas d'état serveur, pas de /tmp, 100 % compatible Vercel.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");
    const format = formData.get("format");
    const quality = Number(formData.get("quality") ?? 82);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }
    if (!isOutputFormat(format)) {
      return NextResponse.json({ error: "Format de sortie non supporté." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_BYTES / 1024 / 1024} Mo).` },
        { status: 413 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    const output = await convertImageBuffer(input, format, {
      quality: Number.isFinite(quality) ? quality : 82,
    });

    const name = outputFileName(file.name, format);

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": OUTPUT_FORMATS[format].mime,
        "Content-Length": String(output.length),
        "Content-Disposition": `attachment; filename="${name}"`,
        "X-File-Name": name,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[convert] échec :", error);
    return NextResponse.json(
      { error: "La conversion a échoué. Le fichier est peut-être corrompu ou dans un format non lisible." },
      { status: 500 }
    );
  }
}
