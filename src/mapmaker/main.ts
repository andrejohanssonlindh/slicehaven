import { MAPS, compile } from '../content/maps';
import { CHUNK } from '../core/world3d/chunks';
import { THINGS } from '../content/things';
import { type MapEdit, type Pick, applyEdit, mapToJson, pickAt, pickLabel } from '../core/world3d/mapedit';
import type { CompiledMap, MapSpec } from '../core/world3d/mapgen';
import type { XZ } from '../core/world3d/terrain';
import { t } from '../i18n';
import { draftNames, dropDraft, loadDraft, saveDraft } from './drafts';
import { Plan } from './plan';

/**
 * The map maker (plan C5): a map file seen from above, edited by hand (things, trees, houses at a spot, notes),
 * kept as a draft in this browser, sent to Claude by copying it or (on the dev server) saved straight to its file.
 * The edits are `core/world3d/mapedit.ts`. Design: director/design/map-maker.md.
 *
 * URL: `?map=<name>`; `?shot` shows only the plan, fitted, for a picture (`npm run map:shot`).
 */

const params = new URLSearchParams(location.search);
const shot = params.has('shot');
const canvas = document.getElementById('plan') as HTMLCanvasElement;
const plan = new Plan(canvas);
const $ = (id: string): HTMLElement => document.getElementById(id)!;
const selEl = $('sel'), toolsEl = $('tools'), fileEl = $('file'), problemsEl = $('problems'), hintEl = $('hint');
const dlg = $('dlg') as HTMLDialogElement, dlgForm = $('dlg-form') as HTMLFormElement;

// --- state ------------------------------------------------------------------

let name = params.get('map') ?? 'hamlet';
let spec: MapSpec;
let map: CompiledMap;
let pick: Pick | null = null;
let undo: MapSpec[] = [];
let redo: MapSpec[] = [];
/** What a tap on the plan does: pick, or place what was chosen. */
let mode: { kind: 'pick' } | { kind: 'thing'; thing: string; tree: boolean } | { kind: 'note' } = { kind: 'pick' };
/** A thing made by a rule that was tapped (told about, not editable). */
let ruled: string | null = null;

function build(s: MapSpec): CompiledMap {
  try {
    return compile(s);
  } catch (e) {
    // A map so broken it does not compile: show the file's own map instead, and say why.
    console.error(e);
    return { ...compile(MAPS.arena), problems: [`the map does not compile: ${(e as Error).message}`] };
  }
}

function open(n: string): void {
  name = n;
  const draft = loadDraft(n);
  spec = draft ?? structuredClone(MAPS[n]) ?? blank(n, 96);
  map = build(spec);
  pick = null;
  ruled = null;
  undo = [];
  redo = [];
  mode = { kind: 'pick' };
  params.set('map', n);
  history.replaceState(null, '', `?${params.toString()}`);
  plan.fit(spec.size);
  refresh();
}

function blank(n: string, size: number): MapSpec {
  return { name: n, about: t('mapmaker.newabout', 'A new map, made in the map maker.'), seed: 1 + Math.floor(Math.random() * 999), size, roads: [] };
}

/** Make an edit: keep the old map for undo, rebuild, save the draft. */
function edit(e: MapEdit): void {
  undo.push(spec);
  redo = [];
  spec = applyEdit(spec, e, map);
  map = build(spec);
  saveDraft(spec);
  refresh();
}

function step(back: boolean): void {
  const from = back ? undo : redo, to = back ? redo : undo;
  const s = from.pop();
  if (!s) return;
  to.push(spec);
  spec = s;
  map = build(spec);
  pick = null;
  saveDraft(spec);
  refresh();
}

const isDraft = (): boolean => !!loadDraft(name);
const isNew = (): boolean => !(name in MAPS);

// --- drawing ----------------------------------------------------------------

let dragTo: XZ | null = null;
let queued = false;
function redraw(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    plan.draw({ spec, map, things: THINGS, pick, drag: pick && dragTo ? { pick, to: dragTo } : null });
  });
}

function button(label: string, act: () => void, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener('click', act);
  return b;
}

