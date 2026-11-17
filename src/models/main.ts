import * as THREE from 'three';
import { PERSON_KINDS } from '../content/people';
import { bodySpecOf } from '../content/people/bodies';
import { TIRED_BANDS } from '../content/people/condition';
import { ANIM, GAITS, READY, STAND, WEAPON_HOLDS, weaponHold } from '../content/people/poses';
import { MOTIONS } from '../content/motions';
import { type BodyPart, type CutArea, unhurt } from '../core/damage';
import type { PersonSpec } from '../core/persons';
import { type AnimState, type Manner, animate, mannerOf, newAnim } from '../core/world3d/animate';
import { buildBody } from '../core/world3d/body';
import { type Condition, PART_JOINTS, conditionOf } from '../core/world3d/condition';
import type { Vec3 } from '../core/world3d/mesh';
import { MOTION_ACTS, type MotionAct, type WayOfMoving, findMotion } from '../core/world3d/motion';
import type { Joint } from '../core/world3d/pose';
import { Blood } from '../engine3d/blood';
import { BODY_SHELLS, type BodyRig, holdOnRig, makeBodyRig, placeRoot } from '../engine3d/body';
import { WORLD, lit } from '../engine3d/materials';
import { Pipeline } from '../engine3d/pipeline';
import { thingGroup } from '../engine3d/things';
import { THINGS } from '../content/things';
import { MODELS } from '../content/things/models';
import { modelOf } from '../core/world3d/things';
import { t } from '../i18n';

/**
 * The model gallery (plan item A2): three views, picked by the tabs on top and remembered. **People**: every kind of
 * body on a stand, standing, walking, running or on guard, with whatever is put in their hands. **Motions** (plan
 * B8g): one body with a weapon playing what the game would play for an act (a strike with a spear is the spear's
 * strike), at full or slow speed, from the side or the front. **Furniture**: every model. All in the real pixel
 * pipeline and moved by the real animator, so what is judged here is what the world shows.
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
const blood = new Blood();
scene.add(blood.group);

// --- what is shown ---
const params = new URLSearchParams(location.search);
/** `?only=table` shows just that model (for checking one piece); `?show=motions` opens on a view. */
const only = params.get('only');
type Show = 'people' | 'motions' | 'furniture';
const SHOWS: Show[] = ['people', 'motions', 'furniture'];
const TAB_KEY = 'slicehaven.models.tab';
/** The view last used in this browser (the address wins; storage may be unavailable). */
function lastShow(): Show | null {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return SHOWS.includes(v as Show) ? (v as Show) : null;
  } catch { return null; }
}
let show: Show = only ? 'furniture' : SHOWS.includes(params.get('show') as Show) ? (params.get('show') as Show) : lastShow() ?? 'people';

/** What the people on the stands do: stand at ease, walk, run, or stand on guard. */
type Doing = 'stand' | 'walk' | 'run' | 'guard';
const DOINGS: Doing[] = ['stand', 'walk', 'run', 'guard'];
/** What can be shown hurt (badly: two wounds), for judging how a condition looks. */
const HURTS: (BodyPart | null)[] = [null, 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'torso', 'head'];
/** Parts that can be shown cut off. */
const LOSSES: ({ area: CutArea; side: 'left' | 'right' } | null)[] = [
  null, { area: 'hand', side: 'left' }, { area: 'forearm', side: 'right' }, { area: 'upperarm', side: 'left' }, { area: 'foot', side: 'right' }, { area: 'calf', side: 'left' },
];
let lost = 0;
const state = { turning: show !== 'motions', doing: 'stand' as Doing, shells: 2, angle: show === 'motions' ? Math.PI / 2 : 0, zoom: show === 'motions' ? 3 : 1, tired: 0, hurt: null as BodyPart | null, bleed: false };
const ZOOMS = [24, 32, 48, 64];

/**
 * The motion view: whose body, what is in the right hand and on the left arm (in the People view too), the act asked
 * for and the motion it finds for that weapon (a test may set `motion` itself), how fast, looping, from which side.
 */
