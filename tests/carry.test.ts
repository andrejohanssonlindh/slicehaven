import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../src/content/actions';
import { DEFAULT_CULTURE, cultureOf } from '../src/content/cultures';
import { LIBRARY } from '../src/content/skillweb';
import { THINGS } from '../src/content/things';
import { Rng } from '../src/core/rng';
import { type ActTarget, type ActWorld, type Doer, offers, perform } from '../src/core/world3d/actions';
import { HAUL_SKILL, aHandFree, actOfStage, carriable, handFor, carryCapacity, hideable, returnedRegard, stageOf, stray, turnedHalf, wealthOf, worthOf } from '../src/core/world3d/carry';
import type { Dice } from '../src/core/checks';
import { rollSheet, sheetSpan } from '../src/core/npcsheet';
import { modelOf } from '../src/core/world3d/things';
import { CONTENT } from '../src/content/chargen';
import { derive } from '../src/core/chargen/derive';
import { newChar } from '../src/core/chargen/state';
import { heroFromChar } from '../src/content/rollables';
import { BORROW, CLAIM, DEMAND, GIVE_BACK, type TalkCase, type TalkPerson, newTalkMemory, talk, talkOffers } from '../src/core/world3d/talk';
import { PERSON_KINDS } from '../src/content/people';
import { BEHAVIOURS } from '../src/content/behaviours';
import { orderly } from '../src/content/people/order';
import { Walking } from '../src/core/world3d/actors';
import { type Acts, type Whereabout, newMind, stepMind } from '../src/core/world3d/behave';
import { NavGrid } from '../src/core/world3d/space';
import { ThingStates, pieceId } from '../src/core/world3d/state';
import { mayDo, weightOf } from '../src/core/world3d/standing';

const country = cultureOf(DEFAULT_CULTURE);

/** An action world: `home` is Wenna's and poor; the hero holds `held` (a kind), or nothing; `watchers` see them. */
function world(held: string | null = null, watchers = 0, seed = 1): ActWorld {
  return {
    things: THINGS, states: new ThingStates(THINGS), flags: {}, rng: Rng.fromSeed(seed), library: LIBRARY,
    view: { rain: 0, hour: 12, housesNear: () => 5, watchers },
    owners: { culture: country, members: (h) => (h === 'home' ? ['wenna'] : []), welcome: () => null, leave: () => false, wealth: () => 'poor' },
    holding: (d) => (d === 'hero' ? held : null),
  };
}

/** A hero who rolls a set pool for everything. */
const hands = (n: number): Doer => ({ id: 'hero', dice: () => ({ n, mod: 0 }) });
const piece = (kind: string): ActTarget => ({ id: pieceId('home', 0, kind), kind, x: 0, z: 1, level: 0, house: 'home', rot: 0 });
const here = { x: 0, z: 0, level: 0, house: 'home' };
const ids = (t: ActTarget | null, w = world()) => offers(t, t ?? here, hands(3), w, ACTIONS).map((o) => o.id);

