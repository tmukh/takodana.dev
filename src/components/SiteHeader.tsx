import Link from "next/link";
import { contact } from "@/data/site";
import styles from "./SiteHeader.module.css";

const items = [
  { href: "/projects/", label: "Projects" },
  { href: "/writing/", label: "Writing" },
  { href: "/about/", label: "About" },
];

export function SiteNav({ dark = false, current }: { dark?: boolean; current?: string }) {
  return (
    <nav aria-label="Main" className={`${styles.nav} ${dark ? styles.dark : ""}`}>
      <Link href="/" className={styles.brand}>
        takodana<span className={styles.tld}>.dev</span>
      </Link>
      <div className={styles.links}>
        {items.map((i) => (
          <Link key={i.href} href={i.href} aria-current={current === i.href ? "page" : undefined} className={styles.link}>
            {i.label}
          </Link>
        ))}
        <a href={contact.github} className={styles.link}>
          GitHub
        </a>
      </div>
    </nav>
  );
}

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className={styles.header}>
      <SiteNav current={current} />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p>Tarik Abu Mukh · Berlin · served from my homelab, which may be asleep</p>
        <div className={styles.footerLinks}>
          <a href={contact.github}>GitHub</a>
          <a href={contact.linkedin}>LinkedIn</a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
      </div>
    </footer>
  );
}
