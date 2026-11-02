import { describe, expect, it } from 'vitest';
import { PERSON_KINDS } from '../src/content/people';
import { BODY_PLANS, bodySpecOf } from '../src/content/people/bodies';
import { WALK } from '../src/content/people/poses';
import type { PersonSpec } from '../src/core/persons';
import { buildBody, type BodyModel } from '../src/core/world3d/body';
import { JOINTS, type Joint, cyclePose, mirrorPose } from '../src/core/world3d/pose';

const body = (who: PersonSpec): BodyModel => buildBody(bodySpecOf(PERSON_KINDS.resolve(who), who.seed ?? 1));

/** Where a joint sits in body space at rest (adding up the chain). */
const restAt = (m: BodyModel, j: Joint): [number, number, number] => {
  const p: [number, number, number] = [0, 0, 0];
  for (let k: Joint | null = j; k; k = m.joints[k].parent) for (let i = 0; i < 3; i++) p[i] += m.joints[k].at[i];
  return p;
};
/** The lowest and highest points of the body at rest. */
const extent = (m: BodyModel): { lo: number; hi: number } => {
  let lo = Infinity, hi = -Infinity;
  for (const part of m.parts) {
    const base = restAt(m, part.joint)[1];
    for (let i = 1; i < part.mesh.positions.length; i += 3) {
      lo = Math.min(lo, base + part.mesh.positions[i]);
      hi = Math.max(hi, base + part.mesh.positions[i]);
    }
  }
  return { lo, hi };
};

describe('3D bodies', () => {
  const human = body({ is: ['human', 'job-farmer'], seed: 1, look: { sex: 'm' } });

  it('is deterministic', () => {
    expect(JSON.stringify(body({ is: ['human', 'job-farmer'], seed: 1, look: { sex: 'm' } }))).toBe(JSON.stringify(human));
  });

  it('stands on the ground, as tall as its height (a hat may add a little)', () => {
    const e = extent(human);
    expect(e.lo).toBeCloseTo(0, 2);
    expect(e.hi).toBeGreaterThan(human.height * 0.97);
    expect(e.hi).toBeLessThan(human.height * 1.15);
    for (const p of human.parts) expect(p.mesh.positions.every(Number.isFinite)).toBe(true);
  });

  it('every people has its own size, from the creator\'s typical figures', () => {
    const h = (is: string[], look: PersonSpec['look'] = {}): number => body({ is: [...is, 'station'], seed: 3, look: { sex: 'm', ...look } }).height;
    expect(h(['dwarf'])).toBeLessThan(1.35);
    expect(h(['missla'])).toBeLessThan(1.35);
    expect(h(['human'])).toBeGreaterThan(1.55);
    expect(h(['tirak'], { size: 'gurder' })).toBeLessThan(h(['tirak'], { size: 'tiraker' }));
    expect(h(['tirak'], { size: 'trukher' })).toBeGreaterThan(2.0);
    // A people with its own figures: the kragg-eyrens are tall.
    expect(h(['kragg-eyrener'])).toBeGreaterThan(1.9);
    // Women of a people are a little shorter than its men, on average.
    const mean = (sex: string): number => [1, 2, 3, 4, 5].reduce((n, seed) => n + body({ is: ['human', 'station'], seed, look: { sex } }).height, 0) / 5;
    expect(mean('f')).toBeLessThan(mean('m'));
  });

  it('every people has its own shape', () => {
    const dwarf = body({ is: ['dwarf', 'station'], seed: 3, look: { sex: 'm' } });
    // A dwarf's head is a bigger share of the body, and the legs a smaller one.
    expect(BODY_PLANS.dwarf.head).toBeGreaterThan(BODY_PLANS.human.head);
    expect(dwarf.joints.root.at[1] / dwarf.height).toBeLessThan(human.joints.root.at[1] / human.height);
    expect(BODY_PLANS.elf.pointedEars).toBe(true);
    expect(BODY_PLANS.tirak.jaw).toBeGreaterThan(0);
  });

  it('is cheap: a few hundred triangles before shells', () => {
    for (const is of [['human', 'job-guard'], ['dwarf', 'job-miller'], ['tirak', 'station'], ['elf', 'job-farmer']]) {
      const m = body({ is, seed: 2 });
      const tris = m.parts.reduce((n, p) => n + p.mesh.indices.length / 3, 0);
      expect(tris).toBeLessThan(800);
    }
  });

  it('cloth and hair get shells, skin does not', () => {
    const skin = bodySpecOf(PERSON_KINDS.resolve({ is: ['human', 'job-farmer'], seed: 1 }), 1).colours.skin;
    expect(human.parts.filter((p) => p.colour === skin).every((p) => !p.shell)).toBe(true);
    expect(human.parts.some((p) => p.shell)).toBe(true);
  });
});

describe('poses', () => {
  it('a loop starts on its first key and comes round to it', () => {
    expect(cyclePose(WALK, 0)).toEqual(cyclePose(WALK, 1));
    expect(cyclePose(WALK, 0).joints.hipR).toEqual(WALK.keys[0].joints.hipR);
  });

  it('the walk swings the legs both ways, mirrored half a loop on', () => {
    const a = cyclePose(WALK, 0), b = cyclePose(WALK, 0.5);
    expect(a.joints.hipR![0]).toBeLessThan(0); // the right leg forward
    expect(b.joints.hipL![0]).toBeCloseTo(a.joints.hipR![0]);
    expect(mirrorPose(mirrorPose(a))).toEqual(a);
    for (const j of Object.keys(a.joints)) expect(JOINTS).toContain(j);
  });
});