describe('carrying capacity (B6)', () => {
  const body = (physique: Dice, haul: Dice = { n: 0, mod: 0 }, load = 0): Doer =>
    ({ id: 'hero', dice: (s) => (s === 'attr:Kroppsbyggnad' ? physique : s === HAUL_SKILL ? haul : { n: 0, mod: 0 }), load });

  it('is 5 kg a die of Physique and 1 a pip, half that for toil and haul, a kilogram for each load point the build takes off', () => {
    expect(carryCapacity({ n: 3, mod: 2 }, { n: 0, mod: 0 })).toBe(17);
    expect(carryCapacity({ n: 3, mod: 2 }, { n: 4, mod: 0 })).toBe(27);
    expect(carryCapacity({ n: 3, mod: 2 }, { n: 0, mod: 0 }, -8)).toBe(25);
    // A build that adds load never takes capacity away here (that is fatigue's, later).
    expect(carryCapacity({ n: 3, mod: 2 }, { n: 0, mod: 0 }, 8)).toBe(17);
  });

  it('refuses what is over it, with both weights; toil and haul and a dwarf\'s build lift it', () => {
    expect(THINGS.get('sacks').weight).toBe(20);
    expect(perform('verb:pick-up', piece('sacks'), piece('sacks'), body({ n: 3, mod: 2 }), world(), ACTIONS))
      .toMatchObject({ done: false, reason: 'The sacks is too heavy for you: it weighs 20 kg, and you can carry 17 kg.' });
    expect(perform('verb:pick-up', piece('sacks'), piece('sacks'), body({ n: 3, mod: 2 }, { n: 4, mod: 0 }), world(), ACTIONS).done).toBe(true);
    expect(perform('verb:pick-up', piece('sacks'), piece('sacks'), body({ n: 3, mod: 2 }, { n: 0, mod: 0 }, -8), world(), ACTIONS).done).toBe(true);
  });

  it('every takeable kind has a weight', () => {
    for (const id of THINGS.placeable) { const k = THINGS.get(id); if (k.size) expect(k.weight, k.id).toBeGreaterThan(0); }
  });

  it('dwarves take 8 load off, once, on the creator\'s sheet and on map people\'s', () => {
    expect(PERSON_KINDS.sheet({ is: ['dwarf', 'job-farmer'] }).load).toBe(-8);
    expect(PERSON_KINDS.sheet({ is: ['human', 'job-farmer'] }).load).toBe(0);
    expect(rollSheet(sheetSpan(PERSON_KINDS.sheet({ is: ['dwarf', 'job-farmer'] }), 'capable'), 3).load).toBe(-8);
    const dvarg = CONTENT.peoples.find((p) => p.family === 'dvarg')!;
    expect(heroFromChar('Test', derive({ ...newChar(), people: dvarg.id } as never, CONTENT)).load).toBe(-8);
  });
});

describe('sizes (B3b)', () => {
  it('what has a size can be picked up; heavy things are offered and refused; built-in things are not offered', () => {
    expect(ids(piece('stool'))).toContain('verb:pick-up');
    expect(ids(piece('table'))).toContain('verb:pick-up');
    expect(perform('verb:pick-up', piece('table'), piece('table'), hands(3), world(), ACTIONS)).toMatchObject({ done: false, reason: 'The table is too heavy to carry alone.' });
    expect(ids(piece('hearth'))).not.toContain('verb:pick-up');
    expect(ids(piece('shelf'))).not.toContain('verb:pick-up');
  });

  it('only small things (pocket, bag) can be slipped away unseen', () => {
    expect(ids(piece('herbs'))).toContain('verb:slip-away');
    expect(ids(piece('basket'))).toContain('verb:slip-away');
    expect(ids(piece('stool'))).not.toContain('verb:slip-away');
    expect([carriable('hands'), carriable('heavy'), carriable(undefined), hideable('pocket'), hideable('hands')]).toEqual([true, false, false, true, false]);
  });

  it('every size and value a kind says is sane', () => {
    for (const id of THINGS.placeable) {
      const t = THINGS.get(id);
      if (t.size && t.size !== 'heavy') expect(modelOf(t), `${id} can be carried, so it needs a model to be drawn loose`).toBeTruthy();
      if (t.value !== undefined) expect(t.value, id).toBeGreaterThanOrEqual(0);
      if (t.importance !== undefined) expect(t.importance, id).toBeLessThanOrEqual(3);
    }
  });
});

