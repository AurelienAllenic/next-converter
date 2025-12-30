"use client";

import Link from "next/link";
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.container_options}>
      <h2 style={{ color: "white", paddingBottom: "20px" }}>Next General tool</h2>
      <Link href='/image-converter'>Image Converter</Link>
      <Link href='/qr-code-generator'>QrCodeGenerator</Link>
      <Link href='/video-to-gif'>Video to GIF</Link>
    </div>
  );
}