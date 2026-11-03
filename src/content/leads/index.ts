import type { LeadDef } from '../../core/world3d/leads';

/**
 * Leads, one file each (plan B11; the rules are `core/world3d/leads.ts`, the shape and the lead note are in
 * director/design/talk-openings.md). A new file is a new lead, found by itself. A placed thing carries one with
 * `"lead": "<id>"` on the map's prop; an action gives one with the outcome `{ lead: id }`; an answer hands over the
 * next with `next`. (A vitest run that misses a brand-new file has a stale glob: edit this file once.)
 */
const files = import.meta.glob<{ default: LeadDef }>('./*.ts', { eager: true });

export const LEADS: Record<string, LeadDef> = {};
for (const [path, m] of Object.entries(files)) {
  if (path === './index.ts') continue;
  const d = m.default;
  if (LEADS[d.id]) throw new Error(`two leads are called ${d.id}`);
  LEADS[d.id] = d;
}
