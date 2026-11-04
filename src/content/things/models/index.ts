import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Furniture as 3D models (plan item A2): one file per kind of furniture, named after the kind's id (`table.ts` is the
 * model of `table`), its default export a `FurnitureModel`. A file here replaces that kind's painted card everywhere;
 * nothing else to edit (weapons are here too: a sword on the sand). How to make one: `director/design/models-authoring.md`. (A vitest run that misses a brand-new
 * file has a stale glob: change this file once and it sees it.)
 */
const files = import.meta.glob<{ default: FurnitureModel }>(['./*.ts', '!./index.ts', '!./_*.ts'], { eager: true });

/** Every furniture model, by the id of its kind. */
export const MODELS: Record<string, FurnitureModel> = Object.fromEntries(
  Object.entries(files).map(([path, m]) => [path.replace(/^\.\/|\.ts$/g, ''), m.default]),
);
