"use client";

// The learning-rate schedule glasswing trained with: linear warm-up, then cosine decay.

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Run = { config: { max_steps: number; warmup_steps: number; lr: number; min_lr: number }; main: { step: number; lr: number }[] };

const W = 760;
const H = 220;
const M = { l: 60, r: 16, t: 14, b: 36 };

export default function LrSchedule() {
  const data = useJson<Run>(`${DATA}/training.json`);
  const [hover, setHover] = useState<number | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const c = data.config;
  // Same formula as glasswing_train.train.lr_at.
  const lrAt = (step: number) => {
    if (step < c.warmup_steps) return (c.lr * (step + 1)) / c.warmup_steps;
    const prog = Math.min(1, (step - c.warmup_steps) / Math.max(1, c.max_steps - c.warmup_steps));
    return c.min_lr + 0.5 * (c.lr - c.min_lr) * (1 + Math.cos(Math.PI * prog));
  };
  const x = (st: number) => M.l + (st / c.max_steps) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v / c.lr) * (H - M.t - M.b);
  const path = Array.from({ length: 401 }, (_, k) => (k * c.max_steps) / 400)
    .map((st, k) => `${k ? "L" : "M"}${x(st).toFixed(1)},${y(lrAt(st)).toFixed(1)}`)
    .join("");
  const st = hover ?? 20000;

  return (
    <Figure
      title="How big the steps were, over time"
      how="Hover along the curve."
      caption={
        <>
          At the start the numbers are random and the slopes point everywhere, so the first {c.warmup_steps.toLocaleString("en")} steps
          ramp the learning rate up from almost zero (<b>warm-up</b>). Then it slowly falls along a cosine curve to a tenth
          of its peak: big steps to explore early, small steps to settle into a good spot at the end. The dots are the
          values actually logged during the run.
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={s.svg}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(c.max_steps, Math.round(((px - M.l) / (W - M.l - M.r)) * c.max_steps))));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Learning rate: linear warm-up to 0.001 over 1,000 steps, then cosine decay to 0.0001"
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.l} x2={W - M.r} y1={y(f * c.lr)} y2={y(f * c.lr)} stroke="var(--line)" />
            <text x={M.l - 6} y={y(f * c.lr) + 4} textAnchor="end">{(f * c.lr).toExponential(0)}</text>
          </g>
        ))}
        {[0, 10000, 20000, 30000, 40000].map((t) => (
          <text key={t} x={x(t)} y={H - M.b + 16} textAnchor="middle">{t.toLocaleString("en")}</text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle">training step</text>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {data.main.map((r) => (
          <circle key={r.step} cx={x(r.step)} cy={y(r.lr)} r={2.5} fill="var(--star)" />
        ))}
        <line x1={x(st)} x2={x(st)} y1={M.t} y2={H - M.b} stroke="var(--line-strong)" />
        <circle cx={x(st)} cy={y(lrAt(st))} r={5} fill="var(--ink)" />
      </svg>
      <div className={s.stat}>
        <span>step <b>{st.toLocaleString("en")}</b></span>
        <span>learning rate <b>{lrAt(st).toExponential(2)}</b></span>
        <span>{st < c.warmup_steps ? "warming up" : "cosine decay"}</span>
      </div>
    </Figure>
  );
}
