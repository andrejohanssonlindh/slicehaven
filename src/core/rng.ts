/**
 * Seeded, serialisable RNG (mulberry32). All game randomness goes through this
 * so scenarios can be saved mid-fight and replayed deterministically in tests.
 */
export class Rng {
  constructor(private state: number) {}

  static fromSeed(seed: number | string): Rng {
    if (typeof seed === 'number') return new Rng(seed >>> 0);
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return new Rng(h >>> 0);
  }

  /** Float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  get seed(): number {
    return this.state;
  }
}
