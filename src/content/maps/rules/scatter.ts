import type { Area, MapRule } from '../../../core/world3d/mapgen';
import { shapeDist } from '../../../core/world3d/space';

/**
 * Scatter: `count` of a kind dropped at seeded spots in an area, wherever there is room (off roads and water, clear of
 * houses and of what is already there by each thing's `keepClear` plus `gap`). A kind of tree may take a `mix` of
 * kinds, one drawn for each. What does not fit is reported.
 * { "rule": "scatter", "kind": "tree", "count": 70, "area": { "ring": [0, 0, 40, 64] }, "mix": ["oak", "pine"] }
 */
const scatter: MapRule = {
  id: 'scatter',
  about: 'A number of trees, bushes or rocks dropped wherever there is room in an area.',
  phase: 'things',
  keys: ['kind', 'count', 'area', 'gap', 'mix'],
  expand(use, ctx) {
    const u = use as unknown as { kind: string; count: number; area: Area; gap?: number; mix?: string[] };
    const { things, rng, half, edge, layout } = ctx;
    for (const k of [u.kind, ...(u.mix ?? [])]) if (!things.has(k)) return ctx.problem(`scatter: no kind of thing called ${k}`);
    const kind = things.get(u.kind);
    const isTree = !!kind.tree || kind.chain.includes('tree');
    const keep = (k: string): number => (things.has(k) ? things.get(k).keepClear ?? 0.5 : 0.5);
    const placed: { x: number; z: number; r: number }[] = [
      ...layout.trees.map((t) => ({ x: t.x, z: t.z, r: keep(t.kind ?? 'oak') })),
      ...layout.props.map((p) => ({ x: p.x, z: p.z, r: keep(p.kind) })),
    ];
    const pick = spotIn(u.area, () => rng.next(), half - edge);
    const own = keep(u.kind);
    const r = own + (u.gap ?? (isTree ? 2.6 : 0.8));
    let got = 0;
    for (let tries = 0; got < u.count && tries < u.count * 80; tries++) {
      const [x, z] = pick();
      if (Math.abs(x) > half - edge || Math.abs(z) > half - edge) continue;
      if (ctx.lakeD(x, z) < 1.6 || ctx.roadD(x, z) < 1.4) continue;
      if (ctx.boxes.some((b) => shapeDist(b, x, z) < (isTree ? 2.4 : 1.2))) continue;
      if (placed.some((o) => Math.hypot(o.x - x, o.z - z) < r + o.r)) continue;
      placed.push({ x, z, r: own });
      got++;
      if (isTree) {
        const seed = 1 + Math.floor(rng.next() * 60);
        // The kind is drawn only when asked for, so maps without a mix place exactly what they always did.
        if (u.mix?.length) layout.trees.push({ x, z, seed, kind: u.mix[Math.floor(rng.next() * u.mix.length)] });
        else layout.trees.push(kind.abstract ? { x, z, seed } : { x, z, seed, kind: u.kind });
      } else layout.props.push({ kind: u.kind, x, z, seed: 1 + Math.floor(rng.next() * 60), size: 0.8 + rng.next() * 0.5 });
    }
    if (got < u.count) ctx.problem(`scatter ${u.kind}: only room for ${got} of ${u.count}`);
  },
};

/** A seeded spot in an area (`all`: anywhere `inner` from the middle). */
function spotIn(a: Area, next: () => number, inner: number): () => [number, number] {
  if ('circle' in a) return () => {
    const r = a.circle[2] * Math.sqrt(next()), t = next() * Math.PI * 2;
    return [a.circle[0] + Math.cos(t) * r, a.circle[1] + Math.sin(t) * r];
  };
  if ('rect' in a) return () => [a.rect[0] + next() * (a.rect[2] - a.rect[0]), a.rect[1] + next() * (a.rect[3] - a.rect[1])];
  if ('ring' in a) return () => {
    const [cx, cz, r0, r1] = a.ring;
    const r = Math.sqrt(r0 * r0 + next() * (r1 * r1 - r0 * r0)), t = next() * Math.PI * 2;
    return [cx + Math.cos(t) * r, cz + Math.sin(t) * r];
  };
  return () => [(next() * 2 - 1) * inner, (next() * 2 - 1) * inner];
}

export default scatter;
