"use client";

// What happens when many people ask at once: two generation slots sharing one CPU, a short wait
// for a free slot, and "busy" after 5 seconds. A simplified simulation with the server's limits.

import { useMemo, useState } from "react";
import { Figure, Slider } from "../ui";
import s from "../viz.module.css";

const SLOTS = 2;
const MAX_WAIT = 5; // seconds
const PREFILL = 2; // seconds, alone (measured ~1.7–2.8 s for a short chat prompt)
const TPS = 9.5; // tokens per second, alone (measured 8–10 on the cluster)
const DURATION = 1800; // simulated seconds

type Job = { arrive: number; start?: number; first?: number; end?: number; rejected?: boolean; work: number; prefill: number };

function rng(seed: number) {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648), x / 2147483648);
}

function simulate(perMinute: number, tokens: number): Job[] {
  const r = rng(7);
  const jobs: Job[] = [];
  let t = 0;
  for (;;) {
    t += -Math.log(1 - r()) * (60 / perMinute); // Poisson arrivals
    if (t > DURATION) break;
    jobs.push({ arrive: t, work: PREFILL + tokens / TPS, prefill: PREFILL });
  }
  const dt = 0.05;
  const active: Job[] = [];
  const waiting: Job[] = [];
  let next = 0;
  for (let now = 0; now < DURATION + 600; now += dt) {
    while (next < jobs.length && jobs[next].arrive <= now) waiting.push(jobs[next++]);
    for (let i = waiting.length - 1; i >= 0; i--) {
      if (now - waiting[i].arrive > MAX_WAIT) {
        waiting[i].rejected = true;
        waiting.splice(i, 1);
      }
    }
    while (active.length < SLOTS && waiting.length) {
      const j = waiting.shift()!;
      j.start = now;
      active.push(j);
    }
    // The running generations share the CPU equally (processor sharing).
    const rate = active.length ? 1 / active.length : 0;
    for (let i = active.length - 1; i >= 0; i--) {
      const j = active[i];
      const step = rate * dt;
      if (j.prefill > 0) {
        j.prefill -= step;
        if (j.prefill <= 0) j.first = now; // the prompt is read: the first word appears
      }
      j.work -= step;
      if (j.work <= 0) {
        j.end = now;
        active.splice(i, 1);
      }
    }
    if (next >= jobs.length && !active.length && !waiting.length) break;
  }
  return jobs;
}

const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)] : 0);

export default function QueueSim() {
  const [rate, setRate] = useState(3);
  const [tokens, setTokens] = useState(80);
  const jobs = useMemo(() => simulate(rate, tokens), [rate, tokens]);
  const served = jobs.filter((j) => !j.rejected && j.first !== undefined);
  const ttft = served.map((j) => j.first! - j.arrive);
  const rejected = jobs.length - served.length;
  const view = jobs.filter((j) => j.arrive < 240).slice(0, 40);
  const W = 760;
  const rowH = 9;
  const H = 30 + view.length * rowH;
  const x = (t: number) => 10 + (t / 300) * (W - 20);

  return (
    <Figure
      title="When many people ask at once"
      how="Change how busy it is and how long the answers are."
      caption={
        <>
          A simplified model of the server: requests arrive at random, at most {SLOTS} are generated at a time and they
          share the CPU (so each runs at half speed when both slots are busy), and a request that can&apos;t get a slot
          within {MAX_WAIT} seconds gets <b>503 busy</b>. Alone, an answer costs about {PREFILL} s before the first word
          and then {TPS} tokens per second, roughly what I measured. Two slots fill up faster than you&apos;d think: with
          80-token answers, 3 requests a minute already turns about one in eight away, and at 6 a minute a quarter get
          503 while the rest wait twice as long for their first word. That trade (refuse some, keep the rest usable)
          is the whole point of the limits; a real service would add machines instead.
        </>
      }
      numbers={{
        head: ["requests in 30 min", "answered", "turned away (503)", "median time to first token", "95th percentile"],
        rows: [[jobs.length, served.length, rejected, `${pct(ttft, 0.5).toFixed(1)} s`, `${pct(ttft, 0.95).toFixed(1)} s`]],
      }}
    >
      <div className={s.controls}>
        <Slider label="requests per minute" value={rate} min={0.5} max={12} step={0.5} onChange={setRate} />
        <Slider label="answer length (tokens)" value={tokens} min={10} max={256} step={2} onChange={setTokens} />
      </div>
      <div className={s.stat}>
        <span>answered <b>{served.length}</b> of {jobs.length}</span>
        <span>turned away <b>{rejected}</b> ({jobs.length ? ((100 * rejected) / jobs.length).toFixed(0) : 0}%)</span>
        <span>first word after <b>{pct(ttft, 0.5).toFixed(1)} s</b> median, <b>{pct(ttft, 0.95).toFixed(1)} s</b> worst 5%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Timeline of the first four minutes of requests">
        {[0, 60, 120, 180, 240].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={14} y2={H} stroke="var(--line)" />
            <text x={x(t)} y={10} textAnchor="middle">{t / 60} min</text>
          </g>
        ))}
        {view.map((j, i) => {
          const y = 18 + i * rowH;
          if (j.rejected) return <text key={i} x={x(j.arrive + MAX_WAIT)} y={y + 7} style={{ fill: "#ff9d8a", fontSize: 9 }}>✕ busy</text>;
          return (
            <g key={i}>
              {j.start! > j.arrive + 0.05 && <rect x={x(j.arrive)} y={y} width={x(j.start!) - x(j.arrive)} height={rowH - 2} fill="var(--line-strong)" />}
              <rect x={x(j.start!)} y={y} width={Math.max(1, x(j.first ?? j.end!) - x(j.start!))} height={rowH - 2} fill="#4f7fe0" />
              {j.first !== undefined && <rect x={x(j.first)} y={y} width={Math.max(1, x(j.end!) - x(j.first))} height={rowH - 2} fill="var(--star)" />}
            </g>
          );
        })}
      </svg>
      <p className={s.how} style={{ margin: 0 }}>
        First four minutes, one row per request: <span style={{ color: "var(--ink-2)" }}>■</span> waiting for a slot,{" "}
        <span style={{ color: "#4f7fe0" }}>■</span> reading the prompt, <span style={{ color: "var(--star)" }}>■</span> writing the answer.
      </p>
    </Figure>
  );
}
