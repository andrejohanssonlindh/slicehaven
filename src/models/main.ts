import * as THREE from 'three';
import { PERSON_KINDS } from '../content/people';
import { bodySpecOf } from '../content/people/bodies';
import { IDLE, IDLE_SECONDS, WALK } from '../content/people/poses';
import type { PersonSpec } from '../core/persons';
import { buildBody } from '../core/world3d/body';
import { cyclePose } from '../core/world3d/pose';
import { BODY_SHELLS, type BodyRig, makeBodyRig } from '../engine3d/body';
import { WORLD, lit } from '../engine3d/materials';
import { Pipeline } from '../engine3d/pipeline';
import { thingGroup } from '../engine3d/things';
import { THINGS } from '../content/things';
import { MODELS } from '../content/things/models';
import { modelOf } from '../core/world3d/things';
import { t } from '../i18n';

/**
 * The model gallery (plan item A2): every kind of body and every piece of furniture on a slowly turning stand, in
 * the real pixel pipeline. Judge models here on the phone; whoever builds one checks it here.
 */

const PITCH = 0.68;
const stage = document.getElementById('stage')!;
const canvas = document.getElementById('view') as HTMLCanvasElement;
// No outline by default, as in the world (the director: it makes most of the graphics worse).
const pipeline = new Pipeline(canvas, { pixelCss: 2, outline: 0, palette: 0.6 });

