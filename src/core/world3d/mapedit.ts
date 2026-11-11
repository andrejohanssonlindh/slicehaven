import type { CompiledMap, MapNote, MapSpec } from './mapgen';
import type { XZ } from './terrain';

/**
 * Editing a map file (plan C5, the map maker): plain functions from a map and an edit to a new map, the old one left
 * as it was (so undo is keeping the old one). The page `/mapmaker/` calls these; so can a script. Only what is placed
 * by hand is edited here (things, trees, houses at a spot, notes); what a rule makes is changed through the rule.
 * Design: director/design/map-maker.md.
 */

/** Something placed by hand, by its list and place in it. */
export type Pick = { list: 'props' | 'trees' | 'houses' | 'notes'; i: number };

export type MapEdit =
  | { do: 'add-prop'; kind: string; at: XZ; rot?: number; seed?: number }
  | { do: 'add-tree'; kind: string; at: XZ; seed?: number }
  | { do: 'add-note'; at: XZ; text: string; by?: MapNote['by']; r?: number }
  | { do: 'move'; pick: Pick; to: XZ }
  | { do: 'turn'; pick: Pick; by: number }
  | { do: 'remove'; pick: Pick }
  | { do: 'note'; pick: Pick; text?: string; r?: number; done?: boolean };

const round = (v: number, step = 0.1): number => Math.round(v / step) * step;
const spot = ([x, z]: XZ): XZ => [Number(round(x).toFixed(1)), Number(round(z).toFixed(1))];
const turned = (rot: number): number => {
  const r = Math.atan2(Math.sin(rot), Math.cos(rot));
  return Number(r.toFixed(2));
};

/** A fresh id among the notes: n1, n2… */
function noteId(notes: MapNote[]): string {
  let n = notes.length + 1;
  while (notes.some((x) => x.id === `n${n}`)) n++;
  return `n${n}`;
}

/** A seed no hand-placed thing of the map has yet, so a new thing looks its own. */
function freshSeed(spec: MapSpec): number {
  const used = new Set([...(spec.props ?? []), ...(spec.trees ?? [])].map((p) => p.seed ?? 0));
  let s = 1;
  while (used.has(s)) s++;
  return s;
}

/**
 * Apply an edit. `compiled` is the map as built (needed when a house placed along a road is moved or turned: it is
 * pinned to the spot where it stood, and from then on stands there).
 */
export function applyEdit(spec: MapSpec, e: MapEdit, compiled?: CompiledMap): MapSpec {
  const m: MapSpec = structuredClone(spec);
  switch (e.do) {
    case 'add-prop':
      (m.props ??= []).push({ kind: e.kind, x: spot(e.at)[0], z: spot(e.at)[1], rot: turned(e.rot ?? 0), seed: e.seed ?? freshSeed(m) });
      return m;
    case 'add-tree':
      (m.trees ??= []).push({ kind: e.kind, x: spot(e.at)[0], z: spot(e.at)[1], seed: e.seed ?? freshSeed(m) });
      return m;
    case 'add-note': {
      const notes = (m.notes ??= []);
      notes.push({ id: noteId(notes), at: spot(e.at), text: e.text, ...(e.r ? { r: Math.round(e.r) } : {}), by: e.by ?? 'director' });
      return m;
    }
    case 'remove': {
      const list = m[e.pick.list] as unknown[] | undefined;
      if (list && list[e.pick.i] !== undefined) list.splice(e.pick.i, 1);
      if (list && !list.length) delete m[e.pick.list];
      return m;
    }
    case 'note': {
      const n = m.notes?.[e.pick.i];
      if (!n || e.pick.list !== 'notes') return m;
      if (e.text !== undefined) n.text = e.text;
      if (e.r !== undefined) { if (e.r > 0) n.r = Math.round(e.r); else delete n.r; }
      if (e.done !== undefined) { if (e.done) n.done = true; else delete n.done; }
      return m;
    }
    case 'move':
    case 'turn': {
      const { list, i } = e.pick;
      if (list === 'notes') {
        const n = m.notes?.[i];
        if (n && e.do === 'move') n.at = spot(e.to);
        return m;
      }
      if (list === 'houses') {
        const h = m.houses?.[i];
        if (!h) return m;
        const built = compiled?.layout.houses.find((b) => b.id === h.id);
        const at = 'x' in h.at ? { x: h.at.x, z: h.at.z, rot: h.at.rot ?? 0 } : built ? { x: built.x, z: built.z, rot: built.rot } : null;
        if (!at) return m;
        if (e.do === 'move') [at.x, at.z] = spot(e.to);
        else at.rot += e.by;
        h.at = { x: Number(at.x.toFixed(1)), z: Number(at.z.toFixed(1)), rot: turned(at.rot) };
        return m;
      }
      const p = (list === 'props' ? m.props : m.trees)?.[i] as { x: number; z: number; rot?: number } | undefined;
      if (!p) return m;
      if (e.do === 'move') [p.x, p.z] = spot(e.to);
      else p.rot = turned((p.rot ?? 0) + e.by);
      return m;
    }
  }
}

