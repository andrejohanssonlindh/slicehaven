import * as THREE from 'three';
import { makeWalkSet, viewFor } from '../art/folkWalk';
import { folkOf } from '../art/folk';
import { PERSON_KINDS } from '../content/people';
import { bodySpecOf } from '../content/people/bodies';
import { IDLE, IDLE_SECONDS, WALK } from '../content/people/poses';
import type { PersonSpec } from '../core/persons';
import { buildBody } from '../core/world3d/body';
import { cyclePose } from '../core/world3d/pose';
import { BODY_SHELLS, type BodyRig, makeBodyRig } from '../engine3d/body';
import { WORLD, lit } from '../engine3d/materials';
import { Pipeline } from '../engine3d/pipeline';
import { walkCard } from '../engine3d/sprites';
import { t } from '../i18n';

/**
 * The model gallery (plan item A2): every kind of body on a slowly turning stand, in the real pixel pipeline, with
 * today's flat card beside the first one to compare. Judge models here on the phone; whoever builds one checks it here.
 */

const PITCH = 0.68;
const stage = document.getElementById('stage')!;
const canvas = document.getElementById('view') as HTMLCanvasElement;
const pipeline = new Pipeline(canvas, { pixelCss: 2, outline: 0.85, palette: 0.6 });

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
const state = { turning: true, walking: false, shells: 2, card: true, angle: 0, phase: 0, zoom: 1 };
const ZOOMS = [24, 32, 48, 64];
const list = document.getElementById('cast')!;

function build(): void {
  rigs.forEach((r) => r.rig.dispose());
  rigs = [];
  list.replaceChildren();
  CAST.forEach((c, i) => {
    const r = PERSON_KINDS.resolve(c.who);
    const model = buildBody(bodySpecOf(r, c.who.seed ?? 1));
    const rig = makeBodyRig(model);
    const at = spot(i);
    rig.group.position.set(at.x, 0, at.z);
    rig.setShells(state.shells);
    scene.add(rig.group);
    rigs.push({ rig, ...at });
    const li = document.createElement('li');
    li.textContent = `${c.label}: ${model.height.toFixed(2)} m`;
    list.appendChild(li);
  });
}

// Today's card beside the first body, to compare.
const first = CAST[0].who;
const card = walkCard(makeWalkSet(folkOf(PERSON_KINDS.resolve(first).look, first.seed ?? 1)), PITCH);
scene.add(card.mesh);

function fit(): void {
  pipeline.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  const ppm = ZOOMS[state.zoom];
  const hw = pipeline.rw / 2 / ppm, hh = pipeline.rh / 2 / ppm;
  Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh });
  camera.updateProjectionMatrix();
  // Looking from +z, down at the world's pitch, at the middle of the stands.
  const target = new THREE.Vector3(0, 0.8, 0);
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH)).multiplyScalar(30));
  camera.lookAt(target);
  WORLD.uPixWorld.value = 1 / ppm;
}

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
toggle(() => t('models.turn', 'Turning'), () => state.turning, () => { state.turning = !state.turning; });
toggle(() => (state.walking ? t('models.walk', 'Walking') : t('models.stand', 'Standing')), () => state.walking, () => { state.walking = !state.walking; });
toggle(() => t('models.shells', 'Shells {n}', { n: state.shells }), () => state.shells > 0, () => {
  state.shells = (state.shells + 1) % 3;
  rigs.forEach((r) => r.rig.setShells(state.shells));
});
toggle(() => t('models.card', 'Old card'), () => state.card, () => { state.card = !state.card; });
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
  for (const r of rigs) {
    r.rig.group.rotation.y = state.angle;
    if (state.walking) r.rig.pose(cyclePose(WALK, state.phase * (rigs[0].rig.model.stride / r.rig.model.stride)));
    else r.rig.pose(cyclePose(IDLE, time / IDLE_SECONDS));
  }
  if (state.walking) state.phase += (speed * dt) / rigs[0].rig.model.stride;
  // The card stands beside the first body, facing the camera, showing the view that matches the turn.
  const a = spot(0);
  card.mesh.visible = state.card;
  card.mesh.position.set(a.x + 0.75, 0, a.z + 0.3);
  const v = viewFor(Math.sin(state.angle), Math.cos(state.angle), 0, card.view, Math.cos(card.mesh.rotation.y) < 0);
  card.pose(v.view, state.walking, speed);
  card.mesh.rotation.y = v.left ? Math.PI : 0;
  card.tick(time);
  pipeline.render(scene, camera, new THREE.Vector2(0, 0), 1 / ZOOMS[state.zoom]);
  requestAnimationFrame(loop);
}

build();
fit();
new ResizeObserver(fit).observe(stage);
(window as unknown as { models: unknown }).models = { rigs, state, build, BODY_SHELLS, pipeline };
requestAnimationFrame((n) => { last = n; loop(n); });
