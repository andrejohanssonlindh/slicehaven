import { type MapRule, type Side, roadLength, roadPoint, sideNormal } from '../../../core/world3d/mapgen';

/**
 * Torches along a road: a thing (a torch post by default) every `every` metres on one side, `offset` metres past the
 * road's edge. { "rule": "torches", "road": 0, "every": 14, "side": "south", "offset": 1.1 }
 */
const torches: MapRule = {
  id: 'torches',
  about: 'A torch post (or any thing) every so many metres along one side of a road.',
  phase: 'things',
  keys: ['road', 'every', 'side', 'offset', 'kind'],
  expand(use, ctx) {
    const u = use as unknown as { road: number; every: number; side: Side; offset?: number; kind?: string };
    const road = ctx.spec.roads[u.road];
    if (!road) return ctx.problem(`torches: no road ${u.road}`);
    if (!(u.every > 0)) return ctx.problem('torches: "every" must be more than 0 metres');
    const len = roadLength(road);
    for (let s = u.every / 2; s < len; s += u.every) {
      const p = roadPoint(road, s);
      const [nx, nz] = sideNormal(p.tx, p.tz, u.side);
      const d = road.width / 2 + (u.offset ?? 0.9);
      ctx.layout.props.push({ kind: u.kind ?? 'torchpost', x: p.x + nx * d, z: p.z + nz * d, seed: ctx.layout.props.length });
    }
  },
};

export default torches;