/** Where a hand-placed thing stands (a house along a road: where it was built). */
export function whereIs(spec: MapSpec, pick: Pick, compiled?: CompiledMap): XZ | null {
  switch (pick.list) {
    case 'notes': return spec.notes?.[pick.i]?.at ?? null;
    case 'props': case 'trees': {
      const p = spec[pick.list]?.[pick.i];
      return p ? [p.x, p.z] : null;
    }
    case 'houses': {
      const h = spec.houses?.[pick.i];
      if (!h) return null;
      if ('x' in h.at) return [h.at.x, h.at.z];
      const b = compiled?.layout.houses.find((x) => x.id === h.id);
      return b ? [b.x, b.z] : null;
    }
  }
}

/**
 * The hand-placed thing nearest a spot, within `reach` metres (a house: anywhere on its footprint). Notes first, then
 * things and trees, then houses, so a pin on a roof is still reachable.
 */
export function pickAt(spec: MapSpec, compiled: CompiledMap, at: XZ, reach: number): Pick | null {
  const d = (p: XZ): number => Math.hypot(p[0] - at[0], p[1] - at[1]);
  let best: { pick: Pick; d: number } | null = null;
  const consider = (pick: Pick, dist: number): void => {
    if (dist <= reach && (!best || dist < best.d)) best = { pick, d: dist };
  };
  (spec.notes ?? []).forEach((n, i) => consider({ list: 'notes', i }, d(n.at) * 0.7));
  if (best) return (best as { pick: Pick }).pick;
  (spec.props ?? []).forEach((p, i) => consider({ list: 'props', i }, d([p.x, p.z])));
  (spec.trees ?? []).forEach((t, i) => consider({ list: 'trees', i }, d([t.x, t.z])));
  if (best) return (best as { pick: Pick }).pick;
  (spec.houses ?? []).forEach((h, i) => {
    const b = compiled.layout.houses.find((x) => x.id === h.id);
    if (!b) return;
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    const dx = at[0] - b.x, dz = at[1] - b.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) <= b.spec.width / 2 + reach * 0.3 && Math.abs(lz) <= b.spec.depth / 2 + reach * 0.3) consider({ list: 'houses', i }, 0);
  });
  return best ? (best as { pick: Pick }).pick : null;
}

/** What a hand-placed thing is, in a few words (its kind, or a note's first words). */
export function pickLabel(spec: MapSpec, pick: Pick): string {
  switch (pick.list) {
    case 'notes': return spec.notes?.[pick.i]?.text.slice(0, 40) ?? '';
    case 'props': return spec.props?.[pick.i]?.kind ?? '';
    case 'trees': return spec.trees?.[pick.i]?.kind ?? 'oak';
    case 'houses': {
      const h = spec.houses?.[pick.i];
      return h ? `${h.id} (${h.plan ?? h.room ?? 'home'})` : '';
    }
  }
}

/**
 * A map as its file is written: the top-level keys one to a line, and each entry of a list (a thing, a house, a note)
 * on a line of its own, so a change shows as one line in a diff.
 */
export function mapToJson(spec: MapSpec): string {
  const inline = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
    if (v && typeof v === 'object') {
      const e = Object.entries(v).filter(([, x]) => x !== undefined);
      return e.length ? `{ ${e.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}';
    }
    return JSON.stringify(v);
  };
  const lines = Object.entries(spec).map(([k, v]) => {
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === 'object' && x !== null && !Array.isArray(x)))
      return `  ${JSON.stringify(k)}: [\n${v.map((x) => `    ${inline(x)}`).join(',\n')}\n  ]`;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'object'))
      return `  ${JSON.stringify(k)}: {\n${Object.entries(v).map(([a, b]) => `    ${JSON.stringify(a)}: ${inline(b)}`).join(',\n')}\n  }`;
    return `  ${JSON.stringify(k)}: ${inline(v)}`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}
