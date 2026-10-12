// The tower: the model drawn as a stack of layers, lit up by each token as it passes through.
//
//   - each layer is a 32x32 grid of its 1,024 MLP neurons: gold = positive activation,
//     blue = negative, brightness = magnitude;
//   - six orbs per layer are the attention heads, brighter when the head focuses on few tokens;
//   - the strip climbing the right side is the residual stream (384 numbers) after the embedding
//     and after every layer;
//   - a pulse carries each token from the embedding at the bottom to the output at the top.
//
// Plain three.js, no React: the Lab component owns one Tower and feeds it steps.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ModelConfig, StepMsg } from "./types";

const GOLD = new THREE.Color("#ffd27a");
const BLUE = new THREE.Color("#7fa8ff");
const SPACING = 1.25; // vertical distance between layers
const SIZE = 7; // width of a neuron grid

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function label(text: string, color = "#8c96b2"): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.font = '500 36px "IBM Plex Mono", ui-monospace, monospace';
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.fillText(text, 4, 32);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  s.scale.set(4.8, 0.6, 1);
  return s;
}

/** Signed value -> colour: gold for positive, blue for negative, black at zero. */
function shade(out: Float32Array, i: number, v: number, scale: number, gain = 1) {
  const m = Math.min(1, Math.abs(v) / (scale || 1)) ** 0.75 * gain;
  const c = v >= 0 ? GOLD : BLUE;
  out[i * 3] = c.r * m;
  out[i * 3 + 1] = c.g * m;
  out[i * 3 + 2] = c.b * m;
}

export class Tower {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private cfg: ModelConfig;
  private neurons: THREE.Points;
  private resid: THREE.Points;
  private heads: THREE.Sprite[][] = [];
  private slabs: THREE.LineSegments[] = [];
  private pulse: THREE.Sprite;
  private target: Float32Array; // neuron colours for the current token
  private previous: Float32Array; // neuron colours for the token before
  private residTarget: Float32Array;
  private residPrevious: Float32Array;
  private headFocus: number[][];
  private start = 0;
  private duration = 1;
  private frame = 0;
  private visible = true;
  private observer: IntersectionObserver;
  private selectedLayer = 0;
  private selectedHead: number | "all" = "all";
  private ablated = new Set<string>();
  private reduced: boolean;
  private y0: number;

  constructor(canvas: HTMLCanvasElement, cfg: ModelConfig) {
    this.cfg = cfg;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    const L = cfg.n_layers;
    this.y0 = -((L + 1) * SPACING) / 2; // centre the tower vertically
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(13, 3.5, 15);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableZoom = false; // the page scrolls; the tower doesn't steal the wheel
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.autoRotate = !this.reduced;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.target.set(0, -0.8, 0); // a little below centre: the labels sit above the top layer

    const glow = glowTexture();
    const side = Math.ceil(Math.sqrt(cfg.hidden_dim));

    // Neurons: one Points cloud for all layers.
    const n = L * cfg.hidden_dim;
    const pos = new Float32Array(n * 3);
    for (let l = 0; l < L; l++) {
      for (let i = 0; i < cfg.hidden_dim; i++) {
        const k = l * cfg.hidden_dim + i;
        pos[k * 3] = ((i % side) / (side - 1) - 0.5) * SIZE;
        pos[k * 3 + 1] = this.layerY(l);
        pos[k * 3 + 2] = (Math.floor(i / side) / (side - 1) - 0.5) * SIZE;
      }
    }
    this.target = new Float32Array(n * 3);
    this.previous = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.neurons = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.32,
        map: glow,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.neurons);

