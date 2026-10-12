import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import s from "@/components/page.module.css";
import { nightSkyMilestones } from "@/data/site";

export const metadata: Metadata = { title: "Projects" };

export default function Projects() {
  return (
    <>
      <SiteHeader current="/projects/" />
      <main className={s.main}>
        <section className={s.hero}>
          <h1 className={s.title}>Projects</h1>
          <p className={s.lede}>
            Each project lives in its own public repository with tests, CI and signed images. All of them deploy the same
            way: a pull request to homelab-dev, and Argo CD syncs the cluster.
          </p>
        </section>

        <article aria-labelledby="ns" className={`card ${s.cardBody} ${s.section}`} style={{ padding: 36 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2 id="ns" style={{ fontSize: 36, fontStretch: "110%" }}>Night Sky Digest</h2>
            <span className={`${s.status} status-ok`}>● live at digest.takodana.dev</span>
          </div>
          <p style={{ fontSize: 18, maxWidth: 820 }}>
            Retrieval and a daily digest over 51,282 arXiv astrophysics abstracts. Hybrid search (pgvector plus Postgres full
            text, fused by reciprocal rank), evaluated on 80 queries in two languages, with citations an LLM can&apos;t invent
            and SLOs that page me.
          </p>
          <ol aria-label="Milestones" className={s.milestones}>
            {nightSkyMilestones.map((m) => (
              <li key={m.id} className={m.done ? undefined : s.next}>
                <span className={s.status} style={{ fontSize: 12, color: m.done ? "var(--ok)" : "var(--muted)" }}>
                  {m.id} · {m.done ? "done" : "next"}
                </span>
                {m.text}
              </li>
            ))}
          </ol>
          <div className={s.linkRow}>
            <Link href="/projects/night-sky-digest/">Case study →</Link>
            <a href="https://digest.takodana.dev">Live site</a>
            <a href="https://github.com/tmukh/night-sky-digest">Repository</a>
          </div>
        </article>

        <div className={s.grid}>
          <article aria-labelledby="hl" className={`card ${s.cardBody}`}>
            <span className={`${s.status} status-ok`}>● running</span>
            <h2 id="hl">homelab-dev</h2>
            <p>The platform everything runs on. k3s on a laptop&apos;s WSL2, changed only through Git.</p>
            <ul>
              <li>Argo CD app of apps, a shared Helm chart every app uses, PSS restricted</li>
              <li>Sealed Secrets, sealed off-cluster with the public cert</li>
              <li>CloudNativePG with WAL archiving, nightly backups and a tested restore</li>
              <li>Prometheus, Grafana, Alertmanager to Telegram, Loki</li>
              <li>Tailscale for private access, one Cloudflare Tunnel for public</li>
            </ul>
            <div className={s.linkRow}>
              <a href="https://github.com/tmukh/homelab-dev">Repository</a>
            </div>
          </article>
          <article aria-labelledby="at" className={`card ${s.cardBody}`}>
            <span className={`${s.status} status-ok`}>● running · private</span>
            <h2 id="at">application-tracker</h2>
            <p>
              How I run my own job search. A web app that tracks applications and classifies incoming mail with a local
              Ollama model. Private for now: authentication comes before it goes public.
            </p>
            <div className={s.linkRow}>
              <a href="https://github.com/tmukh/application-tracker">Repository</a>
            </div>
          </article>
          <article id="sideout" aria-labelledby="so" className={`card ${s.cardBody} ${s.planned}`}>
            <span className={s.status} style={{ color: "var(--muted)" }}>○ planned</span>
            <h2 id="so">Sideout</h2>
            <p>
              Ask questions about volleyball matches in plain language and get answers computed by SQL over real DataVolley
              scouting files plus a labelled synthetic season.
            </p>
            <ul>
              <li>Text-to-SQL with an execution-accuracy eval in CI</li>
              <li>Read-only role, statement timeout, query allow-list</li>
              <li>Same shared chart as Night Sky Digest</li>
            </ul>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
