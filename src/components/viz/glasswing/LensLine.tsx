"use client";

// Logit lens on the name task: probability of the right name if the model stopped after each layer.

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

export default function LensLine() {
  const data = useJson<{ lens: number[] }>(`${DATA}/interp.json`);
  const [hover, setHover] = useState<number | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const lv = data.lens;
  const W = 640;
  const H = 240;
  const M = { l: 44, r: 16, t: 14, b: 36 };
  const x = (i: number) => M.l + (i / (lv.length - 1)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v) * (H - M.t - M.b);
  const i = hover ?? 5;

  return (
    <Figure
      title="When the model knows the answer"
      how="Hover a layer."
      caption="Average over the three name templates and 20 name pairs: the probability the model gives the right name, reading its residual stream after each layer as if that were the last one (the logit lens). Nothing through layer 4, then a jump in layer 5: the same layer where patching sees the name arrive at the last position."
      numbers={{ head: ["after", "probability of the right name"], rows: lv.map((v, k) => [k === 0 ? "embedding" : `layer ${k}`, `${(v * 100).toFixed(1)}%`]) }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} onPointerLeave={() => setHover(null)} role="img" aria-label="Probability of the right name rises from 0 to 36% at layer 5 and 81% at the output">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end">{`${v * 100}%`}</text>
          </g>
        ))}
        {lv.map((_, k) => (
          <text key={k} x={x(k)} y={H - M.b + 18} textAnchor="middle">{k === 0 ? "emb" : k}</text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle">after layer</text>
        <path d={lv.map((v, k) => `${k ? "L" : "M"}${x(k)},${y(v)}`).join("")} fill="none" stroke="var(--star)" strokeWidth={2} />
        {lv.map((v, k) => (
          <g key={k} onPointerEnter={() => setHover(k)}>
            <rect x={x(k) - 20} y={M.t} width={40} height={H - M.t - M.b} fill="transparent" />
            <circle cx={x(k)} cy={y(v)} r={k === i ? 7 : 5} fill="var(--star)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
      </svg>
      <div className={s.stat}>
        <span>
          {i === 0 ? "after the embedding" : `after layer ${i}`}: <b>{(lv[i] * 100).toFixed(1)}%</b>
        </span>
      </div>
    </Figure>
  );
}
