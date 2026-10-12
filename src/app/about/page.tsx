import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import s from "@/components/page.module.css";
import { contact, experience } from "@/data/site";

export const metadata: Metadata = { title: "About" };

const tools = [
  ["Platform", "Kubernetes (k3s), Argo CD, Helm, Kustomize, NetworkPolicies, Docker, GitHub Actions, Ansible, Terraform"],
  ["Operations (personal lab)", "Prometheus, Grafana, Alertmanager, Loki, SLOs and error budgets, CloudNativePG backup and restore, Cloudflare Tunnel"],
  ["Languages", "Python, Java and Spring Boot, TypeScript, Bash, C++, Rust"],
  ["AI engineering", "Embeddings and hybrid retrieval (pgvector), retrieval evaluation (nDCG, recall, LLM judges), structured LLM output, Langfuse"],
  ["Spoken", "Arabic (native), German, English, Hebrew (B1)"],
];

export default function About() {
  return (
    <>
      <SiteHeader current="/about/" />
      <main className={s.main}>
        <section className={s.hero} style={{ maxWidth: "none", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
          <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <h1 className={s.title}>About</h1>
            <p className={s.lede} style={{ maxWidth: 720 }}>
              I&apos;m a software engineer in Berlin moving towards platform engineering and SRE, with a second foot in AI
              engineering. I&apos;ve kept servers at 99.9% for a federal agency, built Java microservices for public-sector
              clients, and in my own time I run the homelab and retrieval system on this site.
            </p>
          </div>
          <a className="button primary" href={contact.cv}>Download CV (PDF)</a>
        </section>

        <section aria-labelledby="exp" className={s.section}>
          <h2 id="exp" className="eyebrow" style={{ marginBottom: 20 }}>Experience</h2>
          <ol className={s.rows}>
            {experience.map((r) => (
              <li key={r.when + r.title}>
                <span className={s.rowMeta}>{r.when}</span>
                <div className={s.rowBody}>
                  <p className={s.rowTitle}>{r.title}</p>
                  <p className={s.rowText}>{r.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className={`${s.split} ${s.section}`} style={{ gap: 48 }}>
          <section aria-labelledby="edu">
            <h2 id="edu" className="eyebrow" style={{ marginBottom: 20 }}>Education</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div>
                <p className={s.rowTitle} style={{ margin: 0 }}>M.Sc. Computer Science · TU Berlin</p>
                <p className={s.rowText} style={{ margin: 0 }}>
                  Data and Software Engineering. Thesis at DIMA, graded 1.7: a Rust reimplementation of Fainder&apos;s query
                  phase. All coursework done; degree awarded after a final colloquium, expected winter 2026/27.
                </p>
              </div>
              <div>
                <p className={s.rowTitle} style={{ margin: 0 }}>B.Sc. Computer Science · RPTU Kaiserslautern, 2020 – 2023</p>
                <p className={s.rowText} style={{ margin: 0 }}>
                  Information systems. Thesis: Transforming Bio-Science Research Contexts into Flexible Data Containers for
                  Multi-omics Data Management Applications.
                </p>
              </div>
            </div>
          </section>
          <section aria-labelledby="tools">
            <h2 id="tools" className="eyebrow" style={{ marginBottom: 20 }}>Tools I&apos;ve used for real</h2>
            <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {tools.map(([k, v]) => (
                <div key={k}>
                  <dt style={{ fontWeight: 600 }}>{k}</dt>
                  <dd style={{ margin: "2px 0 0", color: "var(--ink-2)" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section aria-labelledby="contact" className={`card ${s.cardBody}`} style={{ padding: 32, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 id="contact" style={{ fontSize: 26 }}>Get in touch</h2>
            <p>Open to platform, SRE and AI engineering roles in Berlin or remote in Germany.</p>
          </div>
          <div className={s.linkRow} style={{ marginTop: 0 }}>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <a href={contact.linkedin}>LinkedIn</a>
            <a href={contact.github}>GitHub</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
