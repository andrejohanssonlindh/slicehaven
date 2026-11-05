import { describe, expect, it } from 'vitest';
import { MOTIONS, motionLibraryProblems } from '../src/content/motions';
import { THINGS } from '../src/content/things';
import { type Motion, advance, findMotion, motionProblems, overPose, sampleMotion } from '../src/core/world3d/motion';

const swing: Motion = {
  id: 't-strike', act: 'strike', seconds: 1, part: 'upper', then: 'guard', marks: { contact: 0.5 },
  keys: [{ at: 0, joints: { shoulderR: [0, 0, 0] } }, { at: 0.5, joints: { shoulderR: [-2, 0, 0] } }, { at: 1, joints: { shoulderR: [0, 0, 0] } }],
};

describe('motions, the rules', () => {
  it('eases straight between keys and says when it is done', () => {
    expect(sampleMotion(swing, 0.25).joints.shoulderR![0]).toBeCloseTo(-1);
    expect(sampleMotion(swing, 0.5).joints.shoulderR![0]).toBeCloseTo(-2);
    expect(sampleMotion(swing, 0.5).done).toBe(false);
    expect(sampleMotion(swing, 1.2).done).toBe(true);
    expect(sampleMotion(swing, 1.2).joints.shoulderR![0]).toBeCloseTo(0);
  });

  it('lays an upper-body motion over the legs, and a whole-body one instead of them', () => {
    const base = { joints: { hipL: [0.3, 0, 0] as const, shoulderR: [1, 0, 0] as const } };
    const over = overPose(base, sampleMotion(swing, 0.5), 'upper');
    expect(over.joints.hipL).toEqual([0.3, 0, 0]);
    expect(over.joints.shoulderR![0]).toBeCloseTo(-2);
    const lie = MOTIONS.down;
    const whole = overPose(base, sampleMotion(lie, 0), lie.part);
    expect(whole.joints.hipL).toEqual([0, 0, 0]);
    expect(sampleMotion(lie, 3).root.tilt).toBeCloseTo(-Math.PI / 2);
  });

  it('finds the most specific motion: style over way of moving over any', () => {
    const lib: Record<string, Motion> = {
      any: { ...swing, id: 'any' },
      staff: { ...swing, id: 'staff', way: 'staff' },
      glad: { ...swing, id: 'glad', style: 'gladiator' },
    };
    expect(findMotion(lib, 'strike', 'blade')!.id).toBe('any');
    expect(findMotion(lib, 'strike', 'staff')!.id).toBe('staff');
    expect(findMotion(lib, 'strike', 'staff', 'gladiator')!.id).toBe('glad');
    expect(findMotion(lib, 'parry', 'blade')).toBeNull();
  });

  it('falls back to a nearer act when the library has none (a killing stroke is a strike until it has its own)', () => {
    expect(findMotion({ any: { ...swing, id: 'any' } }, 'finish')!.id).toBe('any');
  });

  it('goes on to what follows, or to the next queued act', () => {
    const find = (a: string) => findMotion(MOTIONS, a as Motion['act']);
    const p = { act: 'strike' as const, motion: 'strike', since: 0, queue: [] };
    expect(advance(p, 0.3, MOTIONS, find)).toBe(p);
    expect(advance(p, 5, MOTIONS, find).act).toBe('guard');
    const q = advance({ ...p, queue: ['strike'] }, MOTIONS.strike.seconds + 0.1, MOTIONS, find);
    expect(q).toMatchObject({ act: 'strike', since: MOTIONS.strike.seconds, queue: [] });
  });

  it('reports what is wrong with a motion', () => {
    const bad: Motion = { ...swing, id: 'bad', marks: {}, keys: [{ at: 0.2, joints: { hipL: [0, 0, 0], knuckle: [0, 0, 0] } as never }, { at: 0.1, joints: {} }] };
    const p = motionProblems(bad).join('\n');
    expect(p).toMatch(/first key must be at 0/);
    expect(p).toMatch(/not after key 0/);
    expect(p).toMatch(/unknown joint knuckle/);
    expect(p).toMatch(/hipL is outside its part/);
    expect(p).toMatch(/needs a contact mark/);
  });
});

describe('the motion library', () => {
  it('has no problems', () => {
    expect(motionLibraryProblems()).toEqual([]);
  });

  it('every weapon and shield says how it moves', () => {
    for (const id of THINGS.placeable) {
      const k = THINGS.get(id);
      if (k.weapon || k.shield) expect(k.moves, id).toBeTruthy();
    }
  });
});
