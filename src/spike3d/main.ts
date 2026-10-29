import { type Sky, WIND_DIRS, clockText } from '../core/environment';
import { ASPECTS, LEVEL_NAMES } from '../core/filaments';
import { MAPS, mapNamed } from '../content/maps';
import { Governor, TIERS, type DeviceInfo, type Tier, type TierName, atlasSize, pickTier, qualityAt } from '../core/world3d/tiers';
import { setAtlasSize, spriteAtlas } from '../engine3d/atlas';
import { Pipeline } from '../engine3d/pipeline';
import { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';

/**
 * M0, the 3D spike: one house with a working cut-away, ground with stamped mud
 * and a road, a tree, a lake, a walking villager, torches, weather and time of
 * day, through the pixel pipeline. Every knob the director needs to judge the
 * look and the frame rate on a phone is a button here.
 */

/** Set at build time by vite.config.ts. */
declare const __BUILD__: string;
document.getElementById('build')!.textContent = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

const stage = document.getElementById('stage')!;
const canvas = document.getElementById('view') as HTMLCanvasElement;
const statsEl = document.getElementById('stats')!;
const loading = document.getElementById('loading')!;

const params = new URLSearchParams(location.search);

/** Ask a throwaway WebGL context what the GPU is, before choosing a tier. */
function probeGpu(): { gpu?: string; maxTexture?: number } {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    if (!gl) return {};
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const out = {
      gpu: ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : undefined,
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return out;
  } catch {
    return {};
  }
}

const device: DeviceInfo = {
  width: stage.clientWidth,
  height: stage.clientHeight,
  dpr: window.devicePixelRatio || 1,
  touch: navigator.maxTouchPoints > 0,
  ...probeGpu(),
};
setAtlasSize(atlasSize(device));
let tier: Tier = { ...TIERS[(params.get('tier') as TierName) in TIERS ? (params.get('tier') as TierName) : pickTier(device)] };
let zoomIndex = tier.zoom;

const pipeline = new Pipeline(canvas, { pixelCss: tier.pixelCss, outline: 0, palette: 0.6 });
let world: SpikeWorld;

function fit(): void {
  pipeline.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  world.ppm = tier.zooms[Math.min(zoomIndex, tier.zooms.length - 1)];
  world.frame(pipeline.rw, pipeline.rh);
}

// --- controls ---------------------------------------------------------------

interface Btn {
  el: HTMLButtonElement;
  refresh(): void;
}
const buttons: Btn[] = [];

/** One setting, as the bottom panel and the admin menu both show it. */
interface Def {
  label: () => string;
  on: () => boolean;
  click: () => void;
}
/** The admin menu's groups, in ring order; each holds the settings that belong to it. */
const GROUPS: { id: string; name: string; defs: Def[] }[] = [
  { id: 'time', name: t('spike.g.time', 'Time'), defs: [] },
  { id: 'weather', name: t('spike.g.weather', 'Weather'), defs: [] },
  { id: 'wind', name: t('spike.g.wind', 'Wind'), defs: [] },
  { id: 'fog', name: t('spike.g.fog', 'Fog'), defs: [] },
  { id: 'fire', name: t('spike.g.fire', 'Fire & light'), defs: [] },
  { id: 'look', name: t('spike.g.look', 'Look'), defs: [] },
  { id: 'magic', name: t('spike.g.magic', 'Magic'), defs: [] },
  { id: 'view', name: t('spike.g.view', 'Sight'), defs: [] },
  { id: 'perf', name: t('spike.g.perf', 'Quality'), defs: [] },
];
const ROW_GROUP: Record<string, string> = { 'row-time': 'time', 'row-sky': 'weather', 'row-fx': 'fire', 'row-look': 'look', 'row-magic': 'magic', 'row-perf': 'view' };

function makeButton(def: Def, parent: HTMLElement): Btn {
  const el = document.createElement('button');
  el.type = 'button';
  const b: Btn = {
    el,
    refresh() {
      el.textContent = def.label();
      el.classList.toggle('on', def.on());
    },
  };
  el.addEventListener('click', () => {
    def.click();
    for (const x of buttons) x.refresh();
  });
  parent.appendChild(el);
  buttons.push(b);
  return b;
}

/** A setting in the bottom panel's row and in the admin menu (`group` overrides the row's own group). */
function button(row: string, label: () => string, on: () => boolean, click: () => void, group = ROW_GROUP[row]): void {
  const def = { label, on, click };
  makeButton(def, document.getElementById(row)!);
  adminButton(group, label, on, click);
}

/** A setting that lives in the admin menu only. */
function adminButton(group: string, label: () => string, on: () => boolean, click: () => void): void {
  GROUPS.find((g) => g.id === group)!.defs.push({ label, on, click });
}

// Dynamic scaling: the governor watches frame times and steps quality down (and back up), and says so.
const governor = new Governor(1000 / 30);
const noticeEl = document.getElementById('notice')!;
let noticeT = 0;

function notify(text: string): void {
  noticeEl.textContent = text;
  noticeEl.hidden = false;
  clearTimeout(noticeT);
  noticeT = window.setTimeout(() => { noticeEl.hidden = true; }, 5000);
}

/** Apply the tier's quality at the governor's current level. */
function applyQuality(): void {
  const q = qualityAt(tier, governor.level);
  world.settings.shells = Math.min(2, q.shells);
  world.settings.lights = Math.min(3, q.lights);
  world.settings.shadowMap = q.shadowMap;
  world.setShadowMap(q.shadowMap);
  world.setGrass(q.grass);
  for (const b of buttons) b.refresh();
}

const cycle = <T>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length];

