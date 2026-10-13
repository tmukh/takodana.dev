"use client";

// Shared anatomy for interactive figures: a frame with a title and a one-line instruction, the
// figure itself, a caption, and the data behind it as a table ("Show the numbers"), so nothing is
// colour-only or hover-only.

import { useEffect, useState, type ReactNode } from "react";
import s from "./viz.module.css";

export function Figure({
  title,
  how,
  children,
  caption,
  numbers,
}: {
  title: string;
  how?: string;
  children: ReactNode;
  caption?: ReactNode;
  numbers?: { head: string[]; rows: (string | number)[][]; note?: string };
}) {
  return (
    <div className={s.frame}>
      <div className={s.head}>
        <span className={s.kicker}>Interactive</span>
        <h4 className={s.title}>{title}</h4>
        {how && <p className={s.how}>{how}</p>}
      </div>
      <div className={s.body}>{children}</div>
      {caption && <p className={s.caption}>{caption}</p>}
      {numbers && (
        <details className={s.numbers}>
          <summary>Show the numbers</summary>
          <div className={s.tableBox}>
            <table>
              <thead>
                <tr>
                  {numbers.head.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numbers.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {numbers.note && <p className={s.note}>{numbers.note}</p>}
        </details>
      )}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className={s.slider}>
      <span>
        {label} <b>{format ? format(value) : value}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={s.choice} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Fetch JSON once per URL; figures share the cache. */
const jsonCache = new Map<string, Promise<unknown>>();
export function useJson<T>(url: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    if (!jsonCache.has(url)) jsonCache.set(url, fetch(url).then((r) => r.json()));
    jsonCache.get(url)!.then((d) => alive && setData(d as T));
    return () => {
      alive = false;
    };
  }, [url]);
  return data;
}

export const DATA = "/writing/glasswing/data";
