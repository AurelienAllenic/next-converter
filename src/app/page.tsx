import Link from "next/link";
import { IoImagesOutline, IoQrCodeOutline, IoFilmOutline, IoArrowForward } from "react-icons/io5";
import { TOOLS } from "@/lib/site";
import styles from "./home.module.scss";

const ICONS = [IoImagesOutline, IoQrCodeOutline, IoFilmOutline];

export default function Home() {
  return (
    <div className={`container page ${styles.home}`}>
      <section className={styles.hero}>
        <span className="eyebrow">Gratuit · sans inscription · sans watermark</span>
        <h1>
          Des outils de conversion <span className={styles.gradient}>simples et rapides</span>
        </h1>
        <p>
          Convertis tes images, génère des QR codes avec ton logo et transforme tes vidéos en GIF.
          Tout se passe dans ton navigateur ou en mémoire côté serveur : rien n&apos;est conservé.
        </p>
      </section>

      <section className={styles.grid} aria-label="Outils disponibles">
        {TOOLS.map((tool, i) => {
          const Icon = ICONS[i];
          return (
            <Link key={tool.href} href={tool.href} className={`card ${styles.tool}`}>
              <span className={styles.icon}>
                <Icon />
              </span>
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
              <span className={styles.cta}>
                Ouvrir l&apos;outil <IoArrowForward />
              </span>
            </Link>
          );
        })}
      </section>

      <section className={styles.features}>
        <div>
          <h3>Vie privée</h3>
          <p>Les fichiers sont traités à la volée et jamais stockés. Les GIF sont générés 100 % en local.</p>
        </div>
        <div>
          <h3>Qualité maîtrisée</h3>
          <p>Choix du format, de la qualité de compression, de la taille et des couleurs.</p>
        </div>
        <div>
          <h3>Par lot</h3>
          <p>Convertis plusieurs images d&apos;un coup et récupère le tout dans un ZIP.</p>
        </div>
      </section>
    </div>
  );
}
