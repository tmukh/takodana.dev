import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import s from "@/components/page.module.css";

export const metadata: Metadata = {
  title: "Night Sky Digest",
  description: "Case study: a retrieval system for astrophysics papers, evaluated before trusted and run like a service.",
};

const flow = [
  { when: "02:00 · CronJob", name: "Ingest", text: "OAI-PMH, 1 request / 3 s, resumable, idempotent upserts" },
  { when: "02:30 · CronJob", name: "Embed", text: "bge-m3 on my desktop's GPU, only new or changed papers" },
  { when: "CloudNativePG", name: "Postgres + pgvector", text: "papers, vectors, full-text index, digests; WAL archived" },
  { when: "06:00 · CronJob", name: "Digest", text: "local LLM per subfield; every cited ID checked" },
  { when: "Cloudflare Tunnel", name: "Website + API", text: "hybrid search, lexical fallback if the GPU box is off" },
];

const evalRows = [
  { q: "English (60)", k: "0.45", m: "0.69", h: "0.74", best: "h" },
  { q: "German (20)", k: "0.00", m: "0.67", h: "0.67", best: "h" },
  { q: "Contrarian (8)", k: "0.02", m: "0.49", h: "0.47", best: "m" },
  { q: "All (80)", k: "0.34", m: "0.69", h: "0.72", best: "h" },
];

const broke = [
  ["The first digest looked right and wasn't.", "23 of 79 \"new\" papers were revisions from 2024: arXiv's created date belongs to the latest version. New now means announced that day with a fresh ID."],
  ["LaTeX ate letters.", "The model copied \\textit into its JSON, where \\t is a tab. Abstracts are stripped of LaTeX before the model sees them."],
  ["The fix was in Git, the pod kept crashing.", "Langfuse's web pod ran out of JavaScript heap, and the first sync was stuck retrying, so Argo CD never picked up the fix until I ended it."],
  ["The first nightly backup died at part 19.", "The S3 store hit its memory limit mid-upload. WAL archiving was fine, which is why the restore drill still worked."],
  ["An alert caught my own process.", "A commit pushed after its PR was merged never reached main; the \"metrics missing\" alert fired. No more pushes to a PR once it's ready."],
];

export default function NightSky() {
  return (
    <>
      <SiteHeader current="/projects/" />
      <main className={s.main}>
        <section className={s.hero}>
          <Link href="/projects/" className={s.back}>
            ← Projects
          </Link>
          <h1 className={s.title}>Night Sky Digest</h1>
          <p className={s.lede}>
            New astrophysics papers every morning, summarised with citations that are checked, searchable in four
            languages. A retrieval system I evaluated before trusting it, and run like a production service on my own
            cluster.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingTop: 6 }}>
            <a className="button primary" href="https://digest.takodana.dev">
              Open the live site
            </a>
            <a className="button" href="https://github.com/tmukh/night-sky-digest">
              Repository
            </a>
          </div>
        </section>

        <dl className={s.stats}>
          <div><dt>abstracts indexed</dt><dd>51,282</dd></div>
          <div><dt>nDCG@10, hybrid, 80 queries</dt><dd>0.72</dd></div>
          <div><dt>human audit vs labels, κ</dt><dd>0.81</dd></div>
          <div><dt>warm search, end to end</dt><dd>~0.65 s</dd></div>
        </dl>

        <section aria-labelledby="arch" className={s.section}>
          <h2 id="arch" className={s.h2}>How it works</h2>
          <p className={s.sectionText}>
            Three nightly jobs and one API, all on k3s, deployed by Argo CD from a separate GitOps repository. The GPU work
            runs on my desktop over Tailscale.
          </p>
          <div className={s.flow}>
            {flow.map((f, i) => (
              <Fragment key={f.name}>
                {i > 0 && <span aria-hidden="true" className={s.arrow}>→</span>}
                <div className="card">
                  <small>{f.when}</small>
                  <strong>{f.name}</strong>
                  <span>{f.text}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        <section aria-labelledby="eval" className={`${s.section} ${s.split}`}>
          <div>
            <h2 id="eval" className={s.h2}>Evaluated before trusted</h2>
            <p className={s.sectionText}>
              80 queries, 60 English and 20 German, each with an intent that defines relevance. 1,971 pooled results were
              graded by two local models from different families; a third broke ties. I audited a random 30: 90% exact
              agreement, κ 0.81. A CI gate fails any change that drops recall@10 or nDCG@10 by more than two points.
            </p>
            <p className={s.sectionText}>
              The finding I didn&apos;t expect: full-text search scores zero on German and on contrarian questions, and drags
              hybrid search down there. That&apos;s the first experiment for M6.
            </p>
          </div>
          <div className={s.tableBox}>
            <table className={`${s.table} card`}>
              <caption>nDCG@10 by search mode</caption>
              <thead>
                <tr><th scope="col">Queries</th><th scope="col">Keyword</th><th scope="col">Meaning</th><th scope="col">Hybrid</th></tr>
              </thead>
              <tbody>
                {evalRows.map((r) => (
                  <tr key={r.q}>
                    <th scope="row">{r.q}</th>
                    <td>{r.k}</td>
                    <td className={r.best === "m" ? s.best : undefined}>{r.m}</td>
                    <td className={r.best === "h" ? s.best : undefined}>{r.h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="ops" className={s.section}>
          <h2 id="ops" className={s.h2}>Run like a service</h2>
          <p className={s.sectionText}>
            Alerts fire on what a reader would notice, not on every hiccup. Multiwindow burn-rate rules page my phone
            through Telegram.
          </p>
          <div className={s.grid}>
            {[
              ["SLO · freshness", "Digest ready by 07:00 on 99% of days", "Measured from the database, so short-lived jobs need no push gateway."],
              ["SLO · search", "99% without errors, p95 under 800 ms", "28-day windows; a minimum-traffic guard so two slow requests can't page."],
              ["backups", "Restored on purpose, 51,282 rows matched", "CloudNativePG base backups plus WAL, recovered into a throwaway cluster."],
              ["supply chain", "Signed images, SBOM, CVE gate", "Digest-pinned bases, Trivy, Syft, keyless cosign, verified before deploys."],
            ].map(([k, t, x]) => (
              <div key={k} className={`card ${s.cardBody}`} style={{ padding: 22, gap: 8 }}>
                <span className={s.status} style={{ fontSize: 12, color: "var(--muted)" }}>{k}</span>
                <strong style={{ fontSize: 18 }}>{t}</strong>
                <p style={{ fontSize: 14 }}>{x}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="broke" style={{ maxWidth: 860 }}>
          <h2 id="broke" className={s.h2}>What broke, and what it taught me</h2>
          <ul className={s.rows}>
            {broke.map(([head, text]) => (
              <li key={head} style={{ display: "block", padding: "18px 0" }}>
                <strong>{head}</strong> <span style={{ color: "var(--ink-2)" }}>{text}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
