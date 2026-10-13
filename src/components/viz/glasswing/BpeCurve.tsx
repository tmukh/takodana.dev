"use client";

// How much each merge buys: letters per token on unseen stories, against vocabulary size, with
// what the vocabulary costs in parameters.

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Curve = {
  text_chars: number;
  total_merges: number;
  points: { merges: number; chars_per_token: number; tokens_per_1000_chars: number }[];
  single_token_at_merge: Record<string, number>;
};

const W = 760;
const H = 300;
const M = { l: 52, r: 18, t: 16, b: 40 };
const DIM = 384; // each vocabulary entry is a row of 384 numbers in the embedding table
const REST = 14_162_304; // glasswing's parameters outside the embedding table

export default function BpeCurve() {
  const data = useJson<Curve>(`${DATA}/bpe_curve.json`);
  const [hover, setHover] = useState<number | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;

  const pts = data.points;
  const maxX = data.total_merges;
  const x = (m: number) => M.l + (m / maxX) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - 1) / 3) * (H - M.t - M.b);
  const interp = (m: number) => {
    const i = pts.findIndex((p) => p.merges >= m);
    if (i <= 0) return pts[0].chars_per_token;
    const [a, b] = [pts[i - 1], pts[i]];
    return a.chars_per_token + ((m - a.merges) / (b.merges - a.merges)) * (b.chars_per_token - a.chars_per_token);
  };
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.merges).toFixed(1)},${y(p.chars_per_token).toFixed(1)}`).join("");
  const words = Object.entries(data.single_token_at_merge).filter(([w]) => w !== "the");
  // Most markers sit in the first few hundred merges; label a few, the rest show on hover.
  const labelled = new Set([" the", " Lily", " once", " dinosaur"]);

  const m = hover ?? maxX;
  const vocab = 256 + m + 1;
  const embedParams = vocab * DIM;
  const share = embedParams / (embedParams + REST);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(maxX, Math.round(((px - M.l) / (W - M.l - M.r)) * maxX))));
  };

  return (
    <Figure
      title="What each merge buys, and what it costs"
      how="Hover or drag across the chart to pick a vocabulary size."
      caption={
        <>
          Measured on {data.text_chars.toLocaleString("en")} characters of stories the tokenizer never saw. The first
          few hundred merges do most of the work; after that each one helps a little. The cost grows the whole time:
          every token in the vocabulary needs its own row of {DIM} numbers. GPT-2&apos;s 50,257-token vocabulary would
          take 19.3 million numbers at this size, more than all of glasswing.
        </>
      }
      numbers={{
        head: ["merges learned", "vocabulary", "letters per token", "tokens per 1,000 letters"],
        rows: pts.map((p) => [p.merges, 256 + p.merges + 1, p.chars_per_token, p.tokens_per_1000_chars]),
        note: "Vocabulary = 256 bytes + merges + 1 story-boundary token.",
      }}
    >
      <div className={s.chart}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={s.svg}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Letters per token rise from 1.0 with no merges to 3.9 with 3,839 merges"
        >
          {[1, 2, 3, 4].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {[0, 1000, 2000, 3000, maxX].map((t) => (
            <text key={t} x={x(t)} y={H - M.b + 18} textAnchor="middle">
              {t.toLocaleString("en")}
            </text>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle">
            merges learned
          </text>
          <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>
            letters per token
          </text>
          <path d={path} fill="none" stroke="var(--star)" strokeWidth={2} />
          {words.map(([w, at]) => (
            <g key={w}>
              <circle cx={x(at)} cy={y(interp(at))} r={4} fill="var(--ground)" stroke="var(--accent)" strokeWidth={2}>
                <title>{`"${w}" became one token at merge #${at}`}</title>
              </circle>
              {labelled.has(w) && (
                <text x={x(at) + 6} y={y(interp(at)) + 16} style={{ fill: "var(--ink-2)" }}>
                  {`"${w}" #${at}`}
                </text>
              )}
            </g>
          ))}
          {hover !== null && (
            <g>
              <line x1={x(m)} x2={x(m)} y1={M.t} y2={H - M.b} stroke="var(--line-strong)" />
              <circle cx={x(m)} cy={y(interp(m))} r={5} fill="var(--star)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      </div>
      <div className={s.stat}>
        <span>
          vocabulary <b>{vocab.toLocaleString("en")}</b>
        </span>
        <span>
          <b>{interp(m).toFixed(2)}</b> letters per token
        </span>
        <span>
          word table <b>{(embedParams / 1e6).toFixed(2)}M</b> numbers ({(share * 100).toFixed(0)}% of the model)
        </span>
      </div>
      <p className={s.how}>
        Markers show when a familiar word became a single token, e.g. <q> Lily</q> at merge #
        {data.single_token_at_merge[" Lily"]} and lowercase <q> once</q> only at #{data.single_token_at_merge[" once"]}:
        it&apos;s rare in stories, which almost always start with a capital <q>Once</q>.
      </p>
    </Figure>
  );
}
