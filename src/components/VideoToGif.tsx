"use client";

import { useEffect, useRef, useState } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { IoCloudUploadOutline, IoDownloadOutline, IoClose, IoSparklesOutline, IoAlertCircle } from "react-icons/io5";
import Spinner, { BlockLoader, ProgressBar } from "./Spinner";
import { downloadBlob, formatBytes } from "@/lib/download";
import { sanitizeBaseName } from "@/lib/formats";
import styles from "./videotogif.module.scss";

const CORE_VERSION = "0.12.10";
const CORE_BASE =
  process.env.NEXT_PUBLIC_FFMPEG_CORE_BASE || `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
/** Lib @ffmpeg/ffmpeg servie depuis public/ (copiée au postinstall) : évite le bundling du Worker. */
const FFMPEG_LIB_URL = "/ffmpeg/index.js";
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type Phase = "idle" | "loading-engine" | "ready" | "converting" | "done";

export default function VideoToGif() {
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string } | null>(null);

  // options
  const [speed, setSpeed] = useState(1);
  const [fps, setFps] = useState(12);
  const [width, setWidth] = useState(480);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [hq, setHq] = useState(true);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (result) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEngine = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setPhase("loading-engine");
    const [lib, { toBlobURL }] = await Promise.all([
      import(/* webpackIgnore: true */ /* turbopackIgnore: true */ FFMPEG_LIB_URL) as Promise<typeof import("@ffmpeg/ffmpeg")>,
      import("@ffmpeg/util"),
    ]);
    const ffmpeg = new lib.FFmpeg();
    ffmpeg.on("progress", ({ progress: p }) => setProgress(Math.min(100, Math.max(0, p * 100))));
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const pickFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Choisis un fichier vidéo (MP4, WebM, MOV…).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Vidéo trop lourde (max ${formatBytes(MAX_VIDEO_BYTES)}).`);
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setVideo(file);
    setVideoUrl(URL.createObjectURL(file));
    setDuration(0);
    setStart(0);
    setEnd(0);
    setPhase("ready");
    setProgress(0);
  };

  const onMetadata = () => {
    const d = videoRef.current?.duration ?? 0;
    if (Number.isFinite(d) && d > 0) {
      setDuration(d);
      setEnd(Math.min(d, 10));
      const w = videoRef.current?.videoWidth ?? 480;
      setWidth(Math.min(480, w));
    }
  };

  const convert = async () => {
    if (!video) return;
    setError("");
    setProgress(0);
    try {
      const ffmpeg = await loadEngine();
      setPhase("converting");
      const { fetchFile } = await import("@ffmpeg/util");

      const ext = (video.name.split(".").pop() || "mp4").toLowerCase();
      const inputName = `input.${ext}`;
      const outputName = "output.gif";
      await ffmpeg.writeFile(inputName, await fetchFile(video));

      const clipLength = Math.max(0.1, (end || duration) - start);
      const filters = [
        `setpts=PTS/${speed}`,
        `fps=${fps}`,
        `scale=${width}:-2:flags=lanczos`,
      ];
      const vf = hq
        ? `${filters.join(",")},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`
        : filters.join(",");

      const args = ["-ss", start.toFixed(2), "-t", clipLength.toFixed(2), "-i", inputName, "-an"];
      args.push(hq ? "-filter_complex" : "-vf", vf, "-loop", "0", "-y", outputName);

      const code = await ffmpeg.exec(args);
      if (code !== 0) throw new Error(`FFmpeg a renvoyé le code ${code}.`);

      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], { type: "image/gif" });
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});

      if (result) URL.revokeObjectURL(result.url);
      setResult({ blob, url: URL.createObjectURL(blob), name: `${sanitizeBaseName(video.name)}.gif` });
      setProgress(100);
      setPhase("done");
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message?.includes("SharedArrayBuffer")
          ? "Ton navigateur ne supporte pas cette conversion."
          : `La conversion a échoué : ${(err as Error).message || "erreur inconnue"}`
      );
      setPhase("ready");
    }
  };

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (result) URL.revokeObjectURL(result.url);
    setVideo(null);
    setVideoUrl(null);
    setResult(null);
    setPhase("idle");
    setProgress(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = phase === "loading-engine" || phase === "converting";
  const clipLen = Math.max(0, (end || duration) - start);
  const estFrames = Math.round((clipLen / speed) * fps);

  return (
    <div className={styles.layout}>
      {!video && (
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <IoCloudUploadOutline className={styles.dropIcon} />
          <p className={styles.dropTitle}>Glisse une vidéo ici ou clique pour choisir</p>
          <p className="hint">MP4, WebM, MOV… · traitement 100 % local, rien n&apos;est envoyé</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <IoAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {video && videoUrl && (
        <div className={styles.grid}>
          <div className={`card ${styles.options}`}>
            <div className={styles.fileHead}>
              <div className={styles.fileMeta}>
                <strong title={video.name}>{video.name}</strong>
                <span className="hint">
                  {formatBytes(video.size)}
                  {duration > 0 && ` · ${duration.toFixed(1)} s`}
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>
                <IoClose /> Changer
              </button>
            </div>

            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              muted
              className={styles.video}
              onLoadedMetadata={onMetadata}
            />

            {duration > 0 && (
              <div className={styles.row}>
                <div className="field">
                  <label htmlFor="start">Début (s)</label>
                  <input
                    id="start"
                    type="number"
                    className="input"
                    min={0}
                    max={Math.max(0, end - 0.1)}
                    step={0.1}
                    value={start}
                    disabled={busy}
                    onChange={(e) => setStart(Math.max(0, Math.min(Number(e.target.value), end - 0.1)))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="end">Fin (s)</label>
                  <input
                    id="end"
                    type="number"
                    className="input"
                    min={start + 0.1}
                    max={duration}
                    step={0.1}
                    value={end}
                    disabled={busy}
                    onChange={(e) => setEnd(Math.min(duration, Math.max(Number(e.target.value), start + 0.1)))}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <div className={styles.rangeHead}>
                <label htmlFor="speed">Vitesse</label>
                <span className="badge">×{speed.toFixed(2)}</span>
              </div>
              <input
                id="speed"
                type="range"
                className="range"
                min={0.25}
                max={4}
                step={0.05}
                value={speed}
                disabled={busy}
                style={{ "--range-progress": `${((speed - 0.25) / 3.75) * 100}%` } as React.CSSProperties}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>

            <div className={styles.row}>
              <div className="field">
                <div className={styles.rangeHead}>
                  <label htmlFor="fps">Images / s</label>
                  <span className="badge">{fps}</span>
                </div>
                <input
                  id="fps"
                  type="range"
                  className="range"
                  min={5}
                  max={30}
                  value={fps}
                  disabled={busy}
                  style={{ "--range-progress": `${((fps - 5) / 25) * 100}%` } as React.CSSProperties}
                  onChange={(e) => setFps(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <div className={styles.rangeHead}>
                  <label htmlFor="width">Largeur</label>
                  <span className="badge">{width} px</span>
                </div>
                <input
                  id="width"
                  type="range"
                  className="range"
                  min={120}
                  max={1280}
                  step={10}
                  value={width}
                  disabled={busy}
                  style={{ "--range-progress": `${((width - 120) / 1160) * 100}%` } as React.CSSProperties}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </div>
            </div>

            <label className={styles.check}>
              <input type="checkbox" checked={hq} disabled={busy} onChange={(e) => setHq(e.target.checked)} />
              Palette optimisée (meilleures couleurs, un peu plus lent)
            </label>

            <p className="hint">
              ≈ {estFrames} images · {clipLen.toFixed(1)} s de vidéo → {(clipLen / speed).toFixed(1)} s de GIF
            </p>

            {phase === "converting" && (
              <div className={styles.progress}>
                <ProgressBar value={progress} label="Conversion" />
                <span className="hint">{Math.round(progress)} %</span>
              </div>
            )}

            <button type="button" className="btn btn-primary btn-block" onClick={convert} disabled={busy || duration === 0}>
              {busy ? <Spinner size={16} /> : <IoSparklesOutline />}
              {phase === "loading-engine"
                ? "Chargement du moteur…"
                : phase === "converting"
                  ? "Conversion…"
                  : result
                    ? "Reconvertir"
                    : "Convertir en GIF"}
            </button>
          </div>

          <div className={`card ${styles.output}`}>
            {phase === "loading-engine" && (
              <BlockLoader label="Téléchargement de FFmpeg (≈ 30 Mo, une seule fois)…" />
            )}
            {phase === "converting" && <BlockLoader label={`Génération du GIF… ${Math.round(progress)} %`} />}
            {phase === "ready" && !result && (
              <div className={styles.placeholder}>
                <p>Le GIF apparaîtra ici.</p>
              </div>
            )}
            {result && phase !== "converting" && phase !== "loading-engine" && (
              <div className={`${styles.result} fade-up`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URL local */}
                <img src={result.url} alt="GIF généré" className={styles.gif} />
                <div className={styles.resultMeta}>
                  <span className={styles.resultName}>{result.name}</span>
                  <span className="badge">{formatBytes(result.blob.size)}</span>
                </div>
                <button type="button" className="btn btn-primary btn-block" onClick={() => downloadBlob(result.blob, result.name)}>
                  <IoDownloadOutline /> Télécharger le GIF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
