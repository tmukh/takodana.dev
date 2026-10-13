"use client";

// How a number is stored in 32 or 16 bits: sign, exponent, mantissa, and what rounding costs.

import { useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const f32buf = new DataView(new ArrayBuffer(4));
const f32Bits = (x: number) => (f32buf.setFloat32(0, x), f32buf.getUint32(0));
const fromF32Bits = (b: number) => (f32buf.setUint32(0, b >>> 0), f32buf.getFloat32(0));

// f32 -> f16 bits, round to nearest even (what PyTorch's .half() does).
function f16Bits(x: number): number {
  const b = f32Bits(x);
  const sign = (b >>> 16) & 0x8000;
  const exp = (b >>> 23) & 0xff;
  let man = b & 0x7fffff;
  if (exp === 0xff) return sign | 0x7c00 | (man ? 0x200 : 0);
  const e = exp - 127 + 15;
  if (e >= 0x1f) return sign | 0x7c00; // too big: infinity
  if (e <= 0) {
    if (e < -10) return sign; // too small: zero
    man |= 0x800000;
    const shift = 14 - e;
    let half = man >>> shift;
    const rem = man & ((1 << shift) - 1);
    const mid = 1 << (shift - 1);
    if (rem > mid || (rem === mid && half & 1)) half++;
    return sign | half;
  }
  let h = sign | (e << 10) | (man >>> 13);
  const rem = man & 0x1fff;
  if (rem > 0x1000 || (rem === 0x1000 && h & 1)) h++;
  return h;
}
function fromF16Bits(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >>> 10) & 0x1f;
  const man = h & 0x3ff;
  if (exp === 0) return sign * man * 2 ** -24;
  if (exp === 0x1f) return man ? NaN : sign * Infinity;
  return sign * (1 + man / 1024) * 2 ** (exp - 15);
}
function bf16Bits(x: number): number {
  const b = f32Bits(x);
  const round = ((b >>> 16) & 1) + 0x7fff;
  return ((b + round) >>> 16) & 0xffff;
}

const FORMATS = [
  { name: "f32", bits: 32, exp: 8, enc: f32Bits, dec: fromF32Bits, use: "training master copy, the Rust engine's maths" },
  { name: "f16", bits: 16, exp: 5, enc: f16Bits, dec: fromF16Bits, use: "the file your browser downloads (31.5 MB)" },
  { name: "bf16", bits: 16, exp: 8, enc: bf16Bits, dec: (b: number) => fromF32Bits(b << 16), use: "training arithmetic on the GPU; SmolLM2's weights" },
];

const PRESETS = [
  { value: "-0.15717271", label: "a real weight (−0.157)" },
  { value: "3.1875279", label: "glasswing's largest weight" },
  { value: "0.1", label: "0.1" },
  { value: "70000", label: "70,000" },
];

export default function FloatBits() {
  const [text, setText] = useState(PRESETS[0].value);
  const x = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(x);

  return (
    <Figure
      title="What a number looks like in memory"
      how="Type a number or pick one; see how each format stores it and what gets lost."
      caption={
        <>
          A floating-point number is stored like scientific notation in binary: a <b>sign</b>, an <b>exponent</b>{" "}
          (how big) and a <b>mantissa</b> (the digits). f16 has fewer exponent bits, so it can&apos;t store numbers
          above 65,504; bf16 keeps f32&apos;s exponent and cuts the digits instead. glasswing&apos;s weights are all
          between −3.2 and 3.2, so f16 loses nothing important: the browser engine converts them back to f32 on load,
          and greedy stories from the f16 file are identical to the f32 ones.
        </>
      }
    >
      <div className={s.controls}>
        <input className={s.input} style={{ maxWidth: 220 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Number" inputMode="decimal" />
        <Choice label="Examples" options={PRESETS} value={PRESETS.some((p) => p.value === text) ? text : ""} onChange={setText} />
      </div>
      {valid &&
        FORMATS.map((f) => {
          const b = f.enc(x);
          const bits = (b >>> 0).toString(2).padStart(f.bits, "0");
          const stored = f.dec(b);
          const err = Math.abs(stored - x);
          return (
            <div key={f.name} style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: "4px 12px", alignItems: "center" }}>
              <b style={{ fontFamily: "var(--font-mono), monospace" }}>{f.name}</b>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 15, letterSpacing: 1, overflowWrap: "anywhere" }}>
                {bits.split("").map((c, i) => (
                  <span key={i} style={{ color: i === 0 ? "#7fa8ff" : i <= f.exp ? "var(--star)" : "var(--ink-2)" }}>{c}</span>
                ))}
              </div>
              <span />
              <span className={s.how}>
                stores <b style={{ color: "var(--ink)" }}>{Number.isFinite(stored) ? stored.toPrecision(9) : String(stored)}</b>
                {Number.isFinite(stored) ? ` · off by ${err === 0 ? "0" : err.toExponential(1)}` : " · out of range"} · {f.use}
              </span>
            </div>
          );
        })}
      <p className={s.how} style={{ margin: 0 }}>
        <span style={{ color: "#7fa8ff" }}>■</span> sign <span style={{ color: "var(--star)", marginLeft: 10 }}>■</span> exponent{" "}
        <span style={{ color: "var(--ink-2)", marginLeft: 10 }}>■</span> mantissa
      </p>
    </Figure>
  );
}
