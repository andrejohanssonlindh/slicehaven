import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { apply, attempt, checkFor, checkOpen, newSceneState, openChecks } from '../src/core/scene';
import type { CheckDef, ObjectDef, SceneState } from '../src/core/scene';
import { disposition, expandObject, expandScene, hooksFor, kindChain, patienceOf, situation, talksLeftWith } from '../src/core/skillweb';
import { defaultHero, isRollable } from '../src/content/rollables';
import { GATE_SCENE } from '../src/content/scenes/gate';
import { KIND_PARENTS, LIBRARY } from '../src/content/skillweb';
import { RELATIONS } from '../src/content/skillweb/relations';

/** An Rng that returns these d6 faces in order (then 1s). */
function dice(...faces: number[]): Rng {
  const r = Rng.fromSeed(1);
  let i = 0;
  r.int = (n: number) => (n === 6 ? (faces[i++] ?? 1) - 1 : 0);
  return r;
}

const npc = (kind: string, over: Partial<ObjectDef> = {}): ObjectDef =>
  expandObject({ id: 'npc', name: 'Old Rae', kind, hexes: [[0, 0]], look: '', ...over }, LIBRARY);
const fresh = (): SceneState => newSceneState(GATE_SCENE);
const use = (o: ObjectDef, s: SceneState, skill: string, who = { kind: 'human', people: 'asharier' }, rng = dice(5, 5, 5, 5, 5, 5)) => {
  const c = checkFor(o, s, skill)!;
  const sit = situation(s, c, o, who, LIBRARY, ['asharier']);
  const r = attempt(s, c, { n: 6, mod: 0 }, rng, sit);
  return { c, sit, ...r, events: apply(s, r.effects) };
};

describe('humans and their subkinds', () => {
  it('guard and outcast are kinds of human, which are humanoids', () => {
    expect(kindChain('guard', KIND_PARENTS)).toEqual(['guard', 'human', 'humanoid', 'creature', 'thing']);
    expect(kindChain('outcast', KIND_PARENTS)).toContain('human');
  });

  it('every humanoid can be argued with, charmed, asked and frightened', () => {
    for (const kind of ['humanoid', 'human', 'dwarf', 'elf', 'tirak', 'guard', 'outcast']) {
      expect(hooksFor({ kind }, LIBRARY).map((h) => h.intention), kind).toEqual(
        expect.arrayContaining(['persuade', 'impress', 'distract', 'ask', 'etiquette', 'intimidate', 'size-up']),
      );
    }
  });

  it('subkinds change single hooks: the guard is harder to frighten, the outcast is easier to ask', () => {
    const by = (kind: string, intention: string) => hooksFor({ kind }, LIBRARY).find((h) => h.intention === intention)!;
    expect(by('guard', 'intimidate').difficulty).toBeGreaterThan(by('human', 'intimidate').difficulty);
    expect(by('outcast', 'ask').difficulty).toBeLessThan(by('human', 'ask').difficulty);
    expect(by('guard', 'persuade').id).toBe(by('human', 'persuade').id);
  });

  it('patience comes from the most specific kind', () => {
    expect(patienceOf({ kind: 'human' }, LIBRARY)).toBe(3);
    expect(patienceOf({ kind: 'guard' }, LIBRARY)).toBe(4);
    expect(patienceOf({ kind: 'outcast' }, LIBRARY)).toBe(2);
    expect(patienceOf({ kind: 'outcast', patience: 5 }, LIBRARY)).toBe(5);
    expect(patienceOf({ kind: 'rock' }, LIBRARY)).toBeUndefined();
  });
});

