import { LOOKS, type Look } from '../art/look';
import { VillageScene, type Placed, type VCell } from '../art/villageScene';
import { SECTIONS, VILLAGE } from './artSections';

/**
 * The "Village art" tab: concept studies for the village, each on its own
 * grass patch, plus a 5x5 hex mock-up with the full look (shadows, light, smoke).
 */

interface Live {
  scene: VillageScene;
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
}

const live: Live[] = [];
let look: Look = LOOKS.day;
let showFoot = false;
const FRAME_MS = 125;

function fit(canvas: HTMLCanvasElement, w: number, h: number, maxCss: number): void {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.floor((maxCss * dpr) / w));
  canvas.style.width = `${(w * k) / dpr}px`;
  canvas.style.height = `${(h * k) / dpr}px`;
}

function mount(parent: HTMLElement, scene: VillageScene, maxCss: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;
  fit(canvas, scene.width, scene.height, maxCss);
  parent.appendChild(canvas);
  live.push({ scene, canvas, ctx: canvas.getContext('2d')! });
}

let lastT = -1;
function tick(now: number): void {
  const t = Math.floor(now / FRAME_MS);
  if (t !== lastT) {
    lastT = t;
    for (const l of live) {
      const r = l.canvas.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) continue; // off screen
      l.scene.render(t, look, showFoot).drawTo(l.ctx);
    }
  }
  requestAnimationFrame(tick);
}

function strip(count: number, rows = 1, ground: VCell['ground'] = 'grass'): VCell[] {
  return Array.from({ length: count * rows }, (_, i) => ({ col: i % count, row: Math.floor(i / count), ground }));
}

export function mountStudio(root: HTMLElement): void {
  root.innerHTML = '';
  const intro = document.createElement('div');
  intro.className = 'art-intro';
  intro.innerHTML = `
    <h2>Village art studio</h2>
    <p>Concept round 1. Grass, flowers and the campfire are kept as they are. Everything else here is new or redone:
    rougher outlines, wear, lopsided shapes. Say which concept is solid and I'll make variations of it.</p>
    <div class="looks" role="group" aria-label="Lighting"></div>`;
  root.appendChild(intro);

  const looks = intro.querySelector('.looks') as HTMLElement;
  for (const [key, l] of Object.entries(LOOKS)) {
    const b = document.createElement('button');
    b.textContent = l.name;
    b.className = l === look ? 'on' : '';
    b.addEventListener('click', () => {
      look = l;
      looks.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      lastT = -1;
    });
    b.dataset.look = key;
    looks.appendChild(b);
  }
  const fb = document.createElement('button');
  fb.textContent = 'Footprints';
  fb.dataset.look = 'footprints';
  fb.addEventListener('click', () => {
    showFoot = !showFoot;
    fb.classList.toggle('on', showFoot);
    lastT = -1;
  });
  looks.appendChild(fb);

  // The 5x5 mock-up comes first: it is the point of all this.
  const hero = document.createElement('section');
  hero.innerHTML = `<h3>Mock-up: a 5×5 hex corner of the village</h3>
    <p>Placeholder layout, only to see the pieces together. The look buttons above change the lighting; try Dusk and Night.</p>`;
  const stage = document.createElement('div');
  stage.className = 'stage';
  hero.appendChild(stage);
  root.appendChild(hero);
  mount(stage, new VillageScene(VILLAGE.cells, VILLAGE.placed, { seed: 11, padTop: 76 }), 380);

  for (const s of SECTIONS) {
    const sec = document.createElement('section');
    sec.innerHTML = `<h3>${s.title}</h3><p>${s.note}</p>`;
    const row = document.createElement('div');
    row.className = 'stage';
    sec.appendChild(row);
    root.appendChild(sec);
    const cells = strip(s.cols, s.rows ?? 1);
    const placed: Placed[] = s.items;
    mount(row, new VillageScene(cells, placed, { seed: 5, padTop: s.padTop ?? 44, tufts: false }), s.maxWidth ?? 380);
  }
  requestAnimationFrame(tick);
}
