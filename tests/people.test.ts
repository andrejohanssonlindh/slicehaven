import { describe, expect, it } from 'vitest';
import { MAX_LEAN, coversSkill, facetChain, kinFor, leaningFor, leaningId, leaningsForSkill } from '../src/core/people';
import { conflictBonus, expandScene, facetScore, hooksFor, kindChain, leanOf } from '../src/core/skillweb';
import { BACKGROUNDS } from '../src/content/chargen/backgrounds';
import { HOMELANDS } from '../src/content/chargen/homelands';
import { PEOPLES } from '../src/content/chargen/peoples';
import { RELIGIONS } from '../src/content/chargen/religions';
import { FACETS, FACET_LIST, LEANINGS, PEOPLE_LIBRARY, backgroundFacet, peopleFacet } from '../src/content/people';
import { defaultHero, isRollable } from '../src/content/rollables';
import { KIND_PARENTS, LIBRARY } from '../src/content/skillweb';
import { TAG_INFO } from '../src/content/skillweb/tags';
import { expandObject, readPerson, situation } from '../src/core/skillweb';
import { newSceneState } from '../src/core/scene';
import { GATE_SCENE } from '../src/content/scenes/gate';
import type { CheckDef } from '../src/core/scene';

describe('the facets', () => {
  it('ids are unique and every parent exists', () => {
    expect(new Set(FACET_LIST.map((f) => f.id)).size).toBe(FACET_LIST.length);
    for (const f of FACET_LIST) if (f.parent) expect(FACETS[f.parent], `${f.id} → ${f.parent}`).toBeDefined();
  });

  it('every people, homeland, faith and calling of the creator is a facet', () => {
    // (The creator splits each tirak house by size; the facet is the house.)
    for (const p of PEOPLES) expect(FACETS[p.id.replace(/-(gurder|tiraker|trukher)$/, '')], p.id).toBeDefined();
    for (const h of HOMELANDS.filter((x) => x.id !== 'ovriga')) expect(FACETS[h.id], h.id).toBeDefined();
    for (const r of RELIGIONS) expect(FACETS[r.id], r.id).toBeDefined();
    expect(FACET_LIST.filter((f) => f.id.startsWith('job-'))).toHaveLength(BACKGROUNDS.length);
  });

  it('every calling sits in a group, and a faith without a parent sits under Faiths', () => {
    for (const f of FACET_LIST.filter((x) => x.id.startsWith('job-'))) expect(FACETS[f.parent!].dim).toBe('station');
    expect(facetChain('arachna', FACETS)).toEqual(['arachna', 'hedendom', 'faith']);
    expect(facetChain('job-soldier', FACETS)).toEqual(['job-soldier', 'martial', 'station']);
  });

  it('a people is a kind of its family: an Asharian is a human, a Léaram is an elf', () => {
    expect(kindChain('asharier', KIND_PARENTS)).toEqual(['asharier', 'human', 'humanoid', 'creature', 'thing']);
    expect(kindChain('learam', KIND_PARENTS).slice(0, 2)).toEqual(['learam', 'elf']);
    expect(kindChain('bazirk', KIND_PARENTS).slice(0, 2)).toEqual(['bazirk', 'tirak']);
  });
});

