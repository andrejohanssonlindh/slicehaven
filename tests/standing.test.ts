import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../src/content/actions';
import { BEHAVIOURS } from '../src/content/behaviours';
import { CULTURES, DEFAULT_CULTURE, cultureOf } from '../src/content/cultures';
import { MAPS } from '../src/content/maps';
import { PERSON_KINDS } from '../src/content/people';
import { defaultHero } from '../src/content/rollables';
import { LIBRARY } from '../src/content/skillweb';
import { THINGS } from '../src/content/things';
import { diceOf } from '../src/core/hero';
import { Rng } from '../src/core/rng';
import { type ActTarget, type ActWorld, type Doer, perform } from '../src/core/world3d/actions';
import { scheduleProblems } from '../src/core/world3d/behave';
import { ThingStates, pieceId } from '../src/core/world3d/state';
import {
  answerFor, answerLines, cultureProblems, giveLeave, hasLeave, hearsay, meet, moodFor, moodsFromScale, newStanding, regardOf,
  scaled, shiftRegard, talkOntoScale, weightOf,
} from '../src/core/world3d/standing';
import { ASK_LEAVE, type TalkCase, type TalkPerson, newTalkMemory, talk, talkOffers } from '../src/core/world3d/talk';

const hero = defaultHero();
const doer: Doer = { id: 'hero', dice: (s) => diceOf(hero, s) };
const country = cultureOf(DEFAULT_CULTURE);

/** An action world with owners: `home` is Wenna's; `inn` welcomes sitting; there are houses all round (a settlement). */
function world(hour = 12, leave = false): ActWorld {
  return {
    things: THINGS, states: new ThingStates(THINGS), flags: {}, rng: Rng.fromSeed(1), library: LIBRARY,
    view: { rain: 0, hour, housesNear: () => 5 },
    owners: {
      culture: country,
      members: (h) => (h === 'home' ? ['wenna'] : []),
      welcome: (h) => (h === 'inn' ? { acts: ['sit'], hours: [6, 24] } : null),
      leave: (d, h) => leave && d === 'hero' && h === 'home',
    },
  };
}

const stool = (house: string | null): ActTarget => ({ id: pieceId(house ?? 'x', 0, 'stool'), kind: 'stool', x: 0, z: 1, level: 0, house, rot: 0 });
const hearth: ActTarget = { id: pieceId('home', 0, 'hearth'), kind: 'hearth', x: 0, z: 0, level: 0, house: 'home' };

describe('owners and wrongs (B3c)', () => {
  it('lets the household, and anyone with leave, use their home; anyone else does wrong, never blocked', () => {
    const wenna: Doer = { id: 'wenna', dice: () => ({ n: 0, mod: 0 }) };
    expect(perform('verb:sit', stool('home'), stool('home'), wenna, world(), ACTIONS).wrongs).toBeUndefined();
    expect(perform('verb:sit', stool('home'), stool('home'), doer, world(12, true), ACTIONS).wrongs).toBeUndefined();
    const r = perform('verb:sit', stool('home'), stool('home'), doer, world(), ACTIONS);
    expect(r.done).toBe(true);
    expect(r.transgressions).toEqual(['owner']);
    expect(r.wrongs).toEqual([{ act: 'sit', owner: { house: 'home' } }]);
  });

  it('weighs what kind of act it is: putting out their hearth is meddling', () => {
    const r = perform('verb:putout', hearth, hearth, doer, world(), ACTIONS);
    expect(r.wrongs).toEqual([{ act: 'meddle', owner: { house: 'home' } }]);
  });

  it('an inn welcomes you to sit in its hours, not after', () => {
    expect(perform('verb:sit', stool('inn'), stool('inn'), doer, world(20), ACTIONS).wrongs).toBeUndefined();
    expect(perform('verb:sit', stool('inn'), stool('inn'), doer, world(3), ACTIONS).wrongs?.[0].act).toBe('sit');
  });

  it('the town lets anyone sit on its benches, not put out its torches; the wild is no one\'s', () => {
    const torch: ActTarget = { id: 'torchpost@1,1', kind: 'torchpost', x: 1, z: 1, level: 0, house: null };
    expect(perform('verb:sit', stool(null), stool(null), doer, world(), ACTIONS).wrongs).toBeUndefined();
    expect(perform('verb:putout', torch, torch, doer, world(), ACTIONS).wrongs).toEqual([{ act: 'meddle', owner: { town: true } }]);
    const wild = { ...world(), view: { rain: 0, hour: 12, housesNear: () => 0 } };
    expect(perform('verb:putout', torch, torch, doer, wild, ACTIONS).wrongs).toBeUndefined();
  });

  it('without owners known (no world to ask), everything is allowed, as before', () => {
    const { owners: _o, ...bare } = world();
    expect(perform('verb:sit', stool('home'), stool('home'), doer, bare, ACTIONS).wrongs).toBeUndefined();
  });
});

