import { type Sky, WIND_DIRS, clockText } from '../core/environment';
import { ASPECTS, LEVEL_NAMES } from '../core/filaments';
import { gearKinds } from '../content/things/gear';
import { MAPS, mapNamed } from '../content/maps';
import { clearWorld, loadWorld, saveWorld } from '../core/world3d/save';
import { rollPool, rollTable, rollTest } from '../core/dice';
import { Rng } from '../core/rng';
import { DICE_SKINS } from '../content/dice/skins';
import { showRolls } from '../ui/dice';
import { DICE_CLOSES, DICE_LEVELS, FIGHT_MODES, loadSettings, saveSettings } from '../ui/settings';
import { DIFFICULTIES, DIFFICULTY_RULES } from '../core/difficulty';
import { diceOf } from '../core/hero';
import { sightWord } from '../core/world3d/perceive';
import { Governor, TIERS, type DeviceInfo, type Tier, type TierName, pickTier, qualityAt } from '../core/world3d/tiers';
import { Pipeline } from '../engine3d/pipeline';
import { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { heroDoer, makeSheet, pageHero, whoseText } from './actsheet';
import { FEARSOME_MARKS } from '../content/people/temper';
import { makeTalk } from './talksheet';
import { makeCondition } from './condition';
import { makeFight } from './fight';
import { rollText } from './fight/words';
import { THINGS } from '../content/things';
import { thingName } from '../core/world3d/actions';
import { makeJournal } from './journal';
import { makePackSheet } from './packsheet';
import { HAUL_SKILL, carryCapacity } from '../core/world3d/carry';

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
  { id: 'game', name: t('spike.g.game', 'Game'), defs: [] },
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
const ROW_GROUP: Record<string, string> = { 'row-game': 'game', 'row-time': 'time', 'row-sky': 'weather', 'row-fx': 'fire', 'row-look': 'look', 'row-magic': 'magic', 'row-perf': 'view' };

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
  world.sky.setShadowMap(q.shadowMap);
  world.grass.setCount(q.grass);
  for (const b of buttons) b.refresh();
}

const cycle = <T>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length];

/**
 * The saved world (plan item B1): loaded at the start, written every few seconds and when the page is left. Off in
 * browser tests (they start fresh) unless `?save`; `?nosave` turns it off by hand.
 */
const saving = !params.has('nosave') && (!navigator.webdriver || params.has('save'));
let mapName = 'spike';
let saveOff = false;

function save(): void {
  if (!saving || saveOff || !world) return;
  saveWorld({ map: mapName, ...world.saveState() }, localStorage);
}