function buildControls(): void {
  const w = world.weather;
  const times: [number, string][] = [[6, t('spike.dawn', 'Dawn')], [12, t('spike.day', 'Day')], [18.5, t('spike.dusk', 'Dusk')], [0, t('spike.night', 'Night')]];
  const nearHour = (h: number): boolean => w.hour !== null && Math.abs(((w.hour - h + 36) % 24) - 12) < 1.5 && world.dayMinutes === 0;
  for (const [h, name] of times) button('row-time', () => name, () => nearHour(h), () => { world.dayMinutes = 0; w.setHour(h); });
  // The clock: a whole day in 0 (stopped), 6, 2 or 0.5 real minutes.
  button('row-time', () => (world.dayMinutes ? t('spike.dayminutes', 'Day: {n} min', { n: world.dayMinutes }) : t('spike.clockstopped', 'Clock stopped')), () => world.dayMinutes > 0, () => { world.dayMinutes = cycle([0, 6, 2, 0.5], world.dayMinutes); });
  const hourEl = document.getElementById('hour') as HTMLInputElement, hourText = document.getElementById('hour-text')!;
  hourEl.addEventListener('input', () => { world.dayMinutes = 0; w.setHour(Number(hourEl.value)); for (const b of buttons) b.refresh(); });
  setInterval(() => {
    if (w.hour === null) return;
    hourText.textContent = clockText(w.hour);
    if (document.activeElement !== hourEl) hourEl.value = String(w.hour);
  }, 250);
  const skies: [Sky, string][] = [['clear', t('spike.clear', 'Clear')], ['cloudy', t('spike.cloudy', 'Cloudy')], ['rain', t('spike.rain', 'Rain')], ['storm', t('spike.storm', 'Storm')]];
  for (const [id, name] of skies) button('row-sky', () => name, () => w.sky === id, () => w.set(id));

  // Lightning and fires, to test by hand: a bolt on demand in any weather, storms throwing their own, campfires beside the hero.
  button('row-fx', () => t('spike.strike', 'Lightning'), () => false, () => { world.strike(); });
  button('row-fx', () => t('spike.autobolts', 'Storm bolts'), () => world.autoBolts, () => { world.autoBolts = !world.autoBolts; });
  button('row-fx', () => t('spike.fire', 'Fire ({n})', { n: world.campfires }), () => world.campfires > 0, () => {
    if (!world.lightFire()) notify(t('spike.toomanyfires', 'That is enough fires.'));
  });
  button('row-fx', () => t('spike.douse', 'Douse'), () => false, () => { world.douseFires(); });

  button('row-fx', () => t('spike.torch', 'Torch'), () => world.torchOn, () => { world.toggleTorch(); });
  button('row-fx', () => t('spike.orb', 'Light orb'), () => world.orbOn, () => { world.toggleOrb(); });
  button('row-fx', () => t('spike.ray', 'Light ray'), () => world.rayOn, () => { world.toggleRay(); });
  button('row-fx', () => t('spike.speed', 'Walk ×{n}', { n: world.speedMul }), () => world.speedMul > 1, () => { world.speedMul = cycle([1, 2, 3], world.speedMul); });

  button('row-look', () => t('spike.inside', 'Inside'), () => world.inside, () => { world.inside = !world.inside; });
  button('row-look', () => t('spike.shells', 'Shells {n}', { n: world.settings.shells }), () => world.settings.shells > 0, () => {
    world.settings.shells = cycle([0, 1, 2], world.settings.shells);
  });
  button('row-look', () => t('spike.outline', 'Outline'), () => pipeline.settings.outline > 0, () => {
    pipeline.settings.outline = pipeline.settings.outline > 0 ? 0 : 0.85;
  });
  button('row-look', () => t('spike.palette', 'Palette {n}%', { n: Math.round(pipeline.settings.palette * 100) }), () => pipeline.settings.palette > 0, () => {
    pipeline.settings.palette = cycle([0, 0.3, 0.6, 1], pipeline.settings.palette);
  });

  // Filaments: cycle the heat map through the eight aspects, then off.
  button('row-magic', () => {
    const a = world.shownAspect;
    return a ? t('spike.magic', 'Filaments: {n}', { n: ASPECTS.find((x) => x.id === a)!.gloss }) : t('spike.magicoff', 'Filaments: off');
  }, () => world.shownAspect !== null, () => {
    const ids = [null, ...ASPECTS.map((x) => x.id)] as const;
    world.showFilaments(ids[(ids.indexOf(world.shownAspect as never) + 1) % ids.length]);
  });

  // Vision: past it the world is grey, then black, and is not built or animated.
  button('row-perf', () => (world.vision.outer > 0 ? t('spike.vision', 'Vision {n} m', { n: Math.round(world.vision.outer) }) : t('spike.visionoff', 'Vision: all')), () => world.vision.outer > 0, () => {
    const base = VISION[tier.name][1];
    const steps = [0, base * 0.7, base, base * 1.5];
    const at = steps.findIndex((s) => Math.abs(s - world.vision.outer) < 1);
    const next = steps[(at + 1) % steps.length];
    world.setVision(next * 0.7, next);
  });
  // The hero's Alertness: how far and how wide they see.
  button('row-perf', () => t('spike.alertness', 'Alertness {n}', { n: world.alertness }), () => world.alertness !== 10, () => { world.alertness = cycle([4, 7, 10, 14, 18], world.alertness); });
  // Mist on demand (what a spell will do): off leaves it to the weather.
  button('row-perf', () => (world.mistAmount > 0 ? t('spike.mist', 'Fog {n}%', { n: Math.round(world.mistAmount * 100) }) : t('spike.mistoff', 'Fog: weather')), () => world.mistAmount > 0, () => {
    world.setMist(cycle([0, 0.25, 0.5, 0.75, 1], world.mistAmount));
  }, 'fog');
  button('row-perf', () => t('spike.forget', 'Forget map'), () => false, () => { world.forgetMap(); });
  button('row-perf', () => t('spike.tier', 'Tier: {n}', { n: tier.name }), () => false, () => {
    setTier(cycle(['low', 'medium', 'high'] as TierName[], tier.name));
  }, 'perf');
  button('row-perf', () => t('spike.pixel', 'Pixel ×{n}', { n: pipeline.factor }), () => false, () => {
    pipeline.settings.pixelCss = cycle([0.5, 1, 1.5, 2, 3], pipeline.settings.pixelCss);
    fit();
  }, 'perf');
  button('row-perf', () => t('spike.shadow', 'Shadow {n}', { n: world.settings.shadowMap }), () => false, () => {
    world.settings.shadowMap = cycle([512, 1024, 2048, 4096], world.settings.shadowMap);
    world.setShadowMap(world.settings.shadowMap);
  }, 'perf');
  button('row-perf', () => t('spike.lights', 'Lights {n}', { n: world.settings.lights }), () => world.settings.lights > 0, () => {
    world.settings.lights = cycle([0, 1, 2, 3], world.settings.lights);
  }, 'perf');

  // Admin only: time steps, wind (the weather's own unless set here) and fog at a chosen strength.
  adminButton('time', () => t('spike.hourplus', '+3 h'), () => false, () => { w.setHour((w.hour ?? 12) + 3); });
  adminButton('time', () => t('spike.hourminus', '−3 h'), () => false, () => { w.setHour((w.hour ?? 12) - 3); });
  // Wind: "Auto" lets the sky decide; 0 to 6 fixes the force (and keeps it when the sky changes); the last button turns it.
  adminButton('wind', () => t('spike.windauto', 'Auto'), () => !w.windPinned, () => { w.unpinWind(); });
  for (let f = 0; f <= 6; f++) {
    adminButton('wind', () => (f === 0 ? t('spike.windcalm', 'Calm') : t('spike.windforce', 'Force {n}', { n: f })), () => w.windPinned && w.windForce === f, () => { w.pinWind(f); });
  }
  adminButton('wind', () => t('spike.winddir', 'Blows {n}', { n: WIND_DIRS[w.windDir].name }), () => false, () => { w.pinWind(w.windForce, w.windDir + 1); });
  // Fog: "Auto" leaves it to the weather (rain brings a little); the others fix how thick it lies.
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    adminButton('fog', () => (v === 0 ? t('spike.fogauto', 'Auto') : `${Math.round(v * 100)}%`), () => Math.abs(world.mistAmount - v) < 0.01, () => { world.setMist(v); });
  }
  buildAdmin();
  for (const b of buttons) b.refresh();
}

