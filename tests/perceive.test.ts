import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import {
  HEARD_FOR, PLAIN_SIGHT, canSee, fadeSenses, hears, lastHeard, newSenses, noteHeard, rollSight, sightBoost, sightDue,
} from '../src/core/world3d/perceive';
import { visionOf } from '../src/core/world3d/vision';
import { BEHAVIOURS } from '../src/content/behaviours';
import { newMind, scheduleProblems } from '../src/core/world3d/behave';
import type { Shape } from '../src/core/world3d/space';

const out = (x: number, z: number) => ({ x, z, house: null, level: 0 });

describe('sight is rolled (B5)', () => {
  it('rolls Alertness against 8: a failure halves sight, advantages stretch it', () => {
    const rng = Rng.fromSeed(1);
    for (let i = 0; i < 50; i++) {
      const { roll, sight } = rollSight({ n: 3, mod: 0 }, rng);
      expect(roll.target).toBe(8);
      expect(sight.success).toBe(roll.total >= 8);
    }
    expect(sightBoost({ success: false, advantages: 0 })).toEqual({ range: 0.5, fov: 0.5 });
    expect(sightBoost(PLAIN_SIGHT)).toEqual({ range: 1, fov: 1 });
    expect(sightBoost({ success: true, advantages: 2 }).range).toBeGreaterThan(1);
    const plain = visionOf({ alertness: 10 });
    const poor = visionOf({ alertness: 10, boost: sightBoost({ success: false, advantages: 0 }) });
    const keen = visionOf({ alertness: 10, boost: sightBoost({ success: true, advantages: 3 }) });
    expect(poor.range).toBeLessThan(plain.range * 0.6);
    expect(poor.fov).toBeLessThan(plain.fov * 0.6);
    expect(keen.range).toBeGreaterThan(plain.range);
    expect(keen.fov).toBeGreaterThan(plain.fov);
    expect(keen.fov).toBeLessThan(Math.PI); // the cone's point stays behind the eye
  });

  it('is due on entering, six world hours on, and when the clock is set back', () => {
    const s = newSenses();
    expect(sightDue(s, 100)).toBe(true);
    s.rolledAt = 100;
    expect(sightDue(s, 105.9)).toBe(false);
    expect(sightDue(s, 106)).toBe(true);
    expect(sightDue(s, 90)).toBe(true);
  });

  it('darkvision takes back what the night takes', () => {
    const night = visionOf({ alertness: 10, night: 1 });
    const tirak = visionOf({ alertness: 10, night: 1, darkSight: 1 });
    expect(tirak.range).toBeGreaterThan(night.range);
    expect(tirak.range).toBeCloseTo(visionOf({ alertness: 10 }).range);
  });
});

describe('seeing someone', () => {
  const spec = visionOf({ alertness: 10 });
  const east = 0;
  it('sees ahead in range, not behind, not past the range', () => {
    expect(canSee(out(0, 0), east, spec, out(10, 0), [])).toBe(true);
    expect(canSee(out(0, 0), east, spec, out(-10, 0), [])).toBe(false);
    expect(canSee(out(0, 0), east, spec, out(spec.range + 2, 0), [])).toBe(false);
    // Right behind, but close: noticed.
    expect(canSee(out(0, 0), east, spec, out(-1, 0), [])).toBe(true);
  });
  it('not through a wall, nor into another house or storey', () => {
    const wall: Shape = { kind: 'box', x: 5, z: 0, hw: 0.2, hd: 3, rot: 0 };
    expect(canSee(out(0, 0), east, spec, out(10, 0), [wall])).toBe(false);
    expect(canSee(out(0, 0), east, spec, { x: 5, z: 0, house: 'inn', level: 0 }, [])).toBe(false);
    expect(canSee({ x: 0, z: 0, house: 'inn', level: 0 }, east, spec, { x: 3, z: 0, house: 'inn', level: 1 }, [])).toBe(false);
    expect(canSee({ x: 0, z: 0, house: 'inn', level: 0 }, east, spec, { x: 3, z: 0, house: 'inn', level: 0 }, [])).toBe(true);
  });
  it('a carried flame shows someone from far at night', () => {
    const dark = visionOf({ alertness: 10, night: 1 });
    const far = out(dark.range + 10, 0);
    expect(canSee(out(0, 0), east, dark, far, [], 1, false)).toBe(false);
    expect(canSee(out(0, 0), east, dark, far, [], 1, true)).toBe(true);
  });
});

describe('hearing', () => {
  const shout = { ...out(30, 0), loud: 40, kind: 'shout', by: 'hero' };
  it('carries by loudness and Alertness, less through a wall', () => {
    expect(hears(out(0, 0), 10, shout)).toBe(true);
    expect(hears(out(0, 0), 10, { ...shout, loud: 5 })).toBe(false);
    expect(hears({ x: 0, z: 0, house: 'inn', level: 0 }, 10, shout)).toBe(false);
    expect(hears(out(0, 0), 2, { ...shout, x: 38 })).toBe(false);
    expect(hears(out(0, 0), 18, { ...shout, x: 45 })).toBe(true);
  });
  it('is remembered for half a minute', () => {
    const s = newSenses();
    noteHeard(s, shout);
    noteHeard(s, shout);
    expect(s.heard).toHaveLength(1);
    expect(lastHeard(s, 'shout')?.x).toBe(30);
    expect(lastHeard(s, 'steps')).toBeNull();
    expect(lastHeard(s, 'any')).not.toBeNull();
    fadeSenses(s, HEARD_FOR + 1);
    expect(lastHeard(s, 'any')).toBeNull();
  });
});

describe('the conditions and behaviours', () => {
  it('sees and heard ask the mind', () => {
    const m = newMind('guard', 0, 0, 1);
    const clock = { hour: 12, events: new Set<string>() };
    expect(BEHAVIOURS.when.sees.holds('hero', clock, m)).toBe(false);
    m.senses.sees = ['hero'];
    expect(BEHAVIOURS.when.sees.holds('hero', clock, m)).toBe(true);
    expect(BEHAVIOURS.when.notSees.holds('hero', clock, m)).toBe(false);
    noteHeard(m.senses, { ...out(3, 3), loud: 5, kind: 'steps', by: 'hero' });
    expect(BEHAVIOURS.when.heard.holds('steps', clock, m)).toBe(true);
    expect(BEHAVIOURS.when.heard.holds(['shout'], clock, m)).toBe(false);
    expect(JSON.parse(JSON.stringify(m)).senses.heard).toHaveLength(1);
  });
  it('schedules using them are checked', () => {
    const ok = [{ when: { sees: 'hero' }, do: 'watch' }, { when: { heard: 'any' }, do: 'investigate', of: 'shout' }];
    expect(scheduleProblems(ok, BEHAVIOURS, {}, new Set())).toEqual([]);
    const bad = [{ when: { heard: 3 }, do: 'watch' }];
    expect(scheduleProblems(bad, BEHAVIOURS, {}, new Set())).toHaveLength(1);
  });
});