interface Hands { held: string; left: string }
const view = { who: 0, held: 'arming-sword', left: '', act: 'strike' as MotionAct, motion: 'strike', speed: 1, loop: true, side: true, t: 0, rest: 0 };
const WEAPONS = THINGS.placeable.filter((id) => THINGS.get(id).weapon).sort();
const SHIELDS = THINGS.placeable.filter((id) => THINGS.get(id).shield).sort();

/** How what is held moves (the weapon kind's `moves`; only a shield; bare hands). */
const wayOf = (h: Hands): WayOfMoving => (h.held ? THINGS.get(h.held).moves ?? 'hands' : h.left ? 'shield' : 'hands');
const wayNow = (): WayOfMoving => wayOf(view);
/** What the people on the stands have in their hands (their own tools when nothing is picked). */
const stands: Hands = { held: '', left: '' };
/** The hands the controls are about: the stands' in the People view, the motion body's in Motions. */
const hands = (): Hands => (show === 'motions' ? view : stands);
/** The motion the game would play for the act with what is held. */
function resolve(): void {
  view.motion = findMotion(MOTIONS, view.act, wayNow())?.id ?? '';
  view.t = 0;
  view.rest = 0;
}

// --- bodies ---
interface Stand { rig: BodyRig; x: number; z: number; manner: Manner; anim: AnimState }
let rigs: Stand[] = [];
let actor: Stand | null = null;
const peopleList: string[] = [];
const COLS = 4;
const spot = (i: number): { x: number; z: number } => ({ x: ((i % COLS) - (COLS - 1) / 2) * 1.5, z: -Math.floor(i / COLS) * 2.2 + 1.1 });

/** One of the cast as a body, with what is picked in its hands (its own tools put away for them). */
function makeStand(i: number, x: number, z: number, h: Hands, bare = false): Stand {
  const c = CAST[i];
  const spec = bodySpecOf(PERSON_KINDS.resolve(c.who), c.who.seed ?? 1);
  // Their own tools (a farmer's hoe) are put away for what is picked; the one who shows motions never has them.
  if (h.held || bare) spec.right = undefined;
  if (h.left || bare) spec.left = undefined;
  const rig = makeBodyRig(buildBody(spec));
  rig.group.position.set(x, 0, z);
  rig.setShells(state.shells);
  for (const id of [h.held, h.left]) {
    if (!id) continue;
    const kind = THINGS.get(id), model = modelOf(kind)!;
    holdOnRig(rig, thingGroup(model.draw(1)), { grip: model.grip, shield: !!kind.shield });
  }
  scene.add(rig.group);
  const manner = mannerOf(c.who.seed ?? 1);
  return { rig, x, z, manner, anim: newAnim(manner) };
}

function build(): void {
  rigs.forEach((r) => r.rig.dispose());
  actor?.rig.dispose();
  peopleList.length = 0;
  rigs = CAST.map((c, i) => {
    const at = spot(i), s = makeStand(i, at.x, at.z, stands);
    peopleList.push(`${c.label}: ${s.rig.model.height.toFixed(2)} m`);
    return s;
  });
  actor = makeStand(view.who, 0, 0, view, true);
  setCondition();
}

/** What the arms do with what is held, and where the second hand takes hold (as `Figures.holdOf` in the world). */
function holdNow(rig: BodyRig, onGuard: boolean, in_: Hands): { hold: ReturnType<typeof weaponHold>; grasp: Vec3 | null } {
  const way = wayOf(in_), h = WEAPON_HOLDS[way];
  const model = in_.held ? modelOf(THINGS.get(in_.held)) : null;
  const second = onGuard && in_.held && !in_.left && h.second !== undefined
    ? (model?.grip2 !== undefined && model.grip !== undefined ? model.grip2 - model.grip : h.second) : null;
  const g = rig.model.grip;
  return { hold: weaponHold(way, onGuard, !!in_.left), grasp: second === null ? null : [g[0], g[1], g[2] + second] };
}

