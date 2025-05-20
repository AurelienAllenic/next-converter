import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./ClientProviders"; // nouveau composant client

export const metadata: Metadata = {
  title: "Image Converter",
  description: "Convert images to different formats",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
