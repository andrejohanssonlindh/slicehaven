import { describe, expect, it } from 'vitest';
import { MAX_LEAN, coversSkill, effortOf, facetChain, leaningFor } from '../src/core/people';
import { kindChain } from '../src/core/skillweb';
import { BACKGROUNDS } from '../src/content/chargen/backgrounds';
import { HOMELANDS } from '../src/content/chargen/homelands';
import { PEOPLES } from '../src/content/chargen/peoples';
import { RELIGIONS } from '../src/content/chargen/religions';
import { FACETS, FACET_LIST, LEANINGS, PEOPLE_LIBRARY } from '../src/content/people';
import { isRollable } from '../src/content/rollables';
import { KIND_PARENTS, LIBRARY } from '../src/content/skillweb';
import { TAG_INFO } from '../src/content/skillweb/tags';
import { expandObject, situation } from '../src/core/skillweb';
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
    // The old kinds are unchanged.
    expect(kindChain('guard', KIND_PARENTS)[1]).toBe('rural');
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

  it('intimidate is the threaten effort', () => {
    expect(effortOf('intimidate')).toBe('threaten');
    expect(effortOf('ask')).toBe('ask');
    expect(effortOf(undefined)).toBeUndefined();
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
    const a = situation(state(), check('intimidate'), npc([], 'asharier'), { kind: 'human' }, LIBRARY, undefined, 'Injaga fruktan');
    expect(a.shift).toBe(2);
    const h = situation(state(), check('intimidate'), npc([], 'human'), { kind: 'human' }, LIBRARY, undefined, 'Injaga fruktan');
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
