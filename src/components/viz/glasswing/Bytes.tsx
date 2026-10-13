"use client";

// Text -> UTF-8 bytes. Every character becomes one to four numbers between 0 and 255.

import { useState } from "react";
import { Choice, Figure } from "../ui";
import s from "../viz.module.css";

const PRESETS = ["Once upon a time", "café", "Lily 🐶", "Привет"];

export default function Bytes() {
  const [text, setText] = useState(PRESETS[0]);
  const enc = new TextEncoder();
  const chars = Array.from(text.slice(0, 60)); // by code point, so emoji stay whole
  const total = chars.reduce((n, c) => n + enc.encode(c).length, 0);

  return (
    <Figure
      title="What the computer actually receives"
      how="Type anything. Each character turns into one or more numbers (bytes, 0 to 255)."
      caption={
        <>
          English letters are one byte each; accented letters take two, Cyrillic two, emoji four. A model that
          read raw bytes would need {total} steps for this text.
        </>
      }
      numbers={{
        head: ["character", "bytes (UTF-8)"],
        rows: chars.map((c) => [c === " " ? "space" : c, Array.from(enc.encode(c)).join(" ")]),
      }}
    >
      <input className={s.input} value={text} onChange={(e) => setText(e.target.value)} aria-label="Text" />
      <Choice
        label="Examples"
        options={PRESETS.map((p) => ({ value: p, label: p }))}
        value={PRESETS.includes(text) ? text : ""}
        onChange={setText}
      />
      <div className={s.chars} aria-label="Characters and their bytes">
        {chars.map((c, i) => {
          const bytes = Array.from(enc.encode(c));
          return (
            <div key={i} className={`${s.char} ${bytes.length > 1 ? s.charMulti : ""}`}>
              <span>{c === " " ? "␣" : c}</span>
              <small>{bytes.join(" ")}</small>
            </div>
          );
        })}
      </div>
      <div className={s.stat}>
        <span>
          <b>{chars.length}</b> characters
        </span>
        <span>
          <b>{total}</b> bytes
        </span>
      </div>
    </Figure>
  );
}
