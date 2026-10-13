"use client";

// The per-visitor rate limit, simulated with the server's real settings: a bucket of 5 tokens,
// refilled at 6 per minute; every request takes one.

import { useEffect, useRef, useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const BURST = 5;
const PER_MIN = 6;

type Event = { t: number; ok: boolean; wait?: number };

export default function TokenBucket() {
  const [speed, setSpeed] = useState<1 | 10>(10);
  const [tokens, setTokens] = useState(BURST);
  const [log, setLog] = useState<Event[]>([]);
  const [now, setNow] = useState(0); // simulated seconds, for display
  const [bot, setBot] = useState(false);
  const clock = useRef(0); // simulated seconds
  const tokensRef = useRef(BURST);

  useEffect(() => {
    const dt = 0.1;
    const t = window.setInterval(() => {
      clock.current += dt * speed;
      tokensRef.current = Math.min(BURST, tokensRef.current + (PER_MIN / 60) * dt * speed);
      setTokens(tokensRef.current);
      setNow(clock.current);
    }, dt * 1000);
    return () => window.clearInterval(t);
  }, [speed]);

  const send = () => {
    const ok = tokensRef.current >= 1;
    if (ok) tokensRef.current -= 1;
    const wait = ok ? undefined : Math.ceil((1 - tokensRef.current) / (PER_MIN / 60));
    setTokens(tokensRef.current);
    setLog((l) => [{ t: clock.current, ok, wait }, ...l].slice(0, 14));
  };

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (!bot) return;
    // A bot sending one request per simulated second.
    const t = window.setInterval(() => sendRef.current(), 1000 / speed);
    return () => window.clearInterval(t);
  }, [bot, speed]);

  const okCount = log.filter((e) => e.ok).length;

  return (
    <Figure
      title="A bucket of permissions"
      how="Press “send a request” a few times quickly, then wait. Or let a bot loose."
      caption={
        <>
          Each visitor gets a bucket that holds up to {BURST} tokens and refills at {PER_MIN} per minute. A request takes
          a token; an empty bucket means <b>429 Too Many Requests</b>, with a <i>Retry-After</i> header saying when the
          next token arrives. People asking a few quick questions never notice; a script hammering the server gets one
          request through every 10 seconds, whatever it does. Time runs {speed}× fast here so you don&apos;t have to wait.
        </>
      }
    >
      <div className={s.controls}>
        <button type="button" className={s.btn} onClick={send}>send a request</button>
        <button type="button" className={s.btn} onClick={() => setBot((b) => !b)}>{bot ? "stop the bot" : "start a bot (1 request/s)"}</button>
        <Choice label="Speed" options={[{ value: 1, label: "real time" }, { value: 10, label: "10× faster" }]} value={speed} onChange={setSpeed} />
      </div>
      <div className={s.cols}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 70 }} aria-label={`${Math.floor(tokens)} of ${BURST} tokens in the bucket`}>
            {Array.from({ length: BURST }, (_, i) => {
              const fill = Math.max(0, Math.min(1, tokens - i));
              return (
                <div key={i} style={{ width: 38, height: 60, border: "1px solid var(--line-strong)", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${fill * 100}%`, background: fill >= 1 ? "var(--star)" : "rgba(255,210,122,0.4)" }} />
                </div>
              );
            })}
          </div>
          <p className={s.stat} style={{ margin: "10px 0 0" }}>
            <span>bucket <b>{tokens.toFixed(1)}</b> / {BURST}</span>
            <span>simulated time <b>{Math.floor(now)} s</b></span>
          </p>
        </div>
        <ol className={s.merges} style={{ flexDirection: "column", gap: 4, flexWrap: "nowrap" }}>
          {log.length === 0 && <li>no requests yet</li>}
          {log.map((e, i) => (
            <li key={log.length - i} style={{ borderColor: e.ok ? "var(--line)" : "#5a2a2a" }}>
              t={e.t.toFixed(0)} s · {e.ok ? <b>200 OK</b> : <b style={{ color: "#ff9d8a" }}>429 · retry after {e.wait} s</b>}
            </li>
          ))}
          {log.length > 0 && <li>last {log.length}: {okCount} allowed, {log.length - okCount} refused</li>}
        </ol>
      </div>
    </Figure>
  );
}
