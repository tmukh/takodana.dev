"use client";

// The path of one request to glasswing.takodana.dev, and the path of one release to the cluster.

import { useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

type Hop = { id: string; label: string; sub: string; text: string };

const REQUEST: Hop[] = [
  { id: "you", label: "your browser", sub: "anywhere", text: "Sends the question as an HTTPS POST and reads the answer as a stream (Server-Sent Events): one small message per token, so text appears while the model is still writing." },
  { id: "cf", label: "Cloudflare", sub: "edge, nearest city", text: "Terminates HTTPS and adds a header with your IP address (CF-Connecting-IP). My home connection never accepts incoming connections: there are no open ports to scan." },
  { id: "tunnel", label: "tunnel", sub: "cloudflared pod", text: "An outbound connection from the cluster to Cloudflare, opened by a small pod. Requests come back through it. It also answers 404 for /metrics, so the server's internal numbers stay internal." },
  { id: "traefik", label: "Traefik", sub: "ingress", text: "The cluster's front door: matches the hostname glasswing.takodana.dev and forwards to the right service." },
  { id: "policy", label: "NetworkPolicy", sub: "firewall", text: "Only Traefik and Prometheus may talk to the server. That's also why the server can trust the IP header: there's no other way in." },
  { id: "server", label: "the server", sub: "Rust, 1 pod", text: "Checks the rate limit for your IP, waits for one of two generation slots, runs the model on 3 CPU threads, and streams tokens back. Prompts are never logged." },
];
const RELEASE: Hop[] = [
  { id: "code", label: "commit", sub: "glasswing repo", text: "A change to the engine or server, merged after tests: Rust tests, parity against PyTorch, the browser build, and Python tests." },
  { id: "ci", label: "CI", sub: "test · scan · sign", text: "Builds a container with the models baked in, each file pinned by checksum. Scans it for known vulnerabilities (Trivy), lists everything inside it (an SBOM), smoke-tests that SmolLM2 says Paris, then signs it (cosign)." },
  { id: "registry", label: "registry", sub: "ghcr.io", text: "The signed image, addressed by its digest: a hash of its contents, so it can never silently change." },
  { id: "gitops", label: "homelab-dev", sub: "a Git repo", text: "The cluster's desired state. Deploying means a pull request that changes one line: the image digest. I verify the signature first." },
  { id: "argo", label: "Argo CD", sub: "in the cluster", text: "Notices the change in Git and applies it. Nobody runs kubectl apply by hand; the repository is the only way to change the cluster." },
  { id: "pod", label: "new pod", sub: "rolling update", text: "Kubernetes starts the new version, waits until it answers its health check, then retires the old one." },
];

export default function RequestPath() {
  const [mode, setMode] = useState<"request" | "release">("request");
  const hops = mode === "request" ? REQUEST : RELEASE;
  const [on, setOn] = useState(0);
  const W = 780;
  const step = (W - 40) / hops.length;

  return (
    <Figure title="How it gets there" how="Pick a path, then hover or tap each stop.">
      <Choice
        label="Path"
        options={[{ value: "request", label: "a request from you" }, { value: "release", label: "a new version from me" }]}
        value={mode}
        onChange={(m) => { setMode(m); setOn(0); }}
      />
      <svg viewBox={`0 0 ${W} 120`} className={s.svg} role="img" aria-label={hops.map((h) => h.label).join(" → ")}>
        <defs>
          <marker id="rp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--line-strong)" />
          </marker>
        </defs>
        {mode === "request" && (
          <rect x={20 + step * 2 - 6} y={8} width={step * 4 + 2} height={104} rx={10} fill="none" stroke="var(--line-strong)" strokeDasharray="5 4" />
        )}
        {mode === "request" && <text x={20 + step * 2} y={22} style={{ fill: "var(--muted)" }}>my k3s cluster, at home</text>}
        {hops.map((h, i) => {
          const cx = 20 + step * i + step / 2;
          return (
            <g key={h.id} tabIndex={0} role="button" aria-label={h.label} onPointerEnter={() => setOn(i)} onFocus={() => setOn(i)} onClick={() => setOn(i)} style={{ cursor: "pointer" }}>
              {i > 0 && <line x1={cx - step + (step - 18) / 2} y1={66} x2={cx - (step - 18) / 2 - 2} y2={66} stroke="var(--line-strong)" strokeWidth={1.5} markerEnd="url(#rp)" />}
              <rect x={cx - (step - 18) / 2} y={46} width={step - 18} height={40} rx={8} fill={i === on ? "rgba(157,180,255,0.22)" : "var(--ground)"} stroke={i === on ? "var(--accent)" : "var(--line-strong)"} />
              <text x={cx} y={64} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 12 }}>{h.label}</text>
              <text x={cx} y={78} textAnchor="middle" style={{ fontSize: 9.5 }}>{h.sub}</text>
            </g>
          );
        })}
      </svg>
      <p className={s.caption} style={{ margin: 0, minHeight: 66 }} aria-live="polite">
        <b style={{ color: "var(--ink)" }}>{hops[on].label}.</b> {hops[on].text}
      </p>
    </Figure>
  );
}