describe('carrying (B3b)', () => {
  it('picking up holds it; with full hands you can neither take another nor sit, and you can put it down', () => {
    const r = perform('verb:pick-up', piece('stool'), piece('stool'), hands(3), world(), ACTIONS);
    expect(r.done).toBe(true);
    expect(r.events).toContainEqual({ kind: 'carry', target: piece('stool'), hidden: false });
    // (Moving it about its room is no wrong: what it becomes depends on where it goes.)
    expect(r.wrongs).toBeUndefined();
    const full = world('stool');
    expect(perform('verb:pick-up', piece('broom'), piece('broom'), hands(3), full, ACTIONS)).toMatchObject({ done: false, reason: 'Your hands are full: put the stool down first.' });
    expect(perform('verb:sit', piece('stool'), piece('stool'), hands(3), full, ACTIONS).done).toBe(false);
    expect(ids(null, full)).toContain('verb:put-down');
    expect(offers(null, here, hands(3), full, ACTIONS).find((o) => o.id === 'verb:put-down')?.label).toBe('Put down the stool');
    expect(ids(null, world())).not.toContain('verb:put-down');
    expect(perform('verb:put-down', null, here, hands(3), full, ACTIONS).events).toContainEqual({ kind: 'putdown', at: here });
  });

  it('slipped away well, no one answers the theft; fumbled, the theft is seen, weighed by what it is worth to them', () => {
    const good = perform('verb:slip-away', piece('herbs'), piece('herbs'), hands(12), world(), ACTIONS);
    expect(good.success).toBe(true);
    expect(good.events).toContainEqual({ kind: 'carry', target: piece('herbs'), hidden: true });
    expect(good.wrongs).toBeUndefined();
    expect(good.transgressions).toEqual(['owner']);
    const clumsy: Doer = { id: 'hero', dice: (s) => (s === 'attr:Kroppsbyggnad' ? { n: 3, mod: 0 } : { n: 0, mod: 0 }) };
    const bad = perform('verb:slip-away', piece('herbs'), piece('herbs'), clumsy, world(), ACTIONS);
    expect(bad.success).toBe(false);
    expect(bad.wrongs?.[0]).toMatchObject({ act: 'steal', owner: { house: 'home' } });
  });

  it('is harder under watching eyes, and for something bag-sized', () => {
    const r = perform('verb:slip-away', piece('basket'), piece('basket'), hands(3), world(null, 2), ACTIONS);
    expect(r.events.find((e) => e.kind === 'say' && e.line.text.startsWith('Harder'))).toMatchObject({ line: { text: 'Harder: it is bag-sized, someone is watching you.' } });
  });
});

describe('how far it went, and what it was worth (B3b)', () => {
  const home = { x: 0, z: 0, level: 0, house: 'home', rot: 0, room: 0 };

  it('in its room it is home; another room of the house, moved; out of the house, taken; the wild\'s, never', () => {
    expect(stageOf(home, { house: 'home', room: 0 })).toBe('home');
    expect(stageOf(home, { house: 'home', room: 1 })).toBe('room');
    expect(stageOf(home, { house: null, room: null })).toBe('out');
    expect(stageOf(home, { house: 'inn', room: 0 })).toBe('out');
    expect(stageOf({ ...home, house: null, room: null }, { house: 'inn', room: 2 })).toBe('home');
    expect(['home', 'room', 'out'].map((s) => actOfStage(s as never))).toEqual([null, 'move', 'take']);
  });

  it('a thing weighs more taken from the poor, less from the rich, and more for its importance; sitting is not about worth', () => {
    const poor = worthOf('take', 6, 0, 'poor', country), rich = worthOf('take', 6, 0, 'rich', country);
    expect(poor).toBeGreaterThan(1);
    expect(rich).toBeLessThan(1);
    expect(worthOf('take', 6, 1, 'poor', country)).toBeCloseTo(poor * 1.5);
    expect(worthOf('sit', 600, 3, 'poor', country)).toBe(1);
    // (Kept within the culture's bounds: a lord's hen is still something.)
    expect(worthOf('take', 0.01, 0, 'rich', country)).toBe(country.worth[0]);
    expect(worthOf('take', 1e6, 0, 'poor', country)).toBe(country.worth[1]);
    expect(weightOf({ act: 'take', owner: { house: 'h' }, worth: 2 }, country, true)).toBe(country.acts.take * 2);
    expect(wealthOf(['human', 'rich'])).toBe('rich');
    expect(wealthOf(['poor'])).toBe('poor');
    expect(wealthOf([])).toBe('common');
  });

  it('giving back restores goodwill only where something was lost; a stray is out of place and in no one\'s hands', () => {
    expect(returnedRegard(-30, false)).toBe(10);
    expect(returnedRegard(-8, false)).toBe(4);
    expect(returnedRegard(20, false)).toBe(0);
    expect(returnedRegard(-30, true)).toBe(3);
    const l = { kind: 'stool', seed: 1, home, at: { x: 5, z: 5, level: 0, house: null, rot: 0 } };
    expect(stray(l, { house: null, room: null })).toBe(true);
    expect(stray({ ...l, mine: true }, { house: null, room: null })).toBe(false);
    expect(stray({ ...l, by: 'wenna' }, { house: null, room: null })).toBe(false);
    expect(stray(l, { house: 'home', room: 0 })).toBe(false);
    expect(turnedHalf(1, 0.4, 0)).toEqual({ hw: 0.5, hd: 0.2 });
    const q = turnedHalf(1, 0.4, Math.PI / 2);
    expect([q.hw, q.hd].map((v) => +v.toFixed(6))).toEqual([0.2, 0.5]);
  });

  it('leave lets you make yourself at home, move things included, but not take them', () => {
    const c = (act: 'move' | 'take' | 'meddle') => mayDo({ owner: { house: 'h' }, act, member: false, leave: true, welcome: null, hour: 12, culture: country });
    expect([c('meddle'), c('move'), c('take')]).toEqual([true, true, false]);
  });
});

