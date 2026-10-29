import { describe, expect, it } from 'vitest';
import { scorchImage } from '../src/core/world3d/scorch';
import { Rng } from '../src/core/rng';

const mulberry32 = (seed: number): (() => number) => {
  const g = Rng.fromSeed(seed);
  return () => g.next();
};

describe('the mark of a lightning strike', () => {
  const alpha = (img: ReturnType<typeof scorchImage>, x: number, y: number) => img.data[(y * img.size + x) * 4 + 3];

  it('is a dark patch in the middle with bare corners, the same every time for a seed', () => {
    const a = scorchImage(mulberry32(7)), b = scorchImage(mulberry32(7)), c = scorchImage(mulberry32(8));
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    expect(Array.from(a.data)).not.toEqual(Array.from(c.data));
    const m = Math.floor(a.size / 2);
    expect(alpha(a, m, m)).toBe(255);
    expect(alpha(a, 0, 0)).toBe(0);
    expect(alpha(a, a.size - 1, a.size - 1)).toBe(0);
  });

  it('has a branching scar that reaches well past the burnt disc, and only fully opaque or clear pixels', () => {
    const img = scorchImage(mulberry32(3));
    let far = 0;
    for (let y = 0; y < img.size; y++) for (let x = 0; x < img.size; x++) {
      const a = alpha(img, x, y);
      expect(a === 0 || a === 255).toBe(true);
      if (a && Math.hypot(x - img.size / 2, y - img.size / 2) > 2 * 21) far++;
    }
    expect(far).toBeGreaterThan(20);
  });
});
