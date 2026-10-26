import type { TableId } from '../../../core/chargen/grants';
import type { EventEntry, EventTable } from '../../../core/chargen/types';

/** [d100 low, d100 high, source name, English name, grants, own summary?, roll again?] */
export type Row = [lo: number, hi: number, sv: string, en: string, g: string, note?: string, again?: boolean];

export function table(id: TableId, sv: string, en: string, rows: Row[]): EventTable {
  const entries: EventEntry[] = rows.map(([lo, hi, sv2, en2, g, note, again]) => ({ lo, hi, sv: sv2, en: en2, g, note, again }));
  return { id, sv, en, entries };
}
