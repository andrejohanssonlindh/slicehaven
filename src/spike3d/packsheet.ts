import { THINGS } from '../content/things';
import { thingName } from '../core/world3d/actions';
import { kgText } from '../core/world3d/carry';
import { type Grid, type PackItem, type PackSpot, type Side, PACK, SIDE, SIDES, coverOf, extent, turned } from '../core/world3d/inventory';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';

/**
 * The pack sheet (plan B6; rules `core/world3d/inventory.ts`, the world's part `engine3d/world/pack.ts`): the hero's
 * pockets, and the pack with a column on each side for an add-on. Phone first, no dragging: **tap a thing** to pick it,
 * **tap a cell** to lay it there (its top left), *Turn* it, *Take out* into a hand, *Put down* on the ground, *Fit* an
 * add-on on a side, or *Auto-pack* everything. What you hold can be put in from here too.
 */
export interface PackSheet {
  open(): void;
  /** Draw it again if it is open (something was packed or taken out elsewhere). */
  refresh(): void;
}

/** A colour for a kind of thing (its hue from its id): the art waits for the game's style. */
function hueOf(kind: string): number {
  let h = 0;
  for (const ch of kind) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

const nameOf = (kind: string): string => (THINGS.has(kind) ? t(`thing.${kind}.name`, thingName(THINGS.get(kind))) : kind);

export function makePackSheet(world: () => SpikeWorld, capacity: () => number, notify: (s: string) => void, save: () => void): PackSheet {
  const el = document.getElementById('pack')!, body = el.querySelector<HTMLElement>('.body')!;
  const openBtn = document.getElementById('pack-open')!;
  let picked: string | null = null;

  const close = (): void => {
    el.hidden = true;
    picked = null;
  };
  el.querySelector('.close')!.addEventListener('click', close);
  openBtn.addEventListener('click', () => (el.hidden ? open() : close()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) close(); });

  /** After a change: draw again and save. */
  const changed = (ok: boolean, no?: string): void => {
    if (!ok && no) notify(no);
    if (ok) save();
    render();
  };

  /** The cell size that lets the pack and both sides fit the sheet's width. */
  const cellPx = (cols: number): number => Math.max(26, Math.min(44, Math.floor((el.clientWidth - 40) / cols)));

  /** One grid, its cells and the things lying in it. */
  function gridEl(g: Grid, items: readonly PackItem[], px: number): HTMLElement {
    const box = document.createElement('div');
    box.className = 'grid';
    box.dataset.grid = g.id;
    box.style.width = `${g.w * px}px`;
    box.style.height = `${g.h * px}px`;
    box.style.setProperty('--cell', `${px}px`);
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'cell';
        c.style.left = `${x * px}px`;
        c.style.top = `${y * px}px`;
        c.setAttribute('aria-label', t('pack.cell', 'Cell {x},{y}', { x: x + 1, y: y + 1 }));
        c.addEventListener('click', () => tapCell(g, x, y));
        box.appendChild(c);
      }
    }
    const loose = world().carry.loose;
    for (const it of items) {
      if (it.at?.grid !== g.id) continue;
      const kind = loose[it.id]?.kind ?? '?', hue = hueOf(kind);
      const cover = coverOf(it.cells, it.at);
      const has = new Set(cover.map(([x, y]) => `${x},${y}`));
      // (Borders only on the shape's outer edges, so it reads as one thing.)
      const edge = (x: number, y: number): string => (has.has(`${x},${y}`) ? '0' : '1px');
      for (const [x, y] of cover) {
        const p = document.createElement('button');
        p.type = 'button';
        p.className = `item${picked === it.id ? ' picked' : ''}`;
        p.dataset.id = it.id;
        p.style.left = `${x * px}px`;
        p.style.top = `${y * px}px`;
        p.style.background = `hsl(${hue} 35% 32%)`;
        p.style.borderColor = `hsl(${hue} 40% 55%)`;
        p.style.borderWidth = `${edge(x, y - 1)} ${edge(x + 1, y)} ${edge(x, y + 1)} ${edge(x - 1, y)}`;
        p.setAttribute('aria-label', nameOf(kind));
        p.addEventListener('click', () => tapItem(it.id, g, x, y));
        box.appendChild(p);
      }
      // The name, across the first row of the shape.
      const first = [...cover].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
      let run = 1;
      while (has.has(`${first[0] + run},${first[1]}`)) run++;
      const label = document.createElement('span');
      label.className = 'label';
      label.style.left = `${first[0] * px}px`;
      label.style.top = `${first[1] * px}px`;
      label.style.width = `${run * px}px`;
      label.textContent = nameOf(kind);
      box.appendChild(label);
    }
    return box;
  }

  /** A side of the pack: the add-on's grid, or an empty slot. */
  function sideEl(side: Side, sides: number, grids: readonly Grid[], items: readonly PackItem[], px: number): HTMLElement {
    const col = document.createElement('div');
    col.className = `side ${side}`;
    const g = grids.find((x) => x.id === SIDE(side));
    if (g) {
      col.appendChild(gridEl(g, items, px));
      const off = document.createElement('button');
      off.type = 'button';
      off.className = 'off';
      off.textContent = t('pack.takeoff', 'Take off');
      off.addEventListener('click', () => changed(world().pack.unfit(side), t('pack.notempty', 'Empty it first.')));
      col.appendChild(off);
    } else if (SIDES.indexOf(side) < sides) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.width = `${2 * px}px`;
      slot.textContent = t('pack.noaddon', 'no add-on');
      col.appendChild(slot);
    }
    return col;
  }

  function tapItem(id: string, g: Grid, x: number, y: number): void {
    if (picked === id) picked = null;
    else if (picked) return tapCell(g, x, y);
    else picked = id;
    render();
  }

  /** With a thing picked, a tapped cell is where its top left goes (kept inside the grid). */
  function tapCell(g: Grid, x: number, y: number): void {
    if (!picked) return;
    const w = world(), l = w.carry.loose[picked];
    const it = w.pack.items.find((i) => i.id === picked);
    if (!l?.in || !it) return;
    // (On another grid, it keeps its turn; it is moved back inside if it would hang over the edge.)
    const { w: sw, h: sh } = extent(turned(it.cells, l.in.turn));
    const at: PackSpot = { grid: g.id, x: Math.max(0, Math.min(x, g.w - sw)), y: Math.max(0, Math.min(y, g.h - sh)), turn: l.in.turn };
    const ok = w.pack.move(picked, at);
    if (ok) picked = null;
    changed(ok, t('pack.nofit', "It doesn't fit there."));
  }

  function button(label: string, on: () => void, cls = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', on);
    return b;
  }

  function render(): void {
    const w = world(), pack = w.pack, loose = w.carry.loose;
    const grids = pack.grids, items = pack.items;
    if (picked && !loose[picked]?.in) picked = null;
    body.replaceChildren();

    const weight = document.createElement('p');
    weight.className = 'weight';
    const have = pack.carriedKg, can = capacity();
    weight.textContent = t('pack.weight', 'You carry {have} of {can}.', { have: kgText(have), can: kgText(can) });
    if (have > can) weight.classList.add('over');
    body.appendChild(weight);

    // What is in hand, to put in from here.
    const heldId = w.carry.held ?? w.carry.left, held = heldId ? loose[heldId] : null;
    if (held && heldId) {
      const row = document.createElement('div');
      row.className = 'hand';
      const s = document.createElement('span');
      s.textContent = t('pack.inhand', 'In hand: {name}', { name: nameOf(held.kind) });
      row.appendChild(s);
      if (pack.spotFor(held.kind, heldId)) row.appendChild(button(t('pack.putin', 'Put in pack'), () => changed(pack.stashHeld(heldId))));
      body.appendChild(row);
    }

    const pockets = grids.filter((g) => g.id.startsWith('pocket:'));
    const px = cellPx(9);
    if (pockets.length) {
      const h = document.createElement('h3');
      h.textContent = t('pack.pockets', 'Pockets');
      body.appendChild(h);
      const row = document.createElement('div');
      row.className = 'row pockets';
      for (const g of pockets) row.appendChild(gridEl(g, items, px));
      body.appendChild(row);
    }
    const main = grids.find((g) => g.id === PACK), worn = pack.worn;
    if (main && worn) {
      const h = document.createElement('h3');
      h.textContent = nameOf(worn.l.kind);
      body.appendChild(h);
      const sides = THINGS.get(worn.l.kind).bag?.sides ?? 0;
      const row = document.createElement('div');
      row.className = 'row packrow';
      row.appendChild(sideEl('left', sides, grids, items, px));
      row.appendChild(gridEl(main, items, px));
      row.appendChild(sideEl('right', sides, grids, items, px));
      body.appendChild(row);
    } else {
      const p = document.createElement('p');
      p.className = 'none';
      p.textContent = t('pack.nopack', 'You wear no pack.');
      body.appendChild(p);
    }

    // The picked thing: what it is and what can be done with it.
    const bar = document.createElement('div');
    bar.className = 'bar';
    if (picked) {
      const l = loose[picked], def = THINGS.get(l.kind);
      const what = document.createElement('p');
      what.className = 'what';
      what.textContent = `${nameOf(l.kind)}, ${kgText(def.weight ?? 0)}. ${t('pack.tapcell', 'Tap a cell to move it.')}`;
      bar.appendChild(what);
      const id = picked;
      bar.appendChild(button(t('pack.turn', 'Turn'), () => changed(pack.turn(id), t('pack.noturn', 'No room to turn it here.'))));
      bar.appendChild(button(t('pack.takeout', 'Take out'), () => {
        const ok = pack.takeOut(id);
        if (ok) picked = null;
        changed(ok, t('pack.handsfull', 'Your hands are full.'));
      }));
      bar.appendChild(button(t('pack.drop', 'Put down'), () => {
        const ok = pack.drop(id);
        if (ok) picked = null;
        changed(ok);
      }));
      if (def.addon) bar.appendChild(button(t('pack.fit', 'Fit on the side'), () => {
        const ok = pack.fit(id);
        if (ok) picked = null;
        changed(ok, t('pack.nosides', 'No free side on your pack.'));
      }));
    } else {
      const what = document.createElement('p');
      what.className = 'what';
      what.textContent = items.length ? t('pack.tapthing', 'Tap a thing to pick it.') : t('pack.empty', 'Nothing in your pockets or pack.');
      bar.appendChild(what);
    }
    bar.appendChild(button(t('pack.auto', 'Auto-pack'), () => changed(pack.autoPack(), t('pack.noauto', "It won't all fit any better.")), 'auto'));
    body.appendChild(bar);
  }

  function open(): void {
    el.hidden = false;
    render();
  }

  return { open, refresh: () => { if (!el.hidden) render(); } };
}
