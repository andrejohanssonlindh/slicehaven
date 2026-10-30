import { type ThingDef, Things } from '../../core/world3d/things';

/**
 * Every kind of thing in the world, one file each in `kinds/` (a file may also hold a small family as an array). A
 * new file there is a new kind: nothing else to edit. See `core/world3d/things.ts` for what a kind can say, and
 * `tests/thing-kinds.test.ts` for what every kind must get right. (A vitest run that misses a brand-new kind file
 * has a stale glob: change this file once (any edit will do) and it sees it.) Buildings are kinds too.
 */
const files = import.meta.glob<{ default: ThingDef | ThingDef[] }>('./kinds/*.ts', { eager: true });

export const THINGS = new Things(Object.values(files).flatMap((m) => [m.default].flat()));
