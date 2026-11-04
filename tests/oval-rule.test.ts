import { describe, expect, it } from 'vitest';
import { MAPS, compile } from '../src/content/maps';
import type { MapSpec } from '../src/core/world3d/mapgen';

const arena = (): MapSpec => structuredClone(MAPS.arena) as MapSpec;

describe('the oval map rule', () => {
  it('rings the arena with wall pieces and leaves the gates open', () => {
    const c = compile(arena());
    const walls = c.layout.props.filter((p) => p.kind === 'palisade');
    expect(walls.length).toBeGreaterThan(15);
    // Every piece sits on the ellipse.
    for (const w of walls) expect(Math.abs((w.x / 15) ** 2 + (w.z / 7.5) ** 2 - 1)).toBeLessThan(0.08);
    // Nothing stands in the two gates.
    for (const gx of [15, -15]) expect(walls.some((w) => Math.hypot(w.x - gx, w.z) < 1.5)).toBe(false);
    expect(c.problems).toEqual([]);
  });

  it('treads the floor bare and the hero starts inside', () => {
    const c = compile(arena());
    expect(c.ground.mud.length).toBeGreaterThan(20);
    expect(c.hero[0] ** 2 / 225 + c.hero[1] ** 2 / 56.25).toBeLessThan(1);
  });

  it('reports a kind nobody wrote and stray keys', () => {
    const s = arena();
    s.rules![0] = { ...s.rules![0], kind: 'nope', typo: 1 };
    const p = compile(s).problems.join('\n');
    expect(p).toMatch(/no kind of thing called nope/);
    expect(p).toMatch(/unknown key "typo"/);
  });
});
