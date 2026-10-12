// Single source for what the site says. Facts follow CAREER-PLAN §7 (claim boundaries);
// [BRACKETS] are placeholders only Tarik can fill.

export type Link = { label: string; href: string };

export type World = {
  id: string;
  label: string;
  kind: string;
  color: string;
  title: string;
  text: string;
  links: Link[];
  orbit?: { a: number; r: number; moons?: number; planned?: boolean; rings?: boolean };
};

// The orrery: the homelab is the star, everything else orbits it.
export const worlds: World[] = [
  {
    id: "homelab",
    label: "homelab-dev",
    kind: "the star",
    color: "#FFD27A",
    title: "homelab-dev",
    text: "The machine everything orbits: single-node k3s, changed only through Git. Argo CD, Sealed Secrets, CloudNativePG with tested restores, Prometheus and Loki, one Cloudflare Tunnel.",
    links: [
      { label: "Repository", href: "https://github.com/tmukh/homelab-dev" },
      { label: "All projects", href: "/projects/" },
    ],
  },
  {
    id: "tracker",
    label: "application-tracker",
    kind: "inner planet · private",
    color: "#7FD6A4",
    title: "application-tracker",
    text: "How I run my own job search: tracks applications and classifies incoming mail with a local model. Private until it has proper authentication.",
    links: [{ label: "Repository", href: "https://github.com/tmukh/application-tracker" }],
    orbit: { a: 3.0, r: 0.32 },
  },
  {
    id: "nsd",
    label: "Night Sky Digest",
    kind: "gas giant · six moons",
    color: "#7FA8FF",
    title: "Night Sky Digest",
    text: "New astrophysics papers every morning, summarised with citations that are checked, searchable in four languages. Its six moons are milestones M0 to M5; the faint seventh is next.",
    links: [
      { label: "Case study", href: "/projects/night-sky-digest/" },
      { label: "Live site", href: "https://digest.takodana.dev" },
    ],
    orbit: { a: 4.8, r: 0.6, moons: 7 },
  },
  {
    id: "writing",
    label: "Build logs",
    kind: "asteroid belt",
    color: "#B9A98F",
    title: "Build logs and essays",
    text: "How the projects were built, including what broke, plus essays on things I keep thinking about: word frequencies, grammatical case, three bodies.",
    links: [{ label: "Read", href: "/writing/" }],
  },
  {
    id: "sideout",
    label: "Sideout",
    kind: "predicted planet",
    color: "#E39A7A",
    title: "Sideout",
    text: "Not observed yet: volleyball match analytics in plain language, with text-to-SQL checked against an execution-accuracy eval and a read-only database role.",
    links: [{ label: "What is planned", href: "/projects/#sideout" }],
    orbit: { a: 7.2, r: 0.42, planned: true },
  },
  {
    id: "languages",
    label: "Languages",
    kind: "ringed outer world",
    color: "#D7B7FF",
    title: "Languages",
    text: "Arabic is my first language; I work in German and English and read Hebrew. It is why the search speaks more than English, and why some of my essays are about grammar and Zipf's law.",
    links: [{ label: "About me", href: "/about/" }],
    orbit: { a: 9.2, r: 0.5, rings: true },
  },
];

export const nightSkyMilestones = [
  { id: "M0", done: true, text: "Signed images, SBOM, CVE gate" },
  { id: "M1", done: true, text: "Polite, resumable arXiv harvester" },
  { id: "M2", done: true, text: "Hybrid multilingual search" },
  { id: "M3", done: true, text: "Eval harness gated in CI" },
  { id: "M4", done: true, text: "Cited digest, traced in Langfuse" },
  { id: "M5", done: true, text: "On k3s with backups and SLOs" },
  { id: "M6", done: false, text: "Experiments and write-up" },
];

export type Role = { when: string; title: string; text: string };