function buildControls(): void {
  const w = world.weather;
  // The game: a new game forgets this map's save. (Hearths and torches are lit and put out by tapping them: B3a.)
  button('row-game', () => t('spike.newgame', 'New game'), () => false, () => {
    saveOff = true;
    clearWorld(mapName, localStorage);
    location.reload();
  });
  // The one roll system (B2), to try until checks have something to act on: how rolls are shown (a setting every
  // page shares), which dice, and two rolls: a skill test that can split sixes, and a creator's table roll.
  const levelName = { glass: t('spike.dice.glass', 'Dice: on glass'), icons: t('spike.dice.icons', 'Dice: icons'), result: t('spike.dice.result', 'Dice: result') };
  button('row-game', () => levelName[loadSettings().dice], () => false, () => { saveSettings({ dice: cycle(DICE_LEVELS, loadSettings().dice) }); });
  const skins = Object.keys(DICE_SKINS).sort();
  button('row-game', () => t('spike.dice.skin', 'Skin: {name}', { name: t(`dice.skin.${loadSettings().diceSkin}`, DICE_SKINS[loadSettings().diceSkin]?.name ?? '?') }), () => false, () => {
    saveSettings({ diceSkin: cycle(skins, loadSettings().diceSkin) });
  });
  // How a fight is shown (B8g): fast (each exchange played out, its dice behind the log) or every roll step by step.
  const fightName = { fast: t('spike.fight.fast', 'Fights: fast'), dice: t('spike.fight.dice', 'Fights: dice') };
  button('row-game', () => fightName[loadSettings().fight], () => false, () => { saveSettings({ fight: cycle(FIGHT_MODES, loadSettings().fight) }); });
  // How hard the game is: on easy, sight rolls are shown and who sees or heard you is marked over their head (B5).
  const diffName = { easy: t('spike.diff.easy', 'Game: easy'), normal: t('spike.diff.normal', 'Game: normal'), hard: t('spike.diff.hard', 'Game: hard') };
  button('row-game', () => diffName[loadSettings().difficulty], () => loadSettings().difficulty === 'easy', () => {
    saveSettings({ difficulty: cycle(DIFFICULTIES, loadSettings().difficulty) });
    world.senses.showSenses = loadSettings().difficulty === 'easy';
    world.fights.restMinutes = DIFFICULTY_RULES[loadSettings().difficulty].restMinutes;
  });
  // Sight is rolled on entering the map and every six world hours; this rolls it now (as waking will).
  button('row-game', () => t('spike.rollsight', 'Roll sight'), () => false, () => { world.senses.rerollSight(); });
  const closeName = { ok: t('spike.dice.closeok', 'Rolls: press OK'), auto: t('spike.dice.closeauto', 'Rolls: go by themselves') };
  button('row-game', () => closeName[loadSettings().diceClose], () => false, () => { saveSettings({ diceClose: cycle(DICE_CLOSES, loadSettings().diceClose) }); });
  const diceRng = Rng.fromSeed(Date.now() >>> 0);
  button('row-game', () => t('spike.roll4d6', 'Roll 4D6 vs 14'), () => false, () => { void showRolls([rollTest({ n: 4, mod: 0 }, 14, diceRng, t('spike.testroll', 'Test'))]); });
  button('row-game', () => t('spike.roll10d6', 'Roll 10D6+2'), () => false, () => { void showRolls([rollTest({ n: 10, mod: 2 }, 35, diceRng, t('spike.testroll', 'Test'))]); });
  button('row-game', () => t('spike.rolld10', 'Roll D10+2'), () => false, () => { void showRolls([rollPool({ n: 1, mod: 2 }, diceRng, t('spike.sumroll', 'Sum'), 10)]); });
  button('row-game', () => t('spike.rolld100', 'Roll D100'), () => false, () => { void showRolls([rollTable(100, diceRng, t('spike.tableroll', 'Table'))]); });
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
  button('row-fx', () => t('spike.strike', 'Lightning'), () => false, () => { world.sky.strike(); });
  button('row-fx', () => t('spike.autobolts', 'Storm bolts'), () => world.sky.autoBolts, () => { world.sky.autoBolts = !world.sky.autoBolts; });
  button('row-fx', () => t('spike.fire', 'Fire ({n})', { n: world.lights.campfires }), () => world.lights.campfires > 0, () => {
    if (!world.lights.lightFire()) notify(t('spike.toomanyfires', 'That is enough fires.'));
  });
  button('row-fx', () => t('spike.douse', 'Douse'), () => false, () => { world.lights.douseFires(); });

  button('row-fx', () => t('spike.torch', 'Torch'), () => world.lights.torchOn, () => { world.lights.toggleTorch(); });
  button('row-fx', () => t('spike.orb', 'Light orb'), () => world.lights.orbOn, () => { world.lights.toggleOrb(); });
  button('row-fx', () => t('spike.ray', 'Light ray'), () => world.lights.rayOn, () => { world.lights.toggleRay(); });
  button('row-fx', () => t('spike.speed', 'Walk ×{n}', { n: world.speedMul }), () => world.speedMul > 1, () => { world.speedMul = cycle([1, 2, 3], world.speedMul); });

  button('row-look', () => t('spike.inside', 'Inside'), () => world.housing.inside, () => { world.housing.inside = !world.housing.inside; });
  button('row-look', () => t('spike.up', 'Upstairs'), () => world.heroLevel > 0, () => {
    if (world.climb(1) === null) notify(t('spike.nostairs', 'No stairs up from here.'));
  });
  button('row-look', () => t('spike.down', 'Downstairs'), () => false, () => {
    if (world.climb(-1) === null) notify(t('spike.nostairsdown', 'No stairs down from here.'));
  });
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
    const a = world.filaments.shownAspect;
    return a ? t('spike.magic', 'Filaments: {n}', { n: ASPECTS.find((x) => x.id === a)!.gloss }) : t('spike.magicoff', 'Filaments: off');
  }, () => world.filaments.shownAspect !== null, () => {
    const ids = [null, ...ASPECTS.map((x) => x.id)] as const;
    world.filaments.showFilaments(ids[(ids.indexOf(world.filaments.shownAspect as never) + 1) % ids.length]);
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
  button('row-perf', () => (world.sky.mistAmount > 0 ? t('spike.mist', 'Fog {n}%', { n: Math.round(world.sky.mistAmount * 100) }) : t('spike.mistoff', 'Fog: weather')), () => world.sky.mistAmount > 0, () => {
    world.sky.setMist(cycle([0, 0.25, 0.5, 0.75, 1], world.sky.mistAmount));
  }, 'fog');
  button('row-perf', () => t('spike.forget', 'Forget map'), () => false, () => { world.sight.forgetMap(); });
  button('row-perf', () => t('spike.tier', 'Tier: {n}', { n: tier.name }), () => false, () => {
    setTier(cycle(['low', 'medium', 'high'] as TierName[], tier.name));
  }, 'perf');
  button('row-perf', () => t('spike.pixel', 'Pixel ×{n}', { n: pipeline.factor }), () => false, () => {
    pipeline.settings.pixelCss = cycle([0.5, 1, 1.5, 2, 3], pipeline.settings.pixelCss);
    fit();
  }, 'perf');
  button('row-perf', () => t('spike.shadow', 'Shadow {n}', { n: world.settings.shadowMap }), () => false, () => {
    world.settings.shadowMap = cycle([512, 1024, 2048, 4096], world.settings.shadowMap);
    world.sky.setShadowMap(world.settings.shadowMap);
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
    adminButton('fog', () => (v === 0 ? t('spike.fogauto', 'Auto') : `${Math.round(v * 100)}%`), () => Math.abs(world.sky.mistAmount - v) < 0.01, () => { world.sky.setMist(v); });
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
  // Steering by keys: WASD or the arrows (screen up, left, down, right); the world reads `input` every frame.
  const held = new Set<string>();
  // Q and E turn the view.
  const KEYS: Record<string, string> = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', q: 'turnl', e: 'turnr' };
  const steer = (): void => {
    world.input.right = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    world.input.up = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
    world.turnInput = (held.has('turnr') ? 1 : 0) - (held.has('turnl') ? 1 : 0);
  };
  window.addEventListener('keydown', (e) => {
    const k = KEYS[e.key.toLowerCase()];
    if (!k || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
    e.preventDefault();
    held.add(k);
    steer();
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYS[e.key.toLowerCase()];
    if (k) { held.delete(k); steer(); }
  });
  window.addEventListener('blur', () => { held.clear(); steer(); });
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

// --- input: drag to pan, tap the ground to walk, tap the house to step inside, tap a thing to act, zoom buttons and wheel ---

/** How far from a thing (CSS px) a tap still means it. */
const TAP_SLACK = 22;
/** The hero who acts and talks: the creator's character, or the shepherd. */
const hero = pageHero();
const doer = heroDoer(hero);
/** The sheet a tapped thing opens (plan B3a). */
/** The journal of leads (plan B11). */
const journal = makeJournal(() => world);
const sheet = makeSheet(() => world, notify, save, doer, journal.added);
/** The hero's pockets and pack (plan B6, the "Pack" button). */
const packSheet = makePackSheet(() => world, () => carryCapacity(doer.dice('attr:Kroppsbyggnad'), doer.dice(HAUL_SKILL), doer.load ?? 0), notify, save);
/** Talking to someone tapped (plan B3d). */
/** A fight with someone tapped (plan B8a): it takes over from the talk, and the world waits while it lasts. */
/** The hero's condition: fatigue and where it came from, dice off rolls, wounds (the "You" button). */
const condition = makeCondition(() => world, hero);
/** The zoom before a fight, given back when it ends (a fight starts closer in: the tier's `fightZoom`). */
let zoomBeforeFight: number | null = null;
const fight = makeFight(() => world, hero, notify, save, () => {
  saveOff = true;
  clearWorld(mapName, localStorage);
  location.reload();
}, condition, {
  on: (on) => {
    if (on && zoomBeforeFight === null) {
      zoomBeforeFight = zoomIndex;
      zoomIndex = tier.fightZoom;
    } else if (!on && zoomBeforeFight !== null) {
      zoomIndex = zoomBeforeFight;
      zoomBeforeFight = null;
    }
    fit();
  },
  // The closest zoom (the fight's own at most) at which both fighters fit the free part of the screen: `span` metres
  // across, and a body's height (FIT_TALL) up. A metre is ppm rendered pixels, a rendered pixel factor/dpr CSS pixels.
  fit: (span, width, height) => {
    const css = pipeline.factor / (window.devicePixelRatio || 1);
    let i = tier.fightZoom;
    while (i > 0 && (tier.zooms[i] * css * span > width || tier.zooms[i] * css * FIT_TALL > height)) i--;
    if (i !== zoomIndex) {
      zoomIndex = i;
      fit();
    }
  },
});
/** How tall the fitted fight view must be, metres: a body and what floats over it. */
const FIT_TALL = 3.2;
const talk = makeTalk(() => world, () => pipeline.renderer, hero, doer, notify, save, journal.added, (id) => fight.start(id), (id) => void condition.examine(id));

function bindInput(): void {
  let down: { x: number; y: number; id: number; moved: number } | null = null;
  // Two fingers twist the view round what it looks at (and the gesture is never a tap or a pan).
  const touches = new Map<number, { x: number; y: number }>();
  let twist: number | null = null;
  const twistAngle = (): number => {
    const [a, b] = [...touches.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  const endTouch = (e: PointerEvent): void => {
    touches.delete(e.pointerId);
    if (touches.size < 2) twist = null;
  };
  canvas.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      twist = twistAngle();
      down = null;
      return;
    }
    if (touches.size > 2) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointercancel', endTouch);
  canvas.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (twist !== null && touches.size === 2) {
      const a = twistAngle();
      let d = a - twist;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      world.turn(d);
      twist = a;
      return;
    }
    if (!down || e.pointerId !== down.id) return;
    const k = (window.devicePixelRatio || 1) / pipeline.factor; // CSS px to rendered px
    const dx = (e.clientX - down.x) * k, dy = (e.clientY - down.y) * k;
    down.moved += Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down.x = e.clientX;
    down.y = e.clientY;
    world.pan(dx, dy);
  });
  canvas.addEventListener('pointerup', (e) => {
    endTouch(e);
    if (!down || e.pointerId !== down.id) return;
    if (down.moved < 8) {
      // In a fight a tap plans the round's move: a spot on the ground, or a weapon lying there (the panel offers it).
      if (fight.on) {
        const r = canvas.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
        const slack = { x: TAP_SLACK / (r.width / 2), y: TAP_SLACK / (r.height / 2) };
        const hit = world.acting.tapped(nx, ny, slack);
        fight.tap(hit && typeof hit === 'object' && !('person' in hit) ? hit.id : null, world.groundAt(nx, ny));
        down = null;
        return;
      }
      // Knocked out (left lying after a fight): nothing to do but come round, as fatigue goes.
      const hurt = world.fights.injuriesOf('hero');
      if (hurt?.out) {
        notify(t('spike.out', 'You are knocked out. You come round when your fatigue is gone ("You" shows it).'));
        down = null;
        return;
      }
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      // A tap on a thing (or near enough, on a phone) shows what it is and what can be tried; on the hero, the spot they stand on.
      const slack = { x: TAP_SLACK / (r.width / 2), y: TAP_SLACK / (r.height / 2) };
      const hit = e.shiftKey ? null : world.acting.tapped(nx, ny, slack);
      if (hit && typeof hit === 'object' && 'person' in hit) {
        sheet.close();
        talk.open(hit.person);
        down = null;
        return;
      }
      if (hit) {
        talk.close();
        sheet.open(hit === 'hero' ? null : hit);
        down = null;
        return;
      }
      sheet.close();
      talk.close();
      const house = e.shiftKey ? world.housing.pick(nx, ny) : world.housing.houseTapped(nx, ny);
      if (e.shiftKey && house !== null) {
        // Dev: shift-click lifts or lowers that roof by hand.
        world.housing.toggleRoof(house);
        for (const b of buttons) b.refresh();
      } else if (!world.heroIndoors && house !== null) {
        // Outside, tapping a house walks in through its door.
        if (world.walkIn(house) === null) notify(t('spike.noway', 'There is no way there.'));
      } else {
        // Otherwise tap the ground and the hero walks there, round whatever is in the way.
        // (On an upper floor the tap lands on that floor, and a tap on the stairs changes storey.)
        const at = world.tapPoint(nx, ny);
        if (at && world.walkTo(at.x, at.z, at.level) === null) notify(t('spike.noway', 'There is no way there.'));
      }
    }
    down = null;
  });
  const zoom = (d: number): void => {
    // (The closest step is a fight's own: walking about stops one short of it.)
    const max = fight.on ? tier.zooms.length - 1 : Math.min(tier.zooms.length - 1, tier.fightZoom - 1);
    zoomIndex = Math.max(0, Math.min(max, zoomIndex + d));
    fit();
  };
  for (const b of document.querySelectorAll<HTMLButtonElement>('#zoom button')) {
    b.addEventListener('click', () => zoom(Number(b.dataset.zoom)));
  }
  // The turn buttons turn the view while held.
  for (const b of document.querySelectorAll<HTMLButtonElement>('#turn button')) {
    const dir = Number(b.dataset.turn);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      world.turnInput = dir;
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(ev, () => { if (world.turnInput === dir) world.turnInput = 0; });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    // A sideways two-finger swipe on a trackpad turns the view (Chrome never passes the trackpad's own twist to a page).
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      world.turn(e.deltaX * 0.004);
      return;
    }
    if (e.deltaY !== 0) zoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  // Safari does pass the trackpad's twist, as a gesture with a rotation in degrees.
  let gestureAt = 0;
  type Gesture = Event & { rotation: number };
  canvas.addEventListener('gesturestart', (e) => { e.preventDefault(); gestureAt = (e as Gesture).rotation; });
  canvas.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    const r = (e as Gesture).rotation;
    world.turn(((r - gestureAt) * Math.PI) / 180);
    gestureAt = r;
  });
}

// --- the loop and the numbers -------------------------------------------------

const stairsEl = document.getElementById('stairs')!;
for (const b of stairsEl.querySelectorAll<HTMLButtonElement>('button')) {
  b.addEventListener('click', () => {
    if (world.climb(Number(b.dataset.climb) as 1 | -1) === null) notify(t('spike.nostairs', 'No stairs that way.'));
  });
}
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
    const shown = world.filaments.shownAspect;
    let magic = '';
    if (shown) {
      const r = world.filaments.heroReading()[shown];
      const info = ASPECTS.find((x) => x.id === shown)!;
      magic = `${info.name} at hero: ${r.level > 0 ? '+' : ''}${r.level} ${LEVEL_NAMES[r.level]}\n` + r.parts.map((p) => `  ${p.value > 0 ? '+' : ''}${p.value.toFixed(1)} ${p.label}`).join('\n');
    }
    statsEl.textContent = [
      `${fps.toFixed(0)} fps  cpu ${med.toFixed(1)} ms`,
      `calls ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(1)}k`,
      `${pipeline.rw}×${pipeline.rh} ×${pipeline.factor}  ${world.ppm} px/m`,
      `tier ${tier.name}${governor.level ? ` -${governor.level}` : ''}  shadow ${world.settings.shadowMap}`,
      `chunks ${world.streaming.chunkCount}`,
      `houses ${world.houses.length}/${world.layout.houses.length}  furnished ${world.houseIndex.made}  chunks held ${world.placed.generatedChunks}`,
      magic,
    ].filter(Boolean).join('\n');
  }
  sheet.tick();
  talk.tick();
  // The stairs buttons show what can be climbed from where the hero is.
  const hint = world.stairsHint;
  stairsEl.hidden = !hint.up && !hint.down;
  stairsEl.querySelector<HTMLElement>('[data-climb="1"]')!.hidden = !hint.up;
  stairsEl.querySelector<HTMLElement>('[data-climb="-1"]')!.hidden = !hint.down;
  requestAnimationFrame(loop);
}

