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

/** Bloque les URL pointant vers des réseaux internes (anti-SSRF). */
function isSafeUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^0\./.test(host) ||
    host === "[::1]" ||
    host.startsWith("[fc") ||
    host.startsWith("[fd") ||
    host.startsWith("[fe80")
  ) {
    return null;
  }
  return url;
}

/**
 * POST /api/convert-url
 * JSON : { imageUrl, format, quality }
 * Télécharge l'image puis renvoie le binaire converti.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { imageUrl?: string; format?: string; quality?: number }
      | null;

    const url = body?.imageUrl ? isSafeUrl(body.imageUrl.trim()) : null;
    if (!url) {
      return NextResponse.json({ error: "URL invalide (http/https uniquement)." }, { status: 400 });
    }
    if (!isOutputFormat(body?.format)) {
      return NextResponse.json({ error: "Format de sortie non supporté." }, { status: 400 });
    }
    const format = body.format;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { Accept: "image/*,*/*;q=0.8", "User-Agent": "next-converter/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Téléchargement impossible (HTTP ${response.status}).` },
        { status: 502 }
      );
    }

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Image distante trop volumineuse." }, { status: 413 });
    }
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length === 0) {
      return NextResponse.json({ error: "L'URL ne renvoie aucune donnée." }, { status: 502 });
    }
    if (input.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Image distante trop volumineuse." }, { status: 413 });
    }

    const output = await convertImageBuffer(input, format, {
      quality: Number.isFinite(body.quality) ? Number(body.quality) : 82,
    });

    const name = outputFileName(url.pathname || "image", format);

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
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("[convert-url] échec :", error);
    return NextResponse.json(
      { error: aborted ? "Délai de téléchargement dépassé." : "La conversion depuis l'URL a échoué." },
      { status: aborted ? 504 : 500 }
    );
  }
}
