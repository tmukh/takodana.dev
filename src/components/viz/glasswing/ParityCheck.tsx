"use client";

// The parity test, made visible: for every stage of one forward pass, the largest difference
// between the Rust engine and PyTorch, on the golden fixture model. Toggle in a real bug.

import { useState } from "react";
import { Choice, DATA, Figure, useJson } from "../ui";
import s from "../viz.module.css";

type Stage = { name: string; shape: number[]; max_diff: number; max_abs: number };
type Parity = { tolerance: number; ok: Stage[]; broken: Stage[] };

const LO = -8;
const HI = 2;
const pos = (v: number) => ((Math.log10(Math.max(v, 1e-8)) - LO) / (HI - LO)) * 100;

export default function ParityCheck() {
  const data = useJson<Parity>(`${DATA}/parity.json`);
  const [mode, setMode] = useState<"ok" | "broken">("ok");
  if (!data) return <p className="viz-loading">Loading data…</p>;
  const rows = data[mode];
  const first = rows.findIndex((r) => r.max_diff > data.tolerance);

  return (
    <Figure
      title="Checking every step against the original"
      how="Switch between the real engine and a copy with one bug planted in it."
      caption={
        mode === "ok" ? (
          <>
            One prompt through a small test model with random weights, compared stage by stage with PyTorch. Every
            stage agrees to within {data.tolerance.toExponential(0)} (the dashed line). They&apos;re not exactly equal:
            the two programs add up the same numbers in a different order, and computer arithmetic rounds a tiny bit
            differently depending on the order. This exact comparison runs on every change to the code.
          </>
        ) : (
          <>
            Here one 64×64 matrix, the query weights of layer 1, was loaded transposed: rows and columns swapped. It has
            the right shape, so no size check can notice. Everything before it still matches; the first stage that
            uses it, <code>layers.1.q</code>, is off by {rows[first].max_diff.toFixed(1)}, and the error spreads into
            everything after it. The test points at the exact stage, which made this bug a one-minute fix instead of a
            day of guessing.
          </>
        )
      }
      numbers={{
        head: ["stage", "shape", "largest difference", "largest value"],
        rows: rows.map((r) => [r.name, `[${r.shape.join(", ")}]`, r.max_diff.toExponential(1), r.max_abs.toFixed(2)]),
      }}
    >
      <Choice
        label="Engine"
        options={[
          { value: "ok", label: "the real engine" },
          { value: "broken", label: "one matrix transposed" },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(170px + (100% - 170px - 70px) * ${pos(data.tolerance) / 100})`, borderLeft: "1px dashed var(--ink-2)" }} aria-hidden="true" />
        <ol className={s.neighbours} style={{ gap: 3 }}>
          {rows.map((r, i) => {
            const bad = r.max_diff > data.tolerance;
            return (
              <li key={r.name} style={{ gridTemplateColumns: "162px 1fr 62px" }} title={`shape [${r.shape.join(", ")}], largest value ${r.max_abs.toFixed(2)}`}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, color: i === first ? "#ff9d8a" : "var(--ink-2)" }}>
                  {i === first ? "▶ " : ""}
                  {r.name}
                </span>
                <span style={{ position: "relative", height: 10 }}>
                  <span className={s.bar} style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${pos(r.max_diff)}%`, background: bad ? "#de5c3c" : "var(--accent)" }} />
                </span>
                <span className={s.val}>{r.max_diff ? r.max_diff.toExponential(0) : "0"}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className={s.how} style={{ margin: 0 }}>
        Bars on a log scale from 10<sup>−8</sup> to 10<sup>2</sup>; dashed line: the tolerance, 10<sup>−4</sup>. Red: fails.
      </p>
    </Figure>
  );
}
