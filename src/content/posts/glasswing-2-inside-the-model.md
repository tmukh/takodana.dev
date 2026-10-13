---
title: "What happens inside: attention, neurons, and a stream of numbers"
date: 2026-10-13
series: "glasswing explained · 2"
group: "glasswing"
summary: "How a stack of eight identical layers turns a list of word vectors into a guess for the next word: words looking at each other, neurons with surprisingly specific jobs, and the moment the right answer appears."
---

In [part 1](/writing/glasswing-1-letters-to-numbers/), a story became a list of vectors: one row of 384 numbers per token. This post follows those vectors up through the model until, at the top, they turn into a guess for the next word. As before, every figure uses the real model.

## The whole model on one page

glasswing has the same shape as most modern language models (it's a small copy of Meta's Llama design), and the whole thing fits on one diagram:

```figure
block-diagram
```

The key idea is the **residual stream**, the vertical line on the left. Each token keeps one vector for the whole trip. Every layer reads a copy of it, computes something, and **adds** the result back. Nothing is ever overwritten: by the top, each token's vector is the original embedding plus eight layers' worth of additions. Each layer has two parts with very different jobs:

- **attention**: the only place where words exchange information;
- the **MLP**: where each word is processed on its own, by 1,024 "neurons".

## Attention: words looking at each other

To guess what comes after *Lily gave the ball to*, the model needs information from earlier words: who else was there? Attention is how a word gathers it. For every word, the layer computes three things from its vector:

- a **query**: roughly, the question the word is asking;
- a **key**: what the word has to offer to others who ask;
- a **value**: the information it hands over if chosen.

The word then compares its query with every earlier word's key. Good matches get a bigger share of its attention, and it takes in a blend of their values in those shares:

```figure
attention-toy
```

That's one **head**. Each layer has six, each with its own idea of what to ask, and their results are combined. glasswing has 48 heads in total.

### No peeking at the future

A model that predicts the next word must not be allowed to see it. During training, glasswing predicts the next word at *every* position of a 256-token window at once, which is efficient but means the answer to each prediction is sitting right there in the input. The **causal mask** forbids each word from looking at anything after itself:

```figure
causal-mask
```

### What the heads actually learned

Nobody told the heads what to look for. Here is what they ended up doing, on three sentences:

```figure
attention-real
```

Three patterns are easy to spot. The previous-token head in layer 3 attends almost entirely to the word right before. A head in layer 1 parks most of its attention on the invisible start token whenever there's nothing useful to look at: an **attention sink**, which turns up in nearly every transformer. And on the repeated sentence, the head in layer 4 looks at the word that came *after* the earlier occurrence of the current word. That's an **induction head**, and [part 5](/writing/glasswing-induction-heads/) shows the model really uses it.

### Word order, by rotating arrows

Attention compares vectors; it has no built-in sense of which word came first. glasswing solves that with a geometric trick:

```figure
rope-dial
```

## The MLP: 1,024 neurons per layer, per word

After attention, each word's vector goes through the **MLP** on its own: the 384 numbers are expanded into 1,024 intermediate values, the **neurons**, and then compressed back into 384 numbers that get added to the stream. A neuron "fires" when its value is large. In the [lab](/projects/glasswing/#lab), these are the glowing grids: one grid per layer, one dot per neuron.

Most neurons respond to many unrelated things at once and are hard to describe. But some have strikingly specific jobs. I ran the model over 2,000 stories it never saw during training and kept, for every neuron, the moments it fired hardest:

```figure
neurons
```

These are worth a second look. The model was only ever trained to guess the next word, yet it has neurons for story structure: one that fires at the end of a story's setup, just before *One day*; one for the moral at the end, *from that day on*; one that fires on *named* because a name has to come next. Children's stories follow strict patterns, and the cheapest way to predict them was to learn the patterns.

## Following one word to the top

Putting it together: here's one sentence, *Lily and Ben were playing in the park. Lily gave the ball to Ben.* Pick a word to see what each layer adds to it, and what the model would guess if it stopped after that layer (a technique called the **logit lens**):

```figure
residual-stream
```

At *to*, the guesses tell a story. Layers 1 and 2 expect a verb (*to play*, *to be*). Layers 3 and 4 have worked out that a person comes next and guess *her* (with *Lily*, the wrong name, as runner-up in layer 3). From layer 5 the model settles on *Ben* (44%), and by the output it's 95% sure. Somewhere between layers 4 and 5, information about who's left in the scene arrives at the word *to*. Part 5 tracks down where it comes from.

## What comes next

All of this only works because of the numbers inside the model: 15.7 million of them, in the embedding table, the attention heads and the neurons. None of them were set by hand. Part 3 is about training: how 3.6 hours on one graphics card turned random numbers into a model that writes stories, and what it wrote along the way.

*Built with [Claude Code](https://claude.com/claude-code) as a pair programmer; I directed the design, reviewed the code and ran the experiments. Code and data: [github.com/tmukh/glasswing](https://github.com/tmukh/glasswing).*
