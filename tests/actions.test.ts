import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../src/content/actions';
import { LIBRARY } from '../src/content/skillweb';
import { THINGS } from '../src/content/things';
import { defaultHero } from '../src/content/rollables';
import { diceOf } from '../src/core/hero';
import { Rng } from '../src/core/rng';
import { type ActTarget, type ActWorld, type Doer, type Spot, libraryProblems, offers, perform } from '../src/core/world3d/actions';
import { ThingStates, pieceId } from '../src/core/world3d/state';

const hero = defaultHero();
const doer: Doer = { id: 'hero', dice: (s) => diceOf(hero, s) };
const nobody: Doer = { id: 'nobody', dice: () => ({ n: 0, mod: 0 }) };

function world(over: Partial<ActWorld['view']> = {}, seed = 1): ActWorld {
  return {
    things: THINGS, states: new ThingStates(THINGS), flags: {}, rng: Rng.fromSeed(seed), library: LIBRARY,
    view: { rain: 0, hour: 12, housesNear: () => 0, ...over },
  };
}

const hearth: ActTarget = { id: pieceId('home', 0, 'hearth'), kind: 'hearth', x: 0, z: 0, level: 0, house: 'home' };
const torch: ActTarget = { id: 'torchpost@10,10', kind: 'torchpost', x: 1, z: 1, level: 0, house: null };
const stool: ActTarget = { id: pieceId('home', 0, 'stool'), kind: 'stool', x: 0, z: 1, level: 0, house: 'home', rot: 0 };
const out: Spot = { x: 30, z: 30, level: 0, house: null };

