"use client";

// Attention in two dimensions: a query asks a question, each earlier word offers a key, the dot
// product scores the match, softmax turns scores into shares that add up to 100%.

import { useRef, useState } from "react";
import { Figure, Slider } from "../ui";
import s from "../viz.module.css";

const KEYS = [
  { word: "Lily", x: 0.9, y: 0.45 },
  { word: "park", x: -0.7, y: 0.6 },
  { word: "ball", x: 0.2, y: -0.95 },
  { word: "the", x: -0.6, y: -0.3 },
];
const SIZE = 300;
const C = SIZE / 2;
const R = 120;

export default function AttentionToy() {
  const [q, setQ] = useState({ x: 0.8, y: 0.6 });
  const [scale, setScale] = useState(2);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef(false);

  const move = (e: React.PointerEvent) => {
    if (!drag.current || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * SIZE - C) / R;
    const y = -(((e.clientY - r.top) / r.height) * SIZE - C) / R;
    const len = Math.hypot(x, y);
    const k = len > 1.15 ? 1.15 / len : 1;
    setQ({ x: x * k, y: y * k });
  };

  const scores = KEYS.map((k) => (k.x * q.x + k.y * q.y) * scale);
  const max = Math.max(...scores);
  const exps = scores.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  const shares = exps.map((v) => v / total);

  return (
    <Figure
      title="Attention, reduced to arrows"
      how="Drag the gold arrow (the question). The bars show how the word divides its attention."
      caption={
        <>
          Each word that is looking around produces a <b>query</b> (gold): roughly, the question it is asking. Every
          earlier word offers a <b>key</b> (blue): what it has to offer. The score is how well they point the same way
          (a dot product). <b>Softmax</b> turns the scores into shares that add up to 100%, and the word then takes in a
          mix of the other words’ information in those proportions. In glasswing the arrows have 64 dimensions instead
          of 2, and every head learns its own way of asking.
        </>
      }
      numbers={{
        head: ["word", "score", "share of attention"],
        rows: KEYS.map((k, i) => [k.word, scores[i].toFixed(2), `${(shares[i] * 100).toFixed(1)}%`]),
      }}
    >
      <div className={s.cols}>
        <svg
          ref={svg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={s.svg}
          style={{ maxWidth: 340, touchAction: "none" }}
          onPointerMove={move}
          onPointerUp={() => (drag.current = false)}
          onPointerLeave={() => (drag.current = false)}
          role="img"
          aria-label="A query arrow and four key arrows"
        >
          <defs>
            <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
            </marker>
          </defs>
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" />
          {KEYS.map((k, i) => (
            <g key={k.word}>
              <line x1={C} y1={C} x2={C + k.x * R} y2={C - k.y * R} stroke="var(--accent)" strokeWidth={1.5 + shares[i] * 4} markerEnd="url(#ah)" opacity={0.5 + shares[i] / 2} />
              <text x={C + k.x * R * 1.12} y={C - k.y * R * 1.12 + 4} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 13 }}>
                {k.word}
              </text>
            </g>
          ))}
          <line x1={C} y1={C} x2={C + q.x * R} y2={C - q.y * R} stroke="var(--star)" strokeWidth={3} markerEnd="url(#ah)" />
          <circle
            cx={C + q.x * R}
            cy={C - q.y * R}
            r={12}
            fill="rgba(255,210,122,0.25)"
            stroke="var(--star)"
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              drag.current = true;
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
          />
          <text x={C + q.x * R} y={C - q.y * R - 18} textAnchor="middle" style={{ fill: "var(--star)" }}>
            query
          </text>
        </svg>
        <div>
          <ol className={s.neighbours}>
            {KEYS.map((k, i) => (
              <li key={k.word}>
                <span>{k.word}</span>
                <span className={s.bar} style={{ width: `${shares[i] * 100}%` }} />
                <span className={s.val}>{(shares[i] * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 16 }}>
            <Slider label="sharpness" value={scale} min={0.2} max={8} step={0.1} onChange={setScale} format={(v) => `×${v.toFixed(1)}`} />
            <p className={s.how} style={{ marginTop: 6 }}>
              Low sharpness spreads attention evenly; high sharpness puts nearly all of it on the best match. Real
              models divide scores by √64 = 8 to keep them from getting too sharp too early.
            </p>
          </div>
        </div>
      </div>
    </Figure>
  );
}