// Building the world takes a moment (ground painting); let the page paint first.
setTimeout(() => {
  const t0 = performance.now();
  // ?map=hamlet loads another map (see content/maps). ?world=192 makes the patch bigger, to see chunks stream in as you pan.
  const name = params.get('map') ?? 'spike';
  if (!(name in MAPS)) console.warn(`spike3d: no map called ${name}; maps are ${Object.keys(MAPS).join(', ')}`);
  // The map picker in the top bar: every map there is; picking one loads the page again with it (other settings kept).
  const pick = document.getElementById('map-pick') as HTMLSelectElement;
  for (const m of Object.keys(MAPS).sort()) pick.add(new Option(m[0].toUpperCase() + m.slice(1), m));
  pick.value = name in MAPS ? name : 'spike';
  pick.addEventListener('change', () => {
    params.set('map', pick.value);
    location.search = params.toString();
  });
  const map = mapNamed(name in MAPS ? name : 'spike');
  mapName = map.name;
  if (map.problems.length) console.warn(`spike3d: map ${map.name} has problems:\n${map.problems.join('\n')}`);
  const size = Number(params.get('world')) || map.ground.size;
  world = new SpikeWorld({ shells: Math.min(2, tier.shells), lights: Math.min(3, tier.lights), shadowMap: tier.shadowMap }, TIERS.high.grass, { ...map, ground: { ...map.ground, size } });
  world.grass.setCount(tier.grass);
  // Perception (B5): the hero sees with their own Alertness (and a tirak's darkvision); sight is rolled against 8,
  // shown on easy (the dice, and how sharp it is), rolled unseen otherwise.
  const units = (id: string): number => { const d = diceOf(hero, id); return d.n * 4 + d.mod; };
  if (units('attr:Vaksamhet') > 0) world.alertness = units('attr:Vaksamhet');
  world.senses.darkSight = Math.min(1, units('F:Mörkersyn') / 12);
  world.senses.showSenses = loadSettings().difficulty === 'easy';
  world.fights.restMinutes = DIFFICULTY_RULES[loadSettings().difficulty].restMinutes;
  // Owners and the scale (B3c): who the hero is, as the people see them; and what they say unasked.
  world.heroWho = { kind: hero.kind, people: hero.people, tags: hero.tags };
  world.onSpeak = (_who, name, text) => notify(`${name}: "${text}"`);
  world.onNote = (text) => notify(text);
  // How dangerous the hero looks: their physique and fearsome marks (scars…); weapons shown come with items.
  world.owners.heroLook = { physique: units('attr:Kroppsbyggnad') || 10, marks: FEARSOME_MARKS.filter((m) => diceOf(hero, m).n > 0).length, weapons: 0, tags: hero.tags ?? [] };
  // Stepping into a house, or another room of it: whose it is (names on easy) and whether it is open to you.
  world.owners.onEnterPlace = (at) => {
    const line = whoseText(world.owners.whoseAt(at), loadSettings().difficulty === 'easy');
    if (line && at.house) notify(line);
  };
  // Noticing something lying about as it comes into view (plan B8): in a fight its log says it, else a line (with
  // the roll on easy).
  world.senses.onNotice = (id, kind, roll) => {
    if (fight.on) return fight.noticed(id, roll);
    const nums = roll && loadSettings().difficulty === 'easy' ? ` (${t('fight.roll.Alertness', 'Alertness')} ${rollText(roll)})` : '';
    const name = thingName(THINGS.get(kind));
    notify(t('spike.noticed', 'You notice {what} on the ground{roll}.', { what: `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`, roll: nums }));
  };
  world.senses.onSightRoll = (who, roll, sight) => {
    if (who !== 'hero' || loadSettings().difficulty !== 'easy') return;
    void showRolls([{ ...roll, label: t('spike.sight', 'Sight') }]).then(() => {
      notify(t(`spike.sight.${sightWord(sight)}`, {
        poor: 'Your sight is poor for now: a narrow, short view.',
        clear: 'Your sight is clear.',
        sharp: 'Your sight is sharp: you see farther and wider.',
        keen: 'Your sight is keen: you see far and wide.',
      }[sightWord(sight)]));
    });
  };
  if (!params.has('novision')) world.setVision(...VISION[tier.name]);
  pipeline.renderer.info.autoReset = false;
  fit();
  new ResizeObserver(fit).observe(stage);
  // Build the shaders of every kind of house now: one built when a new kind streams in later would stall the game.
  const warm = world.housing.warm();
  pipeline.renderer.compile(world.scene, world.camera);
  warm.done();
  const saved = saving ? loadWorld(mapName, localStorage) : null;
  if (saved) {
    world.loadState(saved);
    notify(t('spike.welcomeback', 'The world is as you left it. (New game in the panel starts over.)'));
  }
  // The hero's own gear (the director: use what you have from creation), carried on them until drawn.
  const gear = gearKinds(hero.gear ?? []);
  world.gear.outfit(gear.kinds, `${hero.from}:${hero.name}:${(hero.gear ?? []).join(',')}`);
  fight.check();
  if (saving) {
    setInterval(save, 5000);
    addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }
  buildControls();
  bindInput();
  loading.hidden = true;
  const built = performance.now() - t0;
  console.info(`spike3d: world built in ${built.toFixed(0)} ms`);
  (window as unknown as { spike: unknown }).spike = { world, pipeline, setTier, built, governor, fight, sheet, packSheet, hero, get tier() { return tier; } };
  requestAnimationFrame((n) => {
    last = n;
    loop(n);
  });
}, 30);
