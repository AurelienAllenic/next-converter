import Link from "next/link";
import { SITE_NAME, TOOLS } from "@/lib/site";
import styles from "./footer.module.scss";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.copy}>
          © {new Date().getFullYear()} {SITE_NAME} · par{" "}
          <a href="https://aurelienallenic.fr" target="_blank" rel="noopener noreferrer">
            Aurélien Allenic
          </a>
        </p>
        <nav className={styles.links} aria-label="Pied de page">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              {tool.title}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
