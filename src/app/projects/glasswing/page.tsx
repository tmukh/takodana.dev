import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import Lab from "@/components/glasswing/Lab";
import s from "@/components/page.module.css";
import { glasswingMilestones, glasswingStats } from "@/data/site";

export const metadata: Metadata = {
  title: "glasswing",
  description:
    "A small language model you can watch think: trained on children's stories, running in your browser on an inference engine written from scratch in Rust.",
};

const pipeline = [
  { name: "Tokenizer", text: "byte-level BPE, 4,096 tokens, trained on TinyStories: most words are one token" },
  { name: "Embedding", text: "each token becomes 384 numbers: the start of the residual stream" },
  { name: "8 × attention", text: "6 heads per layer move information between positions; a token only sees the past" },
  { name: "8 × MLP", text: "1,024 neurons per layer (SwiGLU) work on each position alone" },
  { name: "Next token", text: "the stream is scored against all 4,096 tokens; temperature and top-p pick one" },
];

const broke = [
  [
    "A loss that looked too good.",
    "With the causal mask removed, validation loss fell to 0.55 instead of 2.96, and the model wrote “did did but very both both”. It had learned to copy the next token, which doesn't exist yet when you generate.",
  ],
  [
    "A transposed matrix with the right shape.",
    "Layer 1's query weights loaded transposed pass every shape check: they're square. The stage-by-stage parity test named the exact tensor that diverged.",
  ],
  [
    "A bug that only changes the story.",
    "RoPE positions off by one, only when decoding a single token through the KV cache. The full-sequence test stayed green and generation stayed fluent; it just wrote a different story than PyTorch. A test that splits the sequence caught it.",
  ],
  [
    "My own size estimate.",
    "The first plan said 15M parameters for a shape that is 7.2M with our vocabulary. A test on the parameter count caught it before training.",
  ],
];

export default function Glasswing() {
  return (
    <>
      <SiteHeader current="/projects/" />
      <main className={s.main}>
        <section className={s.hero}>
          <Link href="/projects/" className={s.back}>
            ← Projects
          </Link>
          <h1 className={s.title}>glasswing</h1>
          <p className={s.lede}>
            A small language model you can watch think. It learned to write children&apos;s stories, and it runs right
            here in your browser on an inference engine written from scratch in Rust, with no ML framework. While it
            writes, every layer, neuron and attention head is visible.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingTop: 6 }}>
            <a className="button primary" href="#lab">
              Try it
            </a>
            <Link className="button" href="/writing/glasswing-induction-heads/">
              Write-up: the circuit inside
            </Link>
            <a className="button" href="https://glasswing.takodana.dev">
              Live models (SmolLM2 too)
            </a>
            <a className="button" href="https://github.com/tmukh/glasswing">
              Repository
            </a>
          </div>
        </section>

        <dl className={s.stats}>
          <div><dt>parameters</dt><dd>{glasswingStats.params}</dd></div>
          <div><dt>validation loss</dt><dd>{glasswingStats.valLoss}</dd></div>
          <div><dt>trained on, one GPU</dt><dd>{glasswingStats.trainTokens} tokens</dd></div>
          <div><dt>download, f16</dt><dd>{glasswingStats.download}</dd></div>
        </dl>

        <section id="lab" aria-labelledby="lab-h" className={s.section}>
          <h2 id="lab-h" className={s.h2}>Watch it write</h2>
          <p className={s.sectionText}>
            Each token climbs the tower from the embedding at the bottom to the prediction at the top. The grids are the
            MLP neurons of the eight layers, the orbs beside them the attention heads. Hover any word in the story to
            see what the model was predicting there and which earlier words it looked at.
          </p>
          <Lab />
        </section>

        <section aria-labelledby="how" className={s.section}>
          <h2 id="how" className={s.h2}>How it works</h2>
          <p className={s.sectionText}>
            A Llama-style transformer (RMSNorm, rotary positions, SwiGLU), {glasswingStats.params} parameters, trained
            with PyTorch on one RTX 3060 Ti. The browser runs a separate implementation: the same model written out in
            plain Rust (its own safetensors reader, matrix maths, attention loop and KV cache) and compiled to
            WebAssembly with SIMD. A test in CI compares every intermediate tensor against PyTorch, so the two
            can&apos;t drift apart.
          </p>
          <div className={s.flow}>
            {pipeline.map((p, i) => (
              <Fragment key={p.name}>
                {i > 0 && <span aria-hidden="true" className={s.arrow}>→</span>}
                <div className="card">
                  <strong>{p.name}</strong>
                  <span>{p.text}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        <section aria-labelledby="circuit" className={s.section} style={{ maxWidth: 860 }}>
          <h2 id="circuit" className={s.h2}>The circuit inside</h2>
          <p className={s.sectionText}>
            The model learned an <strong>induction circuit</strong>: two previous-token heads in layer 3 (L3H3, L3H1) feed
            an induction head in layer 4 (L4H4), which looks up what came after the last occurrence of the current word.
            Switch the three off and copying gets measurably worse while three random heads barely matter; in a name task,
            activation patching shows the name moving to the last position in layers 5 to 7, the same layer the logit lens
            says the answer appears. The preset in the lab above switches exactly these heads off.{" "}
            <Link href="/writing/glasswing-induction-heads/">Read the write-up</Link>.
          </p>
        </section>

        <section aria-labelledby="serve" className={s.section} style={{ maxWidth: 860 }}>
          <h2 id="serve" className={s.h2}>The same engine, serving a real model</h2>
          <p className={s.sectionText}>
            The engine also loads Hugging Face checkpoints: SmolLM2-135M-Instruct runs on it at{" "}
            <a href="https://glasswing.takodana.dev">glasswing.takodana.dev</a>, served from my k3s cluster through the
            Cloudflare Tunnel, with greedy answers identical to the reference implementation. It&apos;s public without a
            login, so it limits itself: a token bucket per visitor, two generations at a time, 256 tokens per answer,
            prompts never logged, time to first token and tokens/s in Prometheus.
          </p>
        </section>

        <section aria-labelledby="broke" className={s.section} style={{ maxWidth: 860 }}>
          <h2 id="broke" className={s.h2}>What I broke on purpose</h2>
          <p className={s.sectionText}>
            Every milestone ends with one deliberate failure, made and fixed through Git, to see what catches it.
          </p>
          <ul className={s.rows}>
            {broke.map(([head, text]) => (
              <li key={head} style={{ display: "block", padding: "18px 0" }}>
                <strong>{head}</strong> <span style={{ color: "var(--ink-2)" }}>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ms" className={s.section}>
          <h2 id="ms" className={s.h2}>Milestones</h2>
          <ol aria-label="Milestones" className={s.milestones}>
            {glasswingMilestones.map((m) => (
              <li key={m.id} className={m.done ? undefined : s.next}>
                <span className={s.status} style={{ fontSize: 12, color: m.done ? "var(--ok)" : "var(--muted)" }}>
                  {m.id} · {m.done ? "done" : "next"}
                </span>
                {m.text}
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
