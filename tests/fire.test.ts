import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeFlame, makeOrb } from '../src/engine3d/fire';

/** Flames and orbs are made and taken down all the time (torches streaming, campfires, the hand torch): each lets go of what it holds. */
describe('flames', () => {
  for (const [name, make] of [['flame', () => makeFlame(0.4, 10, 3)], ['orb', () => makeOrb(1.8)]] as const) {
    it(`a ${name} disposes its geometry and its material`, () => {
      const fx = make();
      const mesh = fx.object as THREE.InstancedMesh;
      const gone: string[] = [];
      mesh.geometry.addEventListener('dispose', () => gone.push('geometry'));
      (mesh.material as THREE.Material).addEventListener('dispose', () => gone.push('material'));
      fx.dispose();
      expect(gone.sort()).toEqual(['geometry', 'material']);
    });
  }
});
