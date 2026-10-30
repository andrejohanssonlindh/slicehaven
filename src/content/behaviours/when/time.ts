import type { Condition } from '../../../core/world3d/behave';

/**
 * Conditions on the time and on what is going on. A schedule line holds when every condition in its `when` does:
 * { "when": { "hours": [9, 17] } }, { "when": { "event": "hanging" } }, { "when": { "hours": [20, 6], "notEvent": "curfew" } }.
 */

const hourPair = (v: unknown): string | null =>
  Array.isArray(v) && v.length === 2 && v.every((h) => typeof h === 'number' && h >= 0 && h <= 24) ? null : 'give [from, to] in hours, 0 to 24';

const name = (v: unknown): string | null => (typeof v === 'string' && v ? null : 'give the name of an event');

const conditions: Condition[] = [
  {
    id: 'hours',
    about: 'Between two hours of the day ([20, 6] runs past midnight).',
    check: hourPair,
    holds(v, clock) {
      const [a, b] = v as [number, number];
      return a <= b ? clock.hour >= a && clock.hour < b : clock.hour >= a || clock.hour < b;
    },
  },
  {
    id: 'event',
    about: 'While an event is running (scheduled in the map, or started by a script).',
    check: name,
    holds: (v, clock) => clock.events.has(String(v)),
  },
  {
    id: 'notEvent',
    about: 'While an event is not running.',
    check: name,
    holds: (v, clock) => !clock.events.has(String(v)),
  },
];

export default conditions;
