"use client";

// One word's embedding: 384 numbers as a strip of coloured cells, and the words whose vectors
// point in the most similar direction (cosine similarity).

import { useState } from "react";
import { Choice, DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Emb = Record<string, { vector: number[]; nearest: { word: string; cosine: number }[] }>;

const PICKS = ["Lily", "happy", "dog", "red", "three", "cake", "jumped", "mom"];

// Diverging: blue for negative, gold for positive, dark at zero (the site's validated pair).
function cell(v: number, scale: number) {
  const t = Math.max(-1, Math.min(1, v / scale));
  const a = Math.abs(t) ** 0.8;
  return t >= 0 ? `rgba(255, 210, 122, ${a})` : `rgba(127, 168, 255, ${a})`;
}

function cosine(a: number[], b: number[]) {
  let d = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / Math.sqrt(na * nb);
}

export default function WordVector() {
  const data = useJson<Emb>(`${DATA}/embeddings.json`);
  const [word, setWordState] = useState("Lily");
  const [other, setOther] = useState("Anna");
  if (!data) return <p className="viz-loading">Loading data…</p>;
  // Picking a word compares it with its nearest neighbour that has a vector in the data.
  const setWord = (w: string) => {
    setWordState(w);
    const n = data[w].nearest.find((x) => x.word in data && x.word !== w);
    if (n) setOther(n.word);
  };

  const e = data[word];
  const scale = Math.max(...e.vector.map(Math.abs)) * 0.8;
  const words = Object.keys(data);
  const o = data[other];

  return (
    <Figure
      title="One word, 384 numbers"
      how="Pick a word to see its vector and its nearest neighbours; compare it with any other word."
      caption={
        <>
          Each cell is one of the 384 numbers glasswing learned for the word (gold positive, blue negative). No single
          number means anything readable on its own; what matters is the direction they point in together. Cosine
          similarity measures that: 1 means the same direction, 0 unrelated. Opposites like <q>happy</q> and{" "}
          <q>sad</q> often end up close, because they appear in the same places in sentences.
        </>
      }
      numbers={{
        head: ["nearest to “" + word + "”", "cosine similarity"],
        rows: e.nearest.map((n) => [n.word, n.cosine]),
      }}
    >
      <Choice label="Word" options={PICKS.map((p) => ({ value: p, label: p }))} value={word} onChange={setWord} />
      <div className={s.cols}>
        <div>
          <p className={s.how} style={{ marginBottom: 6 }}>
            “{word}”
          </p>
          <div className={s.strip} aria-label={`The 384 numbers of ${word}`}>
            {e.vector.map((v, i) => (
              <span key={i} style={{ background: cell(v, scale) }} title={`dimension ${i}: ${v}`} />
            ))}
          </div>
          <p className={s.how} style={{ margin: "14px 0 6px" }}>
            compared with{" "}
            <select value={other} onChange={(ev) => setOther(ev.target.value)} className={s.btn} aria-label="Compare with">
              {words.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>{" "}
            : cosine similarity <b style={{ color: "var(--ink)" }}>{cosine(e.vector, o.vector).toFixed(2)}</b>
          </p>
          <div className={s.strip} aria-label={`The 384 numbers of ${other}`} style={{ marginBottom: 4 }}>
            {o.vector.map((v, i) => (
              <span key={i} style={{ background: cell(v, scale) }} title={`dimension ${i}: ${v}`} />
            ))}
          </div>
        </div>
        <div>
          <p className={s.how} style={{ marginBottom: 6 }}>
            Nearest words to “{word}”
          </p>
          <ol className={s.neighbours}>
            {e.nearest.map((n) => (
              <li key={n.word}>
                <span>{n.word}</span>
                <span className={s.bar} style={{ width: `${Math.max(0, n.cosine) * 100}%` }} />
                <span className={s.val}>{n.cosine.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Figure>
  );
}
