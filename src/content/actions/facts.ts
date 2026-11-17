import type { FactDef } from '../../core/world3d/actions';

/**
 * Facts about a spot that gates and rolls ask: true or false there. A gate names them (`place`: "not among the
 * houses"), and a roll can be harder where one holds (rain on an outdoor fire). A new fact is an entry here.
 */
export const FACTS: FactDef[] = [
  {
    id: 'indoors',
    about: 'Inside a house.',
    holds: (at) => at.house !== null,
    whenTrue: 'Not indoors.',
    whenFalse: 'Only indoors.',
  },
  {
    id: 'raining',
    about: 'Out of doors, in rain.',
    holds: (at, view) => at.house === null && view.rain > 0.3,
    whenTrue: 'Not in this rain.',
    whenFalse: 'Only in the rain.',
  },
  {
    // A settlement by intent rather than drawn bounds: where houses stand close, it is the village. Maps that draw a
    // palisade or a town line can make this sharper later.
    id: 'inSettlement',
    about: 'Among houses: three or more within 20 m.',
    holds: (at, view) => view.housesNear(at.x, at.z, 20) >= 3,
    whenTrue: 'Not here, among the houses: folk would not thank you for a fire in the street.',
    whenFalse: 'Only among the houses.',
  },
  {
    // A fire put out by smothering keeps embers (`embers`, set by `putout`); lit again, they're gone. They don't cool
    // with time yet: that waits for days on the clock (the calendar, plan C2).
    id: 'embers',
    about: 'The fire acted on still has embers in it.',
    holds: (_at, _view, target, world) => !!target && !!world && world.states.has(target.kind, 'embers') && world.states.get(target.id, target.kind, 'embers') === true,
    whenTrue: 'Not while there are embers.',
    whenFalse: 'Only where there are embers.',
  },
  {
    id: 'blazing',
    about: 'The thing acted on burns with three dice or more (plan B7).',
    holds: (_at, _view, target, world) => !!target && !!world && world.states.has(target.kind, 'burning') && Number(world.states.get(target.id, target.kind, 'burning')) >= 3,
    whenTrue: 'Not while it blazes.',
    whenFalse: 'Only once it blazes.',
  },
  {
    // A bucket of water in the hands (a kind that `douses`).
    id: 'carrying-water',
    about: 'The doer holds something that brings water against a fire (a bucket).',
    holds: (_at, _view, _target, world, doer) => {
      const k = doer && world?.holding?.(doer.id);
      return !!k && !!world && world.things.has(k) && (world.things.get(k).douses ?? 0) > 0;
    },
    whenTrue: 'Not with water in your hands.',
    whenFalse: 'Only with water at hand.',
  },
  {
    id: 'bulky',
    about: 'The thing acted on is bag-sized (not a pocket\'s worth): harder to hide (plan B3b).',
    holds: (_at, _view, target, world) => !!target && !!world && world.things.get(target.kind).size === 'bag',
    whenTrue: 'Not something this big.',
    whenFalse: 'Only something bag-sized.',
  },
  {
    id: 'watched',
    about: 'Someone of the map sees the hero now.',
    holds: (_at, view) => (view.watchers ?? 0) > 0,
    whenTrue: 'Not while anyone is watching.',
    whenFalse: 'Only with someone watching.',
  },
  {
    id: 'dark',
    about: 'Night (before six or after eight in the evening).',
    holds: (_at, view) => view.hour < 6 || view.hour >= 20,
    whenTrue: 'Not in the dark.',
    whenFalse: 'Only after dark.',
  },
];