// --- the admin menu: a ring of groups on "å" (or the cog), a ring of their settings on tapping one ---

function buildAdmin(): void {
  const ring = document.getElementById('radial')!;
  const panel = document.getElementById('panel')!;
  const cog = document.getElementById('admin-open')!;
  let level: string | null = null;
  let mine: Btn[] = [];
  const panelShown = (): boolean => !panel.classList.contains('folded');
  const setPanel = (show: boolean): void => {
    panel.classList.toggle('folded', !show);
    try { localStorage.setItem('spike3d.panel', show ? '1' : '0'); } catch { /* private window */ }
    window.dispatchEvent(new Event('resize')); // the stage changed size
  };
  const place = (el: HTMLElement, i: number, n: number, r: number): void => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    el.style.transform = `translate(-50%, -50%) translate(${Math.round(Math.cos(a) * r)}px, ${Math.round(Math.sin(a) * r)}px)`;
  };
  const draw = (): void => {
    for (const b of mine) buttons.splice(buttons.indexOf(b), 1);
    mine = [];
    ring.replaceChildren();
    const r = Math.min(150, Math.min(stage.clientWidth, stage.clientHeight) * 0.36);
    const hub = document.createElement('button');
    hub.type = 'button';
    hub.className = 'hub';
    hub.textContent = level === null ? '✕' : '‹';
    hub.addEventListener('click', () => { if (level === null) close(); else { level = null; draw(); } });
    ring.appendChild(hub);
    if (level === null) {
      GROUPS.forEach((g, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = g.name;
        el.addEventListener('click', () => { level = g.id; draw(); });
        place(el, i, GROUPS.length + 1, r);
        ring.appendChild(el);
      });
      const p = document.createElement('button');
      p.type = 'button';
      p.textContent = panelShown() ? t('spike.hidepanel', 'Hide panel') : t('spike.showpanel', 'Show panel');
      p.addEventListener('click', () => { setPanel(!panelShown()); draw(); });
      place(p, GROUPS.length, GROUPS.length + 1, r);
      ring.appendChild(p);
      return;
    }
    const defs = GROUPS.find((g) => g.id === level)!.defs;
    defs.forEach((d, i) => {
      const b = makeButton(d, ring);
      place(b.el, i, defs.length, r);
      b.refresh();
      mine.push(b);
    });
  };
  const open = (): void => { level = null; ring.hidden = false; draw(); };
  const close = (): void => { ring.hidden = true; ring.replaceChildren(); for (const b of mine) buttons.splice(buttons.indexOf(b), 1); mine = []; };
  const toggle = (): void => (ring.hidden ? open() : close());
  cog.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'å' || e.key === 'Å') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && !ring.hidden) close();
  });
  ring.addEventListener('click', (e) => { if (e.target === ring) close(); });
  let saved = '0';
  try { saved = localStorage.getItem('spike3d.panel') ?? '0'; } catch { /* private window */ }
  panel.classList.toggle('folded', saved !== '1');
}