/** Who stands in the gallery: one of each people (the tirak in their three sizes), in a few callings. */
const CAST: { label: string; who: PersonSpec }[] = [
  { label: t('models.humanm', 'Human man, farmer'), who: { is: ['human', 'job-farmer'], seed: 1, look: { sex: 'm', build: 'avg', skin: 'tan', hair: 'brown', beard: 'stubble' } } },
  { label: t('models.humanf', 'Human woman, miller'), who: { is: ['human', 'job-miller'], seed: 2, look: { sex: 'f', garment: 'dress' } } },
  { label: t('models.elf', 'Elf woman, innkeeper'), who: { is: ['elf', 'job-innkeeper'], seed: 3, look: { sex: 'f' } } },
  { label: t('models.dwarf', 'Dwarf man, guard'), who: { is: ['dwarf', 'job-guard'], seed: 4, look: { sex: 'm' } } },
  { label: t('models.missla', 'Missla'), who: { is: ['missla', 'station'], seed: 5, look: { sex: 'f', style: 'long' } } },
  { label: t('models.gurder', 'Tirak, small (gurder)'), who: { is: ['tirak', 'station'], seed: 6, look: { sex: 'm', size: 'gurder' } } },
  { label: t('models.tiraker', 'Tirak, strong (tiraker)'), who: { is: ['tirak', 'job-guard'], seed: 7, look: { sex: 'f', size: 'tiraker' } } },
  { label: t('models.trukher', 'Tirak, giant (trukher)'), who: { is: ['tirak', 'station'], seed: 8, look: { sex: 'm', size: 'trukher' } } },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a3a24');
// The world's materials read the scene's fog colour (for mist); a fog far beyond the stands gives them one.
scene.fog = new THREE.Fog(0x2a3a24, 500, 1000);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(6, 12, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
scene.add(sun, sun.target, new THREE.HemisphereLight(0xbcd0ff, 0x4a3a28, 1.1));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), lit({ color: '#4f6a34' }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const COLS = 4;
const spot = (i: number): { x: number; z: number } => ({ x: ((i % COLS) - (COLS - 1) / 2) * 1.5, z: -Math.floor(i / COLS) * 2.2 + 1.1 });

let rigs: { rig: BodyRig; x: number; z: number }[] = [];
const state = { turning: true, walking: false, shells: 2, angle: 0, phase: 0, zoom: 1 };
const ZOOMS = [24, 32, 48, 64];
const list = document.getElementById('cast')!;

const peopleList: string[] = [];

function build(): void {
  rigs.forEach((r) => r.rig.dispose());
  rigs = [];
  peopleList.length = 0;
  CAST.forEach((c, i) => {
    const r = PERSON_KINDS.resolve(c.who);
    const model = buildBody(bodySpecOf(r, c.who.seed ?? 1));
    const rig = makeBodyRig(model);
    const at = spot(i);
    rig.group.position.set(at.x, 0, at.z);
    rig.setShells(state.shells);
    scene.add(rig.group);
    rigs.push({ rig, ...at });
    peopleList.push(`${c.label}: ${model.height.toFixed(2)} m`);
  });
}

// --- furniture: every model in `content/things/models/` ---
const params = new URLSearchParams(location.search);
/** `?only=table` shows just that model (for checking one piece); `?show=furniture` opens on the furniture. */
const only = params.get('only');
let show: 'people' | 'furniture' = only || params.get('show') === 'furniture' ? 'furniture' : 'people';
const furn = new THREE.Group();
scene.add(furn);
const furnItems: { model: THREE.Group }[] = [];
/** Pieces that come in variants are shown in a few of them. */
const VARIANTS: Record<string, (string | undefined)[]> = { shelf: [undefined, 'loaves', 'bottles', 'bolts'] };

function buildFurniture(): void {
  furn.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  furn.clear();
  furnItems.length = 0;
  const lines: string[] = [];
  const ids = Object.keys(MODELS).filter((id) => !only || id === only).sort();
  const entries = ids.flatMap((id) => (VARIANTS[id] ?? [undefined]).map((v) => [id, v] as const));
  // Laid out in rows by real width: each model, then a gap; a new row when a row is full.
  const ROW = 7, GAP = 0.6;
  let x = 0, row = 0;
  const rows: THREE.Object3D[][] = [[]];
  entries.forEach(([id, variant]) => {
    const kind = THINGS.get(id);
    const model = modelOf(kind)!;
    const parts = model.draw(1, variant);
    const g = thingGroup(parts);
    // A turning model sweeps a circle as wide as its diagonal.
    const sweep = Math.hypot(model.w, model.d);
    if (x > 0 && x + sweep > ROW) {
      x = 0;
      row++;
      rows.push([]);
    }
    const z = 1 - row * 2.4;
    // Hung pieces float at about the height they hang.
    const y = kind.furniture?.mount === 'hung' ? 1.0 : 0;
    g.position.set(x + sweep / 2, y, z);
    furn.add(g);
    rows[row].push(g);
    x += sweep + GAP;
    furnItems.push({ model: g });
    const tris = parts.meshes.reduce((n, p) => n + p.mesh.indices.length / 3, 0);
    lines.push(`${id}${variant ? ` (${variant})` : ''}: ${model.w} × ${model.d} m, ${tris} triangles`);
  });
  furnMidZ = 1 - (row * 2.4) / 2;
  // Centre each row.
  for (const r of rows) {
    if (!r.length) continue;
    const box = new THREE.Box3();
    r.forEach((o) => box.expandByPoint(o.position));
    const mid = (box.min.x + box.max.x) / 2;
    r.forEach((o) => { o.position.x -= mid; });
  }
  furnList.length = 0;
  furnList.push(...lines);
}
const furnList: string[] = [];
/** The middle of the furniture rows, front to back (the view centres on it). */
let furnMidZ = 0;
/** Look at the middle of what is shown. */
const centre = (): void => { target.set(0, 0.8, show === 'furniture' ? furnMidZ : 0); };

/** The list under the stage: who or what stands there. */
function fillList(): void {
  list.replaceChildren();
  const lines = show === 'people' ? peopleList : furnList;
  for (const l of lines) {
    const li = document.createElement('li');
    li.textContent = l;
    list.appendChild(li);
  }
}


function fit(): void {
  pipeline.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  const ppm = ZOOMS[state.zoom];
  const hw = pipeline.rw / 2 / ppm, hh = pipeline.rh / 2 / ppm;
  Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh });
  camera.updateProjectionMatrix();
  placeCamera();
}

