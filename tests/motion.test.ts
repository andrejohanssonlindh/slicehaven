import { describe, expect, it } from 'vitest';
import { MOTIONS, motionLibraryProblems } from '../src/content/motions';
import { THINGS } from '../src/content/things';
import { modelOf } from '../src/core/world3d/things';
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
    const over = overPose(base, sampleMotion(swing, 0.5), swing);
    expect(over.joints.hipL).toEqual([0.3, 0, 0]);
    expect(over.joints.shoulderR![0]).toBeCloseTo(-2);
    const lie = MOTIONS.down;
    const whole = overPose(base, sampleMotion(lie, 0), lie);
    expect(whole.joints.hipL).toEqual([0, 0, 0]);
    expect(sampleMotion(lie, 3).root.tilt).toBeCloseTo(-Math.PI / 2);
  });

  it('a key on `base` shows the body\'s own pose, so a motion starts and ends on whatever guard is held', () => {
    const own = { joints: { shoulderR: [0.4, 0, 0] as const, elbowR: [-1.2, 0, 0] as const } };
    const based: Motion = { ...swing, keys: [{ at: 0, base: 1, joints: {} }, { at: 0.5, joints: { shoulderR: [-2, 0, 0] } }, { at: 1, base: 1, joints: {} }] };
    expect(overPose(own, sampleMotion(based, 0), based).joints.shoulderR![0]).toBeCloseTo(0.4);
    expect(overPose(own, sampleMotion(based, 0.5), based).joints.shoulderR![0]).toBeCloseTo(-2);
    expect(overPose(own, sampleMotion(based, 1), based).joints.shoulderR![0]).toBeCloseTo(0.4);
    // A joint the motion never names keeps the body's own turn throughout.
    expect(overPose(own, sampleMotion(based, 0.5), based).joints.elbowR![0]).toBeCloseTo(-1.2);
    // Every fight motion that stands starts on the body's own pose.
    for (const m of Object.values(MOTIONS)) if (!m.add && m.seconds > 0) expect(m.keys[0].base, m.id).toBe(1);
  });

  it('an added motion is laid on top of the body\'s own pose', () => {
    const own = { joints: { spine: [0.1, 0, 0] as const }, lift: -0.02 };
    const jolt: Motion = { ...swing, act: 'flinch', add: true, marks: {}, keys: [{ at: 0, joints: {} }, { at: 0.5, joints: { spine: [-0.2, 0, 0] } }, { at: 1, joints: {} }] };
    const mid = overPose(own, sampleMotion(jolt, 0.5), jolt);
    expect(mid.joints.spine![0]).toBeCloseTo(-0.1);
    expect(mid.lift).toBeCloseTo(-0.02);
    expect(motionProblems({ ...jolt, keys: [{ at: 0, base: 1, joints: {} }] }).join()).toMatch(/added motion has no base/);
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

  it('a thrust and a killing stroke are found for the weapon in hand; one with none thrusts as it strikes', () => {
    expect(findMotion(MOTIONS, 'thrust', 'blade')!.id).toBe('thrust');
    expect(findMotion(MOTIONS, 'thrust', 'spear')!.id).toBe('thrust-spear');
    expect(findMotion(MOTIONS, 'thrust', 'two-hander')!.id).toBe('thrust-two-hander');
    expect(findMotion(MOTIONS, 'thrust', 'staff')!.id).toBe('strike-staff');
    expect(findMotion(MOTIONS, 'thrust', 'hands')!.id).toBe('strike-hands');
    for (const way of ['axe-mace', 'two-hander', 'spear', 'staff', 'hands'] as const) expect(findMotion(MOTIONS, 'finish', way)!.id).toBe(`finish-${way}`);
    expect(findMotion(MOTIONS, 'finish', 'blade')!.id).toBe('finish');
    expect(findMotion(MOTIONS, 'finish', 'shield')!.id).toBe('finish');
  });

  it('a weapon that takes both hands moves as a two-hander, whatever its family', () => {
    // (Its row lets the very strong use it in one hand; it is still swung in both.)
    expect(THINGS.get('binderakk-hammer').moves).toBe('two-hander');
    expect(THINGS.get('war-hammer').moves).toBe('axe-mace');
    for (const id of THINGS.placeable) {
      const k = THINGS.get(id);
      if (k.weapon && k.hands === 2) expect(['two-hander', 'staff', 'spear'], id).toContain(k.moves);
    }
    // Held in both hands, it says where the second hand goes.
    expect(modelOf(THINGS.get('binderakk-hammer'))!.grip2).toBeGreaterThan(modelOf(THINGS.get('binderakk-hammer'))!.grip!);
  });

  it('every weapon and shield says how it moves', () => {
    for (const id of THINGS.placeable) {
      const k = THINGS.get(id);
      if (k.weapon || k.shield) expect(k.moves, id).toBeTruthy();
    }
  });
});