describe('the leanings', () => {
  it('name a real facet, a real kind of effort and real skills; shifts are one or two points', () => {
    for (const l of LEANINGS) {
      expect(FACETS[l.who], `${l.who}: ${l.effort}`).toBeDefined();
      expect(l.effort in TAG_INFO, `${l.who}: ${l.effort}`).toBe(true);
      expect(Math.abs(l.shift), `${l.who}: ${l.effort}`).toBeGreaterThanOrEqual(1);
      expect(Math.abs(l.shift), `${l.who}: ${l.effort}`).toBeLessThanOrEqual(2);
      expect(l.why.length, `${l.who}: ${l.effort}`).toBeGreaterThan(3);
      for (const s of l.skills ?? []) expect(s.endsWith(':*') || isRollable(s), `${l.who}: ${s}`).toBe(true);
    }
  });

  it('no facet leans the same effort and skills twice', () => {
    const seen = new Set<string>();
    for (const l of LEANINGS) {
      const key = `${l.who}|${l.effort}|${(l.skills ?? []).join(',')}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('every kind of facet has something that differs', () => {
    for (const dim of ['people', 'realm', 'faith', 'station', 'setting', 'state'] as const) {
      const n = LEANINGS.filter((l) => facetChain(l.who, FACETS).some((f) => FACETS[f].dim === dim)).length;
      expect(n, dim).toBeGreaterThan(10);
    }
  });
});

describe('applying the leanings', () => {
  const lib = PEOPLE_LIBRARY;

  it('wildcards cover a whole group of skills', () => {
    expect(coversSkill('H:*', 'H:Bagare')).toBe(true);
    expect(coversSkill('H:*', 'E:Supa')).toBe(false);
    expect(coversSkill('Charm', 'Charm')).toBe(true);
  });

  it('every leaning has a stable id of its own (for translation keys later)', () => {
    const ids = LEANINGS.map(leaningId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(leaningId({ who: 'roghan', effort: 'impress', shift: 1, why: '', skills: ['H:*'] })).toBe('roghan.impress.H:*');
  });

  it('a leaning applies to the facet and everything below it', () => {
    // job-soldier is under martial: soldiers are hard to frighten.
    expect(leaningFor(['job-soldier'], 'threaten', undefined, lib).v).toBe(-1);
    // And a person with no facets is untouched.
    expect(leaningFor([], 'threaten', undefined, lib)).toEqual({ v: 0, notes: [] });
  });

  it('a skill-specific leaning only applies with those skills', () => {
    // An innkeeper is won by shop talk about bread, not by a good sword.
    expect(leaningFor(['job-innkeeper'], 'impress', 'H:Bagare', lib).v).toBe(1);
    expect(leaningFor(['job-innkeeper'], 'impress', 'Svärd', lib).v).toBe(0);
    expect(leaningFor(['job-innkeeper'], 'impress', undefined, lib).v).toBe(0);
  });

  it('several facets add up, and never past the cap', () => {
    // A drunk, grieving, afraid, hungry, hurried man being offered a bribe in the market.
    const a = leaningFor(['drunk', 'hungry', 'hurried', 'poor'], 'bribe', 'Handel', lib);
    expect(a.v).toBe(MAX_LEAN);
    expect(a.notes.length).toBeGreaterThan(3);
    const b = leaningFor(['grieving', 'devout', 'rich', 'clergy'], 'bribe', undefined, lib);
    expect(b.v).toBe(-MAX_LEAN);
    // Naming a facet twice (a tag and a kind) counts it once.
    expect(leaningFor(['drunk', 'drunk'], 'ask', undefined, lib).v).toBe(1);
  });

  it('the same person, different places: a tavern is for talk, a courtroom for law', () => {
    expect(leaningFor(['tavern'], 'ask', undefined, lib).v).toBeGreaterThan(0);
    expect(leaningFor(['courtroom'], 'bribe', undefined, lib).v).toBeLessThan(0);
    expect(leaningFor(['courtroom'], 'law', 'Lagkunskap', lib).v).toBeGreaterThan(0);
    expect(leaningFor(['courtroom'], 'law', 'Charm', lib).v).toBe(0);
  });
});

describe('in a roll', () => {
  const state = () => newSceneState(GATE_SCENE);
  const npc = (tags: string[], kind = 'human') =>
    expandObject({ id: 'npc', name: 'Old Rae', kind, tags, hexes: [[0, 0]], look: '' }, LIBRARY);
  const check = (intention: string, talk = true): CheckDef => ({
    id: 'c', label: 'Try', skills: [], difficulty: 10, intention, success: [], failure: [], talk: talk ? { who: 'npc', patience: 3 } : undefined,
  });

  it('the people library is part of the library', () => {
    expect(LIBRARY.people).toBe(PEOPLE_LIBRARY);
  });

  it('a drunk guard is easier to ask, a grieving one harder to bribe', () => {
    const ask = situation(state(), check('ask'), npc(['drunk']), { kind: 'human' }, LIBRARY, undefined, 'Charm');
    expect(ask.shift).toBe(-2);
    expect(ask.notes).toContain('a loose tongue');
    const bribe = situation(state(), check('bribe'), npc(['grieving']), { kind: 'human' }, LIBRARY, undefined, 'Handel');
    expect(bribe.shift).toBe(4);
  });

  it('where it happens counts too', () => {
    const sit = situation(state(), check('ask'), npc([]), { kind: 'human' }, LIBRARY, { tags: ['tavern', 'night'] }, 'Charm');
    expect(sit.shift).toBe(0); // +1 in a tavern, −1 at night
    expect(sit.notes).toEqual(expect.arrayContaining(['loose tongues', 'people are wary after dark']));
  });

  it('a people leans through its kind: an Asharian is not easily threatened, any human is', () => {
    const a = situation(state(), check('threaten'), npc([], 'asharier'), { kind: 'human' }, LIBRARY, undefined, 'Injaga fruktan');
    expect(a.shift).toBe(2);
    const h = situation(state(), check('threaten'), npc([], 'human'), { kind: 'human' }, LIBRARY, undefined, 'Injaga fruktan');
    expect(h.shift).toBe(0);
  });

  it('works for rolls that are not a talk (sneaking by night)', () => {
    const sit = situation(state(), check('sneak', false), npc([]), { kind: 'human' }, LIBRARY, { tags: ['night', 'rain'] }, 'Smyga');
    expect(sit.shift).toBe(-4);
  });

  it('nothing changes for a person with no facets', () => {
    expect(situation(state(), check('ask'), npc([]), { kind: 'human' }, LIBRARY, undefined, 'Charm').shift).toBe(0);
  });
});

describe('the Skill map view', () => {
  it('lists where a skill works for an effort, general rows and ones that name the skill', () => {
    const rows = leaningsForSkill('H:Bagare', 'impress', PEOPLE_LIBRARY);
    const mine = rows.filter((r) => r.specific).map((r) => r.l.who);
    expect(mine).toEqual(expect.arrayContaining(['job-innkeeper', 'job-miller']));
    // A general row (the rich are hard to impress, whatever you do) is there too, and sorts below the open doors.
    expect(rows.find((r) => r.l.who === 'rich')?.specific).toBe(false);
    expect(rows[0].l.shift).toBeGreaterThanOrEqual(rows[rows.length - 1].l.shift);
    // A skill that is not named only gets the general rows.
    expect(leaningsForSkill('Svärd', 'impress', PEOPLE_LIBRARY).some((r) => r.l.who === 'job-innkeeper')).toBe(false);
  });
});

describe('what you share', () => {
  const lib = PEOPLE_LIBRARY;

  it('a shared faith helps with persuading, a shared calling with impressing', () => {
    expect(kinFor(['samorism'], ['samorism'], 'persuade', lib).v).toBe(1);
    expect(kinFor(['samorism'], ['daak'], 'persuade', lib).v).toBe(0);
    // A soldier and a guard are both martial: one walk of life.
    expect(kinFor(['job-soldier'], ['job-guard'], 'impress', lib).v).toBe(1);
    expect(kinFor(['job-soldier'], ['job-baker'], 'impress', lib).v).toBe(0);
  });

  it('the root of a dimension is not something you share', () => {
    // Both have "a faith" in the abstract, but nothing in common.
    expect(kinFor(['arachna'], ['daak'], 'persuade', lib).v).toBe(0);
    expect(kinFor(['arachna'], ['dibuk'], 'persuade', lib).v).toBe(1); // two old pagan cults
  });

  it('a homeland counts only when it is the very same one', () => {
    expect(kinFor(['asharien'], ['asharien'], 'ask', lib).v).toBe(1);
    expect(kinFor(['asharien'], ['vastmark'], 'ask', lib).v).toBe(0); // both lawless lands, but not the same land
  });

  it('it does nothing for efforts it does not help', () => {
    expect(kinFor(['samorism'], ['samorism'], 'threaten', lib).v).toBe(0);
    expect(kinFor([], ['samorism'], 'persuade', lib).v).toBe(0);
  });

  it('the place is not kin, only the person', () => {
    const o = expandObject({ id: 'npc', name: 'Old Rae', kind: 'human', hexes: [[0, 0]], look: '' }, LIBRARY);
    const sit = leanOf(o, { kind: 'human', tags: ['asharien'] }, LIBRARY, { tags: ['asharien'] }, 'ask');
    expect(sit.v).toBe(0); // lawless land: nothing for asking; and the scene tag does not make Rae a fellow countryman
  });

  it('is part of the roll', () => {
    const o = expandObject({ id: 'npc', name: 'Old Rae', kind: 'human', tags: ['samorism'], hexes: [[0, 0]], look: '' }, LIBRARY);
    const c: CheckDef = { id: 'c', label: 'Try', skills: [], difficulty: 10, intention: 'persuade', success: [], failure: [], talk: { who: 'npc', patience: 3 } };
    const same = situation(newSceneState(GATE_SCENE), c, o, { kind: 'human', tags: ['samorism'] }, LIBRARY, undefined, 'Teologi');
    // Samorists weigh scripture (+1) and you share their faith (+1).
    expect(same.shift).toBe(-4);
    expect(same.notes).toEqual(expect.arrayContaining(['scripture counts', 'you share their faith']));
    const other = situation(newSceneState(GATE_SCENE), c, o, { kind: 'human', tags: ['daak'] }, LIBRARY, undefined, 'Teologi');
    expect(other.shift).toBe(-2);
  });
});

describe('in a conflict', () => {
  const guard = expandObject({ id: 'guard', name: 'Gate guard', kind: 'human', tags: ['asharier', 'rural', 'job-guard', 'on-duty'], hexes: [[0, 0]], look: '' }, LIBRARY);
  const state = () => newSceneState(GATE_SCENE);

  it('the approach\'s effort moves the starting Control', () => {
    const none = conflictBonus(state(), guard, { kind: 'human', people: 'asharier' }, LIBRARY, { tags: ['checkpoint'] });
    const bribe = conflictBonus(state(), guard, { kind: 'human', people: 'asharier' }, LIBRARY, { tags: ['checkpoint'] }, undefined, 'bribe');
    // A checkpoint is a familiar place for a bribe (+1); a guard on duty is less open to it (−1 twice: as a guard and on duty).
    expect(bribe.control - none.control).toBe(-1);
    expect(bribe.notes).toEqual(expect.arrayContaining(['a familiar transaction', 'on watch, and answerable for it']));
  });

  it('is only applied when the approach names an effort', () => {
    const a = conflictBonus(state(), guard, { kind: 'human' }, LIBRARY, { tags: ['checkpoint'] });
    expect(a.notes.filter((n) => n === 'a familiar transaction')).toHaveLength(0);
  });

  it('the gate\'s three approaches name their effort', () => {
    const soc = GATE_SCENE.objects.find((o) => o.id === 'guard')!.social!;
    expect(soc.approaches.map((a) => a.effort).sort()).toEqual(['bribe', 'sweet-talk', 'threaten']);
  });
});

describe('outcomes by type of person', () => {
  const person = (tags: string[], kind = 'human') => ({ kind, tags });
  const pick = (tags: string[], intention: string, kind?: string) => hooksFor(person(tags, kind), LIBRARY).find((h) => h.intention === intention)!;

  /** Hooks by type of person: a facet on someone humanoid. */
  const ALL = LIBRARY.hooks.filter((h) => h.facet && h.kind === 'humanoid' && h.social);
  const ASK_HOOKS = ALL.filter((h) => h.intention === 'ask');

  it('every hook by type of person targets a real facet and replaces a general hook of the same intention', () => {
    expect(ALL.length).toBeGreaterThan(60);
    for (const h of ALL) {
      expect(FACETS[h.facet!], h.id).toBeDefined();
      expect(LIBRARY.hooks.some((g) => !g.facet && g.kind === 'humanoid' && g.intention === h.intention), h.id).toBe(true);
      expect(h.id.startsWith(`${h.intention}-`), h.id).toBe(true);
      expect(h.success.length, h.id).toBeGreaterThan(0);
      expect(h.failure.length, h.id).toBeGreaterThan(0);
      for (const e of [...h.success, ...h.failure]) if ('token' in e) expect(e.token.n, h.id).toBeGreaterThan(0);
    }
    const ids = ALL.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('however a person answers, asking still sets what the scene waits for', () => {
    for (const h of ASK_HOOKS) expect(h.success.some((e) => 'set' in e && e.set === 'asked:{id}'), h.id).toBe(true);
    // And the general hook does too.
    expect(pick([], 'ask').success.some((e) => 'set' in e && e.set === 'asked:{id}')).toBe(true);
  });

  it('provoking is a rise on purpose, stealing is not a talk and ends in loot or in trouble', () => {
    for (const h of LIBRARY.hooks.filter((x) => x.effort === 'provoke')) {
      expect(h.success.some((e) => 'mood' in e && e.mood < 0), h.id).toBe(true);
    }
    const steals = LIBRARY.hooks.filter((x) => x.effort === 'steal');
    expect(steals.length).toBeGreaterThan(5);
    for (const h of steals) {
      expect(h.social, h.id).toBeFalsy();
      expect(h.wants, h.id).toEqual(['steal']);
      expect(h.success.some((e) => 'set' in e && e.set === 'stolen:{id}'), h.id).toBe(true);
      expect(h.failure.some((e) => 'set' in e && e.set === 'suspicious:{id}'), h.id).toBe(true);
    }
    expect(pick(['job-soldier'], 'steal').id).toBe('steal-martial');
    expect(pick(['drunk'], 'comfort').id).toBe('comfort-drunk');
    expect(pick([], 'sweet-talk').id).toBe('sweet-talk');
  });

  it('a lie is a hidden roll: success and failure read the same, and only a silent flag tells them apart', () => {
    const lies = LIBRARY.hooks.filter((h) => h.effort === 'deceive');
    expect(lies.length).toBeGreaterThan(10);
    for (const h of lies) {
      expect(h.hidden, h.id).toBe(true);
      const words = (es: typeof h.success) => es.filter((e) => 'say' in e).map((e) => JSON.stringify(e));
      expect(words(h.success), h.id).toEqual(words(h.failure));
      expect(h.success.every((e) => 'say' in e || ('set' in e && e.set === 'deceived:{id}')), h.id).toBe(true);
      expect(h.failure.every((e) => 'say' in e || ('set' in e && e.set === 'doubted:{id}')), h.id).toBe(true);
    }
    expect(pick(['child'], 'deceive').difficulty).toBeLessThan(pick(['job-soldier'], 'deceive').difficulty);
  });

  it('whether they believed you shows later: in the roll, and in a sound size-up', () => {
    const o = expandObject({ id: 'p', name: 'Marn', kind: 'human', tags: [], at: [0, 0] } as never, LIBRARY);
    const s = newSceneState(GATE_SCENE);
    const check = o.checks!.find((c) => c.talk)!;
    const base = situation(s, check, o, defaultHero(), LIBRARY, undefined, check.skills[0]).shift;
    s.flags['deceived:p'] = true;
    expect(situation(s, check, o, defaultHero(), LIBRARY, undefined, check.skills[0]).shift).toBe(base - 2);
    expect(readPerson(o, s, defaultHero(), LIBRARY, undefined, true).join(' ')).toContain('taken your word');
    expect(readPerson(o, s, defaultHero(), LIBRARY, undefined, false).join(' ')).toContain('not sure they believe');
    delete s.flags['deceived:p'];
    s.flags['doubted:p'] = true;
    expect(situation(s, check, o, defaultHero(), LIBRARY, undefined, check.skills[0]).shift).toBe(base + 2);
  });

  it('a person gets one hook per intention, the best match', () => {
    const hooks = hooksFor(person(['job-soldier', 'drunk', 'tavern']), LIBRARY);
    const intentions = hooks.map((h) => h.intention);
    expect(new Set(intentions).size).toBe(intentions.length);
    // A particular hook does not push the general ones around: the list keeps the library's order (sizing up first).
    expect(intentions[0]).toBe('size-up');
    expect(intentions).toEqual(hooksFor(person([]), LIBRARY).map((h) => h.intention).filter((i) => intentions.includes(i)));
    expect(pick(['job-soldier', 'drunk'], 'ask').id).toBe('ask-drunk'); // a state beats who they are
    expect(pick(['job-soldier'], 'ask').id).toBe('ask-martial');
    expect(pick(['job-soldier'], 'persuade').id).toBe('persuade-martial');
    expect(pick(['job-soldier'], 'distract').id).toBe('distract-martial');
  });

  it('the same try, a different reply: six people ask, six answers', () => {
    const say = (h: ReturnType<typeof pick>) => (h.success.find((e) => 'say' in e) as { say: string }).say;
    const lines = new Set(['nobility', 'clergy', 'martial', 'merchant', 'servile', 'underworld'].map((f) => say(pick([f], 'ask'))));
    expect(lines.size).toBe(6);
  });

  it('a person without any of these facets gets the general hook', () => {
    expect(pick([], 'impress').id).toBe('impress');
    expect(pick([], 'threaten').id).toBe('threaten');
  });

  it('a facet hook applies to the facet and everything under it', () => {
    expect(pick(['martial'], 'impress').id).toBe('impress-martial');
    expect(pick(['job-soldier'], 'impress').id).toBe('impress-martial'); // a soldier is martial
    expect(pick(['job-priest'], 'threaten').id).toBe('threaten-clergy');
  });

  it('a particular facet beats a general one; a state beats who they are', () => {
    // What is happening to them right now beats who they are: a terrified soldier is first of all terrified.
    expect(pick(['job-soldier', 'afraid'], 'threaten').id).toBe('threaten-afraid');
    expect(pick(['job-soldier'], 'threaten').id).toBe('threaten-martial');
    // A calling beats its group: a guard is martial, but has a hook of his own.
    expect(pick(['job-guard'], 'threaten').id).toBe('threaten-job-guard');
    // And a frightened guard is frightened first (when a guard was a kind, the guard's hook always won).
    expect(pick(['job-guard', 'afraid'], 'threaten').id).toBe('threaten-afraid');
  });

  it('a facet never outranks a kind, however deep the facet tree grows', () => {
    for (const f of Object.keys(FACETS)) expect(facetScore(f, FACETS), f).toBeLessThan(2);
    expect(facetScore('made-up', { 'made-up': { id: 'made-up', dim: 'state', label: '', blurb: '', parent: 'a' }, a: { id: 'a', dim: 'state', label: '', blurb: '', parent: 'b' }, b: { id: 'b', dim: 'state', label: '', blurb: '', parent: 'c' }, c: { id: 'c', dim: 'state', label: '', blurb: '', parent: 'd' }, d: { id: 'd', dim: 'state', label: '', blurb: '' } })).toBeLessThan(2);
  });

  it('different people answer the same try in different ways', () => {
    const say = (h: ReturnType<typeof pick>) => (h.success.find((e) => 'say' in e) as { say: string }).say;
    const lines = new Set(['nobility', 'clergy', 'martial', 'merchant', 'servile', 'child'].map((f) => say(pick([f], 'impress'))));
    expect(lines.size).toBe(6);
  });

  it('the place can pick a hook too', () => {
    const lib = { ...LIBRARY, hooks: [...LIBRARY.hooks, { ...pick(['nobility'], 'impress'), id: 'impress-tavern', facet: 'tavern' }] };
    const o = { kind: 'human', tags: [] as string[] };
    expect(hooksFor(o, lib).find((h) => h.intention === 'impress')!.id).toBe('impress');
    expect(hooksFor(o, lib, { tags: ['tavern'] }).find((h) => h.intention === 'impress')!.id).toBe('impress-tavern');
  });

  it('is on the gate guard: a martial, on-duty Asharian gets the soldier\'s replies', () => {
    const def = expandScene(GATE_SCENE, LIBRARY);
    const guard = def.objects.find((o) => o.id === 'guard')!;
    const ids = (guard.checks ?? []).map((c) => c.id);
    expect(ids.some((i) => i.endsWith('impress-martial'))).toBe(true);
    expect(ids.some((i) => i.endsWith('threaten-job-guard'))).toBe(true);
  });
});

describe('the hero\'s own facets', () => {
  it('the default shepherd is an Asharian herder from Asharien, and the tags are real facets', () => {
    const h = defaultHero();
    expect(h.tags).toEqual(['asharier', 'asharien', 'job-herder']);
    for (const t of h.tags!) expect(FACETS[t], t).toBeDefined();
  });

  it('every calling the creator offers is a facet a hero can carry', () => {
    for (const b of BACKGROUNDS) expect(FACETS[backgroundFacet(b.en)], b.en).toBeDefined();
    expect(peopleFacet('bazirk-gurder')).toBe('bazirk');
    expect(peopleFacet('asharier')).toBe('asharier');
  });
});
