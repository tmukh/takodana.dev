"use client";

// Where the waiting goes: time to first token vs the rest of the answer, for real requests from
// the server's own logs (and one run on my laptop).

import { useState } from "react";
import { Figure } from "../ui";
import s from "../viz.module.css";

const ROWS = [
  { label: "glasswing, on the cluster", ttft: 0.059, tokens: 200, tps: 61.8, note: "15.7M parameters: the prompt is read in 59 ms and 200 words take 3.3 s." },
  { label: "SmolLM2, on the cluster, alone", ttft: 1.75, tokens: 90, tps: 9.6, note: "135M parameters, 9× more numbers to read per word. Reading the 34-token chat prompt takes most of the first two seconds." },
  { label: "SmolLM2, cluster busy", ttft: 12.52, tokens: 8, tps: 8.4, note: "The same short question while a stranger's 174-token answer was being generated: two generations shared the CPU, and the prompt took six times longer to read." },
  { label: "SmolLM2, on my laptop", ttft: 0.42, tokens: 53, tps: 36.1, note: "Same engine, faster machine and more threads: 4× quicker to the first word." },
];

export default function TimeAnatomy() {
  const [on, setOn] = useState(1);
  const max = Math.max(...ROWS.map((r) => r.ttft + r.tokens / r.tps));
  return (
    <Figure
      title="Where the waiting goes"
      how="Hover a row. Gold: until the first word appears. Blue: the rest of the answer."
      caption={
        <>
          Two numbers describe how a language model feels in use. <b>Time to first token</b> is the pause before
          anything happens: the model has to read the whole prompt first. <b>Tokens per second</b> is how fast the text
          flows after that. People forgive a slow flow much more than a long silence, which is why the server reports
          both to Prometheus for every request. These are real requests from the server&apos;s log.
        </>
      }
      numbers={{
        head: ["request", "first token after", "tokens", "tokens per second", "total"],
        rows: ROWS.map((r) => [r.label, `${r.ttft.toFixed(2)} s`, r.tokens, r.tps, `${(r.ttft + r.tokens / r.tps).toFixed(1)} s`]),
      }}
    >
      <ol className={s.neighbours} style={{ gap: 10 }}>
        {ROWS.map((r, i) => {
          const gen = r.tokens / r.tps;
          return (
            <li key={r.label} style={{ gridTemplateColumns: "210px 1fr 64px", cursor: "default" }} onPointerEnter={() => setOn(i)} tabIndex={0} onFocus={() => setOn(i)}>
              <span style={{ fontSize: 13, color: i === on ? "var(--ink)" : "var(--ink-2)" }}>{r.label}</span>
              <span style={{ display: "flex", height: 14 }}>
                <span style={{ width: `${(r.ttft / max) * 100}%`, background: "var(--star)", borderRadius: "2px 0 0 2px", minWidth: 2 }} />
                <span style={{ width: `${(gen / max) * 100}%`, background: "#4f7fe0", borderRadius: "0 2px 2px 0" }} />
              </span>
              <span className={s.val}>{(r.ttft + gen).toFixed(1)} s</span>
            </li>
          );
        })}
      </ol>
      <p className={s.how} style={{ margin: 0, minHeight: 42 }} aria-live="polite">
        <b style={{ color: "var(--ink)" }}>{ROWS[on].label}:</b> first word after {ROWS[on].ttft.toFixed(2)} s, then{" "}
        {ROWS[on].tps} words per second. {ROWS[on].note}
      </p>
    </Figure>
  );
}
