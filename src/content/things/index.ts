import { type ThingDef, Things } from '../../core/world3d/things';

/**
 * Every kind of thing in the world, one file each in `kinds/` (a file may also hold a small family as an array). A
 * new file there is a new kind: nothing else to edit. See `core/world3d/things.ts` for what a kind can say, and
 * `tests/thing-kinds.test.ts` for what every kind must get right.
 */
const files = import.meta.glob<{ default: ThingDef | ThingDef[] }>('./kinds/*.ts', { eager: true });

export const THINGS = new Things(Object.values(files).flatMap((m) => [m.default].flat()));
