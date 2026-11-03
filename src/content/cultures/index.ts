import type { CultureDef } from '../../core/world3d/standing';

/**
 * How places weigh what is done in them (plan B3c; the rules are `core/world3d/standing.ts`): one file each, found by
 * itself. A map names its own with `"culture": "<id>"`; one that doesn't gets `DEFAULT_CULTURE`. Balance data: edit
 * freely. (A vitest run that misses a brand-new file has a stale glob: edit this file once.)
 */
const files = import.meta.glob<{ default: CultureDef }>('./*.ts', { eager: true });

export const CULTURES: Record<string, CultureDef> = {};
for (const [path, m] of Object.entries(files)) {
  if (path === './index.ts') continue;
  const d = m.default;
  if (CULTURES[d.id]) throw new Error(`two cultures are called ${d.id}`);
  CULTURES[d.id] = d;
}

/** The culture of a map that names none. */
export const DEFAULT_CULTURE = 'country';

export const cultureOf = (id: string | null | undefined): CultureDef => CULTURES[id ?? DEFAULT_CULTURE] ?? CULTURES[DEFAULT_CULTURE];
