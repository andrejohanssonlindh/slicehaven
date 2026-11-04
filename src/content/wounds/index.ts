import type { DamageType, WoundTableDef } from '../../core/damage';

/**
 * The serious-wound tables, one file per damage type (cut, crush, thrust, brawl, fall, burn), found by themselves.
 * Mechanics only: each row is the death roll's difficulty and its after-effects in the notation of `WoundRowDef`
 * (`core/damage.ts`); no description from the book. A page can describe a wound from its effects (later, with t()).
 * `tests/damage.test.ts` requires every table to read (`woundTableProblems` empty).
 * (A vitest run that misses a brand-new file has a stale glob: edit this file once.)
 */
const files = import.meta.glob<{ default: WoundTableDef }>('./*.ts', { eager: true });

export const WOUND_TABLES = {} as Record<DamageType, WoundTableDef>;
for (const [path, m] of Object.entries(files)) {
  if (path === './index.ts') continue;
  const t = m.default;
  if (WOUND_TABLES[t.type]) throw new Error(`two wound tables for ${t.type}`);
  WOUND_TABLES[t.type] = t;
}
