"use client";

// The whole model as one diagram: hover or tap a box for what it does, in plain words.

import { useState } from "react";
import { Figure } from "../ui";
import s from "../viz.module.css";

type Box = { id: string; label: string; x: number; y: number; w: number; text: string; group?: boolean };

const BOXES: Box[] = [
  { id: "tok", label: "tokens", x: 20, y: 300, w: 120, text: "The story as token numbers, e.g. 428 437 258 396 for “Once upon a time” (part 1)." },
  { id: "emb", label: "embedding", x: 20, y: 230, w: 120, text: "Look up each token's row of 384 numbers. From here on, every token is a vector, and the list of vectors is the residual stream." },
  { id: "norm1", label: "RMSNorm", x: 200, y: 230, w: 110, text: "Rescale a copy of each vector to a standard size, so no layer has to cope with numbers that keep growing." },
  { id: "attn", label: "attention · 6 heads", x: 340, y: 230, w: 170, text: "The only place where tokens look at each other. Each head lets every token gather information from earlier tokens. Below: how it decides where to look." },
  { id: "add1", label: "+", x: 540, y: 230, w: 40, text: "Add the result back onto the token's vector. Layers only ever add to the residual stream; they never overwrite it." },
  { id: "norm2", label: "RMSNorm", x: 200, y: 160, w: 110, text: "Normalise a copy again before the MLP." },
  { id: "mlp", label: "MLP · 1,024 neurons", x: 340, y: 160, w: 170, text: "Works on each token on its own: 384 numbers in, 1,024 “neurons”, 384 numbers out. Much of what the model knows is stored here. Below: what some neurons fire on." },
  { id: "add2", label: "+", x: 540, y: 160, w: 40, text: "Add the MLP's output back onto the stream." },
  { id: "layers", label: "× 8 layers", x: 610, y: 160, w: 110, group: true, text: "The attention + MLP block is repeated 8 times, each with its own weights. Information flows upwards, layer by layer." },
  { id: "normf", label: "RMSNorm", x: 200, y: 80, w: 110, text: "A final normalisation of each token's vector." },
  { id: "out", label: "scores for 4,096 tokens", x: 340, y: 80, w: 240, text: "Compare the final vector with every token's embedding: the more similar, the higher the score. Softmax turns scores into probabilities for the next token." },
  { id: "next", label: "next token", x: 610, y: 80, w: 110, text: "Pick one (temperature and top-p, part 3), append it to the story, and run again." },
];

export default function BlockDiagram() {
  const [on, setOn] = useState<Box>(BOXES[3]);
  const W = 740;
  const H = 350;
  return (
    <Figure
      title="The whole model on one page"
      how="Hover or tap any box."
      caption="Data flows from the bottom (the story's tokens) to the top (a guess for the next token). The vertical line on the left is the residual stream: one vector per token that every layer reads from and adds to."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Diagram of glasswing: embedding, eight layers of attention and MLP, output scores">
        <rect x={180} y={146} width={548} height={128} rx={10} fill="none" stroke="var(--line-strong)" strokeDasharray="5 5" />
        <line x1={80} y1={290} x2={80} y2={60} stroke="var(--star)" strokeWidth={3} opacity={0.6} />
        <text x={90} y={130} style={{ fill: "var(--star)" }}>residual</text>
        <text x={90} y={144} style={{ fill: "var(--star)" }}>stream</text>
        {[
          [80, 245, 200, 245], [310, 245, 340, 245], [510, 245, 540, 245], [80, 175, 200, 175], [310, 175, 340, 175],
          [510, 175, 540, 175], [80, 95, 200, 95], [310, 95, 340, 95], [580, 95, 610, 95],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-strong)" strokeWidth={1.5} />
        ))}
        <path d="M560 230 L560 215 L80 215" fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
        <path d="M560 160 L560 140 L80 140" fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
        {BOXES.map((b) => {
          const active = on.id === b.id;
          return (
            <g
              key={b.id}
              tabIndex={0}
              role="button"
              aria-label={b.label}
              onPointerEnter={() => setOn(b)}
              onFocus={() => setOn(b)}
              onClick={() => setOn(b)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={30}
                rx={6}
                fill={active ? "rgba(157,180,255,0.22)" : "var(--ground)"}
                stroke={active ? "var(--accent)" : "var(--line-strong)"}
                strokeDasharray={b.group ? "4 3" : undefined}
              />
              <text x={b.x + b.w / 2} y={b.y + 19} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 12 }}>
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={s.caption} style={{ margin: 0, minHeight: 66 }} aria-live="polite">
        <b style={{ color: "var(--ink)" }}>{on.label}.</b> {on.text}
      </p>
    </Figure>
  );
}
