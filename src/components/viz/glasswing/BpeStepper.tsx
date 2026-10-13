"use client";

// Byte-pair encoding, replayed: the real tokenizer with only its first N merges, on any text.

import { useEffect, useMemo, useRef, useState } from "react";
import lock from "../../../../glasswing.lock.json";
import { Bpe, loadBpe } from "../bpe";
import { Figure, Slider } from "../ui";
import s from "../viz.module.css";

const BASE = `/glasswing/${lock.release}`;
const SCALE = 1000; // slider resolution
// The slider is logarithmic: the first merges change the most, the last ones polish rare words.
const toMerges = (v: number, max: number) => Math.round(Math.expm1((v / SCALE) * Math.log1p(max)));
const toSlider = (k: number, max: number) => Math.round((Math.log1p(k) / Math.log1p(max)) * SCALE);

export default function BpeStepper({ text: initial = "Once upon a time, there was a little girl named Lily." }) {
  const [bpe, setBpe] = useState<Bpe | null>(null);
  const [text, setText] = useState(String(initial));
  const [v, setV] = useState(SCALE);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    loadBpe(BASE).then(setBpe);
  }, []);
  const max = bpe?.merges.length ?? 3839;
  const k = toMerges(v, max);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setV((x) => {
        if (x >= SCALE) {
          setPlaying(false);
          return SCALE;
        }
        return Math.min(SCALE, x + 8);
      });
    }, 40);
    return () => window.clearInterval(timer.current);
  }, [playing]);

  const ids = useMemo(() => (bpe ? bpe.encode(text, k) : []), [bpe, text, k]);
  // The merges this text actually used, most recent first.
  const used = useMemo(
    () =>
      bpe
        ? [...new Set(ids.filter((i) => i >= 256).map((i) => i - 256))].sort((a, b) => b - a).slice(0, 10)
        : [],
    [bpe, ids],
  );
  const bytes = new TextEncoder().encode(text).length;

  return (
    <Figure
      title="Learning a vocabulary, one merge at a time"
      how="Drag the slider (or press play) to replay the tokenizer's training on your own sentence."
      caption={
        <>
          At 0 merges every byte is its own token. Each merge glues the most frequent pair seen in the training
          stories into a new token: first common letter pairs like <q> t</q> and <q>he</q>, then whole words. This is
          the real tokenizer glasswing uses, with only its first {k.toLocaleString("en")} of{" "}
          {max.toLocaleString("en")} merges switched on.
        </>
      }
    >
      <input className={s.input} value={text} maxLength={160} onChange={(e) => setText(e.target.value)} aria-label="Text" />
      <div className={s.controls}>
        <Slider
          label="merges learned"
          value={v}
          min={0}
          max={SCALE}
          onChange={(x) => {
            setPlaying(false);
            setV(x);
          }}
          format={() => `${k.toLocaleString("en")} / ${max.toLocaleString("en")}`}
        />
        <button
          type="button"
          className={s.btn}
          onClick={() => {
            if (v >= SCALE) setV(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "pause" : "▶ play from 0"}
        </button>
        <button type="button" className={s.btn} onClick={() => setV(toSlider(0, max))}>
          bytes only
        </button>
      </div>
      <div className={s.tokens} aria-live="polite">
        {bpe ? ids.map((id, i) => <span key={i} className={s.tok}>{bpe.text(id)}</span>) : <span>Loading the tokenizer…</span>}
      </div>
      <div className={s.stat}>
        <span>
          <b>{bytes}</b> bytes
        </span>
        <span>
          <b>{ids.length}</b> tokens
        </span>
        <span>
          <b>{ids.length ? (bytes / ids.length).toFixed(2) : "–"}</b> bytes per token
        </span>
      </div>
      {bpe && used.length > 0 && (
        <div>
          <p className={s.how} style={{ marginBottom: 6 }}>
            Latest merges this sentence used:
          </p>
          <ol className={s.merges}>
            {used.map((r) => {
              const [a, b] = bpe.merges[r];
              return (
                <li key={r}>
                  #{r + 1} <b>{bpe.text(a)}</b>+<b>{bpe.text(b)}</b> → <b>{bpe.text(256 + r)}</b>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Figure>
  );
}
