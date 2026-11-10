import type { ActionLibrary, FactDef, GateDef, VerbDef } from '../../core/world3d/actions';
import { FACTS } from './facts';

/**
 * What the action frame runs on (`core/world3d/actions.ts`, design: director/design/actions.md): plain verbs in
 * `verbs/` and gates in `gates/`, one file each, found by themselves; the facts gates ask in `facts.ts`. A new verb is
 * a new file. (A vitest run that misses a brand-new file has a stale glob: edit this file once.) A verb may make a
 * sound (`noise`), heard by those near (plan B5). Taking and carrying (B3b): `pick-up`, `slip-away`, `put-down`, and
 * the gates in `hands.ts`. Choosing from a thing (B8a): `take-from` (a rack's stock), `strike-gong` (call a fighter).
 * The pack (B6): `pack` (a thing straight in), `pack-held` (what you hold).
 */
const verbFiles = import.meta.glob<{ default: VerbDef | VerbDef[] }>('./verbs/*.ts', { eager: true });
const gateFiles = import.meta.glob<{ default: GateDef | GateDef[] }>('./gates/*.ts', { eager: true });

function byId<T extends { id: string }>(items: T[], what: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const x of items) {
    if (out[x.id]) throw new Error(`two ${what} are called ${x.id}`);
    out[x.id] = x;
  }
  return out;
}

const all = <T>(files: Record<string, { default: T | T[] }>): T[] => Object.values(files).flatMap((m) => [m.default].flat() as T[]);

export const ACTIONS: ActionLibrary = {
  verbs: byId(all(verbFiles), 'verbs'),
  gates: byId(all(gateFiles), 'gates'),
  facts: byId<FactDef>(FACTS, 'facts'),
};
