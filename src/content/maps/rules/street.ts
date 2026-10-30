import type { MapHouse, MapRule, Side } from '../../../core/world3d/mapgen';

/** A house as a street gives it: everything but where it stands (the street places it), and maybe how many of it there may be. */
type Look = Omit<MapHouse, 'at' | 'id'> & { id?: string; max?: number };

/**
 * A street: houses along a road, one every `every` metres from `from` (metres along the road) on each of `sides`.
 * Either the houses are listed (`houses`, with their ids, placed in order: the first spot's sides, then the next) or
 * the street runs to `to` and each house takes the next look from `cycle` (a look with `max` is used that often,
 * then built without its room), named `<id><spot><side's first letter>` ("east3n").
 *
 * { "rule": "street", "id": "east", "road": 0, "from": 4420, "to": 5120, "every": 20, "sides": ["north", "south"], "step": 3, "cycle": [...] }
 */
const street: MapRule = {
  id: 'street',
  about: 'Houses along a road, every so many metres, on one or both sides: listed, or by turns from a list of looks.',
  phase: 'houses',
  keys: ['id', 'road', 'from', 'to', 'every', 'sides', 'gap', 'houses', 'cycle', 'step'],
  expand(use, ctx) {
    const u = use as unknown as {
      id?: string; road: number; from: number; to?: number; every: number; sides?: Side[]; gap?: number;
      houses?: Look[]; cycle?: Look[]; step?: number;
    };
    const where = `street ${u.id ?? ''}`.trim();
    if (!ctx.spec.roads[u.road]) return ctx.problem(`${where}: no road ${u.road}`);
    if (!(u.every > 0)) return ctx.problem(`${where}: "every" must be more than 0 metres`);
    const sides = u.sides ?? ['north', 'south'];
    const at = (k: number, s: number): MapHouse['at'] => ({ road: u.road, m: u.from + k * u.every, side: sides[s], ...(u.gap !== undefined ? { gap: u.gap } : {}) });
    const strip = (l: Look): Omit<MapHouse, 'at' | 'id'> => {
      const { id: _id, max: _max, ...rest } = l;
      return rest;
    };
    if (u.houses) {
      u.houses.forEach((h, i) => {
        if (!h.id) return ctx.problem(`${where}: house ${i + 1} has no id`);
        ctx.houses.push({ ...strip(h), id: h.id, at: at(Math.floor(i / sides.length), i % sides.length) });
      });
      return;
    }
    const cycle = u.cycle ?? [];
    if (!cycle.length || u.to === undefined || !u.id) return ctx.problem(`${where}: needs "houses", or "id", "to" and "cycle"`);
    const used = new Map<Look, number>();
    const step = u.step ?? sides.length;
    for (let m = u.from, k = 0; m < u.to; m += u.every, k++) {
      sides.forEach((side, s) => {
        const look = cycle[(k * step + s) % cycle.length];
        const n = used.get(look) ?? 0;
        used.set(look, n + 1);
        const { room, ...rest } = strip(look);
        // (Past its `max`, a look is built as a plain home: the same house, without the room.)
        ctx.houses.push({ ...rest, ...(room && (look.max === undefined || n < look.max) ? { room } : {}), id: `${u.id}${k}${side[0]}`, at: at(k, s) });
      });
    }
  },
};

export default street;
