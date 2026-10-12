"use client";

// The glasswing lab: type a prompt, watch the model write, and look inside while it does.
//
// The model runs in a Web Worker (WebAssembly, glasswing's Rust engine). The worker produces
// steps as fast as it can; this component plays them back at the chosen speed, so the tower's
// animation stays watchable whatever the device.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import lock from "../../../glasswing.lock.json";
import { Tower } from "./Tower";
import { attentionWeight, type ModelConfig, type StepMsg, type WorkerMsg } from "./types";
import s from "./Lab.module.css";

const BASE = `/glasswing/${lock.release}`;
const PROMPTS = [
  "Once upon a time",
  "Lily and Ben went to the park. Ben saw a big dog and",
  "The little robot was sad because",
  "Tom had a red ball. He gave it to",
];

type Status = "idle" | "loading" | "ready" | "running" | "error";

function show(text: string) {
  return text.replace(/\n/g, "↵\n");
}

export default function Lab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const towerRef = useRef<Tower | null>(null);
  const queue = useRef<StepMsg[]>([]);
  const finished = useRef<string | null>(null);
  const arrivals = useRef<number[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [cfg, setCfg] = useState<ModelConfig | null>(null);
  const [steps, setSteps] = useState<StepMsg[]>([]);
  const [focus, setFocus] = useState<number | null>(null); // hovered/pinned token index
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState<number | "all">("all");
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.9);
  const [speed, setSpeed] = useState(6); // tokens per second on screen
  const [seed, setSeed] = useState(1);
  const [doneReason, setDoneReason] = useState("");
  const [engineTps, setEngineTps] = useState<number | null>(null);

  // Worker lifecycle.
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      towerRef.current?.dispose();
    };
  }, []);

  const load = useCallback(() => {
    setStatus("loading");
    const w = new Worker(`${BASE}/worker.js`, { type: "module" });
    workerRef.current = w;
    w.onmessage = ({ data }: MessageEvent<WorkerMsg>) => {
      if (data.type === "progress") setProgress(data.total ? data.loaded / data.total : 0);
      else if (data.type === "ready") {
        setCfg(data.config);
        setStatus("ready");
      } else if (data.type === "step") {
        queue.current.push(data);
        if (!data.prompt) arrivals.current.push(performance.now());
      } else if (data.type === "done") finished.current = data.reason;
      else if (data.type === "error") {
        setError(data.message);
        setStatus("error");
      }
    };
    w.postMessage({ type: "load", base: new URL(BASE, location.href).href });
  }, []);

  // The tower exists once the model's shape is known.
  useEffect(() => {
    if (!cfg || !canvasRef.current || towerRef.current) return;
    const tower = new Tower(canvasRef.current, cfg);
    towerRef.current = tower;
    const onResize = () => tower.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [cfg]);

  useEffect(() => towerRef.current?.select(layer, head), [layer, head, cfg]);

  // Playback: move steps from the queue to the screen at `speed` tokens per second.
  // Prompt tokens go faster: they're given, not generated.
  useEffect(() => {
    if (status !== "running") return;
    let timer = 0;
    const tick = () => {
      const next = queue.current.shift();
      if (next) {
        const ms = 1000 / (next.prompt ? Math.max(speed, 12) : speed);
        towerRef.current?.show(next, ms * 0.85);
        setSteps((prev) => [...prev, next]);
        timer = window.setTimeout(tick, ms);
        return;
      }
      if (finished.current) {
        const a = arrivals.current;
        if (a.length > 1) setEngineTps((a.length - 1) / ((a[a.length - 1] - a[0]) / 1000));
        setDoneReason(finished.current);
        setStatus("ready");
        return;
      }
      timer = window.setTimeout(tick, 30);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [status, speed]);

  const generate = () => {
    if (!workerRef.current) return;
    queue.current = [];
    finished.current = null;
    arrivals.current = [];
    setSteps([]);
    setFocus(null);
    setDoneReason("");
    setEngineTps(null);
    setStatus("running");
    workerRef.current.postMessage({ type: "generate", prompt, maxTokens: 200, temperature, topP, seed });
  };
  const stop = () => workerRef.current?.postMessage({ type: "stop" });

  const current = focus ?? steps.length - 1;
  const step = steps[current];
  const weights = useMemo(() => {
    if (!step || !cfg) return [];
    return Array.from({ length: step.pos + 1 }, (_, j) => attentionWeight(step, cfg, layer, head, j));
  }, [step, cfg, layer, head]);
  // Shade relative to the strongest visible weight. The start-of-story token (index 0, not shown)
  // is excluded: many heads park most of their attention there when nothing else is relevant.
  const strongest = Math.max(1e-9, ...weights.slice(1));
  const chosenNext = steps[current + 1]?.token;

  const story = steps.filter((x) => !x.prompt).length;

  return (
    <section className={s.lab} aria-label="glasswing lab">
      <form
        className={s.controls}
        onSubmit={(e) => {
          e.preventDefault();
          if (status === "ready") generate();
        }}
      >
        <label className={s.prompt}>
          <span>Prompt</span>
          <input
            value={prompt}
            maxLength={300}
            onChange={(e) => setPrompt(e.target.value)}
            list="glasswing-prompts"
            disabled={status === "running"}
          />
          <datalist id="glasswing-prompts">
            {PROMPTS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label>
          <span>Temperature {temperature.toFixed(1)}</span>
          <input type="range" min={0} max={1.5} step={0.1} value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))} disabled={status === "running"} />
        </label>
        <label>
          <span>Top-p {topP.toFixed(2)}</span>
          <input type="range" min={0.5} max={1} step={0.05} value={topP}
            onChange={(e) => setTopP(Number(e.target.value))} disabled={status === "running"} />
        </label>
        <label>
          <span>Speed {speed} tokens/s</span>
          <input type="range" min={1} max={30} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </label>
        <label className={s.seed}>
          <span>Seed</span>
          <input type="number" value={seed} min={0} onChange={(e) => setSeed(Number(e.target.value) || 0)}
            disabled={status === "running"} />
        </label>
        <div className={s.buttons}>
          {status === "idle" && (
            <button type="button" className="button primary" onClick={load}>
              Load the model (31.5 MB)
            </button>
          )}
          {status === "loading" && (
            <div className={s.progress} role="progressbar" aria-valuenow={Math.round(progress * 100)}>
              <div style={{ width: `${progress * 100}%` }} />
              <span>Downloading weights… {Math.round(progress * 100)}%</span>
            </div>
          )}
          {status === "ready" && (
            <button type="submit" className="button primary">
              Generate
            </button>
          )}
          {status === "running" && (
            <button type="button" className="button" onClick={stop}>
              Stop
            </button>
          )}
          {status === "ready" && steps.length > 0 && (
            <button type="button" className="button" onClick={() => setSeed((x) => x + 1)}>
              New seed
            </button>
          )}
        </div>
      </form>
      {status === "error" && <p className={s.error}>Something went wrong: {error}</p>}

      <div className={s.stage}>
        <div className={s.towerWrap}>
          <canvas ref={canvasRef} className={s.tower} aria-label="The model's layers, lit by the current token" />
          {status === "idle" && (
            <p className={s.placeholder}>
              The model downloads once (31.5 MB) and then runs entirely in your browser. Nothing you type leaves
              your machine.
            </p>
          )}
          <dl className={s.legend}>
            <div><dt className={s.gold}>●</dt><dd>MLP neuron, positive</dd></div>
            <div><dt className={s.blue}>●</dt><dd>MLP neuron, negative</dd></div>
            <div><dt className={s.head}>◉</dt><dd>attention head: brighter = more focused</dd></div>
            <div><dt className={s.strip}>┃</dt><dd>residual stream (384 numbers per layer)</dd></div>
          </dl>
        </div>

        <aside className={s.side}>
          <h3>Next token</h3>
          {step ? (
            <>
              <p className={s.hint}>
                After <q>{show(step.text)}</q>, the model expected (temperature 1):
              </p>
              <ol className={s.probs}>
                {Array.from(step.topIds.slice(0, 10)).map((id, k) => (
                  <li key={id} className={id === chosenNext ? s.chosen : undefined}>
                    <span className={s.tok}>{show(step.topTexts[k])}</span>
                    <span className={s.bar} style={{ width: `${step.topProbs[k] * 100}%` }} />
                    <span className={s.pct}>{(step.topProbs[k] * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ol>
              {chosenNext !== undefined && !step.topIds.slice(0, 10).includes(chosenNext) && (
                <p className={s.hint}>It sampled <q>{show(steps[current + 1].text)}</q>, outside the top 10.</p>
              )}
            </>
          ) : (
            <p className={s.hint}>Generate a story, then hover any word to see what the model was thinking there.</p>
          )}

          {cfg && (
            <>
              <h3>Attention</h3>
              <p className={s.hint}>Which earlier tokens this token looked at, in one layer.</p>
              <div className={s.pick} role="group" aria-label="Layer">
                {Array.from({ length: cfg.n_layers }, (_, l) => (
                  <button key={l} type="button" aria-pressed={layer === l} onClick={() => setLayer(l)}>
                    {l + 1}
                  </button>
                ))}
              </div>
              <div className={s.pick} role="group" aria-label="Head">
                <button type="button" aria-pressed={head === "all"} onClick={() => setHead("all")}>
                  all heads
                </button>
                {Array.from({ length: cfg.n_heads }, (_, h) => (
                  <button key={h} type="button" aria-pressed={head === h} onClick={() => setHead(h)}>
                    h{h + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <div className={s.text} onMouseLeave={() => setFocus(null)} aria-live="off">
        {steps.map((x, i) =>
          i === 0 ? null : (
            <span
              key={i}
              className={`${s.chip} ${x.prompt ? s.given : ""} ${i === current ? s.current : ""}`}
              style={i <= current && weights[i] !== undefined
                ? { backgroundColor: `rgba(255, 210, 122, ${(0.8 * (weights[i] / strongest) ** 0.8).toFixed(3)})` }
                : undefined}
              onMouseEnter={() => setFocus(i)}
              onFocus={() => setFocus(i)}
              tabIndex={0}
            >
              {show(x.text)}
            </span>
          ),
        )}
        {status === "running" && <span className={s.caret}>▍</span>}
      </div>
      <p className={s.meta}>
        {steps.length > 0 && `${story} tokens generated`}
        {doneReason === "end" && " · the model ended the story"}
        {doneReason === "length" && " · reached the length limit"}
        {doneReason === "stopped" && " · stopped"}
        {engineTps !== null && ` · your browser computed ${engineTps.toFixed(0)} tokens/s (playback is slowed down)`}
        {steps.length > 0 && weights[0] !== undefined &&
          ` · highlighted: attention from “${show(step.text).trim()}”, layer ${layer + 1}, ${head === "all" ? "mean of heads" : `head ${head + 1}`}; strongest ${(strongest * 100).toFixed(0)}%, ${(weights[0] * 100).toFixed(0)}% parked on the start-of-story token`}
      </p>
    </section>
  );
}