describe('Court Life depends on who it is done to', () => {
  const cl = 'Hovliv';
  it('a rich human is flattered: mood up and a kept advantage for bartering', () => {
    const o = npc('human', { tags: ['rich'] });
    const s = fresh();
    const { events } = use(o, s, cl);
    expect(s.social.npc.mood).toBe(1);
    // Six dice is a strong success: one token from the success, one more from the strong effects.
    expect(s.tokens.length).toBeGreaterThanOrEqual(1);
    expect(s.tokens.every((t) => t.kind === 'barter' && t.against === 'npc')).toBe(true);
    expect(events.map((e) => e.kind === 'say' && e.text).join(' ')).toMatch(/warms to you/);
  });

  it('an outcast hears mockery, however it goes', () => {
    for (const faces of [[5, 5, 5, 5, 5, 5], [1, 1, 1, 1, 1, 1]]) {
      const s = fresh();
      use(npc('outcast'), s, cl, undefined, dice(...faces));
      expect(s.social.npc.mood).toBe(-2);
      expect(s.tokens).toEqual([]);
    }
  });

  it('anyone else is just puzzled: no mood, no token', () => {
    const s = fresh();
    use(npc('human'), s, cl);
    expect(s.social.npc.mood).toBe(0);
    expect(s.tokens).toEqual([]);
  });
});

describe('how peoples see each other', () => {
  const look = (observer: string, hero: string) => disposition({ kind: observer }, { kind: hero }, LIBRARY);

  it('dwarves and elves distrust each other, both ways; almost nobody likes the tirak', () => {
    expect(look('dwarf', 'elf').v).toBeLessThan(0);
    expect(look('elf', 'dwarf').v).toBeLessThan(0);
    for (const k of ['human', 'dwarf', 'elf']) expect(look(k, 'tirak').v, k).toBeLessThan(0);
  });

  it('the observer is the first people in the thing\'s kind chain: a guard looks at you as a human', () => {
    expect(disposition({ kind: 'guard' }, { kind: 'elf' }, LIBRARY).v).toBe(RELATIONS.human.elf.v);
  });

  it('a stranger from far off is treated a little warily, a local is not', () => {
    const o = { kind: 'human' };
    expect(disposition(o, { kind: 'human', people: 'asharier' }, LIBRARY, ['asharier']).v).toBe(0);
    expect(disposition(o, { kind: 'human', people: 'adasier' }, LIBRARY, ['asharier']).v).toBe(-1);
    expect(disposition(o, { kind: 'human', people: 'adasier' }, LIBRARY).v).toBe(0);
  });

  it('a worse reception makes the roll harder and a success grudging', () => {
    const s = fresh();
    const o = npc('human');
    const c = checkFor(o, s, 'Charm')!;
    const home = situation(s, c, o, { kind: 'human' }, LIBRARY);
    const tirak = situation(s, c, o, { kind: 'tirak' }, LIBRARY);
    expect(tirak.shift).toBeGreaterThan(home.shift);
    expect(tirak.control).toBe(-2);
    expect(home.control).toBe(0);
    expect(tirak.notes.join()).toMatch(/tirak/);
  });

  it('charming someone who dislikes your people works, but you get less out of it', () => {
    const o = npc('dwarf');
    const strong = fresh();
    use(o, strong, 'Charm', { kind: 'dwarf', people: 'x' }); // dwarf to dwarf: liked
    const grudging = fresh();
    const r = use(o, grudging, 'Charm', { kind: 'elf', people: 'x' }, dice(6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5));
    expect(r.result.success).toBe(true);
    expect(grudging.social.npc.last).toBe('grudging');
    // The impress hook gives a token of 1; a grudging success of -2 cuts it away.
    expect(grudging.tokens).toEqual([]);
    expect(strong.tokens).toHaveLength(1);
  });

  it('every people in the table is a real kind', () => {
    for (const [obs, row] of Object.entries(RELATIONS)) {
      expect(obs in KIND_PARENTS).toBe(true);
      for (const k of Object.keys(row)) expect(k in KIND_PARENTS).toBe(true);
    }
  });
});

