"use client";

// Why eight running sums are faster than one: independent additions can happen side by side.

import { useEffect, useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const N = 32;
const VALUES = Array.from({ length: N }, (_, i) => ((i * 37) % 11) - 5);

export default function DotLanes() {
  const [lanes, setLanes] = useState<1 | 8>(1);
  const [tick, setTick] = useState(0);
  const [play, setPlay] = useState(false);
  // One sum: one addition per tick. Eight sums: eight additions per tick, then 3 ticks to combine.
  const total = lanes === 1 ? N : N / 8 + 3;

  useEffect(() => {
    if (!play) return;
    const t = window.setInterval(() => setTick((k) => (k >= total ? (setPlay(false), k) : k + 1)), 260);
    return () => window.clearInterval(t);
  }, [play, total]);

  const done = (i: number) => (lanes === 1 ? i < tick : Math.floor(i / 8) < tick);
  const combining = lanes === 8 && tick > N / 8;

  return (
    <Figure
      title="One long sum, or eight short ones"
      how="Pick one or eight running sums and press play. Each tick is one step of the processor."
      caption={
        <>
          A dot product adds up hundreds of products. With a single running total, each addition has to wait for the
          one before. Computer arithmetic isn&apos;t exactly associative (rounding depends on the order), so the compiler
          isn&apos;t allowed to reorder it. Written as eight independent totals that are combined at the end, the
          processor can do eight additions at once with one SIMD instruction. The result differs only in the last
          bits, well inside the parity test&apos;s tolerance. This one change made glasswing&apos;s engine 3× faster.
        </>
      }
    >
      <div className={s.controls}>
        <Choice label="Sums" options={[{ value: 1, label: "one running sum" }, { value: 8, label: "eight running sums" }]} value={lanes} onChange={(v) => { setLanes(v); setTick(0); setPlay(false); }} />
        <button type="button" className={s.btn} onClick={() => { setTick(0); setPlay(true); }}>▶ play</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${lanes === 1 ? 16 : 8}, 1fr)`, gap: 4, maxWidth: 560 }}>
        {VALUES.map((v, i) => (
          <span
            key={i}
            style={{
              textAlign: "center",
              padding: "6px 0",
              borderRadius: 4,
              fontFamily: "var(--font-mono), monospace",
              fontSize: 13,
              background: done(i) ? "rgba(255,210,122,0.35)" : "var(--ground)",
              border: "1px solid var(--line)",
            }}
          >
            {v}
          </span>
        ))}
      </div>
      <div className={s.stat}>
        <span>
          ticks <b>{Math.min(tick, total)}</b> of <b>{total}</b>
        </span>
        {combining && <span>combining the eight totals…</span>}
        {tick >= total && <span>sum = <b>{VALUES.reduce((a, b) => a + b, 0)}</b></span>}
      </div>
    </Figure>
  );
}
