import { LOOKS, type Look } from '../art/look';
import { VillageScene } from '../art/villageScene';
import { buildVillage } from '../content/village/build';
import { Camera } from '../engine/camera';

/**
 * Reedwater: the whole village on one map. Pan and zoom, change the light, tap a
 * house or a person to read about them, and step inside the furnished houses.
 * A sketch for now: nobody walks, nothing is hooked up yet.
 */

const village = buildVillage();
const scene = new VillageScene(village.cells, village.placed, { seed: 11, padTop: 120, padSide: 24 });

const canvas = document.getElementById('view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const offscreen = document.createElement('canvas');
offscreen.width = scene.width;
offscreen.height = scene.height;
const octx = offscreen.getContext('2d')!;
const card = document.getElementById('card')!;
const info = document.getElementById('info')!;
const looksEl = document.getElementById('looks')!;

let look: Look = LOOKS.day;
/** House tags whose roof is lifted so you see the inside. */
const inside = new Set<string>();

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function showCard(html: string): void {
  card.innerHTML = html;
  card.hidden = false;
}

function setInside(tag: string, on: boolean): void {
  const h = village.houses.find((x) => x.tag === tag);
  if (!h?.inside) return;
  scene.swap(tag, on ? h.inside : h.outside);
  if (on) inside.add(tag);
  else inside.delete(tag);
}

function openHouse(tag: string): void {
  const h = village.houses.find((x) => x.tag === tag);
  if (!h) return;
  const on = inside.has(tag);
  showCard(`<h2>${esc(h.def.name)}</h2><div class="sub">${esc(h.def.owner)}${h.def.room ? '' : ' · shut for now'}</div>`
    + `<p>${esc(h.def.blurb)}</p><div class="row">`
    + (h.inside ? `<button type="button" data-act="${on ? 'out' : 'in'}">${on ? 'Step outside' : 'Step inside'}</button>` : '')
    + '<button type="button" data-act="close">Close</button></div>');
  card.querySelector('[data-act="in"]')?.addEventListener('click', () => { setInside(tag, true); openHouse(tag); });
  card.querySelector('[data-act="out"]')?.addEventListener('click', () => { setInside(tag, false); openHouse(tag); });
  card.querySelector('[data-act="close"]')?.addEventListener('click', () => { card.hidden = true; });
}

function openFolk(tag: string): void {
  const e = village.villagers.find((x) => x.tag === tag);
  if (!e) return;
  showCard(`<h2>${esc(e.v.name)}</h2><div class="sub">${esc(e.v.role)}</div><p>${esc(e.v.doing)}</p>`
    + '<div class="row"><button type="button" data-act="close">Close</button></div>');
  card.querySelector('[data-act="close"]')?.addEventListener('click', () => { card.hidden = true; });
}

const camera = new Camera(canvas, scene.width, scene.height, (wx, wy) => {
  const hit = scene.hit(wx, wy);
  if (!hit) { card.hidden = true; return; }
  if (hit.startsWith('house:')) openHouse(hit);
  else openFolk(hit);
});

// Lighting buttons.
for (const [key, l] of Object.entries(LOOKS)) {
  if (key === 'flat') continue;
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = l.name;
  b.dataset.look = key;
  b.className = l === look ? 'on' : '';
  b.addEventListener('click', () => {
    look = l;
    looksEl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
  looksEl.appendChild(b);
}

info.innerHTML = `<b>Reedwater</b> · ${village.houses.length} houses, ${village.villagers.length} villagers<br>`
  + '<span>Drag to look around, pinch to zoom. Tap a house or a person. Furnished houses have an inside.</span>';

window.addEventListener('resize', () => camera.resize());
new ResizeObserver(() => camera.resize()).observe(document.getElementById('stage')!);
camera.fit();
for (const z of document.querySelectorAll<HTMLButtonElement>('[data-zoom]')) {
  z.addEventListener('click', () => {
    const step = Number(z.dataset.zoom);
    if (step === 0) camera.fit();
    else camera.zoomCenter(step);
  });
}

const FRAME_MS = 125;
let lastT = -1;
let lastCost = 0;
function frame(now: number): void {
  requestAnimationFrame(frame);
  const t = Math.floor(now / FRAME_MS);
  if (t === lastT) return;
  lastT = t;
  const t0 = performance.now();
  try {
    scene.render(t, look).drawTo(octx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.offX, camera.offY);
    ctx.drawImage(offscreen, 0, 0);
  } catch (err) {
    console.error('[village] frame error', err);
  }
  lastCost = performance.now() - t0;
}
requestAnimationFrame(frame);

// Debug hooks: drive it from the console or a browser test.
(window as unknown as { village: unknown }).village = {
  village, scene, camera,
  enter: (id: string) => setInside(`house:${id}`, true),
  leave: (id: string) => setInside(`house:${id}`, false),
  enterAll: () => { for (const h of village.houses) setInside(h.tag, true); },
  setLook: (key: string) => { look = LOOKS[key]; },
  cost: () => lastCost,
  /** The whole map at 1:1 as a PNG data URL. */
  snapshot: (key = 'day', t = 3) => {
    const c = document.createElement('canvas');
    c.width = scene.width;
    c.height = scene.height;
    scene.render(t, LOOKS[key]).drawTo(c.getContext('2d')!);
    return c.toDataURL('image/png');
  },
};
