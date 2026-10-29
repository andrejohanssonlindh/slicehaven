import { type Sky, clockText } from '../core/environment';
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

function button(row: string, label: () => string, on: () => boolean, click: () => void): void {
  const el = document.createElement('button');
  el.type = 'button';
  const b: Btn = {
    el,
    refresh() {
      el.textContent = label();
      el.classList.toggle('on', on());
    },
  };
  el.addEventListener('click', () => {
    click();
    for (const x of buttons) x.refresh();
  });
  document.getElementById(row)!.appendChild(el);
  buttons.push(b);
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
  button('row-perf', () => t('spike.forget', 'Forget map'), () => false, () => { world.forgetMap(); });
  button('row-perf', () => t('spike.tier', 'Tier: {n}', { n: tier.name }), () => false, () => {
    setTier(cycle(['low', 'medium', 'high'] as TierName[], tier.name));
  });
  button('row-perf', () => t('spike.pixel', 'Pixel ×{n}', { n: pipeline.factor }), () => false, () => {
    pipeline.settings.pixelCss = cycle([0.5, 1, 1.5, 2, 3], pipeline.settings.pixelCss);
    fit();
  });
  button('row-perf', () => t('spike.shadow', 'Shadow {n}', { n: world.settings.shadowMap }), () => false, () => {
    world.settings.shadowMap = cycle([512, 1024, 2048, 4096], world.settings.shadowMap);
    world.setShadowMap(world.settings.shadowMap);
  });
  button('row-perf', () => t('spike.lights', 'Lights {n}', { n: world.settings.lights }), () => world.settings.lights > 0, () => {
    world.settings.lights = cycle([0, 1, 2, 3], world.settings.lights);
  });
  for (const b of buttons) b.refresh();
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
      `houses ${world.houses.length}/${world.layout.houses.length}  furnished ${world.houseIndex.made}`,
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
