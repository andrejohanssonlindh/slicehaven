import { describe, expect, it } from 'vitest';
import { type Battle, type Unit, fit, unitAt, walkReach } from '../src/core/battle';
import { advantages, modify, rollOpen, test } from '../src/core/checks';
import { SHAPES, around, cover, gap } from '../src/core/footprint';
import { hex, hexKey } from '../src/core/hex';
import { defaultHero } from '../src/content/rollables';
import { isRollable } from '../src/content/rollables';
import { Rng } from '../src/core/rng';
import {
  apply, approachOpen, attempt, blocks, checkFor, met, newSceneState, openChecks, talkFor, usefulSkills,
} from '../src/core/scene';
import {
  type Approach, allowed, exchange, mustUseLocked, newConflict, outcome, playRound, pooled,
} from '../src/core/social';
import { GATE_SCENE } from '../src/content/scenes/gate';

function grid(w: number, h: number, obstacles: [number, number][] = []): Battle {
  const blocked = new Set(obstacles.map(([q, r]) => hexKey(hex(q, r))));
  const cells: Battle['cells'] = {};
  for (let q = 0; q < w; q++) {
    for (let r = 0; r < h; r++) {
      const at = hex(q, r);
      cells[hexKey(at)] = { at, obstacle: blocked.has(hexKey(at)), flammable: false, water: false, fire: 'none' };
    }
  }
  return { cells, units: [] };
}

/** An Rng that returns these d6 faces in order (then 1s). */
function dice(...faces: number[]): Rng {
  const r = Rng.fromSeed(1);
  let i = 0;
  r.int = (n: number) => (n === 6 ? (faces[i++] ?? 1) - 1 : 0);
  return r;
}

describe('footprints', () => {
  it('covers its shape from the anchor', () => {
    expect(cover(hex(2, 2), SHAPES.three).map(hexKey)).toEqual(['2,2', '3,2', '2,3']);
  });

  it('measures edge to edge and finds the hexes around', () => {
    const rock = cover(hex(0, 0), SHAPES.three);
    expect(gap(rock, [hex(2, 0)])).toBe(1);
    expect(gap(rock, [hex(3, 0)])).toBe(2);
    const ring = around(rock);
    expect(ring.length).toBe(9);
    expect(ring.some((h) => rock.some((x) => hexKey(x) === hexKey(h)))).toBe(false);
  });

  it('a big unit occupies every hex it covers', () => {
    const b = grid(6, 6);
    const troll: Unit = { id: 't', kind: 't', name: 't', team: 'foe', at: hex(1, 1), hp: 9, maxHp: 9, shape: SHAPES.three };
    b.units.push(troll);
    expect(unitAt(b, hex(2, 1))).toBe(troll);
    expect(unitAt(b, hex(1, 2))).toBe(troll);
    expect(unitAt(b, hex(2, 2))).toBeUndefined();
  });

  it('a big unit cannot squeeze through a one-hex gap', () => {
    // A wall along q = 2 with one opening at r = 2.
    const wall: [number, number][] = [0, 1, 3, 4, 5].map((r) => [2, r]);
    const b = grid(5, 6, wall);
    const small: Unit = { id: 's', kind: 's', name: 's', team: 'party', at: hex(0, 2), hp: 1, maxHp: 1 };
    const big: Unit = { ...small, id: 'b', at: hex(0, 1), shape: SHAPES.three };
    b.units.push(small);
    expect(walkReach(b, small, 6).has('3,2')).toBe(true);
    b.units = [big];
    expect(fit(b, big, hex(1, 1))).toBe('blocked'); // its east hex would be in the wall
    expect(fit(b, big, hex(1, 2))).toBe('stop'); // nosing into the gap is fine
    expect([...walkReach(b, big, 8).keys()].some((k) => Number(k.split(',')[0]) >= 3)).toBe(false);
  });
});

describe('open-ended rolls', () => {
  it('a six is replaced by two more dice and never counts itself', () => {
    const r = rollOpen({ n: 2, mod: 1 }, dice(6, 3, 6, 2, 4, 5));
    expect(r.faces).toEqual([6, 3, 6, 2, 4, 5]);
    expect(r.kept).toEqual([3, 2, 4, 5]);
    expect(r.total).toBe(15);
  });

  it('no dice rolls 0', () => {
    expect(rollOpen({ n: 0, mod: 0 }, dice(5)).total).toBe(0);
  });

  it('advantages are every full 5 over', () => {
    expect([0, 4, 5, 9, 10, 15].map(advantages)).toEqual([0, 0, 1, 1, 2, 3]);
    expect(test({ n: 3, mod: 2 }, 15, dice(5, 5, 5)).success).toBe(true); // 17
    expect(test({ n: 3, mod: 2 }, 15, dice(4, 4, 4)).success).toBe(false); // 14
  });

  it('penalties work in whole dice, never below 1D6; +4 becomes +1D6', () => {
    expect(modify({ n: 2, mod: 2 }, -2)).toEqual({ n: 1, mod: 2 });
    expect(modify({ n: 3, mod: 3 }, 0, 2)).toEqual({ n: 4, mod: 1 });
    expect(modify({ n: 0, mod: 0 }, 1)).toEqual({ n: 0, mod: 0 });
  });
});

