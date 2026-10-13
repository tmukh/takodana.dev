"use client";

// How an induction circuit works, in three steps, on a sentence with a repeat.

import { useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const WORDS = ["The", "red", "ball", "and", "the", "blue", "box", ".", "The", "red"];
const CUR = 9; // the second "red": what comes next?
const STEPS = [
  {
    label: "1. look back one word",
    text: "Layer 3: a previous-token head (L3H3) makes every word look at the word right before it, and copies a note into the word's vector: “the word before me was …”. Now “ball” carries the note “after red”.",
  },
  {
    label: "2. find the earlier occurrence",
    text: "Layer 4: the induction head (L4H4) at the second “red” asks: which earlier word has the note “the word before me was red”? Its query matches the key built from that note, so it lands on “ball”, exactly one step after the first “red”.",
  },
  {
    label: "3. copy what came next",
    text: "It copies “ball” into the vector of the second “red”, and the model predicts “ball”. Two heads in two layers: neither could do it alone, which is why one-layer models can't copy like this.",
  },
];

export default function InductionExplainer() {
  const [step, setStep] = useState(0);
  const W = 820;
  const H = 210;
  const xs = (i: number) => 38 + i * 72;
  const y0 = 120;

  return (
    <Figure title="How the copying trick works" how="Step through it.">
      <Choice label="Step" options={STEPS.map((st, i) => ({ value: i, label: st.label }))} value={step} onChange={setStep} />
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={STEPS[step].text}>
        <defs>
          <marker id="ia" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
          </marker>
        </defs>
        {WORDS.map((w, i) => {
          const lit = (step >= 1 && i === 2) || i === CUR;
          return (
            <g key={i}>
              <rect x={xs(i) - 30} y={y0} width={60} height={34} rx={6} fill={lit ? "rgba(255,210,122,0.18)" : "var(--ground)"} stroke={i === CUR ? "var(--star)" : "var(--line-strong)"} />
              <text x={xs(i)} y={y0 + 22} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 14 }}>{w}</text>
              {step === 0 && i > 0 && (
                <path d={`M${xs(i) - 12},${y0} C${xs(i) - 30},${y0 - 34} ${xs(i - 1) + 20},${y0 - 34} ${xs(i - 1) + 6},${y0}`} fill="none" stroke="var(--accent)" strokeWidth={i === 2 ? 2.5 : 1.2} opacity={i === 2 ? 1 : 0.5} markerEnd="url(#ia)" />
              )}
              {step >= 0 && i === 2 && (
                <text x={xs(i)} y={y0 + 56} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12 }}>note: after “red”</text>
              )}
            </g>
          );
        })}
        {step >= 1 && (
          <path d={`M${xs(CUR)},${y0} C${xs(CUR) - 60},${y0 - 110} ${xs(2) + 60},${y0 - 110} ${xs(2)},${y0}`} fill="none" stroke="var(--star)" strokeWidth={3} markerEnd="url(#ia)" />
        )}
        {step >= 1 && (
          <text x={(xs(CUR) + xs(2)) / 2} y={y0 - 84} textAnchor="middle" style={{ fill: "var(--star)", fontSize: 12 }}>
            induction head: “who comes after red?”
          </text>
        )}
        {step === 2 && (
          <g>
            <rect x={xs(CUR) + 40} y={y0} width={60} height={34} rx={6} fill="none" stroke="var(--star)" strokeDasharray="4 3" />
            <text x={xs(CUR) + 70} y={y0 + 22} textAnchor="middle" style={{ fill: "var(--star)", fontSize: 14 }}>ball?</text>
          </g>
        )}
      </svg>
      <p className={s.caption} style={{ margin: 0, minHeight: 68 }} aria-live="polite">
        {STEPS[step].text}
      </p>
    </Figure>
  );
}
