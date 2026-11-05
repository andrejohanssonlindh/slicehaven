import { type Motion, libraryProblems } from '../../core/world3d/motion';

/**
 * Every motion (plan B8g; rules `core/world3d/motion.ts`), one file each in this folder, found by itself. A file's
 * default export is a motion or a small family of them (an array). Its id is the file's name, or for a family its
 * own. A new motion: a new file; check it on `/models/` (Motions).
 */
const files = import.meta.glob<{ default: Motion | Motion[] }>('./*.ts', { eager: true });

export const MOTIONS: Record<string, Motion> = {};
for (const [path, mod] of Object.entries(files)) {
  if (path === './index.ts') continue;
  for (const m of [mod.default].flat()) {
    if (MOTIONS[m.id]) throw new Error(`two motions are called ${m.id}`);
    MOTIONS[m.id] = m;
  }
}

/** What is wrong with the motions (the tests require none). */
export const motionLibraryProblems = (): string[] => libraryProblems(MOTIONS);
