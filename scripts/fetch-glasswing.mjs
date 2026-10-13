// Fetch the glasswing browser bundle and weights into public/glasswing/<release>/, verified by
// sha256 against glasswing.lock.json. Runs before every build (npm "prebuild").
//
// The release tag is part of the URL path, so nginx and Cloudflare can cache the files as
// immutable: a new model means a new tag, which means a new path.
//
// Local development before a release exists:
//   GLASSWING_LOCAL=../glasswing GLASSWING_WEIGHTS=checkpoints/step1000-f16.safetensors npm run dev
// copies from a glasswing checkout instead (no checksum check).

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(join(root, "glasswing.lock.json"), "utf8"));
const out = join(root, "public/glasswing", lock.release);
mkdirSync(out, { recursive: true });

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

if (process.env.GLASSWING_LOCAL) {
  const src = process.env.GLASSWING_LOCAL;
  const weights = process.env.GLASSWING_WEIGHTS ?? "checkpoints/main/model-f16.safetensors";
  const local = {
    "glasswing_wasm.js": "web/pkg/glasswing_wasm.js",
    "glasswing_wasm_bg.wasm": "web/pkg/glasswing_wasm_bg.wasm",
    "worker.js": "web/worker.js",
    "tokenizer.json": "assets/tokenizer.json",
    "model.bin": weights,
  };
  for (const [name, path] of Object.entries(local)) copyFileSync(join(src, path), join(out, name));
  console.log(`glasswing: copied from ${src} (local development, not checksum-verified)`);
  process.exit(0);
}

for (const [name, { asset, sha256: want }] of Object.entries(lock.files)) {
  const dest = join(out, name);
  if (existsSync(dest) && sha256(readFileSync(dest)) === want) continue;
  const url = `https://github.com/${lock.repo}/releases/download/${lock.release}/${asset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha256(buf);
  if (got !== want) throw new Error(`${asset}: sha256 ${got}, lock file says ${want}`);
  writeFileSync(dest, buf);
  console.log(`glasswing: ${name} (${(buf.length / 1e6).toFixed(1)} MB) verified`);
}
