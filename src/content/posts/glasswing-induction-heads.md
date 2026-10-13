---
title: "Finding an induction head in a 16M-parameter model I can watch think"
date: 2026-10-13
series: "glasswing explained · 5"
group: "glasswing"
summary: "I trained a small language model, rebuilt it in Rust for the browser, and went looking for the circuit that lets it copy names. Two layers, three heads, and the moment the answer appears."
---

[glasswing](/projects/glasswing/) is a small language model you can watch while it writes. The first four parts of this series explained how it reads ([part 1](/writing/glasswing-1-letters-to-numbers/)), what happens inside ([part 2](/writing/glasswing-2-inside-the-model/)), how it was trained ([part 3](/writing/glasswing-3-teaching-it-to-write/)) and how it runs in your browser ([part 4](/writing/glasswing-4-in-your-browser/)). This part is about what I was most curious about: once you can see every head and neuron, can you find the machinery behind something the model actually does, and prove the model uses it?

In short: glasswing has 8 layers with 6 attention heads each. It's a Llama-style transformer with 15.7 million parameters, trained on [TinyStories](https://arxiv.org/abs/2305.07759) to a validation loss of 1.18.

Children's stories repeat themselves. Names come back sentence after sentence: *Lily and Ben were playing in the park. Lily gave the ball to…* The model gets that kind of prompt right in all 180 of my test cases (three templates, 60 name pairs). To do it, it has to look back, find the other name, and copy it. That smells like an **induction head**.

## What an induction head is

An induction head completes patterns of the form *A B … A → B*: when the current token appeared before, it looks at whatever came *after* that earlier occurrence and predicts it again. [Olsson et al. (2022)](https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html) showed they form in transformers of all sizes, and that they need two heads working together:

1. a **previous-token head** in an earlier layer writes "the token before me was X" into each position;
2. the **induction head** in a later layer searches for positions whose previous token matches the current token, which lands it exactly one step after the earlier occurrence.

```figure
induction-explainer
```

## Finding them

The standard test is to feed the model a random sequence of tokens, then the same sequence again. Nothing in the first half helps predict it except copying, so a head that attends from each token in the second copy to *the token after its first occurrence* is doing induction. I measured that for all 48 heads, and the same for "attends to the previous token".

```figure
head-map
```

One head stands out: **L4H4**, layer 4 head 4, with an induction score of 0.26. No other head gets above 0.05. And right before it, in layer 3, sit the two strongest previous-token heads: L3H3 puts 84% of its attention on the previous token, L3H1 43%. That's the two-step circuit from the paper, found in a 16M-parameter model that only ever read children's stories.

| head | induction score | previous-token score |
|---|---|---|
| L4H4 | **0.26** | 0.01 |
| L3H3 | 0.00 | **0.84** |
| L3H1 | 0.00 | **0.43** |
| median of the other 45 heads | 0.01 | 0.06 |

## Do they matter?

Seeing a pattern in attention weights isn't proof the model uses it. So I switched the heads off (zero-ablation: the head's output is replaced with zeros before it's added back) and measured the loss. As a control, I switched off the same number of randomly chosen heads.

```figure
ablation-chart
```

The cleanest test is repeated text: a 60-token window of a real story, then the same window again. The second copy is much easier (loss 1.40 instead of 1.94), because the model can copy. Switching off the circuit (L4H4, L3H3, L3H1) raises the second copy to 1.59; switching off three random heads, to 1.42. Three heads out of 48 account for about a third of the copying advantage; random ones for almost none.

On ordinary stories the picture is different, and I think it's worth saying plainly: the circuit costs 0.10 and three random heads cost 0.08. Taking out almost any three heads hurts a little; the circuit's specific job is copying. A broader set (L4H4 plus the two heads with the next-highest, though small, induction scores) removed 0.40 of the 0.54 advantage, so copying is also spread over weaker heads.

The name task agrees: with the circuit off, the model still names the right person 97.8% of the time, but its confidence (the logit difference between the right and the wrong name) drops from 10.4 to 7.8.

## Where the name travels

Back to *Lily and Ben were playing in the park. Lily gave the ball to…* To find where the answer is computed, I used **activation patching**. Take a corrupted prompt where the second subject is swapped (*…Ben gave the ball to*, so the right answer flips to Lily), run it, and at one layer and one position paste in the residual stream from the clean run. If that one patch brings the clean answer back, the information that decides the answer lived right there.

```figure
patching-map
```

Two clean bands. In the early layers the only position that matters is the second *A*, the subject of the second sentence: patch it and the clean answer comes back completely. From layer 5 on, that moves to the last position, *to*: 0.23 of the answer restored after layer 5, 0.60 after layer 6, 0.92 after layer 7. Something in layers 5 to 7 reads the subject and moves the information to where the next word is predicted. Ablating heads one at a time points the same way: the two that hurt the name task most are L5H2 and L6H5.

The **logit lens** says the same thing from another angle. Pass the residual stream after each layer through the model's final norm and output layer, as if the model stopped there, and read off the probability of the right name:

```figure
lens-line
```

Through layer 4 the right name has essentially zero probability. After layer 5 it jumps to 0.36, and it reaches 0.81 at the output. The answer is assembled in layer 5, where patching found it arriving at the last position.

## Try it

In the [lab](/projects/glasswing/#lab), *switch off the induction circuit* zeroes these heads in your browser. Generate a story with a fixed seed, switch them off, and generate again with the same seed: the story changes, and with the logit lens on you can watch where the next word stops forming.

## What I'd check next


- **Zero-ablation is crude.** Replacing a head's output with its *average* output would separate "this head is needed" from "an output of zero is out of distribution".
- **One checkpoint, a few templates.** Watching the induction heads appear during training (they often form suddenly, in a phase change) would make a better story than one snapshot.
- **The heads that matter for names but aren't induction heads** (L5H2, L6H5 and L2H3) are the next thing to look at: something moves the name to the last position, and patching says it happens in layers 5 to 7.

## What comes next

This is the last part about the model itself. [Part 6](/writing/glasswing-6-serving-strangers/) is about putting the same engine in front of the public: serving a real model, SmolLM2, to anyone on the internet without a login, and the limits that keep it alive.

*Built with [Claude Code](https://claude.com/claude-code) as a pair programmer; I directed the design, reviewed the code and ran the experiments. Code, analysis and data: [github.com/tmukh/glasswing](https://github.com/tmukh/glasswing).*
