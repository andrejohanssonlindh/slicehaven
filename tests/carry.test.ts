import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../src/content/actions';
import { DEFAULT_CULTURE, cultureOf } from '../src/content/cultures';
import { LIBRARY } from '../src/content/skillweb';
import { THINGS } from '../src/content/things';
import { Rng } from '../src/core/rng';
import { type ActTarget, type ActWorld, type Doer, offers, perform } from '../src/core/world3d/actions';
import { actOfStage, carriable, hideable, stageOf, wealthOf, worthOf } from '../src/core/world3d/carry';
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
      if (t.size && t.size !== 'heavy') expect(t.furniture, `${id} can be carried, so it needs a model to be drawn loose`).toBeTruthy();
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
    const bad = perform('verb:slip-away', piece('herbs'), piece('herbs'), { id: 'hero', dice: () => ({ n: 0, mod: 0 }) }, world(), ACTIONS);
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

  it('leave lets you make yourself at home, move things included, but not take them', () => {
    const c = (act: 'move' | 'take' | 'meddle') => mayDo({ owner: { house: 'h' }, act, member: false, leave: true, welcome: null, hour: 12, culture: country });
    expect([c('meddle'), c('move'), c('take')]).toEqual([true, true, false]);
  });
});
