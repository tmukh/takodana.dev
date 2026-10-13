---
title: "A model in your browser: rebuilding it from scratch, and proving it's the same"
date: 2026-10-13
series: "glasswing explained · 4"
group: "glasswing"
summary: "Training gave me a file of numbers and a Python program to run it. To make it run in a web page, I wrote the model again in Rust, checked it number by number against the original, and made it fast. A tour of the engine, with the real measurements."
---

At the end of [part 3](/writing/glasswing-3-teaching-it-to-write/), glasswing was a 63 MB file of numbers, plus PyTorch, a large Python library, to run it. Neither belongs in a web page. So I wrote a second implementation: the same model, written out in Rust with no machine-learning library at all, compiled to **WebAssembly** so it runs inside your browser at close to native speed. This post is about that engine: how to know it's right, and how it got fast.

## Rewriting a model by hand

Everything glasswing does reduces to a handful of operations, the ones from [part 2](/writing/glasswing-2-inside-the-model/): look up a row in a table, multiply a vector by a matrix, rescale a vector (RMSNorm), rotate pairs of numbers (RoPE), softmax, and add. The Rust engine is a few hundred lines that do exactly those, in order, plus a reader for the weights file. Writing it is not the hard part. Knowing it's correct is.

A bug in a model doesn't crash anything. A wrong index or a swapped matrix still produces numbers, and often still produces fluent text, just not the text the trained model would write. You can't eyeball your way to correctness.

## Checking every step against the original

So the engine is checked against PyTorch, the reference, at every single stage of a forward pass. A small test model with random weights runs the same prompt through both implementations, and every intermediate result is compared: after the embedding, after each normalisation, the queries, keys and values of every head, the attention weights, every neuron, the logits. 25 stages, every one has to agree:

```figure
parity-check
```

This test runs on every change to the code. During the project I planted bugs on purpose to see whether it catches them, like the transposed matrix above. It did every time, and it named the stage.

## Remembering instead of recomputing

Writing a story means running the model once per new word. A naive engine would feed the whole story through all eight layers every time: word 200 would redo the work for words 1 to 199. There's a better way:

```figure
kv-cache
```

The cache has its own trap, and I planted that bug too: a position counted off by one, only in the cached path. The full-story test above stayed green, and the model still wrote fluent stories, just *different* stories from PyTorch's. A second test that feeds the same text in different-sized pieces and demands identical results caught it. The lesson: a shortcut needs its own test, because a test of the slow path proves nothing about the fast one.

## Making it fast

Here's the speed of every version, measured on the same laptop:

```figure
speed-ladder
```

The biggest jump came from one small change. Every word requires multiplying vectors by matrices, which means millions of dot products: multiply pairs of numbers and add up the results. The first version added them up one by one:

```figure
dot-lanes
```

After that change, the engine is close to the speed limit set by memory: each word has to read all 63 MB of weights, and the processor can't get them any faster. Wider SIMD instructions on top barely helped, which is how you know you've hit that wall.

## Half the download: 16-bit weights

63 MB is a lot to download for a web page. But the weights don't need 32 bits of precision to be stored, only to be computed with:

```figure
float-bits
```

So the file your browser downloads holds every weight as a 16-bit number (31.5 MB), and the engine widens them back to 32 bits as it loads them. I checked that this costs nothing: the greedy stories from the 16-bit file are identical to those from the 32-bit file, in PyTorch, in native Rust and in the browser.

## Into the browser

The last step is compiling the Rust engine to WebAssembly: a compact instruction format every modern browser can run, sandboxed, at close to native speed. The result is a 288 KB file. In the [lab](/projects/glasswing/#lab) it runs in a **Web Worker**, a background thread, so the page stays smooth while the model computes; the worker sends the page one message per word, with everything the visualisation draws. In V8, the JavaScript engine inside Chrome, it generates about 285 words per second with full tracing switched on, close to native. The lab slows it down on purpose so you can watch.

Three automatic checks keep it honest. The browser build must stay under a size budget (400 KB). It must produce the same greedy text as the native build. And the weights the website serves are pinned by checksum to a specific release of the engine, so the page can only ever load the files the tests ran against.

## What comes next

With the model running in the open, where every head and neuron is visible and can be switched off, we can ask a sharper question than "what is it doing?": *how* does it do something? [Part 5](/writing/glasswing-induction-heads/) tracks down the circuit glasswing uses to copy names, and proves the model depends on it.

*Built with [Claude Code](https://claude.com/claude-code) as a pair programmer; I directed the design, reviewed the code and ran the experiments. Code and data: [github.com/tmukh/glasswing](https://github.com/tmukh/glasswing).*
