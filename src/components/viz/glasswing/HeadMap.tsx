"use client";

// All 48 heads at once: their induction score, previous-token score, or how much the name task
// suffers when each one alone is switched off.

import { useState } from "react";
import { Choice, DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Interp = {
  heads: { induction: number[][]; previous_token: number[][] };
  names: { head_ablation_logit_diff_drop: number[][] };
  ablation: { induction_heads: [number, number][] };
};

const VIEWS = [
  { value: "induction", label: "induction score", unit: "", note: "attention from a repeated word to the word after its first occurrence" },
  { value: "previous_token", label: "previous-token score", unit: "", note: "attention to the word right before" },
  { value: "names", label: "matters for names", unit: "", note: "drop in the name task's logit difference (10.4 with every head on) when only this head is switched off" },
] as const;
type View = (typeof VIEWS)[number]["value"];

export default function HeadMap() {
  const data = useJson<Interp>(`${DATA}/interp.json`);
  const [view, setView] = useState<View>("induction");
  const [hover, setHover] = useState<[number, number] | null>(null);
  if (!data) return <p className="viz-loading">Loading data…</p>;

  const m = view === "names" ? data.names.head_ablation_logit_diff_drop : data.heads[view];
  const max = Math.max(...m.flat());
  const circuit = new Set(data.ablation.induction_heads.map(([l, h]) => `${l}:${h}`));
  const cell = 52;
  const lab = 64;
  const W = lab + 6 * cell + 4;
  const H = 24 + 8 * cell + 4;
  const [hl, hh] = hover ?? [3, 3];
  const v = VIEWS.find((x) => x.value === view)!;

  return (
    <Figure
      title="All 48 heads, three ways"
      how="Switch the measure; hover a head for its value. Outlined: the circuit."
      caption={
        <>
          The induction score finds one head, L4H4. The previous-token score finds the heads it reads from, L3H3 and
          L3H1, one layer below. The third view asks a different question: which heads does the model actually need
          to name the right person? L4H4 is among them, but so are heads in layers 1, 2, 5 and 6 that the first
          two measures don&apos;t flag: copying is only part of the job.
        </>
      }
      numbers={{
        head: ["layer", ...Array.from({ length: 6 }, (_, h) => `h${h + 1}`)],
        rows: m.map((row, l) => [`L${l + 1}`, ...row.map((x) => x.toFixed(3))]),
        note: v.note,
      }}
    >
      <Choice label="Measure" options={VIEWS.map(({ value, label }) => ({ value, label }))} value={view} onChange={setView} />
      <div className={s.cols}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} style={{ maxWidth: 420 }} onPointerLeave={() => setHover(null)} role="img" aria-label={`${v.label} for every head`}>
          {Array.from({ length: 6 }, (_, h) => (
            <text key={h} x={lab + h * cell + cell / 2} y={16} textAnchor="middle">h{h + 1}</text>
          ))}
          {m.map((row, l) => (
            <g key={l}>
              <text x={lab - 8} y={24 + l * cell + cell / 2 + 4} textAnchor="end">layer {l + 1}</text>
              {row.map((x, h) => (
                <rect
                  key={h}
                  x={lab + h * cell + 2}
                  y={24 + l * cell + 2}
                  width={cell - 4}
                  height={cell - 4}
                  rx={4}
                  fill={`rgba(255, 210, 122, ${Math.max(0.03, Math.max(0, x) / max) ** 0.8})`}
                  stroke={circuit.has(`${l}:${h}`) ? "var(--accent)" : hover && hl === l && hh === h ? "var(--ink)" : "none"}
                  strokeWidth={circuit.has(`${l}:${h}`) ? 2.5 : 1.5}
                  onPointerEnter={() => setHover([l, h])}
                />
              ))}
            </g>
          ))}
        </svg>
        <div className={s.stat} style={{ flexDirection: "column", gap: 8, alignSelf: "center" }}>
          <span>
            L{hl + 1}H{hh + 1}: <b>{m[hl][hh].toFixed(3)}</b>
          </span>
          <span className={s.how}>{v.note}</span>
          {circuit.has(`${hl}:${hh}`) && <span className={s.how}>part of the induction circuit</span>}
        </div>
      </div>
    </Figure>
  );
}