function refresh(): void {
  // The map picker: every map in the game, and drafts of new ones.
  const pickEl = $('map-pick') as HTMLSelectElement;
  pickEl.replaceChildren();
  const names = [...new Set([...Object.keys(MAPS), ...draftNames(), name])].sort();
  for (const n of names) pickEl.add(new Option(`${n}${loadDraft(n) ? ' ✎' : ''}`, n));
  pickEl.value = name;

  // What is picked.
  if (pick) {
    const p = pick;
    const what = { props: t('mapmaker.thing', 'Thing'), trees: t('mapmaker.tree', 'Tree'), houses: t('mapmaker.house', 'House'), notes: t('mapmaker.note', 'Note') }[p.list];
    if (p.list === 'notes') {
      const n = spec.notes![p.i];
      selEl.innerHTML = '';
      const head = document.createElement('div');
      head.innerHTML = `<b>${what} ${p.i + 1}</b> <small>${n.by === 'claude' ? 'Claude' : t('mapmaker.you', 'you')}${n.done ? ' · ' + t('mapmaker.done', 'done') : ''}${n.r ? ` · ${n.r} m` : ''}</small>`;
      const body = document.createElement('div');
      body.textContent = n.text;
      selEl.append(head, body);
    } else {
      const h = p.list === 'houses' ? spec.houses![p.i] : null;
      const where = h && 'road' in h.at ? ` <small>${t('mapmaker.byroad', 'placed along a road; moving or turning it pins it to a spot')}</small>` : '';
      selEl.innerHTML = `<b>${what}:</b> ${esc(pickLabel(spec, p))}${where}`;
    }
  } else if (mode.kind === 'thing') selEl.innerHTML = `${t('mapmaker.tapplace', 'Tap the map to place')} <b>${esc(mode.thing)}</b>. ${t('mapmaker.again', 'Tap again for another.')}`;
  else if (mode.kind === 'note') selEl.textContent = t('mapmaker.tapnote', 'Tap the map where the note goes.');
  else if (ruled) selEl.innerHTML = `${esc(ruled)} <small>${t('mapmaker.ruled', 'made by a rule: change the rule, not the thing (a later slice)')}</small>`;
  else selEl.innerHTML = `<small>${t('mapmaker.help', 'Tap a thing with a light ring, a house or a note to pick it; drag to move it. Drag the map to look about, pinch or +/− to zoom.')}</small>`;

  // Tools.
  toolsEl.replaceChildren(
    button(t('mapmaker.addthing', '+ Thing'), chooseThing, mode.kind === 'thing' ? 'on' : ''),
    button(t('mapmaker.addnote', '+ Note'), () => { mode = mode.kind === 'note' ? { kind: 'pick' } : { kind: 'note' }; pick = null; refresh(); }, mode.kind === 'note' ? 'on' : ''),
  );
  if (mode.kind !== 'pick') toolsEl.append(button(t('mapmaker.stop', 'Stop placing'), () => { mode = { kind: 'pick' }; refresh(); }));
  if (pick) {
    const p = pick;
    if (p.list === 'notes') {
      const n = spec.notes![p.i];
      toolsEl.append(
        button(t('mapmaker.edittext', 'Edit'), () => noteDialog(p)),
        button(n.done ? t('mapmaker.reopen', 'Open again') : t('mapmaker.markdone', 'Done'), () => edit({ do: 'note', pick: p, done: !n.done })),
      );
    } else if (p.list !== 'trees') {
      toolsEl.append(button('⟲ 15°', () => edit({ do: 'turn', pick: p, by: Math.PI / 12 })), button('⟳ 15°', () => edit({ do: 'turn', pick: p, by: -Math.PI / 12 })));
    }
    if (p.list !== 'houses') toolsEl.append(button(t('mapmaker.remove', 'Remove'), () => { edit({ do: 'remove', pick: p }); pick = null; refresh(); }));
  }
  if (undo.length) toolsEl.append(button(t('mapmaker.undo', 'Undo'), () => step(true)));
  if (redo.length) toolsEl.append(button(t('mapmaker.redo', 'Redo'), () => step(false)));

  // The file.
  fileEl.replaceChildren(
    button(t('mapmaker.look3d', 'Look in 3D'), look3d),
    button(t('mapmaker.copy', 'Copy for Claude'), copyForClaude, isDraft() ? 'go' : ''),
  );
  if (import.meta.env.DEV) fileEl.append(button(t('mapmaker.savefile', 'Save to file'), saveToFile, isDraft() ? 'go' : ''));
  if (isDraft()) fileEl.append(button(isNew() ? t('mapmaker.deletenew', 'Delete this map') : t('mapmaker.dropdraft', 'Drop my changes'), dropChanges));
  fileEl.append(button(t('mapmaker.newmap', 'New map'), newMap));

  // What the compiler says.
  problemsEl.replaceChildren();
  if (map.problems.length) {
    const ul = document.createElement('ul');
    for (const p of map.problems.slice(0, 12)) {
      const li = document.createElement('li');
      li.textContent = p;
      ul.append(li);
    }
    problemsEl.append(ul);
  }
  hintEl.hidden = true;
  redraw();
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// --- dialogs ----------------------------------------------------------------

function dialog(fill: (f: HTMLFormElement) => void): void {
  dlgForm.replaceChildren();
  fill(dlgForm);
  dlg.showModal();
}

function row(...buttons: HTMLButtonElement[]): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'row';
  d.append(...buttons);
  return d;
}

