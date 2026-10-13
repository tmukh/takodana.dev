"use client";

// Choosing the next word from the model's real distribution: temperature reshapes it, top-p cuts
// the long tail, and a seeded draw picks one.

import { useMemo, useState } from "react";
import { Choice, DATA, Figure, Slider, useJson } from "../ui";
import s from "../viz.module.css";

type Pred = { prompt: string; words: string[]; logits: number[]; probs: number[]; rest: number };
const show = (t: string) => t.replace(/\n/g, "↵");

// Small seeded generator, so "draw 100 times" is repeatable.
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

export default function Sampler() {
  const data = useJson<Pred[]>(`${DATA}/predictions.json`);
  const [k, setK] = useState(1);
  const [temp, setTemp] = useState(0.8);
  const [topP, setTopP] = useState(0.9);
  const [draws, setDraws] = useState<number[]>([]);

  const view = useMemo(() => {
    if (!data) return null;
    const d = data[k];
    // Temperature divides the logits before softmax. (Computed over the top 40 words, which hold
    // nearly all of the probability; the remaining words are left out of this figure.)
    const scaled = d.logits.map((l) => l / Math.max(temp, 1e-3));
    const m = Math.max(...scaled);
    const e = scaled.map((v) => Math.exp(v - m));
    const z = e.reduce((a, b) => a + b, 0);
    const p = e.map((v) => v / z);
    let mass = 0;
    const kept = p.map((v) => {
      const keep = temp === 0 ? v === Math.max(...p) : mass < topP;
      mass += v;
      return keep;
    });
    const keptMass = p.reduce((a, v, i) => a + (kept[i] ? v : 0), 0);
    return { d, p, kept, final: p.map((v, i) => (kept[i] ? v / keptMass : 0)) };
  }, [data, k, temp, topP]);
  if (!data || !view) return <p className="viz-loading">Loading data…</p>;

  const draw = (n: number) => {
    const r = rng(Date.now() % 100000);
    const out: number[] = [];
    for (let t = 0; t < n; t++) {
      let u = r();
      let j = 0;
      while (j < view.final.length - 1 && (u -= view.final[j]) > 0) j++;
      out.push(j);
    }
    setDraws(out);
  };
  const counts = view.final.map((_, j) => draws.filter((x) => x === j).length);
  const keptN = view.kept.filter(Boolean).length;

  return (
    <Figure
      title="Picking the next word"
      how="Choose a prompt, then change temperature and top-p and draw some words."
      caption={
        <>
          The model only produces probabilities; something has to pick a word. Always taking the top one (temperature 0)
          gives safe, repetitive text. <b>Temperature</b> reshapes the odds before picking: below 1 the favourite gets
          even more likely, above 1 the long shots catch up. <b>Top-p</b> then keeps only the most likely words that
          together make up p of the probability, so the occasional absurd word can&apos;t sneak in. The lab uses 0.8 and
          0.9. These are the trained model&apos;s real probabilities for each prompt.
        </>
      }
      numbers={{
        head: ["word", "model probability", "after temperature", "kept by top-p", "chance of being picked"],
        rows: view.d.words.slice(0, 20).map((w, j) => [show(w), `${(view.d.probs[j] * 100).toFixed(2)}%`, `${(view.p[j] * 100).toFixed(2)}%`, view.kept[j] ? "yes" : "no", `${(view.final[j] * 100).toFixed(2)}%`]),
      }}
    >
      <Choice label="Prompt" options={data.map((d, j) => ({ value: j, label: `…${d.prompt.split(" ").slice(-4).join(" ")}` }))} value={k} onChange={(v) => { setK(v); setDraws([]); }} />
      <p className={s.how} style={{ margin: 0 }}>“{view.d.prompt} …”</p>
      <div className={s.controls}>
        <Slider label="temperature" value={temp} min={0} max={2} step={0.05} onChange={(v) => { setTemp(v); setDraws([]); }} format={(v) => v.toFixed(2)} />
        <Slider label="top-p" value={topP} min={0.1} max={1} step={0.05} onChange={(v) => { setTopP(v); setDraws([]); }} format={(v) => v.toFixed(2)} />
      </div>
      <div className={s.controls}>
        <button type="button" className={s.btn} onClick={() => draw(1)}>draw one word</button>
        <button type="button" className={s.btn} onClick={() => draw(100)}>draw 100 times</button>
        <span className={s.how}>{keptN} of 40 words left in the running</span>
      </div>
      <ol className={s.neighbours}>
        {view.d.words.slice(0, 12).map((w, j) => (
          <li key={j} style={{ gridTemplateColumns: "110px 1fr 120px", opacity: view.kept[j] ? 1 : 0.4 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", whiteSpace: "pre" }}>{show(w)}</span>
            <span className={s.bar} style={{ width: `${view.final[j] * 100}%`, background: view.kept[j] ? "var(--star)" : "var(--line-strong)" }} />
            <span className={s.val}>
              {(view.final[j] * 100).toFixed(1)}%{draws.length > 0 ? ` · ${counts[j]}×` : ""}
            </span>
          </li>
        ))}
      </ol>
      {draws.length === 1 && (
        <p className={s.stat} style={{ margin: 0 }}>
          picked: <b>“{show(view.d.words[draws[0]]).trim()}”</b>
        </p>
      )}
    </Figure>
  );
}
