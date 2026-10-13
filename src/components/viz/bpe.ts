// glasswing's tokenizer in TypeScript, so figures can tokenize whatever a reader types with the
// real learned merges. Same rules as the Python and Rust versions (glasswing tokenizer.py):
// pre-tokenize on bytes, then merge the earliest-learned adjacent pair until none is left.
// `limit` uses only the first N merges, to show the tokenizer "while it was learning".

export type BpeFile = { merges: [number, number][]; special_tokens: Record<string, number> };

export class Bpe {
  readonly merges: [number, number][];
  private ranks = new Map<number, number>(); // (a << 16 | b) -> rank
  readonly vocab: Uint8Array[] = [];

  constructor(file: BpeFile) {
    this.merges = file.merges;
    for (let b = 0; b < 256; b++) this.vocab.push(Uint8Array.of(b));
    file.merges.forEach(([a, b], r) => {
      this.ranks.set(a * 65536 + b, r);
      const m = new Uint8Array(this.vocab[a].length + this.vocab[b].length);
      m.set(this.vocab[a]);
      m.set(this.vocab[b], this.vocab[a].length);
      this.vocab.push(m);
    });
  }

  /** Bytes in a chunk's class: letters (ASCII and every non-ASCII byte), digits, space, other. */
  private static cls(b: number) {
    if ((b >= 65 && b <= 90) || (b >= 97 && b <= 122) || b >= 128) return 0;
    if (b >= 48 && b <= 57) return 1;
    if (b === 32 || b === 9 || b === 10 || b === 13 || b === 11 || b === 12) return 3;
    return 2;
  }

  /** Same chunks as the Python regex ` ?L+| ?D+| ?P+|\s+(?!\S)|\s+`. */
  static pretokenize(bytes: Uint8Array): Uint8Array[] {
    const out: Uint8Array[] = [];
    const n = bytes.length;
    let i = 0;
    while (i < n) {
      const start = i;
      const c = Bpe.cls(bytes[i]);
      if (c === 3) {
        if (bytes[i] === 32 && i + 1 < n && Bpe.cls(bytes[i + 1]) !== 3) {
          const word = Bpe.cls(bytes[i + 1]);
          i += 2;
          while (i < n && Bpe.cls(bytes[i]) === word) i++;
        } else {
          let j = i;
          while (j < n && Bpe.cls(bytes[j]) === 3) j++;
          i = j < n && j - i >= 2 ? j - 1 : j;
        }
      } else {
        i++;
        while (i < n && Bpe.cls(bytes[i]) === c) i++;
      }
      out.push(bytes.subarray(start, i));
    }
    return out;
  }

  /** Token ids for `text`, using only the first `limit` merges. */
  encode(text: string, limit = this.merges.length): number[] {
    const out: number[] = [];
    for (const chunk of Bpe.pretokenize(new TextEncoder().encode(text))) {
      let ids = Array.from(chunk);
      for (;;) {
        let best = -1;
        let bestRank = Infinity;
        for (let k = 0; k + 1 < ids.length; k++) {
          const r = this.ranks.get(ids[k] * 65536 + ids[k + 1]);
          if (r !== undefined && r < limit && r < bestRank) {
            bestRank = r;
            best = k;
          }
        }
        if (best < 0) break;
        const [a, b] = [ids[best], ids[best + 1]];
        const merged: number[] = [];
        for (let k = 0; k < ids.length; k++) {
          if (k + 1 < ids.length && ids[k] === a && ids[k + 1] === b) {
            merged.push(256 + bestRank);
            k++;
          } else merged.push(ids[k]);
        }
        ids = merged;
      }
      out.push(...ids);
    }
    return out;
  }

  /** Display text of one token (bytes that aren't valid UTF-8 on their own show as hex). */
  text(id: number): string {
    const bytes = this.vocab[id];
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return Array.from(bytes, (b) => `\\x${b.toString(16).padStart(2, "0")}`).join("");
    }
  }
}

let cached: Promise<Bpe> | null = null;
/** The released tokenizer the site already serves for the lab. */
export function loadBpe(base: string): Promise<Bpe> {
  cached ??= fetch(`${base}/tokenizer.json`)
    .then((r) => r.json())
    .then((f: BpeFile) => new Bpe(f));
  return cached;
}
