"use client";

// Cross-entropy, with a real prediction: the loss is how surprised the model was by the word that
// actually came next, -ln(probability it gave that word).

import { useState } from "react";
import { DATA, Figure, Slider, useJson } from "../ui";
import s from "../viz.module.css";

type Pred = { prompt: string; words: string[]; probs: number[] };
const show = (t: string) => t.replace(/\n/g, "↵");

export default function LossToy() {
  const data = useJson<Pred[]>(`${DATA}/predictions.json`);
  const [pick, setPick] = useState(0);
  const [p, setP] = useState<number | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const pred = data[0];
  const prob = p ?? pred.probs[pick];
  const loss = -Math.log(prob);

  const W = 420;
  const H = 220;
  const M = { l: 40, r: 12, t: 12, b: 34 };
  const x = (v: number) => M.l + v * (W - M.l - M.r);
  const y = (l: number) => M.t + (1 - Math.min(l, 8) / 8) * (H - M.t - M.b);
  const curve = Array.from({ length: 120 }, (_, i) => (i + 1) / 120)
    .map((v, i) => `${i ? "L" : "M"}${x(v).toFixed(1)},${y(-Math.log(v)).toFixed(1)}`)
    .join("");

  return (
    <Figure
      title="How surprised was the model?"
      how="Pick which word “really” came next, or drag the probability yourself."
      caption={
        <>
          Training needs one number that says how wrong the model was. It is the <b>loss</b>: −ln(p), where p is the
          probability the model gave the word that actually came next. A confident right guess costs almost nothing; a
          word it thought impossible costs a lot. Averaged over billions of words, this is the number training pushes
          down. glasswing ended at 1.18, which means it gives the real next word e<sup>−1.18</sup> ≈ 31% probability on
          average, out of 4,096 options.
        </>
      }
      numbers={{
        head: ["next word", "probability", "loss if this came next"],
        rows: pred.words.slice(0, 10).map((w, i) => [show(w), `${(pred.probs[i] * 100).toFixed(1)}%`, (-Math.log(pred.probs[i])).toFixed(2)]),
      }}
    >
      <p className={s.how} style={{ margin: 0 }}>
        The trained model, after <b style={{ color: "var(--ink)" }}>“{pred.prompt}”</b>:
      </p>
      <div className={s.cols}>
        <ol className={s.neighbours}>
          {pred.words.slice(0, 8).map((w, i) => (
            <li key={i} onClick={() => { setPick(i); setP(null); }} style={{ cursor: "pointer", opacity: i === pick && p === null ? 1 : 0.75 }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", whiteSpace: "pre", color: i === pick && p === null ? "var(--star)" : undefined }}>
                {i === pick && p === null ? "▶" : " "}
                {show(w)}
              </span>
              <span className={s.bar} style={{ width: `${pred.probs[i] * 100}%`, background: i === pick && p === null ? "var(--star)" : "var(--accent)" }} />
              <span className={s.val}>{(pred.probs[i] * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ol>
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Loss as a function of the probability of the right word">
            {[0, 2, 4, 6, 8].map((l) => (
              <g key={l}>
                <line x1={M.l} x2={W - M.r} y1={y(l)} y2={y(l)} stroke="var(--line)" />
                <text x={M.l - 6} y={y(l) + 4} textAnchor="end">{l}</text>
              </g>
            ))}
            {[0, 0.5, 1].map((v) => (
              <text key={v} x={x(v)} y={H - M.b + 16} textAnchor="middle">{`${v * 100}%`}</text>
            ))}
            <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle">probability given to the right word</text>
            <path d={curve} fill="none" stroke="var(--accent)" strokeWidth={2} />
            <line x1={x(prob)} x2={x(prob)} y1={y(loss)} y2={H - M.b} stroke="var(--line-strong)" strokeDasharray="3 3" />
            <circle cx={x(prob)} cy={y(loss)} r={6} fill="var(--star)" stroke="var(--surface)" strokeWidth={2} />
          </svg>
          <Slider label="probability of the right word" value={Math.round(prob * 1000)} min={1} max={999} onChange={(v) => setP(v / 1000)} format={(v) => `${(v / 10).toFixed(1)}%`} />
          <div className={s.stat} style={{ marginTop: 8 }}>
            <span>loss <b>{loss.toFixed(2)}</b></span>
          </div>
        </div>
      </div>
    </Figure>
  );
}
