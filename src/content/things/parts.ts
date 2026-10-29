import type { MeshData } from '../../core/world3d/mesh';
import type { PropParts } from '../../core/world3d/propsMore';
import type { ThingMaterial, ThingParts } from '../../core/world3d/things';

/** One mesh in one material. */
export const solid = (material: ThingMaterial, mesh: MeshData): ThingParts => ({ meshes: [{ material, mesh }] });

/** A mesh builder's parts (wood, stone, hay, cloth) as a thing's look; `wood` says what its timber is drawn as. */
export function fromParts(p: PropParts, wood: ThingMaterial = 'plank'): ThingParts {
  const meshes: ThingParts['meshes'] = [];
  if (p.wood) meshes.push({ material: wood, mesh: p.wood });
  if (p.stone) meshes.push({ material: 'stone', mesh: p.stone });
  if (p.hay) meshes.push({ material: 'hay', mesh: p.hay });
  for (const c of p.cloth ?? []) meshes.push({ material: 'cloth', mesh: c.mesh, colour: c.colour });
  return { meshes };
}