export const experience: Role[] = [
  {
    when: "03/2026 – 09/2026",
    title: "Software Engineer · Capgemini",
    text: "Java and Spring Boot microservices for a federal administration client; a TypeScript/React frontend and Python tooling on a defence project; contributed to team-level Terraform on STACKIT; CI with GitHub Actions, Jenkins and GitLab CI.",
  },
  {
    when: "03/2025 – 02/2026",
    title: "IT Systems Engineer · Bundespolizeipräsidium",
    text: "Data-centre migration of Linux and Windows servers. 99.9% availability across the systems I administered. Ansible plus Python and Bash health checks cut manual effort by 40%. Checkmk monitoring; supported Oracle operations including backup and recovery.",
  },
  {
    when: "11/2024 – 02/2025",
    title: "Working student · BIFOLD",
    text: "C++ stream-processing operators for NebulaStream: 45% higher throughput at under 100 ms latency, for a Charité project. Named in the acknowledgements of the SIGMOD Companion 2025 demo paper.",
  },
  { when: "04/2024 – 11/2025", title: "[ROLE] · Innowadi (part-time)", text: "[One line on what you did there.]" },
  {
    when: "06/2023 – 10/2024",
    title: "[ROLE] · Deli Bringy (via Feindt Vermögen & Consult)",
    text: "TypeScript on Node.js Cloud Functions on Google Cloud (Firebase, serverless) and a Flutter app; improved client performance by 35%.",
  },
  { when: "03/2022 – 09/2022", title: "[ROLE] · Universität Hamburg, AKKORD", text: "[One line on what you did there.]" },
];

export type PlannedPost = { series: string; group: "Night Sky Digest" | "Homelab" | "Incidents" | "Essays"; title: string; blurb: string };

// Shown until each one is written as a Markdown file in src/content/posts.
export const plannedPosts: PlannedPost[] = [
  { series: "Night Sky · M0", group: "Night Sky Digest", title: "Pinning everything: image digests, action SHAs and keyless signing", blurb: "Why a tag is a branch and a digest is a commit, a CVE gate that only blocks what you can fix, and what cosign verify actually checks." },
  { series: "Night Sky · M1", group: "Night Sky Digest", title: "Being polite to arXiv: a resumable OAI-PMH harvester", blurb: "One request every three seconds, resumption tokens, idempotent upserts and a checkpoint that only moves after a whole window." },
  { series: "Night Sky · M2", group: "Night Sky Digest", title: "Hybrid search with pgvector and Postgres full text", blurb: "bge-m3 embeddings, HNSW, a stored tsvector and reciprocal-rank fusion in six lines of Python." },
  { series: "Night Sky · M3", group: "Night Sky Digest", title: "Evaluating a retrieval system when you don't know astrophysics", blurb: "LLM-written queries, pooled judging by two local models, a tie-breaker, a human audit at κ 0.81, and a regression gate in CI." },
  { series: "Night Sky · M4", group: "Night Sky Digest", title: "Stopping an LLM from inventing citations", blurb: "JSON-schema output, a deterministic citation check with retries, and tracing every call in a self-hosted Langfuse." },
  { series: "Night Sky · M5", group: "Night Sky Digest", title: "SLOs and error budgets for a one-person service", blurb: "Freshness measured from the database, multiwindow burn-rate alerts, and why one late day uses up a 99% monthly budget." },
  { series: "Homelab", group: "Homelab", title: "Kubernetes on a laptop's WSL2: what bit me", blurb: "Memory limits in .wslconfig, a misspelled section header, mount propagation, and reaching a GPU on another machine over Tailscale." },
  { series: "Homelab", group: "Homelab", title: "GitOps with Argo CD: app of apps, Sealed Secrets and one shared chart", blurb: "How every app on the cluster gets the same Deployment, NetworkPolicy and ServiceMonitor, and why secrets are sealed off-cluster." },
  { series: "Homelab", group: "Homelab", title: "Self-hosting Langfuse: four services, one operator, two crashes", blurb: "CRD ordering, Helm lookup versus GitOps, and pinning every generated credential." },
  { series: "Incident", group: "Incidents", title: "The fix was in Git, the pod was still crashing", blurb: "A JavaScript heap out of memory, exit code 134, and a sync operation that blocked its own fix." },
  { series: "Incident", group: "Incidents", title: "The commit that never reached main", blurb: "How a \"metrics missing\" alert caught a process mistake, and the rule that came out of it." },
];

export const contact = {
  github: "https://github.com/tmukh",
  linkedin: "[LINKEDIN URL]",
  email: "[EMAIL]",
  cv: "[CV PDF URL]",
};
