"use client";

// A map of glasswing's word vectors: 320 frequent words, placed so that words with similar
// vectors sit close together (t-SNE). Nobody told the model what a name or a colour is.

import { useMemo, useState } from "react";
import { Choice, DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Point = { word: string; x: number; y: number; category: string; count: number };
type MapData = { categories: string[]; points: Point[] };

const W = 760;
const H = 480;
const PAD = 26;

export default function WordMap() {
  const data = useJson<MapData>(`${DATA}/word_map.json`);
  const [cat, setCat] = useState("names");
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<Point | null>(null);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? data?.points.find((p) => p.word.toLowerCase() === q) ?? null : null;
  }, [data, query]);
  if (!data) return <p className="viz-loading">Loading data…</p>;

  const px = (p: Point) => PAD + p.x * (W - 2 * PAD);
  const py = (p: Point) => PAD + (1 - p.y) * (H - 2 * PAD);
  const lit = (p: Point) => p.category === cat || p === found;

  // Label placement: highlighted words often sit in one tight cluster (that's the point), so
  // labels are nudged down until they don't overlap a label already placed nearby.
  const labels: { p: Point; lx: number; ly: number }[] = [];
  for (const p of data.points.filter(lit).sort((a, b) => py(a) - py(b))) {
    const lx = px(p) + 9;
    let ly = py(p) + 4;
    const w = p.word.length * 7 + 6;
    while (labels.some((o) => Math.abs(o.ly - ly) < 14 && lx < o.lx + o.p.word.length * 7 + 6 && o.lx < lx + w)) ly += 14;
    labels.push({ p, lx, ly });
  }

  return (
    <Figure
      title="A map of the words glasswing knows"
      how="Pick a group to light it up, hover any dot, or search for a word."
      caption={
        <>
          Each dot is one word&apos;s vector of 384 numbers, squeezed onto a flat map so that words with similar
          vectors land close together (t-SNE, cosine similarity). The model was never told what a name, a colour or an
          animal is: it only learned to predict the next word, and words used in the same places ended up with similar
          numbers. Distances between far-apart groups on such a map don&apos;t mean much; neighbourhoods do.
        </>
      }
      numbers={{
        head: ["word", "group", "x", "y", "times in 3,000 stories"],
        rows: data.points.map((p) => [p.word, p.category, p.x, p.y, p.count]),
      }}
    >
      <div className={s.controls}>
        <Choice
          label="Group"
          options={data.categories.map((c) => ({ value: c, label: c }))}
          value={cat}
          onChange={setCat}
        />
        <input
          className={s.input}
          style={{ maxWidth: 220 }}
          placeholder="find a word, e.g. dragon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find a word"
        />
      </div>
      <div className={s.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={`Word map with the ${cat} highlighted`}>
          {data.points
            .filter((p) => !lit(p))
            .map((p) => (
              <circle
                key={p.word}
                cx={px(p)}
                cy={py(p)}
                r={3.2}
                fill="var(--line-strong)"
                onPointerEnter={() => setHover(p)}
                onPointerLeave={() => setHover(null)}
              />
            ))}
          {labels.map(({ p, lx, ly }) =>
            Math.abs(ly - (py(p) + 4)) > 1 ? (
              <line key={`l-${p.word}`} x1={px(p)} y1={py(p)} x2={lx - 2} y2={ly - 4} stroke="var(--line-strong)" />
            ) : null,
          )}
          {labels.map(({ p, lx, ly }) => (
            <g key={p.word} onPointerEnter={() => setHover(p)} onPointerLeave={() => setHover(null)}>
              <circle cx={px(p)} cy={py(p)} r={5} fill="var(--star)" stroke="var(--surface)" strokeWidth={2} />
              <text x={lx} y={ly} style={{ fill: "var(--ink)", fontSize: 12 }}>
                {p.word}
              </text>
            </g>
          ))}
        </svg>
        {hover && (
          <div className={s.tip} style={{ left: `${(px(hover) / W) * 100}%`, top: `${(py(hover) / H) * 100}%` }}>
            <b>{hover.word}</b> · {hover.count.toLocaleString("en")} uses
          </div>
        )}
      </div>
      {query && !found && <p className={s.how}>“{query}” isn&apos;t one of the 320 words on this map.</p>}
    </Figure>
  );
}
