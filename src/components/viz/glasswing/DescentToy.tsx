"use client";

// Gradient descent on a one-dimensional loss: the slope says which way is downhill, the
// learning rate says how big a step to take.

import { useEffect, useState } from "react";
import { Figure, Slider } from "../ui";
import s from "../viz.module.css";

// A bumpy valley: shallow dips on the way down, the real minimum at the bottom (found numerically).
const f = (w: number) => 0.35 * (w - 1.3) ** 2 + 0.25 * Math.sin(3 * w) + 0.6;
const df = (w: number) => 0.7 * (w - 1.3) + 0.75 * Math.cos(3 * w);
const START = -2.6;
const GRID = Array.from({ length: 8001 }, (_, i) => -4 + i / 1000);
const BEST_W = GRID.reduce((b, w) => (f(w) < f(b) ? w : b), GRID[0]);

export default function DescentToy() {
  const [lr, setLr] = useState(0.15);
  const [path, setPath] = useState<number[]>([START]);
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!run) return;
    const t = window.setInterval(() => {
      setPath((p) => {
        const w = p[p.length - 1];
        const next = w - lr * df(w);
        if (p.length > 60 || Math.abs(next) > 6) {
          setRun(false);
          return p;
        }
        return [...p, next];
      });
    }, 160);
    return () => window.clearInterval(t);
  }, [run, lr]);

  const W = 640;
  const H = 260;
  const X = (w: number) => 20 + ((w + 4) / 8) * (W - 40);
  const Y = (l: number) => H - 20 - (Math.min(l, 6) / 6) * (H - 40);
  const curve = Array.from({ length: 200 }, (_, i) => -4 + (8 * i) / 199)
    .map((w, i) => `${i ? "L" : "M"}${X(w).toFixed(1)},${Y(f(w)).toFixed(1)}`)
    .join("");
  const w = path[path.length - 1];
  const diverged = Math.abs(w) > 4;

  return (
    <Figure
      title="Learning is walking downhill"
      how="Set the step size (learning rate) and press play. Try 0.02, 0.15 and 1.2."
      caption={
        <>
          Imagine the model had a single number to learn, and this curve showed the loss for every value of it.
          Training can&apos;t see the whole curve; it only knows the slope where it stands (the <b>gradient</b>), and
          steps downhill. The <b>learning rate</b> is the step size. Too small and learning crawls; too big and it
          overshoots, zig-zags or flies off. glasswing does this for 15.7 million numbers at once, 40,000 times, with
          a cleverer stepping rule (AdamW) that gives every number its own step size.
        </>
      }
    >
      <div className={s.controls}>
        <Slider label="learning rate" value={lr} min={0.01} max={1.5} step={0.01} onChange={setLr} />
        <button type="button" className={s.btn} onClick={() => { setPath([START]); setRun(true); }}>▶ play from the start</button>
        <button type="button" className={s.btn} onClick={() => setRun(false)}>pause</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="A loss curve with the steps of gradient descent">
        <path d={curve} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {path.slice(1).map((v, i) => (
          <line key={i} x1={X(path[i])} y1={Y(f(path[i]))} x2={X(v)} y2={Y(f(v))} stroke="var(--star)" strokeOpacity={0.45} />
        ))}
        {path.map((v, i) => (
          <circle key={i} cx={X(v)} cy={Y(f(v))} r={i === path.length - 1 ? 7 : 3} fill="var(--star)" stroke="var(--surface)" strokeWidth={i === path.length - 1 ? 2 : 0} />
        ))}
        <line x1={X(BEST_W)} x2={X(BEST_W)} y1={Y(f(BEST_W)) + 8} y2={H - 16} stroke="var(--line-strong)" strokeDasharray="3 3" />
        <text x={X(BEST_W)} y={H - 4} textAnchor="middle">best value</text>
        <text x={20} y={16}>loss</text>
      </svg>
      <div className={s.stat}>
        <span>steps <b>{path.length - 1}</b></span>
        <span>loss <b>{diverged ? "flew off" : f(w).toFixed(3)}</b></span>
        <span>best possible <b>{f(BEST_W).toFixed(3)}</b></span>
      </div>
    </Figure>
  );
}
