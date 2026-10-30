import type { DoEntry } from '../../../core/world3d/behave';
import type { MapRule } from '../../../core/world3d/mapgen';

/**
 * A crowd: `count` people sharing one schedule, each a kind from `kinds` in turn (a list of what they are, as a
 * person's `is`), living in `homes` in turn, with their own seed. Named `<id><n>`. Fills a square at market time,
 * a hanging at noon, a camp with soldiers.
 * { "rule": "crowd", "id": "towns", "count": 12, "kinds": [["human", "job-farmer"], ["dwarf", "job-miller"]],
 *   "homes": ["home1", "home2"], "does": [{ "when": { "hours": [8, 19] }, "do": "wander", "in": "green" }, { "do": "home" }] }
 */
const crowd: MapRule = {
  id: 'crowd',
  about: 'A number of people sharing one schedule, of kinds and homes taken in turn.',
  phase: 'houses',
  keys: ['id', 'count', 'kinds', 'homes', 'does', 'seed', 'at'],
  expand(use, ctx) {
    const u = use as unknown as { id: string; count: number; kinds: string[][]; homes?: string[]; does: DoEntry[]; seed?: number; at?: string };
    if (!u.id || !(u.count > 0) || !u.kinds?.length || !u.does) return ctx.problem(`crowd ${u.id ?? ''}: needs "id", "count", "kinds" and "does"`.replace('  ', ' '));
    for (let n = 0; n < u.count; n++) {
      ctx.people.push({
        id: `${u.id}${n}`,
        is: u.kinds[n % u.kinds.length],
        seed: (u.seed ?? 100) + n * 7,
        ...(u.homes?.length ? { home: u.homes[n % u.homes.length] } : {}),
        ...(u.at ? { at: u.at } : {}),
        // (The same list for all, so they are numbered as one crowd and spread out.)
        does: u.does,
      });
    }
  },
};

export default crowd;
