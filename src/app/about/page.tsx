import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import s from "@/components/page.module.css";
import { contact, experience } from "@/data/site";

export const metadata: Metadata = { title: "About" };

// Grouped as in the master CV. "Personal lab" marks what I run myself rather than in a job.
const tools = [
  ["Platform", "Kubernetes (k3s), Argo CD (app of apps), Helm, Kustomize, Sealed Secrets, NetworkPolicies, Docker, ghcr.io"],
  ["Automation and CI/CD", "Terraform (STACKIT in a team, AWS in a personal lab), Ansible, Bash, GitHub Actions, GitLab CI, Jenkins"],
  ["Operations", "Linux, Windows Server, Checkmk, incident response and root-cause analysis, backup and recovery, TCP/IP, DNS, TLS"],
  ["Observability (personal lab)", "Prometheus, Grafana, Alertmanager, Loki, SLOs and burn-rate alerts, CloudNativePG backups with restore drills"],
  ["AI engineering", "Embeddings and hybrid retrieval (pgvector, reciprocal-rank fusion), retrieval evaluation (nDCG, recall, LLM judges), structured LLM output, Ollama, Langfuse"],
  ["Backend and frontend", "Java, Spring Boot, microservices, REST, SOAP, OAuth2, SAML, Keycloak, Oracle, SQL, TypeScript, Node.js, Angular, React, Flutter"],
  ["Systems and performance", "Rust (Rayon, PyO3), C++, stream processing, profiling with hardware performance counters, ablation studies, Apache Spark"],
  ["Cloud", "AWS (personal lab: EC2, VPC, IAM/STS), STACKIT, Google Cloud (Firebase, serverless)"],
  ["Spoken", "Arabic (native), German (C1), English (C1), Hebrew (B1)"],
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
              I&apos;m a software engineer in Berlin moving into platform engineering and SRE, with a second foot in AI
              engineering. I&apos;ve kept federal police systems at 99.9% through a data-centre migration, built Java
              microservices for a federal agency, and written C++ and Rust where latency mattered. In my own time I run the
              homelab, and the retrieval system on top of it, that this site describes.
            </p>
          </div>
          <a className="button primary" href={`mailto:${contact.email}?subject=CV%20request`}>Ask for my CV</a>
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
            <h2 id="tools" className="eyebrow" style={{ marginBottom: 20 }}>Skills</h2>
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
