import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page" style={{ textAlign: "center", maxWidth: 560 }}>
      <span className="eyebrow">Erreur 404</span>
      <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>Page introuvable</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link href="/" className="btn btn-primary">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
