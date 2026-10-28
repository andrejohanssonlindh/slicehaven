/**
 * Texture-atlas packing: which rectangle of which atlas each small image gets.
 * Pure shelf packing (rows of equal-ish height), so tests can check it and the
 * renderer only has to copy pixels. Atlases are square, 1024 by default
 * (512 on weak phones); a new atlas opens when the current ones are full.
 */

export interface AtlasRect {
  atlas: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Shelf {
  y: number;
  h: number;
  x: number;
}

export class AtlasPacker {
  /** Shelves of each atlas. */
  private atlases: Shelf[][] = [];
  private used = new Map<string, AtlasRect>();

  /** `pad` transparent texels around each image stop neighbours bleeding in. */
  constructor(readonly size = 1024, readonly pad = 1) {}

  get count(): number {
    return this.atlases.length;
  }

  /** Where `key` lives, packing it on first sight. Same key, same rect. */
  place(key: string, w: number, h: number): AtlasRect {
    const have = this.used.get(key);
    if (have) return have;
    const pw = w + this.pad * 2, ph = h + this.pad * 2;
    if (pw > this.size || ph > this.size) throw new Error(`atlas: ${key} (${w}×${h}) does not fit in ${this.size}`);
    for (let a = 0; a < this.atlases.length; a++) {
      const r = this.fit(a, pw, ph);
      if (r) return this.keep(key, a, r, w, h);
    }
    this.atlases.push([]);
    const a = this.atlases.length - 1;
    return this.keep(key, a, this.fit(a, pw, ph)!, w, h);
  }

  private keep(key: string, atlas: number, at: { x: number; y: number }, w: number, h: number): AtlasRect {
    const r = { atlas, x: at.x + this.pad, y: at.y + this.pad, w, h };
    this.used.set(key, r);
    return r;
  }

  private fit(a: number, pw: number, ph: number): { x: number; y: number } | null {
    const shelves = this.atlases[a];
    // The tightest shelf that is tall enough and has room.
    let best: Shelf | null = null;
    for (const s of shelves) {
      if (s.h >= ph && s.x + pw <= this.size && (!best || s.h < best.h)) best = s;
    }
    if (best) {
      const at = { x: best.x, y: best.y };
      best.x += pw;
      return at;
    }
    const y = shelves.length ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].h : 0;
    if (y + ph > this.size) return null;
    shelves.push({ y, h: ph, x: pw });
    return { x: 0, y };
  }

  /** UV box (0..1, y up from the bottom) of a rect, for a texture uploaded with flipY. */
  uv(r: AtlasRect): { u0: number; v0: number; u1: number; v1: number } {
    const s = this.size;
    return { u0: r.x / s, u1: (r.x + r.w) / s, v0: 1 - (r.y + r.h) / s, v1: 1 - r.y / s };
  }
}
