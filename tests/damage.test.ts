import { describe, expect, it } from 'vitest';
import {
  DAMAGE_TYPES, type WoundTableDef, applyEffects, burnPool, damageTable, effectProblems, endOfPhase, endOfScene, fallDice, fallPool,
  hitPart, mergeLasting, penaltyDice, readWound, rollHit, totalFatigue, unhurt, woundTableProblems,
} from '../src/core/damage';
import { Rng } from '../src/core/rng';
import { WOUND_TABLES } from '../src/content/wounds';

/** A die that rolls what it's told, in order (faces as `rng.int(n)` + 1 would give them). */
const loaded = (...faces: number[]): Rng => {
  const r = Rng.fromSeed(1);
  let i = 0;
  (r as unknown as { int: (n: number) => number }).int = () => faces[i++ % faces.length] - 1;
  return r;
};

describe('the damage table', () => {
  it('reads fatigue and the serious-wound bonus', () => {
    expect(damageTable(0)).toEqual({ fatigue: 0, serious: false, woundBonus: 0 });
    expect(damageTable(-3).fatigue).toBe(0);
    expect(damageTable(1)).toEqual({ fatigue: 1, serious: false, woundBonus: 0 });
    expect(damageTable(4).fatigue).toBe(1);
    expect(damageTable(5).fatigue).toBe(2);
    expect(damageTable(9)).toEqual({ fatigue: 2, serious: false, woundBonus: 0 });
    expect(damageTable(10)).toEqual({ fatigue: 4, serious: true, woundBonus: 0 });
    expect(damageTable(17)).toEqual({ fatigue: 6, serious: true, woundBonus: 2 });
    expect(damageTable(26)).toEqual({ fatigue: 10, serious: true, woundBonus: 6 });
    expect(damageTable(44)).toEqual({ fatigue: 16, serious: true, woundBonus: 12 });
    expect(damageTable(45)).toEqual({ fatigue: 18, serious: true, woundBonus: 14 });
  });

  it('places a blow on the D10', () => {
    expect([1, 2, 4, 5, 6, 7, 8, 9, 10].map(hitPart)).toEqual(['head', 'torso', 'torso', 'leftArm', 'leftArm', 'rightArm', 'rightArm', 'leftLeg', 'rightLeg']);
  });
});

describe('the wound tables (content/wounds)', () => {
  it('has one table per damage type, and every row reads', () => {
    expect(Object.keys(WOUND_TABLES).sort()).toEqual([...DAMAGE_TYPES].sort());
    for (const t of Object.values(WOUND_TABLES)) expect(woundTableProblems(t)).toEqual([]);
  });

  it('reports what it cannot read', () => {
    expect(effectProblems('dazed, bleed 1/x')).toHaveLength(1);
    expect(effectProblems('fizzle')).toEqual(['"fizzle": no effect called fizzle']);
    expect(effectProblems('wound 1 elbow')).toHaveLength(1);
    const short: WoundTableDef = { type: 'fall', body: [[null, 'fall']] };
    expect(woundTableProblems(short)).toEqual(['fall body: 1 rows, not 20']);
  });

  it('reads a row for the part hit: limbs, drop or fall, result-relative numbers', () => {
    const rng = Rng.fromSeed(3);
    // Cut, arm, row 9: break risk on that arm, and drops (an arm).
    const arm = readWound(WOUND_TABLES.cut, { type: 'cut', part: 'rightArm', result: 9 }, rng);
    expect(arm.death).toBeNull();
    expect(arm.effects).toEqual([{ k: 'break', diff: 10, area: 'rightArm' }, { k: 'drop', part: 'rightArm' }]);
    // The same on a leg falls.
    const leg = readWound(WOUND_TABLES.cut, { type: 'cut', part: 'leftLeg', result: 9 }, rng);
    expect(leg.effects[1]).toEqual({ k: 'fall', part: 'leftLeg' });
    // Cut, leg, 13: the hand becomes the foot.
    expect(readWound(WOUND_TABLES.cut, { type: 'cut', part: 'leftLeg', result: 13 }, rng).effects[0]).toEqual({ k: 'cut', diff: 12, area: 'foot', side: 'left' });
    // Cut, torso, 23 reads row 20: death at result + 10, amputation at result − 8.
    const top = readWound(WOUND_TABLES.cut, { type: 'cut', part: 'torso', result: 23 }, rng);
    expect(top.row).toBe(20);
    expect(top.death).toBe(33);
    expect(top.effects[0]).toEqual({ k: 'cut', diff: 15, area: 'torso' });
    // Crush, leg, 17: the hip instead of the arm.
    expect(readWound(WOUND_TABLES.crush, { type: 'crush', part: 'rightLeg', result: 17 }, rng).effects[0]).toEqual({ k: 'break', diff: 14, area: 'hip' });
  });

  it('a whole-body table uses one random arm for the whole row', () => {
    const r = readWound(WOUND_TABLES.fall, { type: 'fall', part: 'torso', result: 11 }, loaded(3));
    expect(r.effects.slice(0, 2)).toEqual([{ k: 'break', diff: 14, area: 'leftArm' }, { k: 'wound', n: 1, part: 'leftArm' }]);
  });

  it('only fire ignites; rot infects instead; acid harms armour', () => {
    const fire = readWound(WOUND_TABLES.burn, { type: 'burn', part: 'torso', result: 10, burn: 'fire' }, Rng.fromSeed(1));
    expect(fire.effects).toContainEqual({ k: 'ignite', heat: 2, diff: 10 });
    const cold = readWound(WOUND_TABLES.burn, { type: 'burn', part: 'torso', result: 10, burn: 'cold' }, Rng.fromSeed(1));
    expect(cold.effects.some((e) => e.k === 'ignite')).toBe(false);
    const rot = readWound(WOUND_TABLES.burn, { type: 'burn', part: 'torso', result: 10, burn: 'rot' }, Rng.fromSeed(1));
    expect(rot.effects).toContainEqual({ k: 'infect', level: 2, diff: 10 });
    const acid = readWound(WOUND_TABLES.burn, { type: 'burn', part: 'torso', result: 1, burn: 'acid' }, Rng.fromSeed(1));
    expect(acid.effects.map((e) => e.k)).toEqual(['dazed', 'armour']);
  });
});

