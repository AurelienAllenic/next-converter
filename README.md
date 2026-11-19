# Next Converter

Suite d'outils de conversion en ligne, gratuite et sans inscription :

- **Convertisseur d'images** — JPG, PNG, WebP, GIF, AVIF, TIFF, SVG, HEIC → WebP / JPG / PNG / AVIF / GIF / TIFF. Par lot, drag & drop, réglage de qualité, conversion depuis une URL, export ZIP. Le nom d'origine est conservé (`photo.png` → `photo.webp`).
- **Générateur de QR code** — jusqu'à 4096 px, couleurs, logo centré avec arrondi, export PNG.
- **Vidéo → GIF** — découpe, vitesse, fps, largeur, palette optimisée. Tourne 100 % dans le navigateur (FFmpeg WebAssembly).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Sass modules · sharp · @ffmpeg/ffmpeg · qrcode.react · JSZip

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
npm run lint
```

Copie `.env.example` en `.env.local` et renseigne `NEXT_PUBLIC_SITE_URL` (facultatif en local).

## Architecture

```
src/
  app/
    api/convert/        POST multipart (1 image) → binaire converti + nom correct
    api/convert-url/    POST JSON { imageUrl, format, quality } → binaire converti
    image-converter/    page + metadata
    qr-code-generator/
    video-to-gif/
    layout.tsx          fonts, header/footer, metadata globales, JSON-LD
    robots.ts           robots.txt (bots IA autorisés)
    sitemap.ts, manifest.ts, opengraph-image.tsx
    icon.svg, favicon.ico, apple-icon.png
  components/           UI (client) + styles .module.scss
  lib/
    formats.ts          formats de sortie, limites, nommage des fichiers
    convertImage.ts     conversion sharp en mémoire
    download.ts         helpers téléchargement / taille
    site.ts             nom, description, liste des outils (SEO)
public/llms.txt         description du site pour les assistants IA
```

### Pourquoi « un fichier par requête » ?

Les anciennes routes écrivaient dans `/tmp` ou `public/` puis zippaient côté serveur : ça ne marche pas en serverless (chaque invocation peut tomber sur une instance différente, `public/` est en lecture seule) et tous les fichiers finissaient avec le même nom.
Désormais chaque image est convertie en mémoire et renvoyée directement avec son nom (`Content-Disposition` + header `X-File-Name`), le client lance jusqu'à 3 conversions en parallèle et fabrique le ZIP lui-même avec JSZip. Aucun état serveur.

## Déploiement Vercel

1. Importer le repo sur Vercel (framework détecté automatiquement).
2. Variables d'environnement : `NEXT_PUBLIC_SITE_URL` (optionnel, sinon déduite de l'URL de production).
3. `vercel.json` fixe la région `cdg1` (Paris), 1 Go de mémoire et 30 s max pour les routes API.

Limites à connaître : le body d'une requête serverless est plafonné à ~4,5 Mo, d'où la limite de 4 Mo par image (`MAX_FILE_BYTES`). La conversion vidéo n'est pas concernée (locale).

## SEO / indexation IA

- Metadata complètes (title template, description, OpenGraph, Twitter, canonical) par page.
- `robots.txt` autorise explicitement GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.
- `sitemap.xml`, `manifest.webmanifest`, image OpenGraph générée.
- JSON-LD `WebSite` + `WebApplication` pour chaque outil.
- `/llms.txt` décrit le site en Markdown pour les assistants.
