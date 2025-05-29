"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageConverter from "@/components/ImageConverter";
import QrCodeGenerator from "@/components/QrCodeGenerator";
import Link from "next/link";
import styles from './page.module.css'

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  console.log("Home - Session:", session, "Status:", status);

  useEffect(() => {
    console.log("useEffect - Status:", status, "Session:", session);
    if (status === "unauthenticated") {
      console.log("Redirection vers /login");
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    console.log("Affichage de l'écran de chargement");
    return <p>Chargement...</p>;
  }

  if (!session) {
    console.log("Aucune session, devrait rediriger");
    return null; // ou un message, on redirige juste
  }

  console.log("Rendu de ImageConverter");
  return (
    <div className={styles.container_options}>
      <Link href='/image-converter' >Image Converter</Link>
      <Link href='/qr-code-generator' >QrCodeGenerator</Link>
    </div>
  );
}
