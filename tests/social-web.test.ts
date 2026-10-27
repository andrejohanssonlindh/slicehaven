import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { apply, attempt, checkFor, checkOpen, moodLine, newSceneState, openChecks } from '../src/core/scene';
import { outcome, newConflict } from '../src/core/social';
import type { CheckDef, ObjectDef, SceneState } from '../src/core/scene';
import { conflictBonus, disposition, expandObject, expandScene, hooksFor, kindChain, patienceOf, readPerson, situation, talksLeftWith } from '../src/core/skillweb';
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
const PLACE = { locals: ['asharier'], majority: 'human' };
const fresh = (): SceneState => newSceneState(GATE_SCENE);
const use = (o: ObjectDef, s: SceneState, skill: string, who = { kind: 'human', people: 'asharier' }, rng = dice(5, 5, 5, 5, 5, 5)) => {
  const c = checkFor(o, s, skill)!;
  const sit = situation(s, c, o, who, LIBRARY, PLACE);
  const r = attempt(s, c, { n: 6, mod: 0 }, rng, sit);
  return { c, sit, ...r, events: apply(s, r.effects) };
};

describe('humans and their subkinds', () => {
  it('guard and outcast are kinds of rural human, which are humanoids', () => {
    expect(kindChain('guard', KIND_PARENTS)).toEqual(['guard', 'rural', 'human', 'humanoid', 'creature', 'thing']);
    expect(kindChain('outcast', KIND_PARENTS)).toEqual(['outcast', 'rural', 'human', 'humanoid', 'creature', 'thing']);
  });

  it('every humanoid can be argued with, charmed, asked and frightened', () => {
    for (const kind of ['humanoid', 'human', 'rural', 'dwarf', 'elf', 'tirak', 'guard', 'outcast']) {
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
    expect(events.map((e) => e.kind === 'say' && e.text).join(' ')).toMatch(/warmer toward you/);
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
  const look = (observer: string, hero: string, place = {}) => disposition({ kind: observer }, { kind: hero }, LIBRARY, place);

  it('dwarves and elves distrust each other, both ways; almost nobody likes the tirak', () => {
    expect(look('dwarf', 'elf').v).toBeLessThan(0);
    expect(look('elf', 'dwarf').v).toBeLessThan(0);
    for (const k of ['human', 'dwarf', 'elf']) expect(look(k, 'tirak').v, k).toBeLessThan(0);
  });

  it('country folk are warier than townsfolk of the same people, and fall back to the human row otherwise', () => {
    expect(look('rural', 'elf').v).toBeLessThan(look('human', 'elf').v);
    expect(look('rural', 'tirak').v).toBeLessThan(look('human', 'tirak').v);
    expect(look('rural', 'human').v).toBe(look('human', 'human').v);
    // A guard is rural, so he looks at you as country folk do.
    expect(look('guard', 'elf').v).toBe(RELATIONS.rural.elf.v);
  });

  it('your own kind is kin only where you are not the majority', () => {
    // Two elves in a human city: kin. Two humans in a human city: neutral. Two dwarves in a dwarf hold: neutral too.
    expect(look('elf', 'elf', { majority: 'human' }).v).toBe(RELATIONS.elf.elf.v);
    expect(look('elf', 'elf', { majority: 'human' }).v).toBeGreaterThan(0);
    expect(look('dwarf', 'dwarf', { majority: 'dwarf' }).v).toBe(0);
    expect(look('human', 'human', { majority: 'human' }).v).toBe(0);
    // With no majority named, kin is kin.
    expect(look('dwarf', 'dwarf').v).toBeGreaterThan(0);
  });

  it('a stranger from far off is a step cooler, a local is not', () => {
    const o = { kind: 'human' };
    const at = (people: string, place = { locals: ['asharier'] }) => disposition(o, { kind: 'human', people }, LIBRARY, place).v;
    expect(at('asharier')).toBe(0);
    expect(at('adasier')).toBe(-1);
    expect(disposition(o, { kind: 'human', people: 'adasier' }, LIBRARY).v).toBe(0);
  });

  it('single rolls: worse reception raises the difficulty, 2 per point', () => {
    const s = fresh();
    const o = npc('human');
    const c = checkFor(o, s, 'Charm')!;
    const home = situation(s, c, o, { kind: 'human' }, LIBRARY, PLACE);
    const elf = situation(s, c, o, { kind: 'elf' }, LIBRARY, PLACE);
    const tirak = situation(s, c, o, { kind: 'tirak' }, LIBRARY, PLACE);
    expect(elf.shift - home.shift).toBe(2);
    expect(tirak.shift - home.shift).toBe(4);
    expect(tirak.notes.join()).toMatch(/tirak/);
    expect('control' in tirak).toBe(false);
  });

  it('conflicts: reception moves Control instead, one per point, and tokens add one each', () => {
    const o = npc('dwarf');
    const home = conflictBonus(fresh(), o, { kind: 'dwarf', people: 'x' }, LIBRARY, { majority: 'human' });
    const elf = conflictBonus(fresh(), o, { kind: 'elf' }, LIBRARY, { majority: 'human' });
    expect(home.control).toBe(RELATIONS.dwarf.dwarf.v);
    expect(elf.control).toBe(RELATIONS.dwarf.elf.v);
    expect(elf.control).toBe(-2);
    const s = fresh();
    s.tokens.push({ kind: 'social', n: 1, against: 'npc', label: 'x' }, { kind: 'barter', n: 1, against: 'npc', label: 'y' });
    expect(conflictBonus(s, o, { kind: 'elf' }, LIBRARY).control).toBe(-1);
    // The bonus becomes part of the conflict's situation.
    const c = newConflict('bribe');
    c.bonus = { control: -2, notes: [] };
    expect(outcome(c, { id: 'bribe', label: '', skills: [], locked: '', situation: 2, answers: [] }, 2).situation).toBe(0);
  });

  it('every people in the table is a real kind', () => {
    for (const [obs, row] of Object.entries(RELATIONS)) {
      expect(obs in KIND_PARENTS).toBe(true);
      for (const k of Object.keys(row)) expect(k in KIND_PARENTS).toBe(true);
    }
  });
});

describe('what you can tell about someone', () => {
  it('their mood is a discrete note, and says when they run out of patience', () => {
    expect(moodLine('Rae', undefined)).toBeUndefined();
    expect(moodLine('Rae', { talks: 0, mood: -2 })).toBe('Rae seems irritated.');
    expect(moodLine('Rae', { talks: 2, mood: 1 }, 3)).toMatch(/warmer.*impatient/);
    expect(moodLine('Rae', { talks: 3, mood: 1 }, 3)).toBe('Rae has had enough of you.');
  });

  it('mood changes show up as notes in the log', () => {
    const s = fresh();
    const ev = apply(s, [{ mood: -1, who: 'npc', name: 'Rae' }, { mood: -1, who: 'npc', name: 'Rae' }]);
    expect(ev.map((e) => e.kind === 'say' && e.text)).toEqual(['Rae seems wary.', 'Rae seems irritated.']);
  });

  it('sizing someone up tells you their mood, how they see your people and whether to push', () => {
    const o = npc('outcast');
    const s = fresh();
    s.social.npc = { talks: 1, mood: -1 };
    const lines = readPerson(o, s, { kind: 'elf' }, LIBRARY, PLACE);
    expect(lines[0]).toMatch(/wary/);
    expect(lines.join(' ')).toMatch(/elves/);
    expect(lines.join(' ')).toMatch(/not push/);
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