/** The kinds of thing that can stand out of doors, by family, with a search. */
function chooseThing(): void {
  const kinds = THINGS.placeable.filter((k) => !THINGS.isRoom(k) && !THINGS.get(k).building).sort();
  dialog((f) => {
    const h = document.createElement('h3');
    h.textContent = t('mapmaker.whichthing', 'Place what?');
    const q = document.createElement('input');
    q.type = 'search';
    q.placeholder = t('mapmaker.search', 'Search (barrel, well, pine…)');
    const list = document.createElement('div');
    list.className = 'kinds';
    const fill = (): void => {
      list.replaceChildren();
      const want = q.value.trim().toLowerCase();
      const groups = new Map<string, string[]>();
      for (const k of kinds) {
        const th = THINGS.get(k);
        if (want && !k.includes(want) && !(th.name ?? '').includes(want)) continue;
        const fam = th.chain.length > 2 ? th.chain[th.chain.length - 2] : th.chain[th.chain.length - 1] ?? '';
        groups.set(fam, [...(groups.get(fam) ?? []), k]);
      }
      for (const [fam, ks] of [...groups].sort()) {
        const h4 = document.createElement('h4');
        h4.textContent = fam;
        list.append(h4);
        for (const k of ks) list.append(button(THINGS.get(k).name ?? k, () => {
          mode = { kind: 'thing', thing: k, tree: THINGS.get(k).chain.includes('tree') };
          pick = null;
          dlg.close();
          refresh();
        }));
      }
    };
    q.addEventListener('input', fill);
    fill();
    f.append(h, q, list, row(button(t('mapmaker.cancel', 'Cancel'), () => dlg.close())));
  });
}

/** Write or change a note (`at` for a new one). */
function noteDialog(p: Pick | null, at?: XZ): void {
  const n = p ? spec.notes![p.i] : null;
  dialog((f) => {
    const h = document.createElement('h3');
    h.textContent = n ? `${t('mapmaker.note', 'Note')} ${p!.i + 1}` : t('mapmaker.newnote', 'A note on this spot');
    const text = document.createElement('textarea');
    text.value = n?.text ?? '';
    text.placeholder = t('mapmaker.noteph', 'What should be here, or change? (Claude reads it where it stands.)');
    const lab = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'number';
    r.min = '0';
    r.step = '1';
    r.value = String(n?.r ?? 0);
    r.style.width = '6em';
    lab.append(t('mapmaker.area', 'About the area round it, metres (0: just the spot):'), r);
    const ok = button(t('mapmaker.ok', 'OK'), () => {
      const txt = text.value.trim();
      dlg.close();
      if (!txt) return;
      if (p) edit({ do: 'note', pick: p, text: txt, r: Number(r.value) || 0 });
      else if (at) {
        edit({ do: 'add-note', at, text: txt, r: Number(r.value) || 0 });
        pick = { list: 'notes', i: spec.notes!.length - 1 };
        mode = { kind: 'pick' };
        refresh();
      }
    }, 'go');
    f.append(h, text, lab, row(button(t('mapmaker.cancel', 'Cancel'), () => dlg.close()), ok));
    setTimeout(() => text.focus(), 50);
  });
}