/** How far each tier sees (grey from, black at), metres from the view's focus. */
const VISION: Record<TierName, [number, number]> = { low: [30, 44], medium: [40, 56], high: [52, 72] };

function setTier(name: TierName): void {
  tier = { ...TIERS[name] };
  if (typeof world !== 'undefined' && world.vision.outer > 0) world.setVision(...VISION[name]);
  zoomIndex = tier.zoom;
  pipeline.settings.pixelCss = tier.pixelCss;
  governor.level = 0;
  applyQuality();
  fit();
}

// --- input: drag to pan, tap the ground to walk, tap the house to step inside, zoom buttons and wheel ---

function bindInput(): void {
  let down: { x: number; y: number; id: number; moved: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const k = (window.devicePixelRatio || 1) / pipeline.factor; // CSS px to rendered px
    const dx = (e.clientX - down.x) * k, dy = (e.clientY - down.y) * k;
    down.moved += Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down.x = e.clientX;
    down.y = e.clientY;
    world.pan(dx, dy);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || e.pointerId !== down.id) return;
    if (down.moved < 8) {
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const house = e.shiftKey ? world.pick(nx, ny) : world.houseTapped(nx, ny);
      if (e.shiftKey && house !== null) {
        // Dev: shift-click lifts or lowers that roof by hand.
        world.toggleRoof(house);
        for (const b of buttons) b.refresh();
      } else if (!world.heroIndoors && house !== null) {
        // Outside, tapping a house walks in through its door.
        if (world.walkIn(house) === null) notify(t('spike.noway', 'There is no way there.'));
      } else {
        // Otherwise tap the ground and the hero walks there, round whatever is in the way.
        const at = world.groundAt(nx, ny);
        if (at && world.walkTo(at.x, at.z) === null) notify(t('spike.noway', 'There is no way there.'));
      }
    }
    down = null;
  });
  const zoom = (d: number): void => {
    zoomIndex = Math.max(0, Math.min(tier.zooms.length - 1, zoomIndex + d));
    fit();
  };
  for (const b of document.querySelectorAll<HTMLButtonElement>('#zoom button')) {
    b.addEventListener('click', () => zoom(Number(b.dataset.zoom)));
  }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
}

