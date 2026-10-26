import { type CellArt, MapScene, type MobKind, type PropKind } from '../art/mapScene';
import type { Ground } from '../art/terrain';

// --- animation loop -------------------------------------------------------

interface Live {
  scene: MapScene;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
const live: Live[] = [];
const FRAME_MS = 125;

/** Size a canvas to an integer number of device pixels per art pixel. */
function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number, maxCssWidth: number): void {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.floor((maxCssWidth * dpr) / w));
  canvas.style.width = `${(w * k) / dpr}px`;
  canvas.style.height = `${(h * k) / dpr}px`;
}

function mount(parent: HTMLElement, scene: MapScene, maxCssWidth: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;
  fitCanvas(canvas, scene.width, scene.height, maxCssWidth);
  parent.appendChild(canvas);
  live.push({ scene, canvas, ctx: canvas.getContext('2d')! });
  return canvas;
}

let lastT = -1;
function tick(now: number): void {
  const t = Math.floor(now / FRAME_MS);
  if (t !== lastT) {
    lastT = t;
    for (const l of live) l.scene.render(t).drawTo(l.ctx);
  }
  requestAnimationFrame(tick);
}

// --- 1. forest scene -------------------------------------------------------

const LAYOUT = [
  'TPfgg~PT',
  'Pfgw~gfP',
  'fmgg~tgT',
  'fgp~tRgf',
  'Tgpg~ggB',
  'gRp~tgwg',
  'gg~~gogT',
  'P~ptggBf',
  'T~pgwfPT',
];

const RIVERS: Record<string, [number, number]> = {
  '5,0': [2, 4], '4,1': [1, 4], '4,2': [1, 4], '3,3': [1, 5], '4,4': [2, 4],
  '3,5': [1, 4], '3,6': [1, 3], '2,6': [0, 4], '1,7': [1, 4], '1,8': [1, 4],
};

const MOBS: Record<string, MobKind> = {
  '2,4': 'shepherd', '6,3': 'wolf', '6,5': 'wolf', '5,2': 'skeleton', '3,7': 'rat',
};

const CELL: Record<string, { ground: Ground; prop?: PropKind; obstacle?: boolean; pond?: boolean }> = {
  g: { ground: 'grass' },
  f: { ground: 'forest' },
  p: { ground: 'path' },
  t: { ground: 'tallgrass' },
  w: { ground: 'flowers' },
  m: { ground: 'forest', prop: 'mushrooms' },
  o: { ground: 'grass', pond: true },
  '~': { ground: 'grass' },
  T: { ground: 'forest', prop: 'tree', obstacle: true },
  P: { ground: 'forest', prop: 'pine', obstacle: true },
  R: { ground: 'grass', prop: 'rock', obstacle: true },
  B: { ground: 'grass', prop: 'thicket', obstacle: true },
};

const cells: CellArt[] = [];
LAYOUT.forEach((line, row) => {
  [...line].forEach((ch, col) => {
    const key = `${col},${row}`;
    cells.push({ col, row, ...CELL[ch], river: RIVERS[key], mob: MOBS[key], selected: key === '2,4' });
  });
});
mount(document.getElementById('scene')!, new MapScene(cells, { seed: 3 }), Math.min(860, window.innerWidth - 16));

// --- 2. tiles ----------------------------------------------------------------

const TILE_SAMPLES: { label: string; note: string; cell: Omit<CellArt, 'col' | 'row'> }[] = [
  { label: 'Grass', note: 'open ground', cell: { ground: 'grass' } },
  { label: 'Flowers', note: 'meadow', cell: { ground: 'flowers' } },
  { label: 'Forest floor', note: 'moss & leaf litter', cell: { ground: 'forest' } },
  { label: 'Path', note: 'dirt track', cell: { ground: 'path' } },
  { label: 'Tall grass', note: 'vegetation (difficult?)', cell: { ground: 'tallgrass' } },
  { label: 'Mushrooms', note: 'decoration', cell: { ground: 'forest', prop: 'mushrooms' } },
  { label: 'River', note: 'straight', cell: { ground: 'grass', river: [3, 0] } },
  { label: 'River', note: 'bend', cell: { ground: 'grass', river: [2, 5] } },
  { label: 'River', note: 'sharp bend', cell: { ground: 'grass', river: [1, 3] } },
  { label: 'Pond', note: 'water', cell: { ground: 'grass', pond: true } },
  { label: 'Oak', note: 'obstacle', cell: { ground: 'forest', prop: 'tree', obstacle: true } },
  { label: 'Pine', note: 'obstacle', cell: { ground: 'forest', prop: 'pine', obstacle: true } },
  { label: 'Boulder', note: 'obstacle', cell: { ground: 'grass', prop: 'rock', obstacle: true } },
  { label: 'Thicket', note: 'obstacle', cell: { ground: 'grass', prop: 'thicket', obstacle: true } },
];

function card(parent: HTMLElement, label: string, note: string, scene: MapScene): void {
  const el = document.createElement('div');
  el.className = 'card';
  parent.appendChild(el);
  mount(el, scene, 110);
  el.insertAdjacentHTML('beforeend', `<b>${label}</b><small>${note}</small>`);
}

const tilesEl = document.getElementById('tiles')!;
TILE_SAMPLES.forEach((s, i) => {
  card(tilesEl, s.label, s.note, new MapScene([{ col: 0, row: 0, ...s.cell }], { seed: 11 + i, padTop: 22, padSide: 2 }));
});

// --- 3. mobs -----------------------------------------------------------------

const mobsEl = document.getElementById('mobs')!;
const MOB_SAMPLES: { mob: MobKind; label: string; note: string }[] = [
  { mob: 'shepherd', label: 'Shepherd', note: 'starting hero' },
  { mob: 'rat', label: 'Cellar rat', note: 'first job' },
  { mob: 'wolf', label: 'Wolf', note: 'farm raid' },
  { mob: 'skeleton', label: 'Skeleton', note: 'Dead Forest' },
];
MOB_SAMPLES.forEach((m, i) => {
  card(mobsEl, m.label, m.note, new MapScene([{ col: 0, row: 0, ground: 'grass', mob: m.mob }], { seed: 40 + i, padTop: 14 }));
});

requestAnimationFrame(tick);
