import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { DiceSkin } from '../../content/dice/skins';
import { PIPS, type Stage, schedule } from '.';

/**
 * The top level: dice thrown on glass over the game. Real 3D dice (a D6 is a rounded cube with pips; a table die is
 * a ten-sided token with its number) fly up from the bottom of the screen, tumble, and land on the faces the rules
 * rolled. A six that splits glows as it lands, and its two new dice tumble out of it. Drawn in its own small
 * transparent canvas, in screen pixels, gone when the show ends.
 */

/** The faces of a cube die by the cube's material slots (+x, −x, +y, −y, +z, −z): opposite faces make seven. */
const CUBE_FACES = [3, 4, 1, 6, 2, 5];
const CUBE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
const TOWARD_VIEW = new THREE.Vector3(0, 0, 1);

/** A face of a die drawn on a canvas: the body with a soft edge, and pips (a D6) or a number (anything else). */
function faceTexture(skin: DiceSkin, sides: number, face: number): THREE.CanvasTexture {
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  g.fillStyle = skin.body;
  g.fillRect(0, 0, n, n);
  g.strokeStyle = skin.edge;
  g.lineWidth = 10;
  g.strokeRect(0, 0, n, n);
  g.fillStyle = skin.pip;
  if (sides === 6) {
    for (const [x, y] of PIPS[face]) {
      g.beginPath();
      g.arc(n * (0.25 + x * 0.25), n * (0.25 + y * 0.25), n * 0.085, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.font = `800 ${face >= 100 ? 40 : face >= 10 ? 52 : 64}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(face), n / 2, n / 2 + 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // A token's top is turned to face the eye, which lays its picture on its side: turn the picture back.
  if (sides !== 6) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}

const easeOut = (u: number): number => 1 - (1 - u) ** 3;

interface Flying {
  mesh: THREE.Mesh;
  mats: THREE.MeshStandardMaterial[];
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** The turn it lands in, and the axis and amount it tumbles about on the way. */
  end: THREE.Quaternion;
  axis: THREE.Vector3;
  spin: number;
  start: number;
  land: number;
  split: boolean;
}

export async function throwOnGlass(stage: Stage): Promise<void> {
  const { root, skin } = stage;
  const W = window.innerWidth, H = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  root.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -2000, 2000);
  camera.position.z = 1000;
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
  sun.position.set(-0.4, 0.8, 1);
  scene.add(sun);

  const textures: THREE.Texture[] = [];
  const geos: THREE.BufferGeometry[] = [];
  stage.cleanup.push(() => {
    for (const t of textures) t.dispose();
    for (const g of geos) g.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  });

  const S = Math.max(44, Math.min(64, W / 8));
  const cube = new RoundedBoxGeometry(S, S, S, 3, S * 0.14);
  const token = new THREE.CylinderGeometry(S * 0.62, S * 0.62, S * 0.36, 10);
  geos.push(cube, token);
  const tex = (sides: number, face: number): THREE.Texture => {
    const t = faceTexture(skin, sides, face);
    textures.push(t);
    return t;
  };
  const side = new THREE.MeshStandardMaterial({ color: skin.body, roughness: 0.55 });

  // Where each die comes to rest: rows above the result line, in throw order.
  const shown = schedule(stage.rolls, 900, 650, 110);
  const gap = S * 1.4, perRow = Math.max(1, Math.floor((W - 32) / gap));
  const rows = Math.ceil(shown.length / perRow);
  const baseY = -H / 2 + Math.min(H * 0.5, 120 + rows * gap);
  const flying: Flying[] = shown.map((s, i) => {
    const row = Math.floor(i / perRow), inRow = Math.min(perRow, shown.length - row * perRow), col = i - row * perRow;
    const to = new THREE.Vector3((col - (inRow - 1) / 2) * gap, baseY - row * gap, 0);
    let mesh: THREE.Mesh, mats: THREE.MeshStandardMaterial[], end: THREE.Quaternion;
    if (s.die.sides === 6) {
      mats = CUBE_FACES.map((f) => new THREE.MeshStandardMaterial({ map: tex(6, f), roughness: 0.45 }));
      mesh = new THREE.Mesh(cube, mats);
      const slot = CUBE_FACES.indexOf(s.die.face);
      end = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...CUBE_NORMALS[slot]), TOWARD_VIEW);
    } else {
      const top = new THREE.MeshStandardMaterial({ map: tex(s.die.sides, s.die.face), roughness: 0.45 });
      mats = [side.clone(), top, side.clone()];
      mesh = new THREE.Mesh(token, mats);
      end = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), TOWARD_VIEW);
    }
    // A little turn about the view axis so they don't all sit square.
    end.premultiply(new THREE.Quaternion().setFromAxisAngle(TOWARD_VIEW, (Math.random() - 0.5) * 0.6));
    const from = s.parent === null ? new THREE.Vector3(to.x + (Math.random() - 0.5) * W * 0.4, -H / 2 - S * 2, 0) : new THREE.Vector3();
    mesh.visible = false;
    scene.add(mesh);
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    return { mesh, mats, from, to, end, axis, spin: (2 + Math.random() * 2) * Math.PI * 2, start: s.start, land: s.land, split: !s.die.counts };
  });
  // A split six's dice come out of it.
  shown.forEach((s, i) => {
    if (s.parent !== null) flying[i].from.copy(flying[s.parent].to);
  });

  const split = new THREE.Color(skin.split);
  const t0 = performance.now();
  const end = Math.max(...flying.map((f) => f.land));
  const q = new THREE.Quaternion();
  await new Promise<void>((done) => {
    const frame = (): void => {
      const now = stage.skipped() ? end : performance.now() - t0;
      for (const f of flying) {
        if (now < f.start) continue;
        f.mesh.visible = true;
        const u = Math.min(1, (now - f.start) / (f.land - f.start)), e = easeOut(u);
        f.mesh.position.lerpVectors(f.from, f.to, e);
        // Thrown up off the glass and down again: nearer the eye looks bigger.
        f.mesh.scale.setScalar(1 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
        q.setFromAxisAngle(f.axis, f.spin * (1 - e));
        f.mesh.quaternion.copy(f.end).multiply(q);
        if (u >= 1 && f.split) {
          // Landed on a six that splits: it glows, then fades back as its two dice take its place.
          const k = Math.max(0, 1 - (now - f.land) / 900);
          for (const m of f.mats) {
            m.emissive.copy(split).multiplyScalar(0.25 + 0.5 * k);
            m.transparent = true;
            m.opacity = 0.55 + 0.45 * k;
          }
        }
      }
      renderer.render(scene, camera);
      if (now >= end) return done();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
