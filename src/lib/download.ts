/** Déclenche le téléchargement d'un Blob avec le nom donné. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // laisse le temps au navigateur de démarrer le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

/** Lit le nom de fichier renvoyé par l'API (header X-File-Name ou Content-Disposition). */
export function fileNameFromResponse(res: Response, fallback: string): string {
  const direct = res.headers.get("X-File-Name");
  if (direct) return direct;
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}
