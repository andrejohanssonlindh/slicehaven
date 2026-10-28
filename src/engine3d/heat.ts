import * as THREE from 'three';
import { ASPECTS, type AspectId } from '../core/filaments';
import { CHUNK, type ChunkTerrain } from '../core/world3d/chunks';
import { FCELL, type FilamentField } from '../core/world3d/filaments3d';

/**
 * The filament heat map: for one aspect, a see-through colour over the ground,
 * one square per field cell (20 × 20 to a chunk). Strong is the aspect's own
 * colour, weak is a cold dark; "normal" is clear. It shares the chunk's mesh
 * and sits just above it.
 */

const N = CHUNK / FCELL;
const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const COLORS = Object.fromEntries(ASPECTS.map((a) => [a.id, hex(a.color)])) as Record<AspectId, [number, number, number]>;
const WEAK: [number, number, number] = [30, 22, 60];

export interface Heat {
  mesh: THREE.Mesh;
  tex: THREE.DataTexture;
  /** Fill the texture from the field for this aspect. */
  paint(field: FilamentField, aspect: AspectId): void;
  dispose(): void;
}

export function makeHeat(c: ChunkTerrain, geometry: THREE.BufferGeometry): Heat {
  const data = new Uint8Array(N * N * 4);
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // Mesh UVs are world metres; this texture covers the chunk.
  tex.repeat.set(1 / CHUNK, 1 / CHUNK);
  tex.offset.set(-c.x0 / CHUNK, -c.z0 / CHUNK);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.renderOrder = 1;
  return {
    mesh,
    tex,
    paint(field, aspect) {
      const col = COLORS[aspect];
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const level = field.readAt(c.x0 + (i + 0.5) * FCELL, c.z0 + (j + 0.5) * FCELL)[aspect].level;
          const o = (j * N + i) * 4;
          const rgb = level > 0 ? col : WEAK;
          data[o] = rgb[0];
          data[o + 1] = rgb[1];
          data[o + 2] = rgb[2];
          data[o + 3] = level > 0 ? 30 + level * 40 : level < 0 ? 28 - level * 30 : 0;
        }
      }
      tex.needsUpdate = true;
    },
    dispose() {
      tex.dispose();
      mat.dispose();
    },
  };
}