describe('the ways to take through talk (B3b)', () => {
  const wenna = (): TalkPerson => {
    const r = PERSON_KINDS.resolve({ is: ['human', 'job-farmer'] });
    return { id: 'wenna', name: 'Wenna', kind: r.facets.people ?? 'human', tags: r.chain, home: 'home' };
  };
  const held = { id: 'home/0/stool', name: 'stool', house: 'home', loan: null as number | null, worth: 1 };
  const ctx = (mood: number, h: typeof held | null = held, nerve?: { afraid: boolean; bold: boolean }): TalkCase => {
    const memory = newTalkMemory();
    memory.social.wenna = { talks: 0, mood };
    return { hero: {}, flags: {}, memory, library: LIBRARY, ...(h ? { holding: h } : {}), ...(nerve ? { nerve } : {}) };
  };
  const ids = (c: TalkCase, p = wenna()) => talkOffers(p, c).map((o) => o.id);
  const roller = (n: number): Doer => ({ id: 'hero', dice: () => ({ n, mod: 0 }) });

  it('holding something of their household\'s: give it back, borrow it, argue for it, threaten for it; not with anyone else', () => {
    expect(ids(ctx(0))).toEqual(expect.arrayContaining([GIVE_BACK, BORROW, CLAIM, DEMAND]));
    expect(ids(ctx(0, null))).not.toContain(GIVE_BACK);
    expect(ids(ctx(0), { ...wenna(), home: 'mill' })).not.toContain(BORROW);
    // (Already lent: no asking again.)
    expect(ids(ctx(0, { ...held, loan: 30 }))).not.toContain(BORROW);
  });

  it('giving back needs no roll; borrowing is a yes from a friend, a no from someone cross, else a roll', () => {
    expect(talk(GIVE_BACK, wenna(), roller(0), ctx(0), Rng.fromSeed(1))).toMatchObject({ success: true, giveBack: held.id });
    expect(talk(BORROW, wenna(), roller(0), ctx(1), Rng.fromSeed(1))).toMatchObject({ success: true, borrow: held.id });
    expect(talk(BORROW, wenna(), roller(9), ctx(-2), Rng.fromSeed(1)).borrow).toBeUndefined();
    const r = talk(BORROW, wenna(), roller(3), ctx(0), Rng.fromSeed(1));
    expect(r.roll).toBeDefined();
    expect(!!r.borrow).toBe(r.success);
  });

  it('argued well, it is yours; argued badly, they think less of you', () => {
    expect(talk(CLAIM, wenna(), roller(12), ctx(0), Rng.fromSeed(1))).toMatchObject({ success: true, given: held.id });
    const c = ctx(0);
    expect(talk(CLAIM, wenna(), roller(1), c, Rng.fromSeed(1)).given).toBeUndefined();
    expect(c.memory.social.wenna.mood).toBe(-1);
  });

  it('a threat that works gets it and costs their liking; one that fails is answered; the bold are harder to frighten', () => {
    const c = ctx(0);
    expect(talk(DEMAND, wenna(), roller(12), c, Rng.fromSeed(1))).toMatchObject({ success: true, given: held.id });
    expect(c.memory.social.wenna.mood).toBe(-1);
    const d = ctx(0);
    expect(talk(DEMAND, wenna(), roller(1), d, Rng.fromSeed(1))).toMatchObject({ success: false, answer: true });
    expect(d.memory.social.wenna.mood).toBe(-2);
    const bold = talk(DEMAND, wenna(), roller(3), ctx(0, held, { afraid: false, bold: true }), Rng.fromSeed(2));
    expect(bold.lines.some((l) => l.text.includes('not easily frightened'))).toBe(true);
  });
});

