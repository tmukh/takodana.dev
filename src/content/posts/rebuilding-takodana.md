---
title: "Rebuilding takodana.dev as a waystation"
date: 2026-10-12
series: "Site"
group: "Homelab"
summary: "Why the home page is an orrery, why the site is a static export, and why it runs on a laptop in my flat instead of a CDN."
---

The old takodana.dev had one thing I wanted to keep: an orbital simulation you could bend by holding the mouse down. It said more about what I'm curious about than any list of skills. So the new site keeps the orbits and puts the work on them.

## The homelab is the star

Everything I build runs on one single-node k3s cluster, so on the home page that cluster is the star and the projects orbit it. Night Sky Digest is the gas giant; its six moons are the milestones I've finished, and a faint seventh is the next one. Planned work is a dashed orbit. The orbits follow Kepler's third law, so the inner planets really do move faster.

There is also a plain list of every world next to the scene. A canvas is invisible to a screen reader and awkward with a keyboard, so the list does everything the clicks do.

## A static export on nginx

The site is Next.js with `output: "export"`: at build time every page becomes plain HTML, CSS and JavaScript. Blog posts are Markdown files in the repository, rendered to HTML during the build, code highlighting included, so no Markdown parser or highlighter ships to the browser. Fonts are bundled at build time too, which means visitors never contact Google.

What's left to serve is a folder of files, so the container is an unprivileged nginx with nothing else in it.

## Why not a CDN

A CDN would keep the site up when my laptop is off. I chose the cluster anyway, deliberately: the site is deployed the same way as everything else here, through a pull request to the GitOps repository, with a signed, digest-pinned image, behind the same Cloudflare Tunnel as Night Sky Digest. If the laptop is asleep, the site is too, and the footer says so.

> The trade-off is availability for honesty: this site is part of the homelab it describes.
