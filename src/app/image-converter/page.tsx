import type { Metadata } from "next";
import ImageConverter from "@/components/ImageConverter";
import { TOOLS } from "@/lib/site";

const tool = TOOLS[0];

export const metadata: Metadata = {
  title: "Convertisseur d'images en ligne — WebP, JPG, PNG, AVIF, GIF",
  description: tool.description,
  keywords: [...tool.keywords],
  alternates: { canonical: tool.href },
  openGraph: { title: tool.title, description: tool.description, url: tool.href },
};

export default function ImageConverterPage() {
  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">Images</span>
        <h1>Convertisseur d&apos;images</h1>
        <p>{tool.description}</p>
      </header>
      <ImageConverter />
    </div>
  );
}
