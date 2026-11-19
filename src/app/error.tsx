"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container page" style={{ textAlign: "center", maxWidth: 560 }}>
      <span className="eyebrow">Oups</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
        Une erreur est survenue
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>{error.message || "Erreur inattendue."}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}