// --- the loop and the numbers -------------------------------------------------

const frameMs: number[] = [];
let frames = 0, fpsT = performance.now(), fps = 0, last = performance.now();

function loop(now: number): void {
  const dt = now - last;
  last = now;
  // Frame interval drives the governor; long gaps (a hidden tab) are not slowness.
  if (dt < 250 && !params.has('nogov')) {
    const r = governor.push(dt);
    if (r.notice) {
      applyQuality();
      notify(r.notice);
    }
  }
  const t0 = performance.now();
  world.update(dt);
  const info = pipeline.renderer.info;
  info.reset();
  pipeline.render(world.scene, world.camera, world.camPix, 1 / world.ppm);
  frameMs.push(performance.now() - t0);
  if (frameMs.length > 120) frameMs.shift();
  frames++;
  if (now - fpsT >= 1000) {
    fps = (frames * 1000) / (now - fpsT);
    frames = 0;
    fpsT = now;
    const sorted = [...frameMs].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] ?? 0;
    for (const b of buttons) b.refresh();
    const shown = world.shownAspect;
    let magic = '';
    if (shown) {
      const r = world.heroReading()[shown];
      const info = ASPECTS.find((x) => x.id === shown)!;
      magic = `${info.name} at hero: ${r.level > 0 ? '+' : ''}${r.level} ${LEVEL_NAMES[r.level]}\n` + r.parts.map((p) => `  ${p.value > 0 ? '+' : ''}${p.value.toFixed(1)} ${p.label}`).join('\n');
    }
    statsEl.textContent = [
      `${fps.toFixed(0)} fps  cpu ${med.toFixed(1)} ms`,
      `calls ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(1)}k`,
      `${pipeline.rw}×${pipeline.rh} ×${pipeline.factor}  ${world.ppm} px/m`,
      `tier ${tier.name}${governor.level ? ` -${governor.level}` : ''}  shadow ${world.settings.shadowMap}`,
      `chunks ${world.chunkCount}  atlases ${spriteAtlas().count}`,
      `houses ${world.houses.length}/${world.layout.houses.length}  furnished ${world.houseIndex.made}  chunks held ${world.placed.generatedChunks}`,
      magic,
    ].filter(Boolean).join('\n');
  }
  requestAnimationFrame(loop);
}

