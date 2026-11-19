import styles from "./spinner.module.scss";

interface SpinnerProps {
  size?: number;
  label?: string;
  className?: string;
}

export default function Spinner({ size = 20, label, className = "" }: SpinnerProps) {
  return (
    <span className={`${styles.wrap} ${className}`} role="status" aria-live="polite">
      <span className={styles.ring} style={{ width: size, height: size, borderWidth: Math.max(2, size / 9) }} />
      {label ? <span className={styles.label}>{label}</span> : <span className="visually-hidden">Chargement</span>}
    </span>
  );
}

/** Barre de progression fine, 0–100. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label}>
      <div className={styles.progressFill} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Loader plein écran de section (ex. chargement de FFmpeg). */
export function BlockLoader({ label }: { label: string }) {
  return (
    <div className={styles.block}>
      <Spinner size={34} />
      <p>{label}</p>
    </div>
  );
}
