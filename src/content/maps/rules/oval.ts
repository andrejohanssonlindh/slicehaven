import type { MapRule } from '../../../core/world3d/mapgen';

/**
 * An oval enclosure: a wall (a kind of run, `palisade` by default) round an ellipse, in pieces about `every` metres
 * long, with gaps where the gates go, and the floor inside trodden bare (`floor`: stamps mud, the map's packed earth).
 * Angles are degrees, 0 east, 90 south (the way +z runs). `posts` is a kind set either side of every gap.
 * { "rule": "oval", "at": [0, 0], "rx": 15, "rz": 7.5, "every": 3, "gaps": [{ "at": 0, "width": 3.4 }, { "at": 180, "width": 3.4 }], "floor": true, "posts": "torchpost" }
 */
const oval: MapRule = {
  id: 'oval',
  about: 'A wall round an ellipse with gaps for gates, and bare earth inside.',
  phase: 'things',
  keys: ['at', 'rx', 'rz', 'every', 'kind', 'gaps', 'floor', 'posts'],
  expand(use, ctx) {
    const u = use as unknown as {
      at?: [number, number]; rx: number; rz: number; every?: number; kind?: string;
      gaps?: { at: number; width: number }[]; floor?: boolean; posts?: string;
    };
    const [cx, cz] = u.at ?? [0, 0];
    const kind = u.kind ?? 'palisade';
    if (!(u.rx > 0 && u.rz > 0)) return ctx.problem('oval: "rx" and "rz" must be more than 0 metres');
    if (!ctx.things.has(kind)) return ctx.problem(`oval: no kind of thing called ${kind}`);
    if (u.posts && !ctx.things.has(u.posts)) return ctx.problem(`oval: no kind of thing called ${u.posts}`);
    const rad = (d: number): number => (d * Math.PI) / 180;
    const pt = (a: number): [number, number] => [cx + Math.cos(a) * u.rx, cz + Math.sin(a) * u.rz];
    const gaps = (u.gaps ?? []).map((g) => ({ p: pt(rad(g.at)), r: g.width / 2, a: rad(g.at) }));

    // Perimeter by Ramanujan's approximation, then equal steps of the angle.
    const h = ((u.rx - u.rz) / (u.rx + u.rz)) ** 2;
    const perimeter = Math.PI * (u.rx + u.rz) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    const n = Math.max(6, Math.round(perimeter / (u.every ?? 3)));
    const run = ctx.things.get(kind).len !== undefined;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const [x0, z0] = pt(a0), [x1, z1] = pt(a1);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (gaps.some((g) => Math.hypot(mx - g.p[0], mz - g.p[1]) < g.r)) continue;
      const seed = ctx.layout.props.length + 1;
      if (run) ctx.layout.props.push({ kind, x: mx, z: mz, rot: Math.atan2(-(z1 - z0), x1 - x0), len: Math.hypot(x1 - x0, z1 - z0) + 0.1, seed });
      else ctx.layout.props.push({ kind, x: mx, z: mz, seed });
    }
    // A post either side of each gap, on the wall, along its way.
    for (const g of u.posts ? gaps : []) {
      for (const s of [-1, 1]) {
        // Walk along the ellipse from the gap's middle until `r` metres away.
        let a = g.a;
        while (Math.hypot(pt(a)[0] - g.p[0], pt(a)[1] - g.p[1]) < g.r + 0.2 && Math.abs(a - g.a) < Math.PI) a += s * 0.01;
        const [x, z] = pt(a);
        ctx.layout.props.push({ kind: u.posts!, x, z, seed: ctx.layout.props.length + 1 });
      }
    }
    // The floor: patches of trodden earth over the inside.
    if (u.floor) {
      const step = 2.2;
      for (let x = -u.rx; x <= u.rx; x += step) for (let z = -u.rz; z <= u.rz; z += step) {
        if ((x / u.rx) ** 2 + (z / u.rz) ** 2 <= 0.8) ctx.mud.push({ x: cx + x, z: cz + z, r: 2.4 });
      }
    }
  },
};

export default oval;
