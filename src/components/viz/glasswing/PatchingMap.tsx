"use client";

// Activation patching: which (layer, position) carries the information that decides the name.

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type P = { patching: { template: string; restored: number[][]; tokens: string[] } };

export default function PatchingMap() {
  const data = useJson<P>(`${DATA}/interp.json`);
  const [hover, setHover] = useState<[number, number] | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const { restored, tokens } = data.patching;
  const cell = 44;
  const lab = 112;
  const W = lab + tokens.length * cell + 4;
  const H = 70 + restored.length * cell + 4;
  const rowName = (r: number) => (r === 0 ? "embedding" : `after layer ${r}`);
  const [hr, hc] = hover ?? [6, tokens.length - 1];

  return (
    <Figure
      title="Where the answer lives"
      how="Hover a square: how much of the right answer comes back if only that one spot is copied over from the clean run."
      caption={
        <>
          Clean prompt: <q>Lily and Ben were playing in the park. Lily gave the ball to</q> (answer: Ben). Corrupted:
          the same with the second <q>Lily</q> swapped for <q>Ben</q> (answer: Lily). A and B in the labels stand for the
          two names, averaged over 24 name pairs. Each square runs the corrupted prompt with one spot replaced by the
          clean run&apos;s vector. Two bright bands: up to layer 4, the deciding information sits on the second
          subject; from layer 5 it moves to <q>to</q>, the position that predicts the next word.
        </>
      }
      numbers={{
        head: ["", ...tokens],
        rows: restored.map((row, r) => [rowName(r), ...row.map((v) => v.toFixed(2))]),
        note: "Share of the clean logit difference restored (1 = fully, 0 = not at all).",
      }}
    >
      <div className={s.chart} style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} style={{ minWidth: 560 }} onPointerLeave={() => setHover(null)} role="img" aria-label="Activation patching heatmap">
          {tokens.map((t, c) => (
            <text key={c} transform={`translate(${lab + c * cell + cell / 2 + 4}, 62) rotate(-50)`} style={{ fill: c === hc ? "var(--ink)" : "var(--muted)", fontSize: 12 }}>
              {t}
            </text>
          ))}
          {restored.map((row, r) => (
            <g key={r}>
              <text x={lab - 8} y={70 + r * cell + cell / 2 + 4} textAnchor="end" style={{ fill: r === hr ? "var(--ink)" : "var(--muted)" }}>
                {rowName(r)}
              </text>
              {row.map((v, c) => (
                <rect
                  key={c}
                  x={lab + c * cell + 2}
                  y={70 + r * cell + 2}
                  width={cell - 4}
                  height={cell - 4}
                  rx={4}
                  fill={`rgba(255, 210, 122, ${Math.max(0.04, Math.min(1, Math.max(0, v)))})`}
                  stroke={r === hr && c === hc ? "var(--ink)" : "none"}
                  onPointerEnter={() => setHover([r, c])}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className={s.stat}>
        <span>
          {rowName(hr)}, at <b>“{tokens[hc].trim()}”</b>: <b>{Math.round(restored[hr][hc] * 100) || 0}%</b> of the answer restored
        </span>
      </div>
    </Figure>
  );
}