describe('social conflict', () => {
  const a: Approach = {
    id: 'sweet', label: 'Sweet-talk', skills: ['Charm', 'attr:Intryck', 'Argumentera'], locked: 'attr:Intryck',
    situation: 0, answers: ['Genomskåda', 'attr:Självkontroll'],
  };
  const mine = () => ({ n: 3, mod: 0 });

  it('Control: 1 for the winner, +1 per 5 more; a tie gives both 1', () => {
    expect(exchange(12, 7)).toEqual({ mine: 2, theirs: 0 });
    expect(exchange(8, 9)).toEqual({ mine: 0, theirs: 1 });
    expect(exchange(10, 10)).toEqual({ mine: 1, theirs: 1 });
  });

  it('the locked roll is forced in the last round if it has not been used', () => {
    const c = newConflict('sweet');
    playRound(c, a, 'Charm', mine, mine, dice());
    playRound(c, a, 'Argumentera', mine, mine, dice());
    expect(mustUseLocked(c, a)).toBe(true);
    expect(allowed(c, a, 'Charm')).toBe(false);
    expect(allowed(c, a, 'attr:Intryck')).toBe(true);
    expect(() => playRound(c, a, 'Charm', mine, mine, dice())).toThrow();
  });

  it('repeating a skill costs 2D6 per earlier use', () => {
    const c = newConflict('sweet');
    playRound(c, a, 'Charm', mine, mine, dice());
    expect(pooled(c, 'Charm', { n: 3, mod: 0 })).toEqual({ n: 1, mod: 0 });
    expect(pooled(c, 'Argumentera', { n: 3, mod: 0 })).toEqual({ n: 3, mod: 0 });
  });

  it('the other side spends its Control cancelling yours; situation counts for you', () => {
    const c = newConflict('sweet');
    c.rounds.push(
      { mine: 2, theirs: 0 } as never, { mine: 1, theirs: 1 } as never, { mine: 0, theirs: 1 } as never,
    );
    expect(outcome(c, a, 2)).toMatchObject({ mine: 3, theirs: 2, left: 1, success: false });
    expect(outcome(c, { ...a, situation: 2 }, 2)).toMatchObject({ left: 3, success: true });
    expect(outcome(c, { ...a, situation: -2 }, 2)).toMatchObject({ left: 0, success: false });
  });
});

describe('the village gate scene', () => {
  const obj = (id: string) => GATE_SCENE.objects.find((o) => o.id === id)!;

  it('names only real skills and attributes', () => {
    const ids = new Set<string>();
    for (const o of GATE_SCENE.objects) {
      for (const c of o.checks ?? []) c.skills.forEach((s) => ids.add(s));
      for (const a of o.social?.approaches ?? []) {
        [...a.skills, a.locked, ...a.answers].forEach((s) => ids.add(s));
        expect(a.skills).toContain(a.locked);
        expect(a.retorts.length).toBeGreaterThanOrEqual(2);
      }
      for (const k of Object.keys(o.social?.dice ?? {})) ids.add(k);
    }
    expect([...ids].filter((id) => !isRollable(id))).toEqual([]);
  });

  it('every object sits on the map, and big things cover more than one hex', () => {
    const rows = GATE_SCENE.layout.length;
    const cols = GATE_SCENE.layout[0].length;
    for (const o of GATE_SCENE.objects) for (const [c, r] of o.hexes) expect(c < cols && r < rows).toBe(true);
    expect(obj('rock').hexes.length).toBe(3);
    expect(obj('cart').hexes.length).toBe(2);
  });

  it('the ivy is climbable (Climb, 15), with two tries before the guard notices', () => {
    const s = newSceneState(GATE_SCENE);
    const rock = obj('rock');
    expect(usefulSkills(rock, s)).toContain('Klättra');
    const climb = checkFor(rock, s, 'Klättra')!;
    expect(climb.difficulty).toBe(15);
    expect(checkFor(rock, s, 'Charm')).toBeUndefined();
    apply(s, attempt(s, climb, { n: 1, mod: 0 }, dice(1)).effects);
    expect(openChecks(rock, s)).toHaveLength(1);
    apply(s, attempt(s, climb, { n: 1, mod: 0 }, dice(1)).effects);
    expect(openChecks(rock, s)).toHaveLength(0);
    expect(s.flags.guardWatching).toBe(true);
  });

  it('searching the cart finds the pass, which the guard accepts', () => {
    const s = newSceneState(GATE_SCENE);
    const search = checkFor(obj('cart'), s, 'Genomsöka')!;
    apply(s, attempt(s, search, { n: 3, mod: 0 }, dice(5, 5, 5)).effects);
    expect(s.flags.hasPass).toBe(true);
    const show = talkFor(obj('guard'), s)!.options.find((o) => met(s, o.when) && o.label.includes('pass'))!;
    apply(s, show.effects!);
    expect(s.flags.gateOpen).toBe(true);
    expect(blocks(obj('gate'), s)).toBe(false);
  });

  it('resting by the fire costs 70% of your gold and opens the gate at dawn', () => {
    const s = newSceneState(GATE_SCENE);
    expect(s.gold).toBe(100);
    apply(s, obj('campfire').actions![0].effects);
    expect(s.gold).toBe(30);
    expect(s.time).toBe('dawn');
    expect(s.flags.gateOpen).toBe(true);
    expect(s.removed).toContain('travellers');
  });

  it('a successful bribe costs 20%; a failed threat closes every approach', () => {
    const guard = obj('guard');
    const bribe = guard.social!.approaches.find((a) => a.id === 'bribe')!;
    const s = newSceneState(GATE_SCENE);
    apply(s, bribe.success);
    expect(s.gold).toBe(80);
    const s2 = newSceneState(GATE_SCENE);
    apply(s2, guard.social!.approaches.find((a) => a.id === 'threaten')!.failure);
    expect(guard.social!.approaches.filter((a) => approachOpen(a, s2))).toHaveLength(0);
  });

  it('the default hero can roll every locked skill', () => {
    const h = defaultHero();
    for (const a of obj('guard').social!.approaches) expect(h.dice[a.locked]?.n ?? 0).toBeGreaterThan(0);
  });
});