describe('bringing found things home (B3b)', () => {
  it('who likes order: dwarves, guards; a farmer brings only their own household\'s things', () => {
    expect(orderly(PERSON_KINDS.resolve({ is: ['dwarf'] }).chain)).toBe(true);
    expect(orderly(PERSON_KINDS.resolve({ is: ['human', 'job-guard'] }).chain)).toBe(true);
    expect(orderly(PERSON_KINDS.resolve({ is: ['human', 'job-farmer'] }).chain)).toBe(false);
  });

  it('tidy: walk to it, lift it, carry it home, put it down, and stop', () => {
    const w = new Walking(new NavGrid(80, []), 80, { holding: () => null, byId: () => null, furniture: () => [] });
    let at: Whereabout | null = { x: 6, z: 0, house: null, level: 0 }, by: string | null = null, home = false;
    const acts: Acts = {
      fireOf: () => null, lit: () => false, act: () => ({ done: false, events: [], transgressions: [] }),
      thingAt: () => (by ? null : at), thingHome: () => ({ x: -6, z: 0, house: null, level: 0 }),
      lift: (m) => ((by = m.id), (at = null), true),
      putHome: () => void (home = true),
    };
    const m = newMind('tam', 0, 0, 1);
    m.tidy = { thing: 'home/0/stool' };
    const does = [{ when: { tidying: true }, do: 'tidy' }];
    for (let t = 0; t < 30 && m.tidy; t += 0.1) stepMind(m, does, BEHAVIOURS, { walking: w, places: {}, clock: { hour: 12, events: new Set() }, acts }, 0.1);
    expect(by).toBe('tam');
    expect(home).toBe(true);
    expect(m.tidy).toBeUndefined();
    expect(Math.hypot(m.actor.x + 6, m.actor.z)).toBeLessThan(1.3);
  });
});

describe('hands (plan B8a)', () => {
  const sword = { hands: 1 as const }, greatsword = { hands: 2 as const }, stool = {}, shield = { hands: 1 as const, shield: 'Bucklare' };
  it('a shield goes on the left beside a one-handed weapon, not beside a two-handed one or something in both arms', () => {
    expect(handFor(shield, null, null)).toBe('left');
    expect(handFor(shield, sword, null)).toBe('left');
    expect(handFor(shield, greatsword, null)).toBeNull();
    expect(handFor(shield, stool, null)).toBeNull();
    expect(handFor(shield, null, shield)).toBeNull();
  });
  it('anything else goes in the right; with a shield on, only what takes one hand', () => {
    expect(handFor(sword, null, shield)).toBe('right');
    expect(handFor(greatsword, null, shield)).toBeNull();
    expect(handFor(stool, null, shield)).toBeNull();
    expect(handFor(sword, sword, null)).toBeNull();
    expect(aHandFree(sword, null)).toBe(true);
    expect(aHandFree(sword, shield)).toBe(false);
    expect(aHandFree(null, shield)).toBe(true);
    expect(aHandFree(greatsword, null)).toBe(false);
  });
});