describe('the scale, one per person (B3c, Q38)', () => {
  it('stays within −100..+100 and forgets a view that comes back to nothing', () => {
    const s = newStanding();
    expect(shiftRegard(s, 'a', -150)).toBe(-100);
    expect(shiftRegard(s, 'a', 100)).toBe(0);
    expect(s.regard).toEqual({});
  });

  it('the talk rules\' mood is a band of it, a step every 20 points', () => {
    expect([-100, -45, -19, 0, 19, 20, 59, 100].map(moodFor)).toEqual([-3, -2, 0, 0, 0, 1, 2, 3]);
  });

  it('advantages scale an effect: nine of them make it four times as big', () => {
    expect(scaled(20, 0)).toBe(20);
    expect(scaled(20, 9)).toBe(80);
  });

  it('a talk that warms them moves the scale at least to the mood it left them in', () => {
    const s = newStanding();
    shiftRegard(s, 'a', -5);
    expect(talkOntoScale(s, 'a', 0, 1)).toBe(20);
    expect(talkOntoScale(s, 'a', 1, 0)).toBe(0);
    expect(talkOntoScale(newStanding(), 'b', 0, 1, 3)).toBe(40);
  });

  it('moods are read from the scale before a talk', () => {
    const s = newStanding();
    shiftRegard(s, 'a', -45);
    const social: Record<string, { talks: number; mood: number }> = { b: { talks: 2, mood: 3 } };
    moodsFromScale(social, s);
    expect(social).toEqual({ a: { talks: 0, mood: -2 }, b: { talks: 2, mood: 0 } });
  });

  it('weighs a wrong more for the owner than a bystander', () => {
    const w = { act: 'meddle' as const, owner: { house: 'home' } };
    expect(weightOf(w, country, true)).toBeGreaterThan(weightOf(w, country, false));
  });
});

describe('consequences start at points on the scale (B3c)', () => {
  it('answers with the deepest step reached: a grumble, a scolding, fetching the guard', () => {
    expect(answerFor(0, country)).toBeNull();
    expect(answerFor(-6, country)?.id).toBe('grumble');
    expect(answerFor(-25, country)?.id).toBe('scold');
    expect(answerFor(-45, country)?.id).toBe('fetch');
    expect(answerFor(-100, country)?.id).toBe('hunt');
  });

  it('sitting down uninvited earns a grumble; putting out their hearth in front of them, a scolding', () => {
    expect(answerFor(-weightOf({ act: 'sit', owner: { house: 'h' } }, country, true), country)?.id).toBe('grumble');
    expect(answerFor(-weightOf({ act: 'meddle', owner: { house: 'h' } }, country, true), country)?.id).toBe('scold');
  });

  it('who you are moves the points: a people they are cold to meets them sooner', () => {
    expect(answerFor(-12, country, 0)?.id).toBe('grumble');
    expect(answerFor(-12, country, -2)?.id).toBe('scold');
    expect(answerFor(-2, country, 1)).toBeNull();
  });

  it('every culture is sound, and its answers are behaviours everyone can follow', () => {
    for (const c of Object.values(CULTURES)) {
      expect(cultureProblems(c)).toEqual([]);
      expect(scheduleProblems(answerLines(c), BEHAVIOURS, {}, new Set())).toEqual([]);
    }
  });

  it('every map names a culture there is', () => {
    for (const m of Object.values(MAPS)) if (m.culture) expect(CULTURES[m.culture]).toBeDefined();
  });
});

describe('word spreads when people meet (B3c, Q38)', () => {
  it('a listener takes in half of a stronger view, never a weaker one', () => {
    expect(hearsay(0, -60)).toBe(-15);
    expect(hearsay(-40, -60)).toBe(-40);
    expect(hearsay(0, 6)).toBe(0);
    expect(hearsay(0, 80)).toBe(20);
  });

  it('two who meet both hear the other, good or bad', () => {
    const s = newStanding();
    shiftRegard(s, 'a', -60);
    shiftRegard(s, 'b', 40);
    expect(meet(s, 'a', 'b')).toBe(false); // (neither view is weaker than what the other says)
    expect(regardOf(s, 'a')).toBe(-60);
    expect(regardOf(s, 'b')).toBe(40);
    shiftRegard(s, 'c', 0);
    meet(s, 'a', 'c');
    expect(regardOf(s, 'c')).toBe(-15);
  });
});

describe('asking leave (B3c)', () => {
  const person = (): TalkPerson => {
    const r = PERSON_KINDS.resolve({ is: ['human', 'job-farmer'] });
    return { id: 'wenna', name: 'Wenna', kind: r.facets.people ?? 'human', tags: r.chain, home: 'home' };
  };
  const ctx = (mood: number, leave = false): TalkCase => {
    const memory = newTalkMemory();
    memory.social.wenna = { talks: 0, mood };
    return { hero: { kind: hero.kind, people: hero.people, tags: hero.tags }, flags: {}, memory, library: LIBRARY, hasLeave: () => leave };
  };

  it('is offered by someone with a home, until you have it', () => {
    expect(talkOffers(person(), ctx(0)).map((o) => o.id)).toContain(ASK_LEAVE);
    expect(talkOffers(person(), ctx(0, true)).map((o) => o.id)).not.toContain(ASK_LEAVE);
  });

  it('someone who likes you says yes; someone cross with you says no', () => {
    expect(talk(ASK_LEAVE, person(), doer, ctx(1), Rng.fromSeed(1))).toMatchObject({ success: true, leave: 'home' });
    expect(talk(ASK_LEAVE, person(), doer, ctx(-2), Rng.fromSeed(1)).leave).toBeUndefined();
  });

  it('anyone else needs asking well (a roll)', () => {
    const r = talk(ASK_LEAVE, person(), doer, ctx(0), Rng.fromSeed(1));
    expect(r.roll).toBeDefined();
    expect(!!r.leave).toBe(r.success);
  });

  it('lasts until midnight', () => {
    const s = newStanding();
    giveLeave(s, 'home', 24 + 15);
    expect(hasLeave(s, 'home', 24 + 23.5)).toBe(true);
    expect(hasLeave(s, 'home', 48.1)).toBe(false);
  });
});