/** The condition the gallery shows, made the way the world makes it: from injuries as the rules keep them. */
let condition: Condition = conditionOf(null, TIRED_BANDS);
function setCondition(): void {
  const inj = unhurt();
  inj.fatigue = TIRED_BANDS[state.tired].from;
  if (state.hurt) inj.wounds[state.hurt] = 2;
  if (state.bleed) inj.bleed = { rate: 2, diff: 10 };
  if (LOSSES[lost]) inj.lost.push(LOSSES[lost]!);
  condition = conditionOf(inj, TIRED_BANDS);
  const marks: Partial<Record<Joint, number>> = {};
  for (const [part, k] of Object.entries(condition.stains) as [BodyPart, number][]) for (const j of PART_JOINTS[part]) marks[j] = k;
  for (const s of [...rigs, ...(actor ? [actor] : [])]) {
    s.rig.stain(marks);
    s.rig.lose(condition.gone);
  }
  if (!state.bleed) blood.clear();
}

// --- furniture: every model in `content/things/models/` ---
const furn = new THREE.Group();
scene.add(furn);
const furnItems: { model: THREE.Group }[] = [];
const furnList: string[] = [];
/** The middle of the furniture rows, front to back (the view centres on it). */
let furnMidZ = 0;
/** Pieces that come in variants are shown in a few of them. */
const VARIANTS: Record<string, (string | undefined)[]> = { shelf: [undefined, 'loaves', 'bottles', 'bolts'] };

function buildFurniture(): void {
  furn.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  furn.clear();
  furnItems.length = 0;
  furnList.length = 0;
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
    // Hung pieces float at about the height they hang.
    g.position.set(x + sweep / 2, kind.furniture?.mount === 'hung' ? 1.0 : 0, 1 - row * 2.4);
    furn.add(g);
    rows[row].push(g);
    x += sweep + GAP;
    furnItems.push({ model: g });
    const tris = parts.meshes.reduce((n, p) => n + p.mesh.indices.length / 3, 0);
    furnList.push(`${id}${variant ? ` (${variant})` : ''}: ${model.w} × ${model.d} m, ${tris} triangles`);
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
}

// --- the camera ---
/** What the camera looks at: the middle of what is shown, moved by dragging. */
const target = new THREE.Vector3(0, 0.8, 0);
const centre = (): void => { target.set(0, show === 'motions' ? 0.9 : 0.8, show === 'furniture' ? furnMidZ : 0); };

function placeCamera(): void {
  // Looking from +z, down at the world's pitch.
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH)).multiplyScalar(30));
  camera.lookAt(target);
  WORLD.uPixWorld.value = 1 / ZOOMS[state.zoom];
}

function fit(): void {
  pipeline.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  const ppm = ZOOMS[state.zoom];
  const hw = pipeline.rw / 2 / ppm, hh = pipeline.rh / 2 / ppm;
  Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh });
  camera.updateProjectionMatrix();
  placeCamera();
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
for (const b of document.querySelectorAll<HTMLButtonElement>('#zoom button')) {
  b.addEventListener('click', () => {
    state.zoom = Math.max(0, Math.min(ZOOMS.length - 1, state.zoom + Number(b.dataset.zoom)));
    fit();
  });
}

// --- the panel: tabs on top, then the rows that belong to the view ---
const panel = document.getElementById('panel')!;
const list = document.getElementById('cast')!;
const refreshers: (() => void)[] = [];
const refresh = (): void => refreshers.forEach((r) => r());

/** A row of controls, shown in some views; `title` says what it is about. */
function row(shows: Show[], title?: string): HTMLElement {
  const r = document.createElement('div');
  r.className = 'row';
  if (title) {
    const s = document.createElement('span');
    s.className = 'title';
    s.textContent = title;
    r.append(s);
  }
  refreshers.push(() => { r.hidden = !shows.includes(show); });
  panel.insertBefore(r, list);
  return r;
}

function button(into: HTMLElement, label: () => string, on: () => boolean, click: () => void): void {
  const b = document.createElement('button');
  b.type = 'button';
  refreshers.push(() => { b.textContent = label(); b.classList.toggle('on', on()); });
  b.addEventListener('click', () => { click(); refresh(); });
  into.appendChild(b);
}

