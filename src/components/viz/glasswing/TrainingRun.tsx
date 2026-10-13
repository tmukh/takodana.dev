"use client";

// The real training run: loss curves on a log scale of steps, and what the model wrote at each
// checkpoint. Steps 50–1,000 come from a replay of the run's start with the same settings, seed and
// data order; GPU arithmetic isn't bit-for-bit repeatable, but the replay tracks the real run closely
// (validation loss 1.851 vs 1.854 at step 1,000).

import { useMemo, useState } from "react";
import { DATA, Figure, Slider, useJson } from "../ui";
import s from "../viz.module.css";

type Row = { step: number; train_loss: number; val_loss: number; lr: number; tokens_seen: number; sample: string };
type Run = { config: { max_steps: number; warmup_steps: number; lr: number; min_lr: number }; early: Row[]; main: Row[] };

const W = 760;
const H = 280;
const M = { l: 48, r: 16, t: 14, b: 40 };

export default function TrainingRun() {
  const data = useJson<Run>(`${DATA}/training.json`);
  // Replay up to step 1,000, then the real run. (The real run's training loss at step 1,000 is
  // averaged over all 1,000 steps; the replay's over the last 50, so it is the comparable point.)
  const rows = useMemo(() => (data ? [...data.early, ...data.main.filter((r) => r.step > 1000)] : []), [data]);
  const [i, setI] = useState(0);
  if (!data) return <p className="viz-loading">Loading data…</p>;

  const lo = Math.log10(rows[0].step);
  const hi = Math.log10(rows[rows.length - 1].step);
  const x = (step: number) => M.l + ((Math.log10(step) - lo) / (hi - lo)) * (W - M.l - M.r);
  const y = (l: number) => M.t + (1 - (Math.min(l, 8) - 1) / 7) * (H - M.t - M.b);
  const line = (key: "val_loss" | "train_loss") =>
    rows.map((r, k) => `${k ? "L" : "M"}${x(r.step).toFixed(1)},${y(r[key]).toFixed(1)}`).join("");
  const r = rows[i];
  // The real run took 3 h 38 min for 40,000 steps at a near-constant speed.
  const minutes = ((r.step / 40_000) * 218).toFixed(r.step < 400 ? 1 : 0);

  return (
    <Figure
      title="3.6 hours of learning, in one slider"
      how="Drag through the training run and read what the model wrote at each point."
      caption={
        <>
          Every point is a checkpoint where the run paused to measure its loss on stories it never trained on
          (validation, gold) and to write a story starting from <q>Once upon a time</q>. The step axis is logarithmic:
          the first thousand steps, about six minutes, get as much room as the next 39,000, because that&apos;s where
          the model goes from noise to sentences. Training loss (blue) is averaged over the steps since the last
          checkpoint, which is why it lags behind early on. Steps 50 to 1,000 come from a replay of the run&apos;s
          first minutes with the same settings, saving a sample every 50 steps (validation loss at step 1,000: 1.851 in
          the replay, 1.854 in the real run).
        </>
      }
      numbers={{
        head: ["step", "tokens seen", "validation loss", "training loss", "learning rate"],
        rows: rows.map((q) => [q.step, q.tokens_seen.toLocaleString("en"), q.val_loss, q.train_loss, q.lr.toExponential(2)]),
      }}
    >
      <div className={s.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Training and validation loss falling over 40,000 steps">
          {[2, 4, 6, 8].map((l) => (
            <g key={l}>
              <line x1={M.l} x2={W - M.r} y1={y(l)} y2={y(l)} stroke="var(--line)" />
              <text x={M.l - 6} y={y(l) + 4} textAnchor="end">{l}</text>
            </g>
          ))}
          {[50, 100, 500, 1000, 5000, 10000, 40000].map((t) => (
            <text key={t} x={x(t)} y={H - M.b + 16} textAnchor="middle">{t.toLocaleString("en")}</text>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle">training step (log scale)</text>
          <text x={12} y={(M.t + H - M.b) / 2} transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`} textAnchor="middle">loss</text>
          <line x1={x(1000)} x2={x(1000)} y1={M.t} y2={H - M.b} stroke="var(--line-strong)" strokeDasharray="3 4" />
          <text x={x(1000) + 6} y={M.t + 12}>end of warm-up</text>
          <path d={line("train_loss")} fill="none" stroke="#4f7fe0" strokeWidth={2} />
          <path d={line("val_loss")} fill="none" stroke="var(--star)" strokeWidth={2} />
          <line x1={x(r.step)} x2={x(r.step)} y1={M.t} y2={H - M.b} stroke="var(--ink-2)" />
          <circle cx={x(r.step)} cy={y(r.val_loss)} r={6} fill="var(--star)" stroke="var(--surface)" strokeWidth={2} />
          <text x={W - M.r} y={y(rows[rows.length - 1].val_loss) - 10} textAnchor="end" style={{ fill: "var(--ink-2)" }}>
            validation {rows[rows.length - 1].val_loss.toFixed(2)}
          </text>
        </svg>
      </div>
      <Slider label="checkpoint" value={i} min={0} max={rows.length - 1} onChange={setI} format={() => `step ${r.step.toLocaleString("en")}`} />
      <div className={s.stat}>
        <span>validation loss <b>{r.val_loss.toFixed(2)}</b></span>
        <span>words read <b>{(r.tokens_seen / 1e6).toFixed(r.tokens_seen < 1e7 ? 1 : 0)}M</b> tokens</span>
        <span>time <b>~{minutes} min</b></span>
      </div>
      <blockquote style={{ margin: 0, padding: "12px 16px", borderLeft: "3px solid var(--star)", background: "var(--ground)", borderRadius: 6, fontSize: 15, whiteSpace: "pre-wrap" }}>
        <span style={{ color: "var(--muted)" }}>Once upon a time</span>
        {r.sample}
      </blockquote>
    </Figure>
  );
}
