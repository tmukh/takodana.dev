---
title: "Serving a model to strangers"
date: 2026-10-13
series: "glasswing explained · 6"
group: "glasswing"
summary: "The same engine that runs glasswing in your browser also serves a real open model, SmolLM2, from a cluster in my flat to anyone on the internet, without a login. How a request gets there, what makes a model feel fast, and the limits that keep it alive. You can try it from this page."
---

The first five parts of this series were about one small model: how it reads ([part 1](/writing/glasswing-1-letters-to-numbers/)), what happens inside ([part 2](/writing/glasswing-2-inside-the-model/)), how it learned ([part 3](/writing/glasswing-3-teaching-it-to-write/)), the engine that runs it in your browser ([part 4](/writing/glasswing-4-in-your-browser/)) and the circuit it uses to copy names ([part 5](/writing/glasswing-induction-heads/)). This last part is about the other side of language models: serving one to people you don't know.

## A real model on the same engine

glasswing only knows children's stories. To serve something you can actually ask a question, I loaded **SmolLM2-135M-Instruct**, a small open chat model by Hugging Face, into the same Rust engine. It has the same architecture as glasswing, just bigger: 30 layers instead of 8, 135 million parameters instead of 15.7. Before trusting it, I checked it the same way as in part 4: my implementation of the model gives the same numbers as Hugging Face's own to within 0.00003, and the same answers word for word.

Here it is. This sends a real request from your browser to the server:

```figure
live-api
```

## How a request gets there

The server runs on a single-node Kubernetes cluster on a computer in my flat. Getting a request from your browser to it, safely, takes a few hops; so does getting a new version of the code onto it:

```figure
request-path
```

The second path matters as much as the first. The cluster only ever changes through Git: a pull request with a new, signed image digest, which Argo CD then applies. That makes every change reviewable, every version traceable to the exact code and model files inside it, and every mistake undoable with `git revert`.

## What makes a model feel fast

A language model's speed is two different numbers, and users feel them differently:

```figure
time-anatomy
```

The busy row is a real accident. While I was writing this post, my test request arrived while a stranger's long answer was being generated. Both generations shared the same CPU threads, and my short question waited 12.5 seconds for its first word instead of 2. In a data centre the fix would be more machines or batching many requests into one pass; on a home server, it's the limits below.

There's also a cheap improvement left on the table: the engine reads the prompt one token at a time through every weight matrix. Reading all of a prompt's tokens in one pass over each matrix would reuse every weight it loads from memory many times over, and should cut the time to the first word considerably. That's the first thing I'd change next.

## Serving people you don't know

A public endpoint with no login has to protect itself, because anyone, or any script, can call it. The first protection is a rate limit for each visitor:

```figure
token-bucket
```

The second is a cap on how much runs at once. The CPU can only do so much; if every request were started immediately, all of them would crawl. The server runs at most two generations at a time, lets a third wait up to 5 seconds for a free slot, and otherwise answers **503 busy**:

```figure
queue-sim
```

The rest of the protections are smaller but each one closes a door:

- **at most 256 new tokens and 60 seconds** per request, so one request can't hold a slot forever;
- **generation stops when you leave**: if the connection closes, the next token isn't computed;
- **at most 64 KB and 20 messages** per request;
- **no prompt injection through the chat template**: SmolLM2 separates turns with special markers like `<|im_start|>`. The server removes those markers from what you type, so a message can't pretend to be the system or the assistant;
- **no logging of what you write**: the server logs one line per request with timings and token counts, and nothing else.

## Watching it

The server reports its own health to Prometheus, the monitoring system on the cluster: requests by outcome (answered, rate-limited, busy, timed out, abandoned), tokens generated, and histograms of time to first token and of tokens per second. Those metrics are only reachable from inside the cluster; the tunnel answers 404 if you ask for them from outside.

One lesson came from breaking it on purpose. I changed the firewall rule (a Kubernetes NetworkPolicy) so that the ingress could no longer reach the server, expecting the site to fail immediately. It didn't: it kept answering for minutes. A firewall rule decides which new connections may open; it doesn't cut the ones already open, and the ingress keeps its connections to the server alive between requests. Only when those idled out did the site fail. "I changed the rule and nothing broke" proves nothing until the old connections are gone.

## The end of the series

That's glasswing from start to finish: text to numbers, numbers through attention and neurons, training from noise to stories, a from-scratch engine checked against the original, a circuit inside it, and the same engine serving strangers. Everything is open: [the lab](/projects/glasswing/#lab) to watch it write, [the live models](https://glasswing.takodana.dev) to ask questions, and [the code, data and notes](https://github.com/tmukh/glasswing) for every step.

*Built with [Claude Code](https://claude.com/claude-code) as a pair programmer; I directed the design, reviewed the code and ran the experiments. Code and data: [github.com/tmukh/glasswing](https://github.com/tmukh/glasswing).*
