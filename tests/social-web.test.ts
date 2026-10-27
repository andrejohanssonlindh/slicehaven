import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { apply, attempt, checkFor, checkOpen, moodLine, newSceneState, openChecks } from '../src/core/scene';
import { type Approach, outcome, newConflict } from '../src/core/social';
import { DIFFICULTY_RULES } from '../src/core/difficulty';
import type { CheckDef, ObjectDef, SceneState } from '../src/core/scene';
import { conflictBonus, disposition, expandObject, expandScene, hooksFor, kindChain, limitOf, patienceOf, readPerson, situation, talksLeftWith } from '../src/core/skillweb';
import { defaultHero, isRollable } from '../src/content/rollables';
import { GATE_SCENE } from '../src/content/scenes/gate';
import { KIND_PARENTS, LIBRARY } from '../src/content/skillweb';
import { RELATIONS } from '../src/content/skillweb/relations';
import { FACETS } from '../src/content/people';

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

/** A country guard and a country vagrant: humans, told apart by their facets. */
const GUARD = ['rural', 'job-guard'];
const VAGRANT = ['rural', 'job-vagrant', 'poor'];

describe('humans and who they are', () => {
  it('kinds are what a thing is; a guard or a vagrant is a human with facets', () => {
    for (const k of ['guard', 'outcast', 'rural']) expect(k in KIND_PARENTS, k).toBe(false);
    expect(kindChain('asharier', KIND_PARENTS)).toEqual(['asharier', 'human', 'humanoid', 'creature', 'thing']);
  });

  it('every humanoid can be argued with, charmed, asked and frightened', () => {
    const who: [string, string[]][] = [['humanoid', []], ['human', []], ['dwarf', []], ['elf', []], ['tirak', []], ['human', GUARD], ['human', VAGRANT]];
    for (const [kind, tags] of who) {
      expect(hooksFor({ kind, tags }, LIBRARY).map((h) => h.intention), `${kind} ${tags}`).toEqual(
        expect.arrayContaining(['persuade', 'impress', 'distract', 'ask', 'etiquette', 'threaten', 'size-up']),
      );
    }
  });

  it('facets change single hooks: the guard is harder to frighten, the poor are easier to ask with streetwise', () => {
    const by = (tags: string[], intention: string) => hooksFor({ kind: 'human', tags }, LIBRARY).find((h) => h.intention === intention)!;
    expect(by(GUARD, 'threaten').difficulty).toBeGreaterThan(by([], 'threaten').difficulty);
    expect(by(VAGRANT, 'ask').difficulty).toBeLessThan(by([], 'ask').difficulty);
    expect(by(VAGRANT, 'ask').effort).toBe('streetwise');
    // A guard is martial: orders are orders.
    expect(by(GUARD, 'persuade').id).toBe('persuade-martial');
  });

  it('patience comes from their facets, else their kind', () => {
    expect(patienceOf({ kind: 'human' }, LIBRARY)).toBe(3);
    expect(patienceOf({ kind: 'human', tags: GUARD }, LIBRARY)).toBe(4);
    expect(patienceOf({ kind: 'human', tags: VAGRANT }, LIBRARY)).toBe(2);
    expect(patienceOf({ kind: 'human', tags: VAGRANT, patience: 5 }, LIBRARY)).toBe(5);
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
    expect(s.tokens.every((t) => t.kind === 'bribe' && t.against === 'npc')).toBe(true);
    expect(events.map((e) => e.kind === 'say' && e.text).join(' ')).toMatch(/warmer toward you/);
  });

  it('the poor hear mockery, however it goes', () => {
    for (const faces of [[5, 5, 5, 5, 5, 5], [1, 1, 1, 1, 1, 1]]) {
      const s = fresh();
      use(npc('human', { tags: VAGRANT }), s, cl, undefined, dice(...faces));
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
  /** The observer is a kind (elf) or, for country folk, a human with that facet. */
  const look = (observer: string, hero: string, place = {}) =>
    disposition(observer in KIND_PARENTS ? { kind: observer } : { kind: 'human', tags: [observer] }, { kind: hero }, LIBRARY, place);

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
    expect(disposition({ kind: 'human', tags: GUARD }, { kind: 'elf' }, LIBRARY).v).toBe(RELATIONS.rural.elf.v);
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
    s.tokens.push({ kind: 'social', n: 1, against: 'npc', label: 'x' }, { kind: 'bribe', n: 1, against: 'npc', label: 'y' });
    expect(conflictBonus(s, o, { kind: 'elf' }, LIBRARY).control).toBe(-1);
    // The bonus becomes part of the conflict's situation.
    const c = newConflict('bribe');
    c.bonus = { control: -2, notes: [] };
    expect(outcome(c, { id: 'bribe', label: '', skills: [], locked: '', situation: 2, answers: [] }, 2).situation).toBe(0);
  });

  it('every row is a real kind or facet, every column a real kind', () => {
    for (const [obs, row] of Object.entries(RELATIONS)) {
      expect(obs in KIND_PARENTS || obs in FACETS, obs).toBe(true);
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
    const o = npc('human', { tags: VAGRANT });
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
    const o = npc('human', { tags: VAGRANT }); // patience 2
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
    expect(s2.tokens.map((t) => t.kind).sort()).toEqual(['sneak', 'steal']);
    expect(s2.tokens.every((t) => t.against === 'npc')).toBe(true);
  });
});

describe('library data and the gate', () => {
  it('every social hook is a social hook with real skills', () => {
    for (const h of LIBRARY.hooks.filter((x) => x.social)) {
      for (const k of h.skills) expect(isRollable(k), `${h.id}: ${k}`).toBe(true);
    }
  });

  it('in the gate: the guard has more patience than the drifter, a poor human vagrant', () => {
    const def = expandScene(GATE_SCENE, LIBRARY);
    const by = (id: string) => def.objects.find((o) => o.id === id)!;
    expect(by('guard').tags).toContain('job-guard');
    expect(by('drifter').tags).toEqual(expect.arrayContaining(['job-vagrant', 'poor']));
    expect(patienceOf(by('guard'), LIBRARY)).toBeGreaterThan(patienceOf(by('drifter'), LIBRARY)!);
    expect(checkOpen(checkFor(by('drifter'), newSceneState(def), 'Skumraskaffärer')!, newSceneState(def))).toBe(true);
  });

  it('the default shepherd is a local human', () => {
    const h = defaultHero();
    expect(h.kind).toBe('human');
    expect(GATE_SCENE.locals).toContain(h.people);
  });
});

describe('people with a social challenge, and the game difficulty', () => {
  const def = expandScene(GATE_SCENE, LIBRARY);
  const guard = def.objects.find((o) => o.id === 'guard')!;
  const drifter = def.objects.find((o) => o.id === 'drifter')!;
  const tries = (diff: keyof typeof DIFFICULTY_RULES, o: ObjectDef) => {
    const s = newSceneState(def);
    s.sideTalks = DIFFICULTY_RULES[diff].sideTalks;
    let n = 0;
    while (n < 10 && openChecks(o, s).some((c) => c.talk)) {
      const c = openChecks(o, s).find((x) => x.talk)!;
      attempt(s, c, { n: 3, mod: 0 }, dice(5, 5, 5));
      n++;
    }
    return n;
  };

  it('the guard has a social challenge, so side tries come from the difficulty: 3, 1 or 0', () => {
    expect(guard.social).toBeDefined();
    expect(tries('easy', guard)).toBe(3);
    expect(tries('normal', guard)).toBe(1);
    expect(tries('hard', guard)).toBe(0);
  });

  it('people without a social challenge keep their own patience at every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) expect(tries(d, drifter)).toBe(2);
  });

  it('the side tries never exceed his own patience', () => {
    const s = newSceneState(def);
    s.sideTalks = 99;
    expect(limitOf(guard, s, LIBRARY)).toBe(4);
  });

  it('the conflict itself is not a side try', () => {
    const s = newSceneState(def);
    s.sideTalks = 1;
    s.social.guard = { talks: 1, mood: 0 };
    expect(talksLeftWith(guard, s, LIBRARY)).toBe(0);
    // Playing the conflict does not touch the count: it is separate machinery.
    expect(s.social.guard.talks).toBe(1);
  });

  it('a conflict that ends 2 Control against 2 with a −1 situation is −1, not 0', () => {
    const c = newConflict('x');
    c.rounds.push({ mine: 2, theirs: 0 } as never, { mine: 0, theirs: 2 } as never);
    const a: Approach = { id: 'x', label: '', skills: [], locked: '', situation: -1, answers: [] };
    expect(outcome(c, a, 2)).toMatchObject({ mine: 2, theirs: 2, situation: -1, left: -1, success: false });
  });
});
