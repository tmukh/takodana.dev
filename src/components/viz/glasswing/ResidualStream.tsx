"use client";

// The residual stream at one word: what each layer's attention and MLP add, and what the model
// would guess if it stopped after that layer (the logit lens).

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Layer = { attn: number; mlp: number; resid: number; lens: [string, number][] };
type Res = { text: string; positions: { token: string; embed: number; layers: Layer[] }[] };

const show = (t: string) => (t === "<|endoftext|>" ? "⟨end⟩" : t.replace(/\n/g, "↵"));

export default function ResidualStream() {
  const data = useJson<Res>(`${DATA}/residual.json`);
  const [pos, setPos] = useState(14);
  if (!data) return <p className="viz-loading">Loading data…</p>;

  const p = data.positions[pos];
  const max = Math.max(...data.positions.flatMap((x) => x.layers.flatMap((l) => [l.attn, l.mlp])));
  const next = data.positions[pos + 1]?.token;

  return (
    <Figure
      title="Following one word up through the layers"
      how="Pick a word. For each layer: how much attention and the MLP added, and the model's best guess for the next word if it stopped there."
      caption={
        <>
          The bars are the length of what each part adds to this word’s vector (longer = a bigger change). The guesses
          on the right come from the <i>logit lens</i>: take the vector after a layer and read it with the model’s
          final output step, as if the model stopped early. Watch how the guess for the next word sharpens on the way
          up: at <q>to</q>, the right name only appears in the upper layers.
        </>
      }
      numbers={{
        head: ["layer", "attention adds", "MLP adds", "vector length", "best guess", "probability"],
        rows: p.layers.map((l, i) => [i + 1, l.attn, l.mlp, l.resid, show(l.lens[0][0]), `${(l.lens[0][1] * 100).toFixed(1)}%`]),
      }}
    >
      <div className={s.tokens} role="group" aria-label="Word">
        {data.positions.map((x, i) => (
          <button
            key={i}
            type="button"
            className={s.tok}
            onClick={() => setPos(i)}
            style={{ cursor: "pointer", font: "inherit", color: "inherit", outline: i === pos ? "2px solid var(--accent)" : undefined }}
            aria-pressed={i === pos}
          >
            {show(x.token)}
          </button>
        ))}
      </div>
      <p className={s.how} style={{ margin: 0 }}>
        At <b style={{ color: "var(--ink)" }}>“{show(p.token).trim()}”</b>
        {next !== undefined && (
          <>
            ; the word that actually came next was <b style={{ color: "var(--ink)" }}>“{show(next).trim()}”</b>
          </>
        )}
      </p>
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 6 }}>
        {p.layers.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) minmax(0,1fr) 170px", gap: 10, alignItems: "center", fontSize: 13 }}>
            <span className={s.val} style={{ textAlign: "left" }}>L{i + 1}</span>
            <span title={`attention adds ${l.attn}`} style={{ height: 10, borderRadius: 2, background: "var(--accent)", width: `${(l.attn / max) * 100}%` }} />
            <span title={`MLP adds ${l.mlp}`} style={{ height: 10, borderRadius: 2, background: "var(--star)", width: `${(l.mlp / max) * 100}%` }} />
            <span style={{ fontFamily: "var(--font-mono), monospace", color: next !== undefined && l.lens[0][0] === next ? "var(--star)" : "var(--ink-2)", whiteSpace: "pre" }}>
              {show(l.lens[0][0])} {(l.lens[0][1] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) minmax(0,1fr) 170px", gap: 10, fontSize: 12, color: "var(--muted)" }}>
          <span />
          <span>attention adds</span>
          <span>MLP adds</span>
          <span>best guess (logit lens)</span>
        </div>
      </div>
    </Figure>
  );
}