describe('limited talks and mood', () => {
  it('each social try costs a talk, then they have had enough', () => {
    const o = npc('outcast'); // patience 2
    const s = fresh();
    expect(talksLeftWith(o, s, LIBRARY)).toBe(2);
    use(o, s, 'Charm');
    expect(talksLeftWith(o, s, LIBRARY)).toBe(1);
    use(o, s, 'Charm');
    expect(talksLeftWith(o, s, LIBRARY)).toBe(0);
    expect(openChecks(o, s).filter((c) => c.talk)).toEqual([]);
    // Observation is not a talk.
    expect(checkFor(o, s, 'Genomskåda')).toBeDefined();
  });

  it('a mood from the last try eases or hardens the next', () => {
    const o = npc('human');
    const s = fresh();
    const c = checkFor(o, s, 'Charm') as CheckDef;
    const base = situation(s, c, o, { kind: 'human' }, LIBRARY).shift;
    s.social.npc = { talks: 0, mood: 2 };
    expect(situation(s, c, o, { kind: 'human' }, LIBRARY).shift).toBe(base - 4);
    s.social.npc = { talks: 0, mood: -2 };
    expect(situation(s, c, o, { kind: 'human' }, LIBRARY).shift).toBe(base + 4);
  });

  it('mood is kept between -3 and +3', () => {
    const s = fresh();
    for (let i = 0; i < 6; i++) apply(s, [{ mood: 2, who: 'npc', name: 'Rae' }]);
    expect(s.social.npc.mood).toBe(3);
    for (let i = 0; i < 6; i++) apply(s, [{ mood: -2, who: 'npc', name: 'Rae' }]);
    expect(s.social.npc.mood).toBe(-3);
  });
});

describe('kept advantages', () => {
  it('impressing someone makes the next try with them easier, once', () => {
    const o = npc('human');
    const s = fresh();
    use(o, s, 'Charm');
    expect(s.tokens).toHaveLength(1);
    const c = checkFor(o, s, 'Argumentera')!;
    const sit = situation(s, c, o, { kind: 'human' }, LIBRARY);
    expect(sit.spend).toHaveLength(1);
    expect(sit.shift).toBeLessThan(-5);
    const r = attempt(s, c, { n: 3, mod: 0 }, dice(5, 5, 5), sit);
    expect(r.difficulty).toBe(Math.max(2, c.difficulty + sit.shift));
    expect(s.tokens.filter((t) => t.kind === 'social' && t.label.includes('impressed'))).toHaveLength(0);
  });

  it('a token against one person does not help against another', () => {
    const s = fresh();
    use(npc('human'), s, 'Charm');
    const other = npc('human', { id: 'other', name: 'Tam' });
    const c = checkFor(other, s, 'Argumentera')!;
    expect(situation(s, c, other, { kind: 'human' }, LIBRARY).spend).toEqual([]);
  });

  it('distracting someone leaves advantages for sneaking and pickpocketing against them', () => {
    const s = fresh();
    use(npc('human'), s, 'Charm');
    // Charm picks 'impress' first; distract needs its own skill route. Use Dupera (only in the distract set).
    const s2 = fresh();
    const { c } = use(npc('human'), s2, 'Dupera');
    expect(c.intention).toBe('distract');
    expect(s2.tokens.map((t) => t.kind).sort()).toEqual(['pickpocket', 'sneak']);
    expect(s2.tokens.every((t) => t.against === 'npc')).toBe(true);
  });
});

describe('library data and the gate', () => {
  it('every social hook is a social hook with real skills', () => {
    for (const h of LIBRARY.hooks.filter((x) => x.social)) {
      for (const k of h.skills) expect(isRollable(k), `${h.id}: ${k}`).toBe(true);
    }
  });

  it('in the gate: the guard has more patience than the drifter, who is a human outcast', () => {
    const def = expandScene(GATE_SCENE, LIBRARY);
    const by = (id: string) => def.objects.find((o) => o.id === id)!;
    expect(by('guard').kind).toBe('guard');
    expect(by('drifter').kind).toBe('outcast');
    expect(patienceOf(by('guard'), LIBRARY)).toBeGreaterThan(patienceOf(by('drifter'), LIBRARY)!);
    expect(checkOpen(checkFor(by('drifter'), newSceneState(def), 'Skumraskaffärer')!, newSceneState(def))).toBe(true);
  });

  it('the default shepherd is a local human', () => {
    const h = defaultHero();
    expect(h.kind).toBe('human');
    expect(GATE_SCENE.locals).toContain(h.people);
  });
});
