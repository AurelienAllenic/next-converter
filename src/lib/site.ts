export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Next Converter";
export const SITE_DESCRIPTION =
  "Outils web gratuits : convertisseur d'images (WebP, JPG, PNG, AVIF, GIF, TIFF), générateur de QR code personnalisé et conversion vidéo en GIF. Rapide, sans inscription.";

export const TOOLS = [
  {
    href: "/image-converter",
    title: "Convertisseur d'images",
    short: "Images",
    description:
      "Convertis plusieurs images à la fois vers WebP, JPG, PNG, AVIF, GIF ou TIFF, avec contrôle de la qualité et export ZIP.",
    keywords: ["convertir image", "webp", "jpg en png", "png en webp", "avif", "compresser image"],
  },
  {
    href: "/qr-code-generator",
    title: "Générateur de QR code",
    short: "QR code",
    description:
      "Génère un QR code haute résolution avec tes couleurs et ton logo au centre, puis télécharge-le en PNG.",
    keywords: ["qr code", "générateur qr code", "qr code logo", "qr code personnalisé"],
  },
  {
    href: "/video-to-gif",
    title: "Vidéo vers GIF",
    short: "Vidéo → GIF",
    description:
      "Transforme une vidéo en GIF animé directement dans ton navigateur : vitesse, fréquence d'images et largeur réglables, rien n'est envoyé sur un serveur.",
    keywords: ["video en gif", "mp4 en gif", "convertir vidéo gif", "créer gif"],
  },
] as const;