// Building the world takes a moment (ground painting); let the page paint first.
setTimeout(() => {
  const t0 = performance.now();
  // ?map=hamlet loads another map (see content/maps). ?world=192 makes the patch bigger, to see chunks stream in as you pan.
  const name = params.get('map') ?? 'spike';
  if (!(name in MAPS)) console.warn(`spike3d: no map called ${name}; maps are ${Object.keys(MAPS).join(', ')}`);
  const map = mapNamed(name in MAPS ? name : 'spike');
  if (map.problems.length) console.warn(`spike3d: map ${map.name} has problems:\n${map.problems.join('\n')}`);
  const size = Number(params.get('world')) || map.ground.size;
  world = new SpikeWorld({ shells: Math.min(2, tier.shells), lights: Math.min(3, tier.lights), shadowMap: tier.shadowMap }, TIERS.high.grass, { ...map, ground: { ...map.ground, size } });
  world.setGrass(tier.grass);
  if (!params.has('novision')) world.setVision(...VISION[tier.name]);
  pipeline.renderer.info.autoReset = false;
  fit();
  new ResizeObserver(fit).observe(stage);
  // Build the shaders of every kind of house now: one built when a new kind streams in later would stall the game.
  const warm = world.warmHouses();
  pipeline.renderer.compile(world.scene, world.camera);
  warm.done();
  buildControls();
  bindInput();
  loading.hidden = true;
  const built = performance.now() - t0;
  console.info(`spike3d: world built in ${built.toFixed(0)} ms`);
  (window as unknown as { spike: unknown }).spike = { world, pipeline, setTier, built, governor, get tier() { return tier; } };
  requestAnimationFrame((n) => {
    last = n;
    loop(n);
  });
}, 30);
