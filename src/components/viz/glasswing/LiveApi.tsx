"use client";

// A real request to the real server, from this page: streamed tokens, time to first token and
// tokens per second measured in your browser.

import { useRef, useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const API = "https://glasswing.takodana.dev/v1/generate";
const PRESETS = {
  smollm2: ["What is the capital of France?", "Name three colours.", "Write one sentence about the sea."],
  glasswing: ["Once upon a time", "Lily found a little box. Inside it was", "The dog was very hungry. He"],
};

type Stats = { ttft: number; tps: number; tokens: number; server?: { ttft_ms: number; tokens_per_s: number; reason: string } };

export default function LiveApi() {
  const [model, setModel] = useState<"smollm2" | "glasswing">("smollm2");
  const [prompt, setPrompt] = useState(PRESETS.smollm2[0]);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abort = useRef<AbortController | null>(null);

  const run = async () => {
    setBusy(true);
    setErr("");
    setOut("");
    setStats(null);
    const t0 = performance.now();
    const tick = window.setInterval(() => setElapsed((performance.now() - t0) / 1000), 100);
    abort.current = new AbortController();
    let first = 0;
    let n = 0;
    try {
      const body = model === "smollm2"
        ? { model, messages: [{ role: "user", content: prompt }], max_tokens: 80, temperature: 0.3 }
        : { model, prompt, max_tokens: 80, temperature: 0.8 };
      const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: abort.current.signal });
      if (!res.ok) {
        const retry = res.headers.get("retry-after");
        const j = await res.json().catch(() => ({}));
        throw new Error(`${res.status} ${j.error ?? ""}${retry ? ` (try again in ${retry} s)` : ""}`);
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const ev = /^event: (.*)$/m.exec(block)?.[1] ?? "message";
          const data = /^data: (.*)$/m.exec(block)?.[1];
          if (!data) continue;
          const j = JSON.parse(data);
          if (ev === "message") {
            if (!first) first = performance.now();
            n++;
            setOut((o) => o + j.text);
          } else if (ev === "done") {
            const end = performance.now();
            setStats({ ttft: (first - t0) / 1000, tps: n > 1 ? (n - 1) / ((end - first) / 1000) : 0, tokens: j.tokens, server: j });
          } else if (ev === "error") throw new Error(j.error);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr(String((e as Error).message || e));
    } finally {
      window.clearInterval(tick);
      setBusy(false);
    }
  };

  return (
    <Figure
      title="Ask the real server"
      how="This sends a real request to glasswing.takodana.dev from your browser. Be patient: it's a CPU in a flat in Berlin."
      caption={
        <>
          SmolLM2-135M is a small open model by Hugging Face (Apache-2.0); glasswing is the story model from this
          series. Both run on the engine from part 4. The numbers under the answer are measured twice: by your browser
          (including the trip across the internet) and by the server itself. If someone else is generating at the
          same moment, you&apos;ll see it: time to first token goes up. Nothing you type is stored or logged.
        </>
      }
    >
      <Choice label="Model" options={[{ value: "smollm2", label: "SmolLM2-135M (chat)" }, { value: "glasswing", label: "glasswing (stories)" }]} value={model} onChange={(m) => { setModel(m); setPrompt(PRESETS[m][0]); setOut(""); setStats(null); }} />
      <div className={s.controls}>
        <input className={s.input} style={{ flex: "1 1 320px" }} value={prompt} maxLength={300} onChange={(e) => setPrompt(e.target.value)} aria-label="Prompt" disabled={busy} />
        {busy ? (
          <button type="button" className={s.btn} onClick={() => abort.current?.abort()}>stop</button>
        ) : (
          <button type="button" className={s.btn} onClick={run} disabled={!prompt.trim()}>send</button>
        )}
      </div>
      <Choice label="Examples" options={PRESETS[model].map((p) => ({ value: p, label: p }))} value={PRESETS[model].includes(prompt) ? prompt : ""} onChange={setPrompt} />
      <div style={{ minHeight: 64, padding: "12px 14px", background: "var(--ground)", border: "1px solid var(--line)", borderRadius: 8, whiteSpace: "pre-wrap", fontSize: 15 }} aria-live="polite">
        {model === "glasswing" && (out || busy) && <span style={{ color: "var(--muted)" }}>{prompt}</span>}
        {out}
        {busy && !out && <span style={{ color: "var(--muted)" }}>waiting for the first token… {elapsed.toFixed(1)} s</span>}
        {busy && out && <span style={{ color: "var(--star)" }}>▍</span>}
      </div>
      {err && <p className={s.how} style={{ color: "#ff9d8a", margin: 0 }}>{err}</p>}
      {stats && (
        <div className={s.stat}>
          <span>first token after <b>{stats.ttft.toFixed(2)} s</b></span>
          <span><b>{stats.tps.toFixed(1)}</b> tokens/s</span>
          <span><b>{stats.tokens}</b> tokens</span>
          {stats.server && (
            <span>
              server&apos;s own view: {(stats.server.ttft_ms / 1000).toFixed(2)} s, {stats.server.tokens_per_s} tokens/s, stopped because{" "}
              {stats.server.reason === "stop" ? "the model finished" : stats.server.reason === "length" ? "it hit the length limit" : stats.server.reason}
            </span>
          )}
        </div>
      )}
    </Figure>
  );
}
