"use client";

// Why a KV cache: without it, every new word recomputes the whole story so far.

import { useState } from "react";
import { Choice, Figure, Slider } from "../ui";
import s from "../viz.module.css";

const LAYERS = 8;
const DIM = 384;

export default function KvCache() {
  const [prompt, setPrompt] = useState(5);
  const [gen, setGen] = useState(190);
  const [mode, setMode] = useState<"no" | "cache">("cache");
  const without = gen * prompt + (gen * (gen - 1)) / 2 + gen; // sum over steps of (prompt + i + 1)
  const withCache = prompt + gen;
  const cacheBytes = 2 * LAYERS * (prompt + gen) * DIM * 4;

  // Small picture: which positions get computed at each of the first steps.
  const P = 4;
  const N = 12;
  return (
    <Figure
      title="Remembering instead of recomputing"
      how="Switch the cache on and off, and change how long the story gets."
      caption={
        <>
          To pick word number n, attention needs every earlier word&apos;s key and value. Without a cache, each step
          recomputes them for the whole story so far, so the work grows with the square of the length. But those keys
          and values never change once computed (a word can&apos;t be affected by words after it), so the engine keeps
          them: the <b>KV cache</b>. Each new word then costs one word&apos;s work. Measured on glasswing for a
          5-token prompt and 190 new tokens: 1.0 tokens/s without the cache, 93.8 with it, a factor of 94. The count
          above predicts {(without / withCache).toFixed(0)} for that case.
        </>
      }
      numbers={{
        head: ["", "without cache", "with cache"],
        rows: [
          ["word computations", without.toLocaleString("en"), withCache.toLocaleString("en")],
          ["memory for keys and values", "none kept", `${(cacheBytes / 1e6).toFixed(1)} MB`],
        ],
      }}
    >
      <Choice label="Cache" options={[{ value: "no", label: "no cache" }, { value: "cache", label: "KV cache" }]} value={mode} onChange={setMode} />
      <p className={s.how} style={{ margin: 0 }}>
        Each row is one step of writing; each square is a position in the text. Filled squares are computed in that
        step (<span style={{ color: "var(--accent)" }}>■</span> prompt, <span style={{ color: "var(--star)" }}>■</span> new
        words); outlined ones are reused from the cache.
      </p>
      <div className={s.cols}>
        <svg viewBox={`0 0 ${(P + N) * 18 + 70} ${N * 18 + 30}`} className={s.svg} style={{ maxWidth: 420 }} role="img" aria-label="Which words are computed at each generation step">
          {Array.from({ length: N }, (_, step) => (
            <g key={step}>
              <text x={60} y={30 + step * 18 + 12} textAnchor="end">step {step + 1}</text>
              {Array.from({ length: P + step + 1 }, (_, t) => {
                const computed = mode === "no" || t === P + step || (step === 0 && t < P);
                return (
                  <rect
                    key={t}
                    x={66 + t * 18}
                    y={30 + step * 18}
                    width={15}
                    height={15}
                    rx={2}
                    fill={computed ? (t < P ? "var(--accent)" : "var(--star)") : "transparent"}
                    stroke={computed ? "none" : "var(--line-strong)"}
                    opacity={computed ? 0.85 : 1}
                  />
                );
              })}
            </g>
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Slider label="prompt tokens" value={prompt} min={1} max={60} onChange={setPrompt} />
          <Slider label="new tokens" value={gen} min={1} max={256 - prompt} onChange={setGen} />
          <div className={s.stat} style={{ flexDirection: "column", gap: 6 }}>
            <span>
              without cache <b>{without.toLocaleString("en")}</b> word computations
            </span>
            <span>
              with cache <b>{withCache.toLocaleString("en")}</b> ({(without / withCache).toFixed(0)}× less)
            </span>
            <span>
              cache size <b>{(cacheBytes / 1e6).toFixed(1)} MB</b> (2 × 8 layers × {prompt + gen} words × 384 numbers)
            </span>
          </div>
        </div>
      </div>
    </Figure>
  );
}