/** What the camera looks at: the middle of the stands, moved by dragging. */
const target = new THREE.Vector3(0, 0.8, 0);

function placeCamera(): void {
  // Looking from +z, down at the world's pitch.
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH)).multiplyScalar(30));
  camera.lookAt(target);
  WORLD.uPixWorld.value = 1 / ZOOMS[state.zoom];
}

// Drag to look around the stands (there are many pieces of furniture).
let drag: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const k = (window.devicePixelRatio || 1) / pipeline.factor / ZOOMS[state.zoom];
  target.x -= (e.clientX - drag.x) * k;
  target.z -= ((e.clientY - drag.y) * k) / Math.sin(PITCH);
  drag = { x: e.clientX, y: e.clientY };
  placeCamera();
});

// --- controls ---
const row = document.getElementById('row-show')!;
const buttons: (() => void)[] = [];
function toggle(label: () => string, on: () => boolean, click: () => void): void {
  const b = document.createElement('button');
  b.type = 'button';
  const refresh = (): void => { b.textContent = label(); b.classList.toggle('on', on()); };
  b.addEventListener('click', () => { click(); buttons.forEach((r) => r()); });
  buttons.push(refresh);
  refresh();
  row.appendChild(b);
}
toggle(() => (show === 'people' ? t('models.people', 'People') : t('models.furniture', 'Furniture')), () => true, () => {
  show = show === 'people' ? 'furniture' : 'people';
  centre();
  placeCamera();
  fillList();
});
toggle(() => t('models.turn', 'Turning'), () => state.turning, () => { state.turning = !state.turning; });
toggle(() => (state.walking ? t('models.walk', 'Walking') : t('models.stand', 'Standing')), () => state.walking, () => { state.walking = !state.walking; });
toggle(() => t('models.shells', 'Shells {n}', { n: state.shells }), () => state.shells > 0, () => {
  state.shells = (state.shells + 1) % 3;
  rigs.forEach((r) => r.rig.setShells(state.shells));
});
toggle(() => t('models.outline', 'Outline'), () => pipeline.settings.outline > 0, () => { pipeline.settings.outline = pipeline.settings.outline > 0 ? 0 : 0.85; });
for (const b of document.querySelectorAll<HTMLButtonElement>('#zoom button')) {
  b.addEventListener('click', () => {
    state.zoom = Math.max(0, Math.min(ZOOMS.length - 1, state.zoom + Number(b.dataset.zoom)));
    fit();
  });
}

// --- the loop ---
let last = performance.now(), time = 0;
function loop(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  WORLD.uTime.value = time;
  if (state.turning) state.angle += dt * 0.6;
  const speed = 1.6;
  furn.visible = show === 'furniture';
  for (const f of furnItems) {
    f.model.rotation.y = state.angle;
  }
  for (const r of rigs) {
    r.rig.group.visible = show === 'people';
    r.rig.group.rotation.y = state.angle;
    if (state.walking) r.rig.pose(cyclePose(WALK, state.phase * (rigs[0].rig.model.stride / r.rig.model.stride)));
    else r.rig.pose(cyclePose(IDLE, time / IDLE_SECONDS));
  }
  if (state.walking) state.phase += (speed * dt) / rigs[0].rig.model.stride;
  pipeline.render(scene, camera, new THREE.Vector2(0, 0), 1 / ZOOMS[state.zoom]);
  requestAnimationFrame(loop);
}

build();
buildFurniture();
fillList();
centre();
fit();
new ResizeObserver(fit).observe(stage);
(window as unknown as { models: unknown }).models = { rigs, furnItems, state, build, BODY_SHELLS, pipeline, target, placeCamera, get show() { return show; } };
requestAnimationFrame((n) => { last = n; loop(n); });
