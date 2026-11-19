"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IoCloudUploadOutline,
  IoClose,
  IoDownloadOutline,
  IoArchiveOutline,
  IoRefresh,
  IoLinkOutline,
  IoCheckmarkCircle,
  IoAlertCircle,
} from "react-icons/io5";
import Spinner, { ProgressBar } from "./Spinner";
import {
  ACCEPTED_INPUT_MIME,
  MAX_FILE_BYTES,
  OUTPUT_FORMATS,
  OUTPUT_FORMAT_KEYS,
  outputFileName,
  type OutputFormat,
} from "@/lib/formats";
import { downloadBlob, fileNameFromResponse, formatBytes } from "@/lib/download";
import styles from "./imageConverter.module.scss";

type Status = "pending" | "converting" | "done" | "error";

interface Item {
  id: string;
  file: File;
  previewUrl: string;
  status: Status;
  error?: string;
  result?: { blob: Blob; name: string; url: string };
}

const CONCURRENCY = 3;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ImageConverter() {
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(82);
  const [imageUrl, setImageUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const busy = items.some((i) => i.status === "converting");
  const done = items.filter((i) => i.status === "done");
  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;
  const progress = items.length ? (done.length / items.length) * 100 : 0;
  const supportsQuality = format !== "gif";

  // libère les object URLs au démontage
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => {
        URL.revokeObjectURL(i.previewUrl);
        if (i.result) URL.revokeObjectURL(i.result.url);
      });
    };
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    setGlobalError("");
    const next: Item[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        rejected.push(`${file.name} (pas une image)`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (> ${formatBytes(MAX_FILE_BYTES)})`);
        continue;
      }
      next.push({ id: uid(), file, previewUrl: URL.createObjectURL(file), status: "pending" });
    }
    if (rejected.length) setGlobalError(`Fichiers ignorés : ${rejected.join(", ")}`);
    if (next.length) setItems((prev) => [...prev, ...next]);
  }, []);

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const removeItem = (id: string) =>
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.result) URL.revokeObjectURL(target.result.url);
      }
      return prev.filter((i) => i.id !== id);
    });

  const reset = () => {
    items.forEach((i) => {
      URL.revokeObjectURL(i.previewUrl);
      if (i.result) URL.revokeObjectURL(i.result.url);
    });
    setItems([]);
    setGlobalError("");
    setImageUrl("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const convertOne = async (item: Item) => {
    updateItem(item.id, { status: "converting", error: undefined, result: undefined });
    try {
      const fd = new FormData();
      fd.append("image", item.file);
      fd.append("format", format);
      fd.append("quality", String(quality));
      const res = await fetch("/api/convert", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `Erreur serveur (${res.status})`);
      }
      const blob = await res.blob();
      const name = fileNameFromResponse(res, outputFileName(item.file.name, format));
      updateItem(item.id, { status: "done", result: { blob, name, url: URL.createObjectURL(blob) } });
    } catch (err) {
      updateItem(item.id, { status: "error", error: (err as Error).message });
    }
  };

  const convertAll = async () => {
    setGlobalError("");
    const queue = itemsRef.current.filter((i) => i.status === "pending" || i.status === "error");
    if (!queue.length) return;
    // petit pool de requêtes parallèles
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (next) await convertOne(next);
      }
    });
    await Promise.all(workers);
  };

  const convertFromUrl = async () => {
    const url = imageUrl.trim();
    if (!url) {
      setGlobalError("Entre une URL d'image.");
      return;
    }
    setGlobalError("");
    setUrlBusy(true);
    try {
      const res = await fetch("/api/convert-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, format, quality }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `Erreur serveur (${res.status})`);
      }
      const blob = await res.blob();
      const name = fileNameFromResponse(res, outputFileName(url, format));
      const pseudoFile = new File([blob], name, { type: blob.type });
      const resultUrl = URL.createObjectURL(blob);
      setItems((prev) => [
        ...prev,
        {
          id: uid(),
          file: pseudoFile,
          previewUrl: resultUrl,
          status: "done",
          result: { blob, name, url: resultUrl },
        },
      ]);
      setImageUrl("");
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setUrlBusy(false);
    }
  };

  const downloadZip = async () => {
    if (!done.length) return;
    setZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const used = new Set<string>();
      for (const item of done) {
        if (!item.result) continue;
        // évite les collisions de noms dans le zip
        let name = item.result.name;
        let n = 1;
        while (used.has(name)) {
          const dot = item.result.name.lastIndexOf(".");
          name = `${item.result.name.slice(0, dot)}-${n++}${item.result.name.slice(dot)}`;
        }
        used.add(name);
        zip.file(name, item.result.blob);
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      downloadBlob(blob, `images-${OUTPUT_FORMATS[format].ext}-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      setGlobalError(`Impossible de créer le ZIP : ${(err as Error).message}`);
    } finally {
      setZipping(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const accept = useMemo(() => ACCEPTED_INPUT_MIME.join(","), []);
  const totalIn = items.reduce((s, i) => s + i.file.size, 0);
  const totalOut = done.reduce((s, i) => s + (i.result?.blob.size ?? 0), 0);

  return (
    <div className={styles.layout}>
      {/* ---------- Colonne gauche : options ---------- */}
      <aside className={`card ${styles.options}`}>
        <div className="field">
          <label htmlFor="format">Format de sortie</label>
          <select
            id="format"
            className="select"
            value={format}
            onChange={(e) => setFormat(e.target.value as OutputFormat)}
            disabled={busy}
          >
            {OUTPUT_FORMAT_KEYS.map((key) => (
              <option key={key} value={key}>
                {OUTPUT_FORMATS[key].label} (.{OUTPUT_FORMATS[key].ext})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <div className={styles.rangeHead}>
            <label htmlFor="quality">Qualité</label>
            <span className="badge">{supportsQuality ? `${quality} %` : "n/a"}</span>
          </div>
          <input
            id="quality"
            type="range"
            className="range"
            min={1}
            max={100}
            value={quality}
            disabled={!supportsQuality || busy}
            style={{ "--range-progress": `${quality}%` } as React.CSSProperties}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
          <p className="hint">
            {supportsQuality
              ? "80–85 % offre le meilleur rapport poids / qualité."
              : "Le GIF n'a pas de réglage de qualité."}
          </p>
        </div>

        <div className={styles.divider} />

        <div className="field">
          <label htmlFor="url">
            <IoLinkOutline /> Depuis une URL
          </label>
          <input
            id="url"
            type="url"
            className="input"
            placeholder="https://exemple.com/image.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && convertFromUrl()}
            disabled={urlBusy}
          />
          <button type="button" className="btn btn-secondary btn-block" onClick={convertFromUrl} disabled={urlBusy}>
            {urlBusy ? <Spinner size={16} /> : <IoRefresh />}
            {urlBusy ? "Conversion…" : "Convertir l'URL"}
          </button>
        </div>
      </aside>

      {/* ---------- Colonne droite : fichiers ---------- */}
      <section className={styles.main}>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="visually-hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            tabIndex={-1}
          />
          <IoCloudUploadOutline className={styles.dropIcon} />
          <p className={styles.dropTitle}>Glisse tes images ici ou clique pour choisir</p>
          <p className="hint">
            JPG, PNG, WebP, GIF, AVIF, TIFF, SVG, HEIC · max {formatBytes(MAX_FILE_BYTES)} par fichier
          </p>
        </div>

        {globalError && (
          <div className="alert alert-error" role="alert">
            <IoAlertCircle size={18} />
            <span>{globalError}</span>
          </div>
        )}

        {items.length > 0 && (
          <div className={`card ${styles.list} fade-up`}>
            <div className={styles.listHead}>
              <div>
                <strong>
                  {items.length} fichier{items.length > 1 ? "s" : ""}
                </strong>
                <span className="hint">
                  {" "}
                  · {formatBytes(totalIn)}
                  {done.length > 0 && ` → ${formatBytes(totalOut)}`}
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>
                <IoClose /> Tout effacer
              </button>
            </div>

            {(busy || done.length > 0) && <ProgressBar value={progress} label="Progression" />}

            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item.id} className={styles.item} data-status={item.status}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob URL local */}
                  <img src={item.result?.url ?? item.previewUrl} alt="" className={styles.thumb} loading="lazy" />
                  <div className={styles.meta}>
                    <span className={styles.name} title={item.file.name}>
                      {item.result?.name ?? item.file.name}
                    </span>
                    <span className="hint">
                      {formatBytes(item.file.size)}
                      {item.result && (
                        <>
                          {" → "}
                          <span className={item.result.blob.size < item.file.size ? styles.gain : styles.loss}>
                            {formatBytes(item.result.blob.size)} (
                            {Math.round(((item.result.blob.size - item.file.size) / item.file.size) * 100)} %)
                          </span>
                        </>
                      )}
                      {item.error && <span className={styles.err}> · {item.error}</span>}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {item.status === "converting" && <Spinner size={18} />}
                    {item.status === "done" && item.result && (
                      <>
                        <IoCheckmarkCircle className={styles.ok} />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => downloadBlob(item.result!.blob, item.result!.name)}
                        >
                          <IoDownloadOutline /> Télécharger
                        </button>
                      </>
                    )}
                    {item.status === "error" && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => convertOne(item)}>
                        <IoRefresh /> Réessayer
                      </button>
                    )}
                    {item.status !== "converting" && (
                      <button
                        type="button"
                        className={`btn btn-ghost btn-sm ${styles.remove}`}
                        onClick={() => removeItem(item.id)}
                        aria-label="Retirer"
                      >
                        <IoClose />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className={styles.listFoot}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={convertAll}
                disabled={busy || pendingCount === 0}
              >
                {busy ? <Spinner size={16} /> : <IoRefresh />}
                {busy
                  ? "Conversion en cours…"
                  : pendingCount
                    ? `Convertir ${pendingCount} fichier${pendingCount > 1 ? "s" : ""} en ${OUTPUT_FORMATS[format].label}`
                    : "Tout est converti"}
              </button>
              {done.length > 1 && (
                <button type="button" className="btn btn-secondary" onClick={downloadZip} disabled={zipping || busy}>
                  {zipping ? <Spinner size={16} /> : <IoArchiveOutline />}
                  {zipping ? "Création du ZIP…" : `Télécharger le ZIP (${done.length})`}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
