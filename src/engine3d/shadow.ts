import * as THREE from 'three';

/** A soft dark blob on the ground under someone standing (the sun's shadow does the rest). */
export function blobShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 12);
  geo.rotateX(-Math.PI / 2);
  geo.scale(1, 1, 0.6);
  const mat = new THREE.MeshBasicMaterial({ color: 0x0e0a14, transparent: true, opacity: 0.32, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 1;
  return m;
}
