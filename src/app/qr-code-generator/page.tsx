import type { Metadata } from "next";
import QrCodeGenerator from "@/components/QrCodeGenerator";
import { TOOLS } from "@/lib/site";

const tool = TOOLS[1];

export const metadata: Metadata = {
  title: "Générateur de QR code personnalisé avec logo",
  description: tool.description,
  keywords: [...tool.keywords],
  alternates: { canonical: tool.href },
  openGraph: { title: tool.title, description: tool.description, url: tool.href },
};

export default function QrCodeGeneratorPage() {
  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">QR code</span>
        <h1>Générateur de QR code</h1>
        <p>{tool.description}</p>
      </header>
      <QrCodeGenerator />
    </div>
  );
}