describe('the action frame', () => {
  it('has no problems in its library', () => {
    expect(libraryProblems(ACTIONS, THINGS)).toEqual([]);
  });

  it('offers putting out a burning fire, and lighting it only once it is out (a state gate hides the other)', () => {
    const w = world();
    const ids = (t: ActTarget): string[] => offers(t, t, doer, w, ACTIONS).map((o) => o.id);
    expect(ids(hearth)).toContain('verb:putout');
    expect(ids(hearth)).not.toContain('verb:light');
    w.states.set(hearth.id, hearth.kind, 'lit', false);
    expect(ids(hearth)).toContain('verb:light');
    expect(ids(hearth)).not.toContain('verb:putout');
  });

  it('puts a fire out with no roll, in a minute', () => {
    const w = world();
    const r = perform('verb:putout', hearth, hearth, doer, w, ACTIONS);
    expect(r.done).toBe(true);
    expect(r.roll).toBeUndefined();
    expect(w.states.get(hearth.id, 'hearth', 'lit')).toBe(false);
    expect(r.events).toContainEqual({ kind: 'time', minutes: 1 });
    expect(r.events.some((e) => e.kind === 'say' && e.line.text.includes('hearth'))).toBe(true);
  });

  it('lights a fire with a Survival roll, and ten minutes pass whether or not it takes', () => {
    let lit = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const w = world({}, seed);
      w.states.set(torch.id, torch.kind, 'lit', false);
      const r = perform('verb:light', torch, torch, doer, w, ACTIONS);
      expect(r.done).toBe(true);
      expect(r.skill).toBe('Vildmarksvana');
      expect(r.roll?.target).toBe(6);
      expect(r.events).toContainEqual({ kind: 'time', minutes: 10 });
      expect(w.states.get(torch.id, torch.kind, 'lit')).toBe(r.success);
      if (r.success) lit++;
    }
    // The shepherd's Survival against an easy 6 takes nearly always, but not always.
    expect(lit).toBeGreaterThan(30);
  });

  it('is harder in the rain out of doors, and easier indoors whatever the weather', () => {
    const wet = world({ rain: 0.8 });
    wet.states.set(torch.id, torch.kind, 'lit', false);
    wet.states.set(hearth.id, hearth.kind, 'lit', false);
    expect(perform('verb:light', torch, torch, doer, wet, ACTIONS).roll?.target).toBe(10);
    const r = perform('verb:light', hearth, hearth, doer, wet, ACTIONS);
    expect(r.roll?.target).toBe(4);
    expect(r.events.some((e) => e.kind === 'say' && /Easier: indoors/.test(e.line.text))).toBe(true);
  });

  it('a fire put out keeps its embers, which make it much easier to light; lit, they are gone', () => {
    const w = world();
    perform('verb:putout', hearth, hearth, doer, w, ACTIONS);
    expect(w.states.get(hearth.id, 'hearth', 'embers')).toBe(true);
    let r = perform('verb:light', hearth, hearth, doer, w, ACTIONS);
    for (let k = 0; !r.success && k < 10; k++) r = perform('verb:light', hearth, hearth, doer, w, ACTIONS);
    expect(r.roll?.target).toBe(2);
    expect(w.states.get(hearth.id, 'hearth', 'embers')).toBe(false);
  });

  it('fails without the skill, and says so', () => {
    const w = world();
    w.states.set(hearth.id, hearth.kind, 'lit', false);
    const r = perform('verb:light', hearth, hearth, nobody, w, ACTIONS);
    expect(r.done).toBe(true);
    expect(r.success).toBe(false);
    expect(w.states.get(hearth.id, 'hearth', 'lit')).toBe(false);
  });

  it('without the skill, the fitting attribute at −2D6 (the rules\' fallback)', () => {
    const plain: Doer = { id: 'farmer', dice: (s) => (s === 'attr:Förflyttning' ? { n: 3, mod: 0 } : { n: 0, mod: 0 }) };
    const w = world();
    w.states.set(hearth.id, hearth.kind, 'lit', false);
    const r = perform('verb:light', hearth, hearth, plain, w, ACTIONS);
    expect(r.skill).toBe('attr:Förflyttning');
    expect(r.roll?.dice).toEqual({ n: 1, mod: 0 });
    expect(r.events.some((e) => e.kind === 'say' && /attribute/.test(e.line.text))).toBe(true);
  });

  it('refuses a requirement with its reason and changes nothing: no fire indoors or among the houses', () => {
    const inside: Spot = { x: 0, z: 0, level: 0, house: 'home' };
    const r = perform('verb:makefire', null, inside, doer, world(), ACTIONS);
    expect(r.done).toBe(false);
    expect(r.reason).toBe('Not indoors.');
    expect(r.events).toEqual([]);
    const town = perform('verb:makefire', null, out, doer, world({ housesNear: () => 5 }), ACTIONS);
    expect(town.done).toBe(false);
    expect(town.reason).toMatch(/among the houses/);
  });

  it('makes a campfire out in the wild', () => {
    expect(offers(null, out, doer, world(), ACTIONS).map((o) => o.id)).toContain('verb:makefire');
    let made = false;
    for (let seed = 1; seed <= 5 && !made; seed++) {
      const r = perform('verb:makefire', null, out, doer, world({}, seed), ACTIONS);
      made = r.events.some((e) => e.kind === 'make' && e.thing === 'campfire');
    }
    expect(made).toBe(true);
  });

  it('seats you on anything with a seat, and offers no sitting on a hearth', () => {
    const w = world();
    expect(offers(stool, stool, doer, w, ACTIONS).map((o) => o.id)).toContain('verb:sit');
    expect(offers(hearth, hearth, doer, w, ACTIONS).map((o) => o.id)).not.toContain('verb:sit');
    expect(perform('verb:sit', stool, stool, doer, w, ACTIONS).events).toContainEqual({ kind: 'sit', target: stool });
  });

  it('offers the skill library\'s hooks on the kind\'s chain, and resolves them with one roll', () => {
    const w = world();
    const chest: ActTarget = { id: pieceId('home', 0, 'footlocker'), kind: 'footlocker', x: 0, z: 0, level: 0, house: 'home' };
    const o = offers(chest, chest, doer, w, ACTIONS);
    const search = o.find((x) => x.id === 'hook:search-container');
    expect(search?.from).toBe('skill');
    expect(search?.label).toBe('Search the footlocker');
    const r = perform(search!.id, chest, chest, doer, w, ACTIONS);
    expect(r.done).toBe(true);
    expect(r.roll).toBeDefined();
    expect(r.events.some((e) => e.kind === 'say')).toBe(true);
  });

  it('a stub owner lets everything through, and nothing is a transgression yet', () => {
    const r = perform('verb:putout', hearth, hearth, doer, world(), ACTIONS);
    expect(r.transgressions).toEqual([]);
  });
});
