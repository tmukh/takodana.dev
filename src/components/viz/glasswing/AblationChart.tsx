"use client";

// What switching heads off costs: the circuit vs three random heads, on repeated text and stories.

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Ab = {
  induction_heads: [number, number][];
  random_heads: [number, number][];
  first_copy_loss: Record<string, number>;
  repeat_loss: Record<string, number>;
  story_loss: Record<string, number>;
};

// Validated palette (dark surface): nothing off, circuit off, random heads off.
const CONDS = [
  { key: "none", label: "nothing switched off", color: "#3f9d74" },
  { key: "induction", label: "the circuit switched off", color: "#bb831c" },
  { key: "random", label: "3 random heads switched off", color: "#4f7fe0" },
];
const GROUPS = [
  { key: "first_copy_loss", label: "first copy of a passage" },
  { key: "repeat_loss", label: "the same passage again" },
  { key: "story_loss", label: "ordinary stories" },
] as const;
const name = (h: [number, number]) => `L${h[0] + 1}H${h[1] + 1}`;

export default function AblationChart() {
  const data = useJson<{ ablation: Ab }>(`${DATA}/interp.json`);
  const [hover, setHover] = useState<string | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const ab = data.ablation;
  const max = 2.2;
  const W = 760;
  const H = 280;
  const M = { l: 44, r: 10, t: 16, b: 46 };
  const gw = (W - M.l - M.r) / 3;
  const bw = gw / 4.4;
  const y = (v: number) => M.t + (1 - v / max) * (H - M.t - M.b);

  return (
    <Figure
      title="What switching heads off costs"
      how="Hover a bar for its value."
      caption={
        <>
          Loss: lower is better. The middle group is the cleanest test: a passage the model has just read, repeated.
          The second copy is much easier than the first ({ab.first_copy_loss.none.toFixed(2)} → {ab.repeat_loss.none.toFixed(2)})
          because the model copies. Switching off the circuit ({ab.induction_heads.map(name).join(", ")}) takes about a
          third of that advantage away; three random heads ({ab.random_heads.map(name).join(", ")}) take almost none. On
          ordinary stories, the circuit and random heads cost about the same: its specific job is copying.
        </>
      }
      numbers={{
        head: ["", ...CONDS.map((c) => c.label)],
        rows: GROUPS.map((g) => [g.label, ...CONDS.map((c) => ab[g.key][c.key].toFixed(3))]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Loss with nothing, the circuit, or random heads switched off">
        {[0, 0.5, 1, 1.5, 2].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {GROUPS.map((g, gi) => (
          <g key={g.key}>
            <text x={M.l + gi * gw + gw / 2} y={H - M.b + 20} textAnchor="middle" style={{ fill: "var(--ink-2)" }}>{g.label}</text>
            {CONDS.map((c, ci) => {
              const v = ab[g.key][c.key];
              const id = `${g.key}-${c.key}`;
              const x = M.l + gi * gw + gw / 2 + (ci - 1) * (bw + 4) - bw / 2;
              return (
                <g key={c.key} onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover(null)}>
                  <rect x={x} y={y(v)} width={bw} height={y(0) - y(v)} rx={3} fill={c.color} opacity={hover && hover !== id ? 0.55 : 1} />
                  <text x={x + bw / 2} y={y(v) - 6} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 11 }}>{v.toFixed(2)}</text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <div className={s.stat}>
        {CONDS.map((c) => (
          <span key={c.key}>
            <span style={{ color: c.color }}>■</span> {c.label}
          </span>
        ))}
      </div>
    </Figure>
  );
}
