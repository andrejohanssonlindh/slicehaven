import type { TableId } from '../../core/chargen/grants';
import type { EventTable } from '../../core/chargen/types';
import { BATTLES } from './events/battles';
import { FRIENDS } from './events/friends';
import { INTRIGUES } from './events/intrigues';
import { MIRACLES } from './events/miracles';
import { SORCERY } from './events/sorcery';
import { STUDIES } from './events/studies';
import { TRAVELS } from './events/travels';

/** The event tables (d100). Each result's grants follow the book; summaries are our own. */
export const EVENT_TABLES: Partial<Record<TableId, EventTable>> = {
  fa: TRAVELS,
  ii: INTRIGUES,
  mu: MIRACLES,
  sd: BATTLES,
  sl: STUDIES,
  th: SORCERY,
  vf: FRIENDS,
};

/** Tables a player may pick for an "any table" roll (Friends & Foes is only reached through results). */
export const PICKABLE_TABLES: TableId[] = ['fa', 'ii', 'mu', 'sd', 'sl', 'th'];
