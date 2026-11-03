import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/content/skillweb';
import { PERSON_KINDS } from '../src/content/people';
import { defaultHero } from '../src/content/rollables';
import { diceOf } from '../src/core/hero';
import { sheetDice } from '../src/core/npcsheet';
import { Rng } from '../src/core/rng';
import type { Doer } from '../src/core/world3d/actions';
import { type TalkCase, type TalkPerson, moodOf, newTalkMemory, patienceLeft, talk, talkOffers } from '../src/core/world3d/talk';

const hero = defaultHero();
const doer: Doer = { id: 'hero', dice: (s) => diceOf(hero, s) };

function person(is: string[], id = 'p'): TalkPerson {
  const r = PERSON_KINDS.resolve({ is });
  return { id, name: 'Wenna', kind: r.facets.people ?? 'human', tags: r.chain };
}

const fresh = (): TalkCase => ({ hero: { kind: hero.kind, people: hero.people, tags: hero.tags }, flags: {}, memory: newTalkMemory(), library: LIBRARY });

describe('talking (B3d)', () => {
  it('offers the library\'s tries for who they are: size up, ask, persuade…', () => {
    const labels = talkOffers(person(['human', 'job-farmer']), fresh()).map((o) => o.label);
    expect(labels).toContain('Size up Wenna');
    expect(labels).toContain('Ask Wenna what they know');
    expect(labels.length).toBeGreaterThan(5);
  });

  it('a guard answers differently from a farmer (the martial facet)', () => {
    const c = fresh();
    const g = person(['human', 'job-guard'], 'g');
    let lines: string[] = [];
    for (let seed = 1; seed < 30 && !lines.some((l) => /Orders|safe to know/.test(l)); seed++) {
      const ask = talkOffers(g, fresh()).find((o) => o.label.startsWith('Ask'))!;
      lines = talk(ask.id, g, doer, fresh(), Rng.fromSeed(seed)).lines.map((l) => l.text);
    }
    expect(lines.some((l) => /Orders|safe to know/.test(l))).toBe(true);
    expect(c.memory.social).toEqual({});
  });

  it('every talking try costs patience; when it runs out they stop listening, but you can still size them up', () => {
    const c = fresh(), p = person(['human', 'job-farmer']);
    const start = patienceLeft(p, c)!;
    expect(start).toBeGreaterThan(0);
    const ask = talkOffers(p, c).find((o) => o.label.startsWith('Ask'))!;
    for (let i = 0; i < start; i++) expect(talk(ask.id, p, doer, c, Rng.fromSeed(i)).done).toBe(true);
    expect(patienceLeft(p, c)).toBe(0);
    const after = talkOffers(p, c).map((o) => o.label);
    expect(after.some((l) => l.startsWith('Ask'))).toBe(false);
    expect(after).toContain('Size up Wenna');
    expect(talk(ask.id, p, doer, c, Rng.fromSeed(9)).done).toBe(false);
  });

  it('sizing up is hidden: an answer either way, and it costs no patience', () => {
    const c = fresh(), p = person(['human', 'job-farmer']);
    const before = patienceLeft(p, c);
    const r = talk(talkOffers(p, c).find((o) => o.label.startsWith('Size up'))!.id, p, doer, c, Rng.fromSeed(3));
    expect(r.hidden).toBe(true);
    expect(r.lines.length).toBeGreaterThan(0);
    expect(patienceLeft(p, c)).toBe(before);
  });

  it('what they think of you is remembered (a mood that the next try feels)', () => {
    const c = fresh(), p = person(['human', 'job-farmer']);
    c.memory.social[p.id] = { talks: 1, mood: 2 };
    expect(moodOf(p, c)).toMatch(/Wenna/);
  });

  it('someone with no fitting skill uses Presence at −2D6 (where Presence isn\'t itself a fitting roll)', () => {
    const p = person(['human', 'job-farmer']);
    const plain: Doer = { id: 'x', dice: (s) => (s === 'attr:Intryck' ? { n: 3, mod: 0 } : { n: 0, mod: 0 }) };
    const o = talkOffers(p, fresh()).find((x) => !x.skills.includes('attr:Intryck'))!;
    const r = talk(o.id, p, plain, fresh(), Rng.fromSeed(1));
    expect(r.skill).toBe('attr:Intryck');
    expect(r.roll?.dice).toEqual({ n: 1, mod: 0 });
  });

  it('a person of the map can be the one talking (their own sheet rolls)', () => {
    const s = PERSON_KINDS.rolled({ is: ['human', 'job-guard'], seed: 2 }, 'guard');
    const npc: Doer = { id: 'guard', dice: (k) => sheetDice(s, k) };
    const p = person(['human', 'job-farmer']);
    const r = talk(talkOffers(p, fresh())[0].id, p, npc, fresh(), Rng.fromSeed(2));
    expect(r.done).toBe(true);
  });
});