function newMap(): void {
  dialog((f) => {
    const h = document.createElement('h3');
    h.textContent = t('mapmaker.newmap', 'New map');
    const n = document.createElement('input');
    n.type = 'search';
    n.placeholder = t('mapmaker.newname', 'Its name, one word (startvillage)');
    const lab = document.createElement('label');
    const size = document.createElement('input');
    size.type = 'number';
    size.value = '128';
    size.min = '32';
    size.step = '32';
    size.style.width = '6em';
    lab.append(t('mapmaker.size', 'Side of the square, metres:'), size);
    const ok = button(t('mapmaker.make', 'Make it'), () => {
      const id = n.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      dlg.close();
      if (!id) return;
      if (!(id in MAPS) && !loadDraft(id)) saveDraft(blank(id, Math.max(32, Number(size.value) || 128)));
      open(id);
    }, 'go');
    f.append(h, n, lab, row(button(t('mapmaker.cancel', 'Cancel'), () => dlg.close()), ok));
  });
}

// --- the file ---------------------------------------------------------------

function toast(text: string): void {
  hintEl.textContent = text;
  hintEl.hidden = false;
  setTimeout(() => (hintEl.hidden = true), 3500);
}

async function copyForClaude(): Promise<void> {
  const text = `Map file src/content/maps/${spec.name}.json from the map maker:\n${mapToJson(spec)}`;
  try {
    await navigator.clipboard.writeText(text);
    toast(t('mapmaker.copied', 'Copied. Paste it into the chat with Claude.'));
  } catch {
    // No clipboard (an old browser, or not https): show it to copy by hand.
    dialog((f) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.minHeight = '40dvh';
      f.append(ta, row(button(t('mapmaker.close', 'Close'), () => dlg.close())));
      setTimeout(() => ta.select(), 50);
    });
  }
}

async function saveToFile(): Promise<void> {
  const res = await fetch(`${import.meta.env.BASE_URL}__maps/${encodeURIComponent(spec.name)}`, { method: 'POST', body: mapToJson(spec) });
  if (!res.ok) return toast(`${t('mapmaker.savefail', 'Could not save')}: ${await res.text()}`);
  dropDraft(spec.name);
  toast(t('mapmaker.saved', 'Saved to the file. The page reloads with it.'));
  setTimeout(() => location.reload(), 900);
}

function dropChanges(): void {
  if (!confirm(isNew() ? t('mapmaker.suredelete', 'Delete this new map from this browser?') : t('mapmaker.suredrop', 'Drop your changes and go back to the file?'))) return;
  dropDraft(name);
  open(isNew() ? 'hamlet' : name);
}

function look3d(): void {
  saveDraft(spec);
  location.href = `${import.meta.env.BASE_URL}spike3d/?map=${encodeURIComponent(spec.name)}&draft`;
}

// --- pointing ---------------------------------------------------------------

const pointers = new Map<number, { x: number; y: number }>();
let gesture: { kind: 'tap' | 'pan' | 'drag' | 'pinch'; x: number; y: number; moved: boolean; dist?: number } | null = null;
const local = (e: PointerEvent): [number, number] => {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};
const reach = (): number => Math.max(0.8, 22 / plan.view.scale);

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const [x, y] = local(e);
  pointers.set(e.pointerId, { x, y });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { kind: 'pinch', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y) };
    dragTo = null;
    return;
  }
  // Pressing on what is picked starts moving it; anywhere else, looking about (or a tap).
  const at = plan.toWorld(x, y);
  const onPicked = pick && mode.kind === 'pick' && JSON.stringify(pickAt(spec, map, at, reach())) === JSON.stringify(pick);
  gesture = { kind: onPicked ? 'drag' : 'tap', x, y, moved: false };
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  const [x, y] = local(e);
  const was = pointers.get(e.pointerId)!;
  pointers.set(e.pointerId, { x, y });
  if (gesture.kind === 'pinch' && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    plan.zoomAt(mx, my, d / (gesture.dist || d));
    plan.view.cx -= (mx - gesture.x) / plan.view.scale;
    plan.view.cz -= (my - gesture.y) / plan.view.scale;
    Object.assign(gesture, { dist: d, x: mx, y: my });
    return redraw();
  }
  if (!gesture.moved && Math.hypot(x - gesture.x, y - gesture.y) < 8) return;
  gesture.moved = true;
  if (gesture.kind === 'tap') gesture.kind = 'pan';
  if (gesture.kind === 'pan') {
    plan.view.cx -= (x - was.x) / plan.view.scale;
    plan.view.cz -= (y - was.y) / plan.view.scale;
  } else if (gesture.kind === 'drag') dragTo = plan.toWorld(x, y);
  redraw();
});

