import * as THREE from 'three';
import { THINGS } from '../../content/things';
import type { PlacedProp } from '../../core/world3d/props';
import { placedId } from '../../core/world3d/state';
import { thingGroup, thingMaterial } from '../things';
import { lumpGeometry } from './trees';
import type { Standing, Tagged } from './types';
import type { SpikeWorld } from './index';

/**
 * Props: anything a map places outdoors that isn't a tree or a house (a well, a statue, a torch post, a rack of weapons,
 * a campfire), drawn as its kind says (`content/things/kinds/`, its model in `content/things/models/`). A prop with a
 * `flame` carries a torch; one fixed to a house (`on`) hides with the house's cut-away.
 */

export class Props {
  /** Things fixed to a house (a door torch, its flame), by the house's id: hidden while the hero is inside it (see `step`). */
  readonly fixedTo = new Map<THREE.Object3D, string>();

  constructor(private readonly w: SpikeWorld) {}

  /** A placed thing, standing on the ground where it is placed (or at height `y`), as part of the chunk `st`. */
  build(p: PlacedProp, st: Standing, y = this.w.store.heightAt(p.x, p.z)): void {
    const w = this.w;
    // (Something the map laid here that has been picked up since is drawn where it is now: `Carrying.drawLoose`.)
    if (w.carry.loose[placedId(p)]) return;
    const kind = THINGS.get(p.kind), parts = THINGS.parts(p);
    const group = thingGroup(parts);
    if (parts.lumps) {
      const { lumps, material } = parts.lumps;
      const m = new THREE.Mesh(lumpGeometry(lumps.clumps, 1), thingMaterial(material));
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    group.scale.setScalar(p.size ?? 1);
    group.rotation.y = p.rot ?? 0;
    group.position.set(p.x, y - (kind.sink ?? 0), p.z);
    w.scene.add(group);
    st.objects.push(group);
    const torch = kind.flame ? w.lights.placeTorch(p.x, y + kind.flame.y * (p.size ?? 1), p.z, st, kind.flame) : null;
    if (p.on) {
      this.fixedTo.set(group, p.on);
      if (torch) this.fixedTo.set(torch.flame, p.on);
    }
    const id = placedId(p);
    group.userData.thing = { id, kind: p.kind, house: null, level: 0, rot: p.rot ?? 0 } satisfies Tagged;
    // A flame that can be put out follows its thing's `lit` state.
    if (torch && kind.states?.lit) w.lights.addPlacedFire(id, p.kind, torch);
  }

  /** What is fixed to the outside of the house the hero is in (its door torch) goes with the cut-away: not logical, but the room reads better. */
  step(): void {
    const w = this.w, out = w.lights.outFlames;
    for (const [o, id] of this.fixedTo) o.visible = !out.has(o) && !w.houses.some((hs) => hs.open && hs.built.place.id === id);
  }
}
