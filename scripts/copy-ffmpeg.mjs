// Copie la lib @ffmpeg/ffmpeg (ESM + worker) dans public/ffmpeg.
// Turbopack ne sait pas bundler le Worker dynamique de la lib : on la charge
// à l'exécution depuis /ffmpeg/index.js (voir VideoToGif.tsx).
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
const dest = join(root, "public", "ffmpeg");

if (!existsSync(src)) {
  console.warn("[copy-ffmpeg] @ffmpeg/ffmpeg introuvable, copie ignorée.");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true, filter: (p) => !p.endsWith(".d.ts") && !p.endsWith(".d.mts") });

const { version } = JSON.parse(readFileSync(join(root, "node_modules", "@ffmpeg", "ffmpeg", "package.json"), "utf8"));
writeFileSync(join(dest, "VERSION"), `${version}\n`);
console.log(`[copy-ffmpeg] @ffmpeg/ffmpeg ${version} → public/ffmpeg`);
