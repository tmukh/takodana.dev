"use client";

// Real attention patterns from glasswing: every layer and head, on three sentences.

import { useState } from "react";
import { Choice, DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Ex = { text: string; tokens: string[]; attention: number[][][][] }; // [layer][head][to][from]

const PRESETS = [
  { label: "looks at the previous word (L3 h3)", ex: 0, layer: 2, head: 2 },
  { label: "induction: copies a repeat (L4 h4)", ex: 2, layer: 3, head: 3 },
  { label: "parks on the start (L1 h3)", ex: 1, layer: 0, head: 2 },
];

const show = (t: string) => t.replace(/\n/g, "↵");

export default function AttentionReal() {
  const data = useJson<Ex[]>(`${DATA}/attention.json`);
  const [ex, setEx] = useState(0);
  const [layer, setLayer] = useState(2);
  const [head, setHead] = useState(2);
  const [hover, setHover] = useState<[number, number] | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;

  const e = data[ex];
  const A = e.attention[layer][head];
  const n = e.tokens.length;
  const cell = Math.min(34, Math.floor(620 / n));
  const lab = 92;
  const W = lab + n * cell + 4;
  const H = lab + n * cell + 4;
  const [r, c] = hover ?? [n - 1, 0];

  return (
    <Figure
      title="Where glasswing's heads actually look"
      how="Pick a sentence, a layer and a head, or start from one of the examples. Hover a cell for the exact value."
      caption={
        <>
          Each row is a word looking back; each column is a word it can look at; brighter means more attention (every
          row adds up to 100%). Heads specialise. Some look at the previous word, some at the start of the text when
          they have nothing better to do (an <i>attention sink</i>), and one, in layer 4, looks at the word that came
          <i> after</i> the last time the current word appeared. That last one is an induction head, the subject of
          part 5.
        </>
      }
      numbers={{
        head: ["from \\ to", ...e.tokens.map(show)],
        rows: A.map((row, i) => [show(e.tokens[i]), ...row.map((v) => (v ? `${(v * 100).toFixed(0)}%` : ""))]),
        note: `Layer ${layer + 1}, head ${head + 1}.`,
      }}
    >
      <Choice
        label="Examples"
        options={PRESETS.map((p, i) => ({ value: i, label: p.label }))}
        value={PRESETS.findIndex((p) => p.ex === ex && p.layer === layer && p.head === head)}
        onChange={(i) => {
          const p = PRESETS[i];
          setEx(p.ex);
          setLayer(p.layer);
          setHead(p.head);
        }}
      />
      <div className={s.controls}>
        <Choice label="Sentence" options={data.map((d, i) => ({ value: i, label: `sentence ${i + 1}` }))} value={ex} onChange={setEx} />
        <Choice label="Layer" options={Array.from({ length: 8 }, (_, i) => ({ value: i, label: `L${i + 1}` }))} value={layer} onChange={setLayer} />
        <Choice label="Head" options={Array.from({ length: 6 }, (_, i) => ({ value: i, label: `h${i + 1}` }))} value={head} onChange={setHead} />
      </div>
      <p className={s.how} style={{ margin: 0 }}>
        “{e.text}”
      </p>
      <div className={s.chart} style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} style={{ minWidth: 420 }} onPointerLeave={() => setHover(null)} role="img" aria-label={`Attention of layer ${layer + 1} head ${head + 1}`}>
          {e.tokens.map((t, j) => (
            <text key={`c${j}`} transform={`translate(${lab + j * cell + cell / 2 + 4}, ${lab - 6}) rotate(-55)`} style={{ fill: j === c ? "var(--ink)" : "var(--muted)", fontSize: 11 }}>
              {show(t)}
            </text>
          ))}
          {A.map((row, i) => (
            <g key={i}>
              <text x={lab - 6} y={lab + i * cell + cell / 2 + 4} textAnchor="end" style={{ fill: i === r ? "var(--ink)" : "var(--muted)", fontSize: 11 }}>
                {show(e.tokens[i])}
              </text>
              {row.map((v, j) => (
                <rect
                  key={j}
                  x={lab + j * cell + 1}
                  y={lab + i * cell + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={2}
                  fill={j > i ? "transparent" : `rgba(255, 210, 122, ${Math.max(0.04, v ** 0.6)})`}
                  stroke={hover && hover[0] === i && hover[1] === j ? "var(--ink)" : "none"}
                  onPointerEnter={() => j <= i && setHover([i, j])}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <p className={s.stat} style={{ margin: 0 }}>
        <span>
          <b>{show(e.tokens[r]).trim() || "·"}</b> → <b>{show(e.tokens[c]).trim() || "·"}</b>: {(A[r][c] * 100).toFixed(1)}% of
          this head&apos;s attention
        </span>
      </p>
    </Figure>
  );
}
