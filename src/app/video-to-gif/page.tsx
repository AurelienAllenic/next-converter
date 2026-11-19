import type { Metadata } from "next";
import VideoToGif from "@/components/VideoToGif";
import { TOOLS } from "@/lib/site";

const tool = TOOLS[2];

export const metadata: Metadata = {
  title: "Convertir une vidéo en GIF (MP4, WebM, MOV)",
  description: tool.description,
  keywords: [...tool.keywords],
  alternates: { canonical: tool.href },
  openGraph: { title: tool.title, description: tool.description, url: tool.href },
};

export default function VideoToGifPage() {
  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">Vidéo → GIF</span>
        <h1>Vidéo vers GIF</h1>
        <p>{tool.description}</p>
      </header>
      <VideoToGif />
    </div>
  );
}
