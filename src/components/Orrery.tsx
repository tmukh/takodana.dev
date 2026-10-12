"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { worlds, type World } from "@/data/site";
import styles from "./Orrery.module.css";

const INCLINATION = 24; // degrees: the camera's default elevation above the ecliptic

function labelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const g = canvas.getContext("2d")!;
  g.font = '500 40px "IBM Plex Mono", monospace';
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 48);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  sprite.scale.set(3.2, 0.6, 1);
  return sprite;
}

function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,230,170,1)");
  grad.addColorStop(0.25, "rgba(255,190,90,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

type Controls = { reset: () => void };

export default function Orrery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x05070f);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
    const home = { theta: 0.9, phi: ((90 - INCLINATION) * Math.PI) / 180, radius: 26 };
    const view = { ...home };

    scene.add(new THREE.AmbientLight(0x3a4466, 1.2));
    scene.add(new THREE.PointLight(0xffe2b0, 2.4, 0, 0));

    // Background stars
    const starPositions: number[] = [];
    for (let i = 0; i < 1800; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const rad = 160 + Math.random() * 60;
      const s = Math.sqrt(1 - u * u);
      starPositions.push(rad * s * Math.cos(t), rad * u, rad * s * Math.sin(t));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9aa6c8, size: 0.7 })));

    const clickables: THREE.Object3D[] = [];
    const star = worlds[0];
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), new THREE.MeshBasicMaterial({ color: star.color }));
    sun.userData.id = star.id;
    scene.add(sun);
    clickables.push(sun);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    glow.scale.set(9, 9, 1);
    scene.add(glow);
    const sunLabel = labelSprite(star.label, star.color);
    sunLabel.position.set(0, 2, 0);
    scene.add(sunLabel);

    type Planet = {
      world: World;
      pivot: THREE.Group;
      planet: THREE.Mesh;
      moons: THREE.Mesh[];
      label: THREE.Sprite;
      baseIncl: number;
      bend: { x: number; z: number };
      phase: number;
      omega: number;
    };
    const planets: Planet[] = [];
    for (const w of worlds) {
      if (!w.orbit) continue;
      const { a, r, moons: moonCount = 0, planned, rings } = w.orbit;
      const pivot = new THREE.Group();
      const baseIncl = (Math.random() - 0.5) * 0.08;
      scene.add(pivot);
      const ring: THREE.Vector3[] = [];
      for (let i = 0; i <= 160; i++) {
        const ang = (i / 160) * Math.PI * 2;
        ring.push(new THREE.Vector3(Math.cos(ang) * a, 0, Math.sin(ang) * a));
      }
      const orbit = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ring),
        planned
          ? new THREE.LineDashedMaterial({ color: 0x5d6788, dashSize: 0.25, gapSize: 0.25 })
          : new THREE.LineBasicMaterial({ color: 0x2c3556 }),
      );
      if (planned) orbit.computeLineDistances();
      pivot.add(orbit);
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 24),
        new THREE.MeshLambertMaterial({ color: w.color, transparent: !!planned, opacity: planned ? 0.55 : 1 }),
      );
      planet.userData.id = w.id;
      pivot.add(planet);
      clickables.push(planet);
      if (rings) {
        const band = new THREE.Mesh(
          new THREE.RingGeometry(r * 1.5, r * 2.4, 64),
          new THREE.MeshBasicMaterial({ color: w.color, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }),
        );
        band.rotation.x = Math.PI / 2.4;
        planet.add(band);
      }
      const moons: THREE.Mesh[] = [];
      for (let m = 0; m < moonCount; m++) {
        const ghost = m === moonCount - 1; // the next milestone, not reached yet
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 16, 12),
          new THREE.MeshLambertMaterial({ color: 0xdfe6ff, transparent: ghost, opacity: ghost ? 0.3 : 1 }),
        );
        moon.userData = { id: w.id, dist: 0.95 + m * 0.16, phase: m * 0.9, speed: 1.6 - m * 0.12 };
        planet.add(moon);
        moons.push(moon);
      }
      const label = labelSprite(w.label, w.color);
      scene.add(label);
      planets.push({
        world: w,
        pivot,
        planet,
        moons,
        label,
        baseIncl,
        bend: { x: (Math.random() - 0.5) * 1.1, z: (Math.random() - 0.5) * 0.9 },
        phase: Math.random() * Math.PI * 2,
        omega: 0.9 / Math.pow(a, 1.5), // Kepler's third law: period grows as a^1.5
      });
    }

    // Asteroid belt: the writing
    const belt = new THREE.Group();
    scene.add(belt);
    const rockGeo = new THREE.IcosahedronGeometry(0.11, 0);
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * Math.PI * 2 + Math.random() * 0.3;
      const rr = 5.9 + (Math.random() - 0.5) * 0.5;
      const rock = new THREE.Mesh(rockGeo, new THREE.MeshLambertMaterial({ color: 0xb9a98f }));
      rock.position.set(Math.cos(ang) * rr, (Math.random() - 0.5) * 0.2, Math.sin(ang) * rr);
      rock.userData.id = "writing";
      belt.add(rock);
      clickables.push(rock);
    }
    const dust: number[] = [];
    for (let i = 0; i < 500; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rr = 5.6 + Math.random() * 0.7;
      dust.push(Math.cos(ang) * rr, (Math.random() - 0.5) * 0.25, Math.sin(ang) * rr);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(dust, 3));
    belt.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x8c8270, size: 0.05 })));
    const beltLabel = labelSprite("writing", "#B9A98F");
    beltLabel.position.set(0, 0.6, -6.2);
    belt.add(beltLabel);

    // Interaction: drag rotates, hold bends the orbits, click selects, wheel zooms
    let bend = 0;
    let bendTarget = 0;
    let down: { x: number; y: number; theta: number; phi: number; moved: boolean; held: boolean } | null = null;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      down = { x: e.clientX, y: e.clientY, theta: view.theta, phi: view.phi, moved: false, held: false };
      holdTimer = setTimeout(() => {
        if (down && !down.moved) {
          down.held = true;
          canvas.style.cursor = "progress";
        }
      }, 280);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > 5) {
        down.moved = true;
        clearTimeout(holdTimer);
        canvas.style.cursor = "grabbing";
      }
      if (down.moved && !down.held) {
        view.theta = down.theta - dx * 0.005;
        view.phi = Math.min(Math.PI * 0.49, Math.max(0.15, down.phi - dy * 0.005));
      }
    };
    const onUp = (e: PointerEvent) => {
      clearTimeout(holdTimer);
      if (down && !down.moved && !down.held) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(clickables, false)[0];
        if (hit) setSelected(hit.object.userData.id as string);
      }
      if (down?.held) bendTarget = bend;
      down = null;
      canvas.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.radius = Math.min(48, Math.max(12, view.radius * (1 + Math.sign(e.deltaY) * 0.08)));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    controls.current = {
      reset: () => {
        bendTarget = 0;
        Object.assign(view, home);
      },
    };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    let raf = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const speed = reduced ? 0.15 : 1;
      if (down?.held) bend = Math.min(1, bend + dt * 0.5);
      else bend += (bendTarget - bend) * Math.min(1, dt * 3);
      const sel = selectedRef.current;
      for (const p of planets) {
        p.phase += p.omega * dt * speed;
        p.pivot.rotation.x = p.baseIncl + bend * p.bend.x;
        p.pivot.rotation.z = bend * p.bend.z;
        const a = p.world.orbit!.a;
        p.planet.position.set(Math.cos(p.phase) * a, 0, Math.sin(p.phase) * a);
        p.planet.rotation.y += dt * 0.4;
        for (const m of p.moons) {
          m.userData.phase += m.userData.speed * dt * speed;
          m.position.set(Math.cos(m.userData.phase) * m.userData.dist, 0, Math.sin(m.userData.phase) * m.userData.dist);
        }
        p.planet.getWorldPosition(tmp);
        p.label.position.set(tmp.x, tmp.y + p.world.orbit!.r + 0.55, tmp.z);
        p.label.material.opacity = sel && sel !== p.world.id ? 0.45 : 1;
      }
      belt.rotation.y += 0.02 * dt * speed;
      belt.rotation.x = bend * 0.35;
      sun.rotation.y += dt * 0.1;
      camera.position.set(
        view.radius * Math.sin(view.phi) * Math.cos(view.theta),
        view.radius * Math.cos(view.phi),
        view.radius * Math.sin(view.phi) * Math.sin(view.theta),
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
  }, []);

  const current = worlds.find((w) => w.id === selected) ?? null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="A 3D orrery: the homelab as a star, projects as planets orbiting it, writing as an asteroid belt, languages as a ringed outer planet."
      />
      <nav aria-label="Worlds in this system" className={styles.worlds}>
        <p className={styles.worldsTitle}>Worlds</p>
        {worlds.map((w) => {
          const on = w.id === selected;
          return (
            <button
              key={w.id}
              type="button"
              aria-pressed={on}
              className={styles.world}
              onClick={() => setSelected(on ? null : w.id)}
            >
              <span
                aria-hidden="true"
                className={styles.dot}
                style={{ background: w.color, opacity: w.orbit?.planned ? 0.55 : 1, outline: w.orbit?.planned ? `1px dashed ${w.color}` : undefined }}
              />
              <span className={styles.worldText}>
                <span className={styles.worldLabel}>{w.label}</span>
                <span className={styles.worldKind}>{w.kind}</span>
              </span>
            </button>
          );
        })}
      </nav>
      {current && (
        <aside aria-live="polite" className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelKind} style={{ color: current.color }}>
              {current.kind}
            </span>
            <button type="button" aria-label="Close" className={styles.close} onClick={() => setSelected(null)}>
              ×
            </button>
          </div>
          <h2 className={styles.panelTitle}>{current.title}</h2>
          <p className={styles.panelText}>{current.text}</p>
          <div className={styles.panelLinks}>
            {current.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
        </aside>
      )}
      <button type="button" className={styles.reset} onClick={() => controls.current?.reset()}>
        reset orbits · inclination {INCLINATION}°
      </button>
    </>
  );
}
