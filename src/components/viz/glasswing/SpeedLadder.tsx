"use client";

// Where the speed came from: measured tokens per second for each version of the engine, against
// the limit set by how fast memory can be read.

import { useState } from "react";
import { Figure } from "../ui";
import s from "../viz.module.css";

const ROWS = [
  { label: "native, one running sum", tps: 94, note: "The first version. Adding 384 products one after another, each addition waiting for the previous one." },
  { label: "native, 8 running sums", tps: 295, note: "Same maths, split into 8 independent sums: the CPU can add 4 or 8 numbers in one instruction (SIMD). 3× faster." },
  { label: "native, AVX2 (8 lanes)", tps: 300, note: "Wider instructions barely help (275–360, noisy): now the CPU waits on memory, not on arithmetic." },
  { label: "browser, no SIMD", tps: 193, note: "WebAssembly in V8 (Chrome's engine) without its SIMD instructions." },
  { label: "browser, SIMD", tps: 285, note: "WebAssembly with 128-bit SIMD: almost native speed, including the full trace for the visualisation." },
];
const LIMIT = 320; // ~20 GB/s of memory bandwidth / 63 MB of weights read per token

export default function SpeedLadder() {
  const [on, setOn] = useState(1);
  const max = 380;
  return (
    <Figure
      title="Where the speed came from"
      how="Hover a bar for what changed."
      caption={
        <>
          Writing one word reads every weight once: 63 MB of numbers, for one multiply-add each. That makes generation
          limited by memory, not arithmetic: at the ~20 GB/s this laptop reads memory, the ceiling is about{" "}
          {LIMIT} words per second (dashed line). The first version was nowhere near it, because of how it added
          numbers up. All numbers measured on the same machine, generating 190 tokens.
        </>
      }
      numbers={{ head: ["version", "tokens per second"], rows: ROWS.map((r) => [r.label, r.tps]) }}
    >
      <div style={{ position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: -6, bottom: 0, left: `calc(190px + (100% - 190px - 60px) * ${LIMIT / max})`, borderLeft: "1px dashed var(--ink-2)" }} />
        <ol className={s.neighbours} style={{ gap: 10 }}>
          {ROWS.map((r, i) => (
            <li key={r.label} style={{ gridTemplateColumns: "182px 1fr 52px", cursor: "default" }} onPointerEnter={() => setOn(i)} onFocus={() => setOn(i)} tabIndex={0}>
              <span style={{ fontSize: 13, color: i === on ? "var(--ink)" : "var(--ink-2)" }}>{r.label}</span>
              <span className={s.bar} style={{ height: 14, width: `${(r.tps / max) * 100}%`, background: r.label.startsWith("browser") ? "var(--accent)" : "var(--star)", opacity: i === on ? 1 : 0.7 }} />
              <span className={s.val}>{r.tps}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={s.how} style={{ margin: 0, minHeight: 42 }} aria-live="polite">
        <b style={{ color: "var(--ink)" }}>{ROWS[on].label}:</b> {ROWS[on].note}
      </p>
    </Figure>
  );
}
