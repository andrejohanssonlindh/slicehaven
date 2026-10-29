import { CHUNK, chunkKey } from './chunks';

/**
 * What the hero has seen: a hash map from chunk to a 32 × 32 mask of one-metre cells (so a world of any size costs
 * only the ground walked near). `mark` records a disc as seen; `fill` writes a window of it for the renderer to
 * draw what is remembered. Plain data: `toJSON` / `fromJSON` are for the save, later.
 */
export class Explored {
  private readonly chunks = new Map<string, Uint8Array>();

  /** Cells marked in all. */
  get count(): number {
    let n = 0;
    for (const m of this.chunks.values()) for (let i = 0; i < m.length; i++) n += m[i] ? 1 : 0;
    return n;
  }

  /** Has anything in chunk (i, j) been seen? */
  chunkSeen(i: number, j: number): boolean {
    return this.chunks.has(chunkKey(i, j));
  }

  has(x: number, z: number): boolean {
    const m = this.chunks.get(chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    if (!m) return false;
    return m[(Math.floor(z) - Math.floor(z / CHUNK) * CHUNK) * CHUNK + (Math.floor(x) - Math.floor(x / CHUNK) * CHUNK)] === 1;
  }

  /** Mark every cell whose centre is within `r` metres of (x, z). Returns how many were new. */
  mark(x: number, z: number, r: number): number {
    return this.markWhere(x, z, r, () => true);
  }

  /** As `mark`, but only the cells (given by their centres) the test accepts: what the eye actually saw. */
  markWhere(x: number, z: number, r: number, seen: (cx: number, cz: number) => boolean): number {
    let added = 0;
    for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++) {
      for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        if (Math.hypot(cx + 0.5 - x, cz + 0.5 - z) > r || !seen(cx + 0.5, cz + 0.5)) continue;
        const ci = Math.floor(cx / CHUNK), cj = Math.floor(cz / CHUNK);
        const k = chunkKey(ci, cj);
        let m = this.chunks.get(k);
        if (!m) this.chunks.set(k, (m = new Uint8Array(CHUNK * CHUNK)));
        const at = (cz - cj * CHUNK) * CHUNK + (cx - ci * CHUNK);
        if (!m[at]) {
          m[at] = 1;
          added++;
        }
      }
    }
    return added;
  }

  /** Write the window with its low corner at whole metres (ox, oz): 255 where seen, 0 where not. `out` is size × size. */
  fill(out: Uint8Array, size: number, ox: number, oz: number): void {
    out.fill(0);
    for (let j = Math.floor(oz / CHUNK); j <= Math.floor((oz + size - 1) / CHUNK); j++) {
      for (let i = Math.floor(ox / CHUNK); i <= Math.floor((ox + size - 1) / CHUNK); i++) {
        const m = this.chunks.get(chunkKey(i, j));
        if (!m) continue;
        for (let cz = 0; cz < CHUNK; cz++) {
          const wz = j * CHUNK + cz - oz;
          if (wz < 0 || wz >= size) continue;
          for (let cx = 0; cx < CHUNK; cx++) {
            const wx = i * CHUNK + cx - ox;
            if (wx >= 0 && wx < size && m[cz * CHUNK + cx]) out[wz * size + wx] = 255;
          }
        }
      }
    }
  }

  clear(): void {
    this.chunks.clear();
  }

  toJSON(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, m] of this.chunks) out[k] = Array.from(m, (b) => (b ? '1' : '0')).join('');
    return out;
  }

  static fromJSON(data: Record<string, string>): Explored {
    const e = new Explored();
    for (const [k, s] of Object.entries(data)) e.chunks.set(k, Uint8Array.from(s, (c) => (c === '1' ? 1 : 0)));
    return e;
  }
}