function select(into: HTMLElement, label: string, options: () => [value: string, text: string][], get: () => string, set: (v: string) => void): void {
  const l = document.createElement('label');
  l.className = 'pick';
  l.append(label + ' ');
  const s = document.createElement('select');
  let shown = '';
  refreshers.push(() => {
    const opts = options(), sig = opts.map((o) => o[0]).join('|');
    if (sig !== shown) {
      s.replaceChildren(...opts.map(([v, text]) => new Option(text, v)));
      shown = sig;
    }
    s.value = get();
  });
  s.addEventListener('change', () => { set(s.value); refresh(); });
  l.append(s);
  into.appendChild(l);
}

/** Go to a view: what it shows, how it is looked at, and remembered for next time. */
function go(to: Show): void {
  show = to;
  try { localStorage.setItem(TAB_KEY, to); } catch { /* not remembered, then */ }
  if (to === 'motions') Object.assign(state, { turning: false, angle: view.side ? Math.PI / 2 : 0, zoom: ZOOMS.length - 1 });
  else Object.assign(state, { turning: true, zoom: 1 });
  fit();
  centre();
  placeCamera();
}

const SHOW_NAMES: Record<Show, () => string> = {
  people: () => t('models.people', 'People'),
  motions: () => t('models.motions', 'Motions'),
  furniture: () => t('models.furniture', 'Furniture'),
};
const DOING_NAMES: Record<Doing, () => string> = {
  stand: () => t('models.stand', 'Standing'),
  walk: () => t('models.walk', 'Walking'),
  run: () => t('models.run', 'Running'),
  guard: () => t('models.guard', 'On guard'),
};

{
  const tabs = row(SHOWS);
  tabs.classList.add('tabs');
  tabs.id = 'row-show';
  for (const s of SHOWS) button(tabs, SHOW_NAMES[s], () => show === s, () => go(s));

  // People: what they all do.
  const doing = row(['people'], t('models.doing', 'They are'));
  for (const d of DOINGS) button(doing, DOING_NAMES[d], () => state.doing === d, () => { state.doing = d; });

  // Motions: whose body, which act; the motion is found as the game finds it.
  const picks = row(['motions']);
  picks.id = 'row-motion';
  select(picks, t('models.body', 'Body'), () => CAST.map((c, i) => [String(i), c.label]), () => String(view.who), (v) => { view.who = Number(v); build(); });
  select(picks, t('models.act', 'Act'),
    () => MOTION_ACTS.filter((a) => findMotion(MOTIONS, a, wayNow())).map((a): [string, string] => [a, `${a} → ${findMotion(MOTIONS, a, wayNow())!.id}`]),
    () => view.act, (v) => { view.act = v as MotionAct; resolve(); });

  // What is in their hands (both views).
  const inHands = row(['people', 'motions']);
  const name = (id: string): string => THINGS.get(id).name ?? id;
  select(inHands, t('models.held', 'Right hand'), () => [['', t('models.nothing', 'nothing')], ...WEAPONS.map((id): [string, string] => [id, `${name(id)} (${THINGS.get(id).moves})`])],
    () => hands().held, (v) => { hands().held = v; resolve(); build(); });
  select(inHands, t('models.left', 'Left arm'), () => [['', t('models.nothing', 'nothing')], ...SHIELDS.map((id): [string, string] => [id, name(id)])],
    () => hands().left, (v) => { hands().left = v; resolve(); build(); });

  const play = row(['motions']);
  button(play, () => t('models.replay', 'Play'), () => false, () => { view.t = 0; view.rest = 0; });
  for (const sp of [1, 0.5, 0.25]) button(play, () => (sp === 1 ? '1×' : sp === 0.5 ? '½×' : '¼×'), () => view.speed === sp, () => { view.speed = sp; });
  button(play, () => t('models.loop', 'Loop'), () => view.loop, () => { view.loop = !view.loop; });
  button(play, () => (view.side ? t('models.side', 'From the side') : t('models.front', 'From the front')), () => true, () => {
    view.side = !view.side;
    state.turning = false;
    state.angle = view.side ? Math.PI / 2 : 0;
  });

  // The shape they are in (both views).
  const cond = row(['people', 'motions'], t('models.shape', 'Condition'));
  button(cond, () => t('models.cond', 'Fatigue: {band}', { band: `${TIRED_BANDS[state.tired].name} (${TIRED_BANDS[state.tired].from}+)` }), () => state.tired > 0, () => {
    state.tired = (state.tired + 1) % TIRED_BANDS.length;
    setCondition();
  });
  button(cond, () => t('models.hurt', 'Hurt: {part}', { part: state.hurt ?? t('models.nohurt', 'nothing') }), () => !!state.hurt, () => {
    state.hurt = HURTS[(HURTS.indexOf(state.hurt) + 1) % HURTS.length];
    setCondition();
  });
  button(cond, () => t('models.bleed', 'Bleeding'), () => state.bleed, () => { state.bleed = !state.bleed; setCondition(); });
  button(cond, () => t('models.lost', 'Lost: {part}', { part: LOSSES[lost] ? `${LOSSES[lost]!.side} ${LOSSES[lost]!.area}` : t('models.nohurt', 'nothing') }), () => lost > 0, () => {
    lost = (lost + 1) % LOSSES.length;
    setCondition();
  });

  const looks = row(SHOWS, t('models.view', 'View'));
  button(looks, () => t('models.turn', 'Turning'), () => state.turning, () => { state.turning = !state.turning; });
  button(looks, () => t('models.shells', 'Shells {n}', { n: state.shells }), () => state.shells > 0, () => {
    state.shells = (state.shells + 1) % 3;
    for (const s of [...rigs, ...(actor ? [actor] : [])]) s.rig.setShells(state.shells);
  });
  button(looks, () => t('models.outline', 'Outline'), () => pipeline.settings.outline > 0, () => { pipeline.settings.outline = pipeline.settings.outline > 0 ? 0 : 0.85; });
}

