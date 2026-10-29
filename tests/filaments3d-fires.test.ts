import { describe, expect, it } from 'vitest';
import type { Environment } from '../src/core/environment';
import { type FSource, FilamentField, HEARTH_FIRE, TORCH_FIRE } from '../src/core/world3d/filaments3d';
import { THINGS } from '../src/content/things';

const world = (sources: FSource[]) => ({ size: 64, ground: () => 'grass' as const, indoors: () => false, sources });
const DUSK: Environment = { time: 'dusk', sky: 'clear', windForce: 1, windDir: 0, hour: 18.5 };
const DAY: Environment = { time: 'day', sky: 'clear', windForce: 1, windDir: 0, hour: 12 };
const read = (srcs: FSource[], env: Environment) => {
  const f = new FilamentField(world(srcs));
  f.setConditions({ env });
  return f;
};

describe('fires in the free world are sized to what they are', () => {
  it('one torch leaves the fire reading normal; a hearth lifts it one level; three hearths two', () => {
    const torch = read([{ x: 0.8, z: 0.8, kind: 'fire', weight: TORCH_FIRE }], DUSK);
    expect(torch.readAt(0.8, 0.8).pyro.level).toBe(0);
    expect(torch.readAt(2.4, 0.8).pyro.level).toBeLessThanOrEqual(0);
    const hearth = read([{ x: 0.8, z: 0.8, kind: 'fire', weight: HEARTH_FIRE }], DUSK);
    expect(hearth.readAt(0.8, 0.8).pyro.level).toBe(1);
    const three = read([0, 0.3, 0.6].map((o): FSource => ({ x: 0.8 + o, z: 0.8, kind: 'fire', weight: HEARTH_FIRE })), DUSK);
    expect(three.readAt(0.8, 0.8).pyro.level).toBe(2);
  });

  it('heat beside a torch is 1 and beside a hearth 2 (at dusk, when the air itself is neutral)', () => {
    expect(read([{ x: 0.8, z: 0.8, kind: 'fire', weight: TORCH_FIRE }], DUSK).readAt(0.8, 0.8).termo.level).toBe(1);
    expect(read([{ x: 0.8, z: 0.8, kind: 'fire', weight: HEARTH_FIRE }], DUSK).readAt(0.8, 0.8).termo.level).toBe(2);
  });

  it('a torch does not make daylight bright', () => {
    const bare = read([], DAY).readAt(0.8, 0.8).foto.raw;
    const lit = read([{ x: 0.8, z: 0.8, kind: 'fire', weight: TORCH_FIRE }], DAY).readAt(0.8, 0.8).foto.raw;
    expect(lit - bare).toBeLessThan(0.5);
  });

  it('a signpost lifts the meanings round it, and only those (and a little of the symbols)', () => {
    const src = THINGS.source({ kind: 'signpost', x: 0.8, z: 0.8, seed: 1 });
    expect(src?.kind).toBe('sign');
    const f = read([src!], DAY);
    expect(f.readAt(0.8, 0.8).semo.level).toBe(1); // open country is -1 without it
    expect(f.readAt(20, 20).semo.level).toBe(-1);
    expect(f.readAt(0.8, 0.8).pyro.level).toBe(-2);
  });
});
