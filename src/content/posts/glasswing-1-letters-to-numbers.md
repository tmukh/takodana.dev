---
title: "How a language model reads: from letters to numbers"
date: 2026-10-13
series: "glasswing explained · 1"
group: "glasswing"
summary: "The first step of every language model happens before any thinking: turning text into numbers. With the real tokenizer and the real word vectors of a model I trained, all of it interactive."
---

[glasswing](/projects/glasswing/) is a small language model I trained to write children's stories. It runs in your browser, and you can watch every part of it while it writes. This series explains how it works from start to finish, one step per post, for readers who have never looked inside a language model. Every figure uses the real model's data: its tokenizer, its weights, its training run. Nothing is a mock-up.

This first post is about something that happens before any "thinking": how text becomes numbers.

## Computers only see numbers

A model can't read letters. Before anything else, text is turned into numbers using a standard called UTF-8: every character becomes one to four **bytes**, each a number between 0 and 255.

```figure
bytes
```

We could feed those bytes to the model directly. It works, but it's wasteful: *Once upon a time* is 16 steps, and the model would spend much of its capacity learning to spell before it learns anything about stories. The cost of the model's main operation also grows with the length of the text, so twice as many steps is more than twice the work.

## Byte-pair encoding: learning a vocabulary from data

The fix is to give common chunks of text their own number. Instead of choosing those chunks by hand, the tokenizer learns them from the training stories with a simple recipe called **byte-pair encoding** (BPE):

1. Start with the 256 possible bytes as the vocabulary.
2. Count every pair of neighbouring tokens in the training text.
3. Glue the most frequent pair into a new token, and replace it everywhere.
4. Repeat.

That's all. After a few merges, common letter pairs become tokens; after a few hundred, whole words do. One detail matters: a word's leading space belongs to the word, so <code>&nbsp;the</code> (with a space) and <code>The</code> at the start of a sentence are different tokens. Here is the real tokenizer replaying its own training on a sentence. Try typing something:

```figure
bpe-stepper
```

Two things stand out. Words that appear constantly in children's stories, like *Lily*, *happy* and *upon*, become single tokens within the first 200 merges. Words the stories rarely use stay in pieces even at the end. Type *The astronomer measured the redshift of a quasar* and watch it fall apart into fragments: a tokenizer is only efficient on text that looks like what it learned from.

## How big should the vocabulary be?

Every merge makes text shorter, but it isn't free. Each token in the vocabulary needs its own row in a table inside the model (more on that table in a moment), and every row is 384 numbers that have to be learned. So the size of the vocabulary is a trade-off:

```figure
bpe-curve
```

I stopped at 4,096 tokens: 256 bytes, 3,839 merges and one special token that marks where one story ends and the next begins. On stories the tokenizer never saw, that's 3.9 letters per token, and 97% of words become a single token. Large models like GPT-2 use 50,000 tokens, but they write about everything; glasswing only needs the few thousand words that children's stories use.

## From token to vector: the embedding table

After tokenizing, a story is a list of numbers between 0 and 4,095. Those numbers are just labels, like seat numbers: token 403 (<code>&nbsp;Lily</code>) isn't "bigger" than token 375 (<code>&nbsp;happy</code>). So the first thing the model does is look each token up in a table with one row per token. Each row is a list of 384 numbers, the token's **vector** or **embedding**. This lookup is the model's first layer.

Nobody fills in that table by hand. It starts as random noise, and training (the subject of part 3) nudges the numbers, billions of times, in whatever direction helps the model predict the next word better. What comes out is not random at all:

```figure
word-vector
```

The nearest neighbours of *Lily* are other girls' names. The nearest neighbours of *happy* include *glad* and *cheerful*, but also *sad*: for a model that learns from where words appear, *happy* and *sad* are close relatives. Both follow *felt* and *was very*, both describe characters, both come at the end of a sentence. The vector captures how a word is *used*, not what it means to us.

## A map of the vocabulary

384 numbers per word is too many to picture, but there are methods to squeeze them onto a flat map while keeping words with similar vectors close together. Here are 320 of the words glasswing uses most:

```figure
word-map
```

Names cluster with names, colours with colours, numbers with numbers. That structure is a side effect: the model was only ever trained to guess the next word in a story. To get good at that, it had to work out that *Lily* and *Sue* play the same role in a sentence, and the place where it keeps that knowledge is this table.

## What comes next

At this point a story has become a grid of numbers: one row of 384 for every token. In [the lab](/projects/glasswing/#lab), that's the bottom of the tower, the *embedding* label. The next post is about what happens on the way up: how the model lets words look at each other (**attention**), what the **neurons** in each layer do, and how eight layers of that turn a list of word vectors into a prediction of the next word.

*Built with [Claude Code](https://claude.com/claude-code) as a pair programmer; I directed the design, reviewed the code and ran the experiments. Code and data: [github.com/tmukh/glasswing](https://github.com/tmukh/glasswing).*