/** The lines under the controls: who or what stands there; for a motion, what it is and where it is now. */
const nowLine = document.createElement('li');
function motionLines(): string[] {
  const m = MOTIONS[view.motion];
  if (!m) return [t('models.nomotion', 'No motion for {act} with this in hand.', { act: view.act })];
  const fits = [m.way ? t('models.mway', 'for {way}', { way: m.way }) : t('models.many', 'for any weapon'), m.style ? t('models.mstyle', 'style {style}', { style: m.style }) : ''].filter(Boolean).join(', ');
  const marks = Object.entries(m.marks ?? {}).map(([k, at]) => `${k} ${(at * m.seconds).toFixed(2)} s`).join(', ');
  return [
    t('models.mline', '{id}: {act}, {fits}; {s} s, {part}; then {then}', { id: m.id, act: m.act, fits, s: m.seconds, part: m.add ? `${m.part}, added` : m.part, then: m.then }),
    ...(marks ? [t('models.marks', 'Marks: {marks}', { marks })] : []),
  ];
}
let listed = '';
refreshers.push(() => {
  const lines = show === 'people' ? peopleList : show === 'furniture' ? furnList : motionLines();
  const sig = `${show}|${lines.join('|')}`;
  if (sig === listed) return;
  listed = sig;
  list.replaceChildren(...lines.map((l) => {
    const li = document.createElement('li');
    li.textContent = l;
    return li;
  }));
});

/** A test (or the console) shows one motion by its id, with a weapon that moves its way in hand. */
function showMotion(id: string): void {
  const m = MOTIONS[id];
  if (!m) return;
  const way = m.way ?? (m.act === 'block' ? 'shield' : 'blade');
  view.held = way === 'hands' || way === 'shield' ? '' : WEAPONS.find((w) => THINGS.get(w).moves === way) ?? view.held;
  view.left = way === 'shield' ? SHIELDS[0] ?? '' : '';
  view.act = m.act;
  build();
  Object.assign(view, { motion: id, t: 0, rest: 0 });
  refresh();
}

