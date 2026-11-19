"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IoMenu, IoClose } from "react-icons/io5";
import { SITE_NAME, TOOLS } from "@/lib/site";
import Logo from "./Logo";
import styles from "./header.module.scss";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <Logo size={28} />
          <span>{SITE_NAME}</span>
        </Link>

        <nav className={`${styles.nav} ${open ? styles.open : ""}`} aria-label="Outils">
          {TOOLS.map((tool) => {
            const active = pathname === tool.href;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {tool.short}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className={styles.burger}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <IoClose /> : <IoMenu />}
        </button>
      </div>
    </header>
  );
}
