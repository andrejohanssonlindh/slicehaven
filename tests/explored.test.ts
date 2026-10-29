import { describe, expect, it } from 'vitest';
import { Explored } from '../src/core/world3d/explored';

describe('explored map', () => {
  it('marks a disc, once, across chunk edges and negative coordinates', () => {
    const e = new Explored();
    const first = e.mark(-1, -1, 6);
    expect(first).toBeGreaterThan(100);
    expect(e.mark(-1, -1, 6)).toBe(0); // nothing new the second time
    expect(e.has(-1, -1)).toBe(true);
    expect(e.has(-7.9, -1)).toBe(false); // just outside the radius
    expect(e.has(30, 30)).toBe(false);
    expect(e.chunkSeen(-1, -1) && e.chunkSeen(0, 0) && e.chunkSeen(-1, 0)).toBe(true);
    expect(e.chunkSeen(5, 5)).toBe(false);
    expect(e.count).toBe(first);
  });

  it('fills a window that matches what was marked, and survives a round trip through JSON', () => {
    const e = new Explored();
    e.mark(40, 20, 5);
    const win = new Uint8Array(64 * 64);
    e.fill(win, 64, 16, 0); // covers x 16..80, z 0..64
    const at = (x: number, z: number): number => win[(Math.floor(z) - 0) * 64 + (Math.floor(x) - 16)];
    expect(at(40.5, 20.5)).toBe(255);
    expect(at(44.5, 20.5)).toBe(255);
    expect(at(48.5, 20.5)).toBe(0);
    expect(win.reduce((n, v) => n + (v ? 1 : 0), 0)).toBe(e.count);
    const back = Explored.fromJSON(JSON.parse(JSON.stringify(e.toJSON())));
    expect(back.count).toBe(e.count);
    expect(back.has(40.5, 20.5)).toBe(true);
    e.clear();
    expect(e.count).toBe(0);
  });
});
