"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { IoDownloadOutline, IoClose, IoImageOutline } from "react-icons/io5";
import { downloadBlob } from "@/lib/download";
import styles from "./qrcodegenerator.module.scss";

const PREVIEW_SIZE = 280;

/** Charge une image (data URL ou URL distante) en Promise. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image (CORS ou URL invalide)."));
    img.src = src;
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function QrCodeGenerator() {
  const [value, setValue] = useState("https://exemple.com");
  const [size, setSize] = useState(1024);
  const [fgColor, setFgColor] = useState("#0b0d12");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(true);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoScale, setLogoScale] = useState(0.22);
  const [logoRadius, setLogoRadius] = useState(12);
  const [logoPadding, setLogoPadding] = useState(true);
  const [error, setError] = useState("");
  const [logoVersion, setLogoVersion] = useState(0); // incrémenté quand le logo est chargé

  const sourceRef = useRef<HTMLCanvasElement>(null); // QR brut (caché) à la taille d'export
  const previewRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  const activeLogo = logoSrc || logoUrl.trim() || null;

  // précharge le logo dès qu'il change (les setState ne sont appelés qu'en callback async)
  useEffect(() => {
    let cancelled = false;
    logoImgRef.current = null;
    if (!activeLogo) return;
    loadImage(activeLogo)
      .then((img) => {
        if (cancelled) return;
        logoImgRef.current = img;
        setError("");
        setLogoVersion((v) => v + 1);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLogoVersion((v) => v + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLogo]);

  /** Compose QR + logo sur un canvas cible, à la taille donnée. */
  const compose = useCallback(
    (target: HTMLCanvasElement, targetSize: number) => {
      const source = sourceRef.current;
      if (!source) return;
      const ctx = target.getContext("2d");
      if (!ctx) return;

      target.width = targetSize;
      target.height = targetSize;
      ctx.imageSmoothingEnabled = targetSize < source.width; // lissage uniquement en réduction
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(source, 0, 0, targetSize, targetSize);

      const logo = logoImgRef.current;
      if (!logo) return;

      const box = targetSize * logoScale;
      const x = (targetSize - box) / 2;
      const y = (targetSize - box) / 2;
      const r = (logoRadius / 100) * box;

      if (logoPadding) {
        const pad = box * 0.08;
        roundedRectPath(ctx, x - pad, y - pad, box + pad * 2, box + pad * 2, r + pad);
        ctx.fillStyle = bgColor;
        ctx.fill();
      }

      // conserve le ratio du logo dans la zone carrée
      const ratio = logo.naturalWidth / logo.naturalHeight;
      let dw = box;
      let dh = box;
      if (ratio > 1) dh = box / ratio;
      else dw = box * ratio;
      const dx = x + (box - dw) / 2;
      const dy = y + (box - dh) / 2;

      ctx.save();
      roundedRectPath(ctx, dx, dy, dw, dh, r);
      ctx.clip();
      ctx.drawImage(logo, dx, dy, dw, dh);
      ctx.restore();
    },
    [logoScale, logoRadius, logoPadding, bgColor]
  );

  // re-dessine l'aperçu à chaque changement (après rendu du QR caché)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (previewRef.current) compose(previewRef.current, PREVIEW_SIZE);
    });
    return () => cancelAnimationFrame(id);
  }, [value, size, fgColor, bgColor, margin, logoVersion, compose]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setLogoSrc(reader.result as string);
      setLogoName(file.name);
      setLogoUrl("");
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setError("");
    setLogoSrc(null);
    setLogoName("");
    setLogoUrl("");
  };

  const download = () => {
    const out = document.createElement("canvas");
    compose(out, size);
    out.toBlob((blob) => {
      if (!blob) {
        setError("Export impossible (logo bloqué par CORS ?). Essaie avec un fichier local.");
        return;
      }
      const slug =
        value
          .replace(/^https?:\/\//, "")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "qrcode";
      downloadBlob(blob, `qr-${slug}.png`);
    }, "image/png");
  };

  return (
    <div className={styles.layout}>
      <div className={`card ${styles.form}`}>
        <div className="field">
          <label htmlFor="qr-value">Contenu (URL ou texte)</label>
          <textarea
            id="qr-value"
            className="textarea"
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://exemple.com"
          />
        </div>

        <div className={styles.row}>
          <div className="field">
            <label htmlFor="fg">Couleur du code</label>
            <input id="fg" type="color" className="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="bg">Couleur de fond</label>
            <input id="bg" type="color" className="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <div className={styles.rangeHead}>
            <label htmlFor="size">Taille d&apos;export</label>
            <span className="badge">{size} px</span>
          </div>
          <input
            id="size"
            type="range"
            className="range"
            min={256}
            max={4096}
            step={64}
            value={size}
            style={{ "--range-progress": `${((size - 256) / (4096 - 256)) * 100}%` } as React.CSSProperties}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>

        <label className={styles.check}>
          <input type="checkbox" checked={margin} onChange={(e) => setMargin(e.target.checked)} />
          Marge blanche autour du code (recommandé pour le scan)
        </label>

        <div className={styles.divider} />

        <div className="field">
          <span className="label">Logo au centre (optionnel)</span>
          <div className={styles.logoRow}>
            <label className="btn btn-secondary">
              <IoImageOutline /> {logoName ? "Changer le fichier" : "Choisir un fichier"}
              <input type="file" accept="image/*" className="visually-hidden" onChange={handleFile} />
            </label>
            {activeLogo && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearLogo}>
                <IoClose /> Retirer
              </button>
            )}
          </div>
          {logoName && <span className="hint">{logoName}</span>}
          <input
            type="url"
            className="input"
            placeholder="…ou URL d'une image"
            value={logoUrl}
            onChange={(e) => {
              setError("");
              setLogoUrl(e.target.value);
            }}
            disabled={!!logoSrc}
          />
        </div>

        {activeLogo && (
          <div className={`${styles.logoOptions} fade-up`}>
            <div className="field">
              <div className={styles.rangeHead}>
                <label htmlFor="logo-size">Taille du logo</label>
                <span className="badge">{Math.round(logoScale * 100)} %</span>
              </div>
              <input
                id="logo-size"
                type="range"
                className="range"
                min={0.1}
                max={0.3}
                step={0.01}
                value={logoScale}
                style={{ "--range-progress": `${((logoScale - 0.1) / 0.2) * 100}%` } as React.CSSProperties}
                onChange={(e) => setLogoScale(Number(e.target.value))}
              />
              <p className="hint">Au-delà de 25 % le code peut devenir illisible.</p>
            </div>
            <div className="field">
              <div className={styles.rangeHead}>
                <label htmlFor="logo-radius">Arrondi</label>
                <span className="badge">{logoRadius} %</span>
              </div>
              <input
                id="logo-radius"
                type="range"
                className="range"
                min={0}
                max={50}
                value={logoRadius}
                style={{ "--range-progress": `${logoRadius * 2}%` } as React.CSSProperties}
                onChange={(e) => setLogoRadius(Number(e.target.value))}
              />
            </div>
            <label className={styles.check}>
              <input type="checkbox" checked={logoPadding} onChange={(e) => setLogoPadding(e.target.checked)} />
              Fond derrière le logo
            </label>
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className={`card ${styles.preview}`}>
        <div className={styles.canvasWrap} style={{ background: bgColor }}>
          <canvas ref={previewRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} className={styles.canvas} aria-label="Aperçu du QR code" />
          <div className={styles.hidden} aria-hidden="true">
            <QRCodeCanvas
              ref={sourceRef}
              value={value || " "}
              size={size}
              fgColor={fgColor}
              bgColor={bgColor}
              level="H"
              marginSize={margin ? 2 : 0}
            />
          </div>
        </div>
        <p className="hint">
          Aperçu réduit · export en {size} × {size} px, correction d&apos;erreur niveau H
        </p>
        <button type="button" className="btn btn-primary btn-block" onClick={download} disabled={!value.trim()}>
          <IoDownloadOutline /> Télécharger en PNG
        </button>
      </div>
    </div>
  );
}