// --- the loop ---
const spot3 = new THREE.Vector3();
/** Blood runs from a bleeding body's wound to the ground under it. */
function drip(id: string, rig: BodyRig, dt: number): void {
  if (condition.bleed <= 0) return;
  rig.group.updateWorldMatrix(true, true);
  blood.bleed(id, rig.jointWorld(condition.bleedFrom, spot3), 0, condition.bleed, dt);
}

/**
 * The motion view: the motion moved on, and the body posed as the world poses it (`animate`): on guard with what it
 * holds, the motion over it, the small movements of someone alive, the root placed.
 */
function stepMotion(dt: number): void {
  if (!actor) return;
  const rig = actor.rig;
  rig.group.visible = show === 'motions';
  if (show !== 'motions') return;
  const m = MOTIONS[view.motion];
  rig.group.rotation.y = state.angle;
  if (m) {
    view.t += dt * view.speed;
    // After its end it holds a moment, then starts again (looping).
    if (view.t >= m.seconds) {
      view.rest += dt;
      if (view.loop && view.rest > 0.8) { view.t = 0; view.rest = 0; }
    }
  }
  const shown = animate(actor.anim, ANIM, {
    dt, moved: 0, body: rig.model, stance: READY, ...holdNow(rig, true, view),
    motion: m ? { motion: m, t: Math.min(view.t, m.seconds) } : null,
    condition, manner: actor.manner,
  });
  rig.pose(shown.pose);
  placeRoot(rig, shown.root, state.angle);
  drip('actor', rig, dt);
  if (!m) return;
  const k = m.seconds > 0 ? Math.min(1, view.t / m.seconds) : 1;
  const hit = Object.entries(m.marks ?? {}).filter(([, at]) => Math.abs(at - k) < 0.06).map(([n]) => n);
  nowLine.textContent = `${(Math.min(view.t, m.seconds)).toFixed(2)} s${hit.length ? ` · ${hit.join(', ').toUpperCase()}` : ''}`;
  nowLine.classList.toggle('mark', hit.length > 0);
  if (nowLine.parentElement !== list) list.prepend(nowLine);
}

let last = performance.now(), time = 0;
function loop(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  WORLD.uTime.value = time;
  if (state.turning) state.angle += dt * 0.6;
  furn.visible = show === 'furniture';
  for (const f of furnItems) f.model.rotation.y = state.angle;
  stepMotion(dt);
  // The people on the stands move as they do in the world: each gait at the speed it is made for, on the spot.
  const pace = state.doing === 'walk' ? GAITS[0].pace : state.doing === 'run' ? GAITS[GAITS.length - 1].pace : 0;
  const onGuard = state.doing === 'guard';
  for (const r of rigs) {
    r.rig.group.visible = show === 'people';
    r.rig.group.rotation.y = state.angle;
    if (show !== 'people') continue;
    const shown = animate(r.anim, ANIM, {
      dt, moved: pace * dt, body: r.rig.model, stance: onGuard ? READY : STAND, ...holdNow(r.rig, onGuard, stands),
      motion: onGuard ? { motion: MOTIONS.guard, t: 0 } : null,
      condition, manner: r.manner,
    });
    r.rig.pose(shown.pose);
    drip(`stand${r.x},${r.z}`, r.rig, dt);
  }
  blood.step(dt);
  pipeline.render(scene, camera, new THREE.Vector2(0, 0), 1 / ZOOMS[state.zoom]);
  requestAnimationFrame(loop);
}

resolve();
build();
buildFurniture();
refresh();
centre();
fit();
new ResizeObserver(fit).observe(stage);
(window as unknown as { models: unknown }).models = {
  furnItems, state, view, build, setCondition, showMotion, blood, BODY_SHELLS, pipeline, target, placeCamera,
  get rigs() { return rigs; }, get show() { return show; }, get actor() { return actor?.rig ?? null; },
};
requestAnimationFrame((n) => { last = n; loop(n); });