    // Residual stream: a strip of `dim` points between layers, on the right side.
    const r = (L + 1) * cfg.dim;
    const rpos = new Float32Array(r * 3);
    for (let b = 0; b <= L; b++) {
      for (let i = 0; i < cfg.dim; i++) {
        const k = b * cfg.dim + i;
        rpos[k * 3] = SIZE / 2 + 1.1 + (i % 4) * 0.12;
        rpos[k * 3 + 1] = this.layerY(b) - SPACING / 2;
        rpos[k * 3 + 2] = (Math.floor(i / 4) / (cfg.dim / 4 - 1) - 0.5) * SIZE;
      }
    }
    this.residTarget = new Float32Array(r * 3);
    this.residPrevious = new Float32Array(r * 3);
    const rgeo = new THREE.BufferGeometry();
    rgeo.setAttribute("position", new THREE.BufferAttribute(rpos, 3));
    rgeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(r * 3), 3));
    this.resid = new THREE.Points(
      rgeo,
      new THREE.PointsMaterial({
        size: 0.18,
        map: glow,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.resid);

    // Slab outlines, head orbs, labels.
    this.headFocus = Array.from({ length: L }, () => new Array(cfg.n_heads).fill(0));
    const half = SIZE / 2 + 0.25;
    for (let l = 0; l < L; l++) {
      const y = this.layerY(l);
      const pts = [
        [-half, -half], [half, -half], [half, -half], [half, half],
        [half, half], [-half, half], [-half, half], [-half, -half],
      ].flatMap(([x, z]) => [x, y, z]);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const slab = new THREE.LineSegments(
        g,
        new THREE.LineBasicMaterial({ color: 0x34405f, transparent: true, opacity: 0.6 }),
      );
      this.slabs.push(slab);
      this.scene.add(slab);

      const row: THREE.Sprite[] = [];
      for (let h = 0; h < cfg.n_heads; h++) {
        const s = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glow,
            color: 0x9db4ff,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        s.position.set(-half - 1.0, y, ((h + 0.5) / cfg.n_heads - 0.5) * SIZE);
        s.scale.setScalar(0.5);
        row.push(s);
        this.scene.add(s);
      }
      this.heads.push(row);

      // On the front edge, away from the head orbs (left) and the residual strip (right).
      const lab = label(`layer ${l + 1}`);
      lab.position.set(-half + 2.2, y, half + 0.7);
      this.scene.add(lab);
    }
    const bottom = label("embedding", "#b9c0d4");
    bottom.position.set(SIZE / 2 + 2.5, this.layerY(0) - SPACING / 2, -half - 0.6);
    this.scene.add(bottom);
    const top = label("→ next token", "#b9c0d4");
    top.position.set(SIZE / 2 + 2.5, this.layerY(L) - SPACING / 2, -half - 0.6);
    this.scene.add(top);

    this.pulse = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: 0xffe2a8,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.pulse.scale.setScalar(2.2);
    this.pulse.visible = false;
    this.scene.add(this.pulse);

    this.observer = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting));
    this.observer.observe(canvas);
    this.resize();
    this.highlight();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      if (this.visible) this.render();
    };
    loop();
  }

  private layerY(l: number) {
    return this.y0 + (l + 1) * SPACING;
  }

  resize() {
    const c = this.renderer.domElement;
    const w = c.clientWidth || 1;
    const h = c.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the whole tower in view on narrow screens.
    this.camera.position.setLength(w / h < 0.9 ? 27 : 18.5);
    this.camera.updateProjectionMatrix();
  }

  /** Heads switched off for the current run: drawn as dark, unlit orbs. */
  setAblated(heads: [number, number][]) {
    this.ablated = new Set(heads.map(([l, h]) => `${l}:${h}`));
  }

  select(layer: number, head: number | "all") {
    this.selectedLayer = layer;
    this.selectedHead = head;
    this.highlight();
  }

  private highlight() {
    this.slabs.forEach((s, l) => {
      const m = s.material as THREE.LineBasicMaterial;
      m.color.set(l === this.selectedLayer ? 0x9db4ff : 0x34405f);
      m.opacity = l === this.selectedLayer ? 1 : 0.6;
    });
  }

  /** Show a token's activity; `ms` is how long the pulse takes to climb the tower. */
  show(step: StepMsg, ms: number) {
    const { n_layers: L, n_heads: H, hidden_dim: F, dim: D } = this.cfg;
    // Freeze whatever is on screen now as "previous", so the pulse reveals the new state.
    const cur = this.neurons.geometry.getAttribute("color") as THREE.BufferAttribute;
    this.previous.set(cur.array as Float32Array);
    const rcur = this.resid.geometry.getAttribute("color") as THREE.BufferAttribute;
    this.residPrevious.set(rcur.array as Float32Array);

    for (let l = 0; l < L; l++) {
      // Per-layer scale: a few neurons are much larger than the rest; the 98th percentile keeps
      // the grid readable instead of one dot and darkness.
      const abs = Array.from(step.mlp.subarray(l * F, (l + 1) * F), Math.abs).sort((a, b) => a - b);
      const scale = abs[Math.floor(F * 0.98)];
      for (let i = 0; i < F; i++) shade(this.target, l * F + i, step.mlp[l * F + i], scale);
    }
    for (let b = 0; b <= L; b++) {
      const abs = Array.from(step.resid.subarray(b * D, (b + 1) * D), Math.abs).sort((a, b2) => a - b2);
      const scale = abs[Math.floor(D * 0.98)];
      for (let i = 0; i < D; i++) shade(this.residTarget, b * D + i, step.resid[b * D + i], scale, 0.9);
    }
    // Head focus: how far the head's strongest weight is above uniform attention.
    const n = step.pos + 1;
    for (let l = 0; l < L; l++) {
      for (let h = 0; h < H; h++) {
        let max = 0;
        for (let j = 0; j < n; j++) max = Math.max(max, step.attention[(l * H + h) * n + j]);
        this.headFocus[l][h] = n > 1 ? (max - 1 / n) / (1 - 1 / n) : 1;
      }
    }
    this.start = performance.now();
    this.duration = this.reduced ? 1 : Math.max(1, ms);
  }

  private render() {
    const L = this.cfg.n_layers;
    const F = this.cfg.hidden_dim;
    const D = this.cfg.dim;
    const t = Math.min(1, (performance.now() - this.start) / this.duration);
    // The pulse climbs from below the first layer to above the last.
    const py = this.layerY(-1) + t * (L + 1) * SPACING;

    const col = this.neurons.geometry.getAttribute("color") as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    for (let l = 0; l < L; l++) {
      const dy = py - this.layerY(l);
      const reached = dy >= 0;
      const flash = reached ? 1 + 0.8 * Math.max(0, 1 - dy / SPACING) : 0;
      const src = reached ? this.target : this.previous;
      const k = reached ? flash : 0.3;
      for (let i = l * F * 3; i < (l + 1) * F * 3; i++) arr[i] = src[i] * k;
    }
    col.needsUpdate = true;

    const rcol = this.resid.geometry.getAttribute("color") as THREE.BufferAttribute;
    const rarr = rcol.array as Float32Array;
    for (let b = 0; b <= L; b++) {
      const reached = py >= this.layerY(b) - SPACING / 2;
      const src = reached ? this.residTarget : this.residPrevious;
      const k = reached ? 1 : 0.3;
      for (let i = b * D * 3; i < (b + 1) * D * 3; i++) rarr[i] = src[i] * k;
    }
    rcol.needsUpdate = true;

    for (let l = 0; l < L; l++) {
      const reached = py >= this.layerY(l);
      this.heads[l].forEach((s, h) => {
        const focus = reached ? this.headFocus[l][h] : 0.05;
        const chosen = l === this.selectedLayer && (this.selectedHead === "all" || this.selectedHead === h);
        if (this.ablated.has(`${l}:${h}`)) {
          s.material.opacity = 0.9;
          s.scale.setScalar(0.45);
          s.material.color.set(0x5a2a2a);
          return;
        }
        s.material.opacity = 0.25 + 0.75 * focus;
        s.scale.setScalar(0.35 + 0.55 * focus + (chosen ? 0.25 : 0));
        s.material.color.set(chosen ? 0xffffff : 0x9db4ff);
      });
    }

    this.pulse.visible = t < 1;
    this.pulse.position.set(SIZE / 2 + 1.3, py, 0);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose();
    });
    this.renderer.dispose();
  }
}