function release(e: PointerEvent): void {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  const g = gesture;
  if (pointers.size) {
    // One finger left after a pinch: carry on looking about with it.
    const [p] = [...pointers.values()];
    gesture = { kind: 'pan', x: p.x, y: p.y, moved: true };
    return;
  }
  gesture = null;
  if (!g) return;
  if (g.kind === 'drag' && dragTo && pick) {
    const to = dragTo;
    dragTo = null;
    edit({ do: 'move', pick, to });
    return;
  }
  dragTo = null;
  if (g.kind === 'tap' || (g.kind === 'drag' && !g.moved)) tap(plan.toWorld(g.x, g.y));
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

function tap(at: XZ): void {
  ruled = null;
  if (mode.kind === 'note') return noteDialog(null, at);
  if (mode.kind === 'thing') {
    edit(mode.tree ? { do: 'add-tree', kind: mode.thing, at } : { do: 'add-prop', kind: mode.thing, at });
    return;
  }
  pick = pickAt(spec, map, at, reach());
  if (!pick) ruled = ruledAt(at);
  refresh();
}

/** A thing a rule made, near a spot: what it is (to say so when tapped). */
function ruledAt(at: XZ): string | null {
  const r = reach();
  const c = map.placed.chunk(Math.floor(at[0] / CHUNK), Math.floor(at[1] / CHUNK));
  let best: { what: string; d: number } | null = null;
  for (const p of [...c.props, ...c.trees.map((x) => ({ kind: x.kind ?? 'oak', x: x.x, z: x.z }))]) {
    const d = Math.hypot(p.x - at[0], p.z - at[1]);
    if (d < r && (!best || d < best.d)) best = { what: p.kind, d };
  }
  for (const h of map.layout.houses) if (Math.hypot(h.x - at[0], h.z - at[1]) < Math.max(h.spec.width, h.spec.depth) / 2) return `${h.id}`;
  return best?.what ?? null;
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [x, y] = local(e as unknown as PointerEvent);
  plan.zoomAt(x, y, Math.exp(-e.deltaY * 0.0015));
  redraw();
}, { passive: false });

for (const b of document.querySelectorAll<HTMLButtonElement>('#zoom [data-zoom]')) {
  b.addEventListener('click', () => {
    plan.zoomAt(plan.w / 2, plan.h / 2, Number(b.dataset.zoom) > 0 ? 1.5 : 1 / 1.5);
    redraw();
  });
}
$('fit').addEventListener('click', () => { plan.fit(spec.size); redraw(); });
($('map-pick') as HTMLSelectElement).addEventListener('change', (e) => open((e.target as HTMLSelectElement).value));

window.addEventListener('keydown', (e) => {
  if (dlg.open || (e.target as HTMLElement).closest('input, textarea, select')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); step(!e.shiftKey); return; }
  if (e.key === 'Escape') { pick = null; mode = { kind: 'pick' }; refresh(); return; }
  if (!pick) return;
  const p = pick;
  if ((e.key === 'Delete' || e.key === 'Backspace') && p.list !== 'houses') { edit({ do: 'remove', pick: p }); pick = null; refresh(); }
  else if (e.key === 'r' || e.key === 'R') edit({ do: 'turn', pick: p, by: (e.shiftKey ? 1 : -1) * (Math.PI / 12) });
});
window.addEventListener('resize', redraw);

// --- start --------------------------------------------------------------------

if (shot) {
  document.body.classList.add('shot');
  for (const id of ['topbar', 'panel', 'zoom']) $(id).style.display = 'none';
}
open(name in MAPS || loadDraft(name) ? name : 'hamlet');

/** For Claude and the browser tests: the map as it stands, and the edits. */
(window as unknown as { mapmaker: unknown }).mapmaker = {
  get spec() { return spec; },
  get problems() { return map.problems; },
  edit,
  plan,
  ready: true,
};
