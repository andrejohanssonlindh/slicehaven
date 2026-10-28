import * as THREE from 'three';
import { ASPECTS, type AspectId } from '../core/filaments';
import { CHUNK, type ChunkTerrain } from '../core/world3d/chunks';
import type { FilamentField } from '../core/world3d/filaments3d';

/**
 * The filament heat map: for one aspect, a see-through colour over the ground.
 * Strong is the aspect's own colour, weak is a cold dark, "normal" is clear.
 * It is drawn from the field's smoothly blended strength at 4 texels per
 * 1.6 m cell, so it fades outward instead of showing squares. A chunk's map
 * shares the chunk's mesh; the room inside a house gets its own plane on the
 * floor (the ground map is hidden under it).
 */

const N = 80;
const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const COLORS = Object.fromEntries(ASPECTS.map((a) => [a.id, hex(a.color)])) as Record<AspectId, [number, number, number]>;
const WEAK: [number, number, number] = [30, 22, 60];

export interface Heat {
  mesh: THREE.Mesh;
  paint(field: FilamentField, aspect: AspectId): void;
  dispose(): void;
}

/** Colour and strength of the heat at a smooth raw value. */
function put(data: Uint8Array, o: number, aspect: AspectId, s: number): void {
  const rgb = s > 0 ? COLORS[aspect] : WEAK;
  data[o] = rgb[0];
  data[o + 1] = rgb[1];
  data[o + 2] = rgb[2];
  // Zero at "normal", rising smoothly either way.
  data[o + 3] = s > 0 ? Math.min(200, s * 85) : Math.min(130, -s * 45);
}

function makeTex(w: number, h: number): { data: Uint8Array; tex: THREE.DataTexture } {
  const data = new Uint8Array(w * h * 4);
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return { data, tex };
}

const material = (tex: THREE.Texture): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

export function makeHeat(c: ChunkTerrain, geometry: THREE.BufferGeometry): Heat {
  const { data, tex } = makeTex(N, N);
  // Mesh UVs are world metres; this texture covers the chunk.
  tex.repeat.set(1 / CHUNK, 1 / CHUNK);
  tex.offset.set(-c.x0 / CHUNK, -c.z0 / CHUNK);
  const mat = material(tex);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.renderOrder = 1;
  return {
    mesh,
    paint(field, aspect) {
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) put(data, (j * N + i) * 4, aspect, field.smoothAt(c.x0 + ((i + 0.5) / N) * CHUNK, c.z0 + ((j + 0.5) / N) * CHUNK, aspect));
      }
      tex.needsUpdate = true;
    },
    dispose() {
      tex.dispose();
      mat.dispose();
    },
  };
}

/**
 * A plane lying on a room's floor (house-local x0..x1, z0..z1 at height y),
 * painted from the field at the room's world positions. `toWorld` turns a
 * house-local (x, z) into world metres.
 */
export function makeFloorHeat(room: { x0: number; x1: number; z0: number; z1: number }, y: number, toWorld: (x: number, z: number) => { x: number; z: number }): Heat {
  const w = room.x1 - room.x0, d = room.z1 - room.z0;
  const tw = Math.ceil(w / 0.25), th = Math.ceil(d / 0.25);
  const { data, tex } = makeTex(tw, th);
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mat = material(tex);
  const mesh = new THREE.Mesh(geo, mat);
  // PlaneGeometry's v runs up; after the turn it runs toward -z (the back of the room).
  mesh.position.set((room.x0 + room.x1) / 2, y, (room.z0 + room.z1) / 2);
  mesh.renderOrder = 1;
  return {
    mesh,
    paint(field, aspect) {
      for (let j = 0; j < th; j++) {
        for (let i = 0; i < tw; i++) {
          const lx = room.x0 + ((i + 0.5) / tw) * w, lz = room.z1 - ((j + 0.5) / th) * d;
          const p = toWorld(lx, lz);
          put(data, (j * tw + i) * 4, aspect, field.smoothAt(p.x, p.z, aspect));
        }
      }
      tex.needsUpdate = true;
    },
    dispose() {
      tex.dispose();
      mat.dispose();
      geo.dispose();
    },
  };
}
