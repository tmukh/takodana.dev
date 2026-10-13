"use client";

// Neurons with a job: the story snippets that make a few of glasswing's MLP neurons fire hardest.

import { useState } from "react";
import { DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Neuron = {
  layer: number;
  neuron: number;
  label: string;
  examples: { before: string; token: string; after: string; activation: number }[];
};

const show = (t: string) => t.replace(/\n/g, " ↵ ");

export default function Neurons() {
  const data = useJson<Neuron[]>(`${DATA}/neurons.json`);
  const [i, setI] = useState(0);
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const n = data[i];
  const max = Math.max(...n.examples.map((e) => e.activation));

  return (
    <Figure
      title="Neurons with a job"
      how="Pick a neuron to see the moments in unseen stories where it fires hardest."
      caption={
        <>
          Found by running the model over 2,000 stories it never trained on and keeping, for each of its 8,192 neurons,
          the moments it fired hardest. Most neurons do several things at once and resist a simple label; these are a
          few of the readable ones. The model can&apos;t see ahead, so a neuron that fires on the full stop before{" "}
          <q>One day</q> isn&apos;t reacting to <q>One day</q>: it&apos;s <i>predicting</i> that the story is about to
          turn.
        </>
      }
      numbers={{
        head: ["activation", "context (the neuron fires on the word in [brackets])"],
        rows: n.examples.map((e) => [e.activation, `…${show(e.before)}[${show(e.token)}]${show(e.after)}…`]),
      }}
    >
      <div className={s.choice} role="group" aria-label="Neuron">
        {data.map((x, j) => (
          <button key={j} type="button" aria-pressed={j === i} onClick={() => setI(j)}>
            {x.label}
          </button>
        ))}
      </div>
      <p className={s.how} style={{ margin: 0 }}>
        Layer {n.layer}, neuron {n.neuron}
      </p>
      <ol className={s.neighbours} style={{ gap: 8 }}>
        {n.examples.map((e, j) => (
          <li key={j} style={{ gridTemplateColumns: "minmax(0,1fr) 90px 44px" }}>
            <span style={{ fontSize: 14, lineHeight: 1.45 }}>
              <span style={{ color: "var(--muted)" }}>…{show(e.before)}</span>
              <mark style={{ background: "rgba(255,210,122,0.35)", color: "var(--ink)", borderRadius: 3, padding: "0 2px" }}>
                {show(e.token)}
              </mark>
              <span style={{ color: "var(--muted)" }}>{show(e.after)}…</span>
            </span>
            <span className={s.bar} style={{ width: `${(e.activation / max) * 100}%`, background: "var(--star)" }} />
            <span className={s.val}>{e.activation.toFixed(1)}</span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}
