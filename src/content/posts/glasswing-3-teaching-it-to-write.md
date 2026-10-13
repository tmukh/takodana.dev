---
title: "Teaching it to write: 3.6 hours from noise to stories"
date: 2026-10-13
series: "glasswing explained · 3"
group: "glasswing"
summary: "How 15.7 million random numbers became a model that writes children's stories: the loss, walking downhill, the learning-rate schedule, the real training run checkpoint by checkpoint, and how a word finally gets picked."
---

[Part 2](/writing/glasswing-2-inside-the-model/) showed what happens inside glasswing: attention heads, neurons, a stream of numbers. All of that depends on 15.7 million numbers, the model's **weights**, and nobody wrote any of them by hand. Before training they were random, and the model wrote things like *pro O missed. films Oorry*. This post is about how they changed, and what the model wrote along the way.

## One number that says how wrong the model was

Training needs a score. The task is the one from the start of this series: read a piece of a story, guess the next word. The model never just names one word; it gives a probability to every word in its vocabulary. So the natural question after each guess is: how much probability did it give the word that actually came next?

```figure
loss-toy
```

That number, −ln(p), is the **loss** (its proper name is cross-entropy). It's 0 for a certain, correct guess and grows without limit as the right word gets less likely. A model guessing at random among 4,096 tokens would score ln(4096) ≈ 8.3, which is exactly where glasswing started.

## Learning is walking downhill

Now the trick that makes all of modern AI work. For any batch of text, the loss is a function of the 15.7 million weights. Calculus (an algorithm called backpropagation) tells us, for every single weight, whether nudging it up or down would make the loss smaller, and how strongly. That set of directions is the **gradient**. Training is repeating one step, millions of times: compute the loss on some text, compute the gradient, move every weight a little bit downhill.

Here is the same idea with just one weight, so the whole landscape fits on screen:

```figure
descent-toy
```

The **learning rate** is the size of those steps, and it's the most important setting in training. glasswing used AdamW, which adds two refinements: it remembers which way each weight has been moving recently (momentum), and it gives each weight its own step size depending on how noisy its gradient is. Rare words, which only get feedback now and then, still learn.

## A schedule for the step size

The best step size changes during training. At the very start the weights are random and the gradients point in wild directions, so big steps would do damage. Near the end the model is close to a good spot and big steps would overshoot it. So the learning rate follows a schedule:

```figure
lr-schedule
```

## The real run

glasswing trained for 40,000 steps. Each step read 32,768 tokens of stories (128 windows of 256 tokens), computed the loss and the gradient, and took one step downhill: 1.31 billion tokens in total, about 2.4 passes over the TinyStories data. On one RTX 3060 Ti that took 3 hours 38 minutes. Every 1,000 steps the run paused, measured the loss on stories it never trained on, and wrote a story. Drag through it:

```figure
training-run
```

The first minutes are the most fun to watch. At step 50 it has learned which tokens are common and nothing else. By step 100 there are real words in the wrong order; by step 200, sentences with a character in them (*there was a small little boy named Tim*); by step 300, about two minutes in, a story that holds together for a few sentences. Everything after that is slower polishing: keeping track of who is who, finishing the story, adding the moral at the end.

Two things in that curve are worth noticing. The validation loss, measured on stories the model never trained on, kept falling until the last step and never drifted away from the training loss, which means the model was learning general patterns rather than memorising its training stories. And the curve was still sloping down at the end: a longer run or a wider model would have done better. I stopped at 1.18 because the point of glasswing is to be watched, not to be the best small model.

Two technical details made this fit on a laptop-class GPU. Most of the arithmetic ran in **bfloat16**, a 16-bit number format with the same range as normal 32-bit floats but less precision, which roughly doubles the speed. And the run saved a full checkpoint every 1,000 steps, so if the machine had gone to sleep overnight, it could have picked up where it stopped.

## Turning probabilities into a story

After training, the model still only produces probabilities. To write, something has to pick one word, append it, and ask again. How that pick happens changes the text a lot:

```figure
sampler
```

Notice the prompts where the model is sure (*Lily gave the ball to*: Ben, 95%) and where it isn't (*The sky was*: gloomy, dark, a, grey, all around 10%). Where it's unsure, the sampler settings decide the character of the story. In [the lab](/projects/glasswing/#lab) you can change both and generate again with the same seed to see the difference.

## What comes next

At this point there is a trained model: a 63 MB file of numbers, and a Python program that knows how to run it. [Part 4](/writing/glasswing-4-in-your-browser/) is about running it somewhere else entirely: in your browser, on an engine written from scratch in Rust, and how I made sure that engine computes exactly the same thing as the original.

*Built with [Claude Code](https://claude.com/claude-code) as a pair programmer; I directed the design, reviewed the code and ran the experiments. Code and data: [github.com/tmukh/glasswing](https://github.com/tmukh/glasswing).*