describe('after-effects on a person', () => {
  it('bleeds, fires and infections merge: the higher of each, then the difficulty +2', () => {
    expect(mergeLasting(null, { a: 1, diff: 16 })).toEqual({ a: 1, diff: 16 });
    expect(mergeLasting({ a: 2, diff: 16 }, { a: 1, diff: 8 })).toEqual({ a: 2, diff: 18 });
    expect(mergeLasting({ a: 1, diff: 16 }, { a: 2, diff: 20 })).toEqual({ a: 2, diff: 22 });
  });

  it('a fourth wound in a part turns into infection 3/20, a fifth +0/+2', () => {
    const rng = Rng.fromSeed(1);
    let i = applyEffects(unhurt(), [{ k: 'wound', n: 3, part: 'leftArm' }], rng).injuries;
    expect(i.wounds.leftArm).toBe(3);
    i = applyEffects(i, [{ k: 'wound', n: 1, part: 'leftArm' }], rng).injuries;
    expect(i.infection).toEqual({ level: 3, diff: 20 });
    i = applyEffects(i, [{ k: 'wound', n: 1, part: 'leftArm' }], rng).injuries;
    expect(i.infection).toEqual({ level: 3, diff: 22 });
    expect(totalFatigue(i)).toBe(3); // the infection's level counts as base fatigue
  });

  it('rolls break risks on 3D6: under the difficulty, broken (with its pain)', () => {
    const broke = applyEffects(unhurt(), [{ k: 'break', diff: 14, area: 'ribs' }], loaded(1, 1, 1));
    expect(broke.risks[0].happened).toBe(true);
    expect(broke.injuries.broken).toEqual(['ribs']);
    expect(broke.injuries.pain).toBe(1);
    const held = applyEffects(unhurt(), [{ k: 'break', diff: 10, area: 'ribs' }], loaded(5, 5, 5));
    expect(held.risks[0].happened).toBe(false);
    expect(held.injuries.broken).toEqual([]);
  });

  it('an amputated hand leaves a wound, pain and a bleed; the neck is death', () => {
    const hand = applyEffects(unhurt(), [{ k: 'cut', diff: 18, area: 'hand', side: 'right' }], loaded(1, 1, 1)).injuries;
    expect(hand.lost).toEqual([{ area: 'hand', side: 'right' }]);
    expect(hand.wounds.rightArm).toBe(1);
    expect(hand.bleed).toEqual({ rate: 1, diff: 10 });
    expect(applyEffects(unhurt(), [{ k: 'cut', diff: 18, area: 'neck' }], loaded(1, 1, 1)).injuries.dead).toBe(true);
  });

  it('negative effects stack: dazed and drops are −2D6, dazed twice is −2D6 too (Q47)', () => {
    const rng = Rng.fromSeed(1);
    const two = applyEffects(unhurt(), [{ k: 'dazed' }, { k: 'drop', part: 'rightArm' }], rng).injuries;
    expect(penaltyDice(two, { kind: 'other' })).toBe(2);
    const twice = applyEffects(applyEffects(unhurt(), [{ k: 'dazed' }], rng).injuries, [{ k: 'dazed' }], rng).injuries;
    expect(penaltyDice(twice, { kind: 'other' })).toBe(2);
  });

  it('weighs on the right rolls', () => {
    const i = { ...unhurt(), pain: 1, short: ['dazed' as const], wounds: { head: 1, torso: 2, rightArm: 1, leftLeg: 2 } };
    expect(penaltyDice(i, { kind: 'other' })).toBe(1); // dazed only
    expect(penaltyDice(i, { kind: 'combat', arms: ['right'] })).toBe(3); // dazed, pain, the sword arm
    expect(penaltyDice(i, { kind: 'combat', arms: ['left'] })).toBe(2);
    expect(penaltyDice(i, { kind: 'movement' })).toBe(4); // dazed, pain, the worse leg
    // A shock or death roll is no action: dazed and pain don't weigh on it, only the head and torso wounds do.
    expect(penaltyDice(i, { kind: 'shock' })).toBe(1); // head wound
    expect(penaltyDice(i, { kind: 'death' })).toBe(2); // torso wounds
    expect(penaltyDice(i, { kind: 'attr', attr: 'Reaktion' })).toBe(2);
    expect(penaltyDice(i, { kind: 'attr', attr: 'Intryck' })).toBe(1);
  });
});

