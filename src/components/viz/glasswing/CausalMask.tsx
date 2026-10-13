"use client";

// The causal mask: while training, each word may look only at itself and earlier words.

import { useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const TOKENS = ["Lily", " gave", " the", " ball", " to", " Ben", "."];

export default function CausalMask() {
  const [mask, setMask] = useState<"on" | "off">("on");
  const [row, setRow] = useState(3);
  const n = TOKENS.length;
  const cell = 46;
  const lab = 64;
  const W = lab + n * cell + 4;
  const H = lab + n * cell + 4;
  const allowed = (r: number, c: number) => mask === "off" || c <= r;

  return (
    <Figure
      title="No peeking at the future"
      how="Hover a row: the word on that row may look at the lit columns. Switch the mask off to see the problem."
      caption={
        mask === "on" ? (
          <>
            With the mask, <q>{TOKENS[row].trim()}</q> sees only {row + 1} word{row ? "s" : ""}: itself and what came
            before. During training the model predicts the next word at every position at once; the mask makes each of
            those predictions honest.
          </>
        ) : (
          <>
            Without the mask, <q>{TOKENS[row].trim()}</q> can read the very word it is supposed to predict
            {row < n - 1 ? (
              <>
                {" "}
                (<q>{TOKENS[row + 1].trim()}</q>)
              </>
            ) : null}
            . I tried this on purpose: the loss fell to 0.55 instead of 2.96, which looks like a huge improvement, and
            the model wrote <q>did did but very both both did</q>. It had learned to copy, not to predict, and when it
            writes on its own there is nothing to copy.
          </>
        )
      }
    >
      <Choice label="Mask" options={[{ value: "on", label: "mask on" }, { value: "off", label: "mask off" }]} value={mask} onChange={setMask} />
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} style={{ maxWidth: 420 }} role="img" aria-label="Which words each word may look at">
        {TOKENS.map((t, c) => (
          <text key={`c${c}`} x={lab + c * cell + cell / 2} y={lab - 10} textAnchor="middle" style={{ fill: "var(--ink-2)", fontSize: 12 }}>
            {t.trim()}
          </text>
        ))}
        {TOKENS.map((t, r) => (
          <g key={`r${r}`} onPointerEnter={() => setRow(r)} style={{ cursor: "pointer" }}>
            <text x={lab - 8} y={lab + r * cell + cell / 2 + 4} textAnchor="end" style={{ fill: r === row ? "var(--ink)" : "var(--ink-2)", fontSize: 12 }}>
              {t.trim()}
            </text>
            {TOKENS.map((_, c) => {
              const ok = allowed(r, c);
              const lit = r === row && ok;
              const future = c > r;
              return (
                <rect
                  key={c}
                  x={lab + c * cell + 2}
                  y={lab + r * cell + 2}
                  width={cell - 4}
                  height={cell - 4}
                  rx={4}
                  fill={lit ? (future ? "rgba(222,92,60,0.75)" : "var(--star)") : ok ? (future ? "rgba(222,92,60,0.25)" : "rgba(255,210,122,0.22)") : "var(--ground)"}
                  stroke={r === row ? "var(--line-strong)" : "var(--line)"}
                />
              );
            })}
          </g>
        ))}
        <text x={4} y={14} style={{ fill: "var(--muted)" }}>
          looking from ↓ at →
        </text>
      </svg>
      {mask === "off" && <p className={s.how}>Red cells: the future, visible only because the mask is off.</p>}
    </Figure>
  );
}
