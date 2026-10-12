# takodana.dev

My site: a 3D orrery of my projects on the home page, case studies, build logs and essays.
Public at https://takodana.dev, served from my homelab ([homelab-dev](https://github.com/tmukh/homelab-dev)).

- Next.js 16 static export (`output: "export"`), served by unprivileged nginx
- Home page: three.js orrery (`src/components/Orrery.tsx`); everything it shows comes from `src/data/site.ts`
- Posts and essays: Markdown in `src/content/{posts,essays}`, rendered at build time (shiki highlighting)
- CI: lint, typecheck, build; image built, scanned (Trivy), SBOM (Syft), signed (cosign), pushed to ghcr.io

```
npm ci
npm run dev        # http://localhost:3000
npm run lint && npm run typecheck && npm run build   # static site in out/
```

## Writing a post

Add `src/content/posts/<slug>.md` (or `essays/`) with front matter:

```yaml
---
title: "…"
date: 2026-10-12
series: "Night Sky · M3"     # shown above the title
group: "Night Sky Digest"    # filter: Night Sky Digest | Homelab | Incidents | Essays
summary: "One or two sentences."
---
```