describe('a hit, start to end', () => {
  it('armour that takes all the damage leaves nothing', () => {
    const h = rollHit({ type: 'thrust', damage: { n: 1, mod: 0 }, part: 'head', armour: 11, vitality: { n: 3, mod: 0 }, victim: unhurt() }, WOUND_TABLES, Rng.fromSeed(5));
    expect(h.net).toBeLessThanOrEqual(0);
    expect(h.fatigue).toBe(0);
    expect(h.serious).toBeNull();
    expect(h.after).toEqual(unhurt());
  });

  it('a heavy blow gives fatigue, a serious wound and owes a shock roll', () => {
    // Damage 4D6 all fives = 20, armour 3 → 17: 6 fatigue, D10+2. The wound D10 is a 5 → row 7 (cut torso: death 6).
    const rng = loaded(5, 5, 5, 5, 5, 5, 5, 5, 5);
    const h = rollHit({ type: 'cut', damage: { n: 4, mod: 0 }, part: 'torso', armour: 3, vitality: { n: 3, mod: 0 }, victim: unhurt() }, WOUND_TABLES, rng);
    expect(h.damageRoll.total).toBe(20);
    expect(h.net).toBe(17);
    expect(h.fatigue).toBe(6);
    expect(h.serious?.result).toBe(7);
    expect(h.serious?.death).toBe(6);
    expect(h.serious?.died).toBe(false); // 3D6 of fives = 15 ≥ 6
    expect(h.after.bleed).toEqual({ rate: 1, diff: 10 });
    expect(h.after.fatigue).toBe(6);
    expect(h.after.shockDue).toBe(true);
  });

  it('a shallow weapon never wounds seriously; a brutal one adds fatigue', () => {
    const base = { type: 'cut' as const, damage: { n: 4, mod: 0 }, part: 'torso' as const, armour: 0, vitality: { n: 3, mod: 0 }, victim: unhurt() };
    const s = rollHit({ ...base, shallow: true, brutal: 2 }, WOUND_TABLES, loaded(5));
    expect(s.serious).toBeNull();
    expect(s.fatigue).toBe(8 + 2); // 20 damage → 8, +2 brutal
  });
});

describe('the end of a phase and of a scene', () => {
  it('bleeding adds fatigue and a shock roll; knocked out while bleeding is a death roll', () => {
    const bleeding = { ...unhurt(), bleed: { rate: 2, diff: 20 }, fatigue: 10 };
    const stays = endOfPhase(bleeding, { n: 4, mod: 0 }, loaded(5)); // 4 fives = 20 ≥ 12
    expect(stays.injuries.fatigue).toBe(12);
    expect(stays.notes).toEqual(['bled', 'stayed up']);
    const falls = endOfPhase(bleeding, { n: 2, mod: 0 }, loaded(1)); // 2 against 12, then 2 against 20
    expect(falls.injuries.out).toBe(true);
    expect(falls.injuries.dying).toBe(true);
    expect(falls.notes).toEqual(['bled', 'knocked out', 'bled out']);
  });

  it('the end of a scene clears fatigue and wakes, but keeps wounds', () => {
    const i = endOfScene({ ...unhurt(), fatigue: 9, out: true, pain: 1, wounds: { torso: 1 } });
    expect(i.fatigue).toBe(0);
    expect(i.out).toBe(false);
    expect(i.pain).toBe(1);
    expect(i.wounds.torso).toBe(1);
  });
});

describe('falls and burns', () => {
  it('fall dice by height and ground', () => {
    expect([1, 2, 4, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200].map(fallDice)).toEqual([0, 2, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    expect(fallPool(2, 'hard', false)).toEqual({ n: 3, mod: 0 });
    expect(fallPool(2, 'verySoft', true)).toEqual({ n: 0, mod: 0 });
  });
  it('burn dice with protection and lasting exposure', () => {
    expect(burnPool(2, -1)).toEqual({ n: 1, mod: 0 });
    expect(burnPool(1, 1, 2)).toEqual({ n: 4, mod: 0 });
    expect(burnPool(1, -8)).toEqual({ n: 0, mod: 0 });
  });
});
