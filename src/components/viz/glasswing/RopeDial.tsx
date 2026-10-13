"use client";

// Rotary position embeddings: rotate query and key by an angle proportional to their position.
// The score only depends on how far apart they are.

import { useState } from "react";
import { Choice, Figure, Slider } from "../ui";
import s from "../viz.module.css";

const Q = { x: 0.85, y: 0.35 };
const K = { x: 0.6, y: -0.55 };
const SPEEDS = [
  { value: 0, label: "fast pair", freq: 1 },
  { value: 1, label: "medium pair", freq: 0.18 },
  { value: 2, label: "slow pair", freq: 0.02 },
];

function rot(v: { x: number; y: number }, a: number) {
  return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
}

export default function RopeDial() {
  const [qPos, setQPos] = useState(7);
  const [kPos, setKPos] = useState(4);
  const [speed, setSpeed] = useState(0);
  const f = SPEEDS[speed].freq;
  const q = rot(Q, qPos * f);
  const k = rot(K, kPos * f);
  const score = q.x * k.x + q.y * k.y;
  const S = 260;
  const C = S / 2;
  const R = 100;

  return (
    <Figure
      title="Telling word order by rotating arrows"
      how="Move the two positions. Then use “shift both” and watch the score stay put."
      caption={
        <>
          Attention on its own doesn&apos;t know which word came first. glasswing’s fix is RoPE (rotary position
          embedding): before scoring, each query and key is rotated by an angle that grows with its position in the text.
          Rotating both arrows by the same extra amount doesn&apos;t change the angle between them, so the score depends
          only on <i>how far apart</i> the two words are, not where they are. A head can learn “the word right before me”
          once, and it works everywhere. Each head’s 64 numbers form 32 such pairs, spinning at different speeds: fast
          pairs tell neighbours apart, slow ones measure long distances.
        </>
      }
    >
      <div className={s.cols}>
        <svg viewBox={`0 0 ${S} ${S}`} className={s.svg} style={{ maxWidth: 300 }} role="img" aria-label="Rotated query and key arrows">
          <defs>
            <marker id="rh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
            </marker>
          </defs>
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" />
          <line x1={C} y1={C} x2={C + k.x * R} y2={C - k.y * R} stroke="var(--accent)" strokeWidth={3} markerEnd="url(#rh)" />
          <line x1={C} y1={C} x2={C + q.x * R} y2={C - q.y * R} stroke="var(--star)" strokeWidth={3} markerEnd="url(#rh)" />
          <text x={C + q.x * R * 1.18} y={C - q.y * R * 1.18 + 4} textAnchor="middle" style={{ fill: "var(--star)" }}>
            query @{qPos}
          </text>
          <text x={C + k.x * R * 1.18} y={C - k.y * R * 1.18 + 4} textAnchor="middle" style={{ fill: "var(--accent)" }}>
            key @{kPos}
          </text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Choice label="Pair" options={SPEEDS.map(({ value, label }) => ({ value, label }))} value={speed} onChange={setSpeed} />
          <Slider label="query at position" value={qPos} min={0} max={60} onChange={setQPos} />
          <Slider label="key at position" value={kPos} min={0} max={60} onChange={setKPos} />
          <div className={s.controls}>
            <button type="button" className={s.btn} onClick={() => { setQPos((p) => Math.min(60, p + 5)); setKPos((p) => Math.min(60, p + 5)); }}>
              shift both +5
            </button>
            <button type="button" className={s.btn} onClick={() => { setQPos((p) => Math.max(0, p - 5)); setKPos((p) => Math.max(0, p - 5)); }}>
              shift both −5
            </button>
          </div>
          <div className={s.stat}>
            <span>
              distance <b>{qPos - kPos}</b>
            </span>
            <span>
              score <b>{score.toFixed(3)}</b>
            </span>
          </div>
        </div>
      </div>
    </Figure>
  );
}
