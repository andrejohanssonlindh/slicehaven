/** Character creator page: state, saving, actions and rendering. */
import { derive, rollsTwice, STEP, STEPS, type Derived } from '../core/chargen/derive';
import type { Attr, TableId } from '../core/chargen/grants';
import { exportChar, importChar, loadRoster, newChar, roll, saveRoster, type CharState, type RollRec, type Roster } from '../core/chargen/state';
import type { PointModel } from '../core/chargen/tables';
import type { Family } from '../core/chargen/types';
import { CONTENT } from '../content/chargen';
import { sheetHtml } from './sheet';
import { STEP_RENDER, view } from './steps';
import { esc, lendView, toast } from './ui';

const app = document.getElementById('app') as HTMLElement;
const stepsNav = document.getElementById('steps') as HTMLElement;
const prevBtn = document.getElementById('btn-prev') as HTMLButtonElement;
const nextBtn = document.getElementById('btn-next') as HTMLButtonElement;
const stepInfo = document.getElementById('step-info') as HTMLElement;
const nameEl = document.getElementById('char-name') as HTMLElement;
const menu = document.getElementById('menu') as HTMLDialogElement;

let roster: Roster = loadRoster();
let s: CharState = roster.chars.find((c) => c.id === roster.current) ?? roster.chars[0] ?? addChar();
let d: Derived = derive(s, CONTENT);
let busy = false;

function addChar(): CharState {
  const c = newChar(Date.now() ^ Math.floor(Math.random() * 1e9));
  roster.chars.push(c);
  roster.current = c.id;
  return c;
}

function save(): void {
  s.updated = new Date().toISOString();
  roster.current = s.id;
  saveRoster(roster);
}

function charLabel(c: CharState): string {
  const p = CONTENT.peoples.find((x) => x.id === c.people)?.en;
  const a = CONTENT.archetypes.find((x) => x.id === c.archetype)?.en;
  return [c.details.name || 'Unnamed', [p, a].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}

function render(): void {
  d = derive(s, CONTENT);
  if (s.people) {
    const fam = CONTENT.peoples.find((p) => p.id === s.people)?.family;
    if (fam && !app.dataset.famSet) {
      view.family = fam;
      app.dataset.famSet = '1';
    }
  }
  nameEl.textContent = charLabel(s);
  stepsNav.innerHTML = STEPS.map((name, i) => {
    const open = d.openByStep[i] > 0;
    return `<button type="button" class="${i === s.step ? 'on' : ''}" data-act="goto" data-val="${i}" title="${esc(name)}">${i + 1}. ${esc(short(name))}${open ? '<span class="dot"></span>' : ''}</button>`;
  }).join('');
  app.innerHTML = s.step === STEP.sheet ? `<h2>Character sheet</h2>${sheetHtml(s, d)}` : STEP_RENDER[s.step](s, d);
  prevBtn.disabled = s.step === 0;
  nextBtn.disabled = s.step === STEPS.length - 1;
  nextBtn.textContent = s.step === STEPS.length - 2 ? 'Sheet →' : 'Next →';
  const open = d.openByStep[s.step];
  stepInfo.textContent = open ? `${open} to do here` : `Step ${s.step + 1} of ${STEPS.length}`;
  stepsNav.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function short(name: string): string {
  return { 'Archetype & environment': 'Archetype', 'Languages & contacts': 'Languages', 'Name & details': 'Details', 'Mysticism & magic': 'Magic', 'Character sheet': 'Sheet', 'Event tables': 'Events' }[name] ?? name;
}

function commit(rerender = true): void {
  save();
  if (rerender) render();
}

function goto(step: number): void {
  s.step = Math.max(0, Math.min(STEPS.length - 1, step));
  commit();
  window.scrollTo(0, 0);
}

/** Show rolling dice for a moment before the result lands. */
function rollFx(sides: number, count = 1): Promise<void> {
  const el = document.getElementById('toast') as HTMLElement;
  el.hidden = false;
  const tick = () => (el.innerHTML = `<span class="dice">${Array.from({ length: count }, () => `<span class="die rolling ${sides === 10 ? 'd10' : ''}">${1 + Math.floor(Math.random() * sides)}</span>`).join('')}</span>`);
  tick();
  const iv = window.setInterval(tick, 70);
  return new Promise((res) =>
    window.setTimeout(() => {
      clearInterval(iv);
      el.hidden = true;
      res();
    }, 550),
  );
}

async function withRoll(sides: number, count: number, apply: () => void): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await rollFx(sides, count);
    apply();
    commit();
  } finally {
    busy = false;
  }
}

function setChoice(key: string, val: number | string | undefined): void {
  if (val === undefined || val === '') delete s.choices[key];
  else s.choices[key] = val;
}

function unchoosePrefix(prefix: string): void {
  for (const k of Object.keys(s.choices)) if (k.startsWith(`${prefix}#`) || k.startsWith(`${prefix}@`)) delete s.choices[k];
}

function setPath(path: string, value: string): void {
  const parts = path.split('.');
  let o = s as unknown as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) o = o[p] as Record<string, unknown>;
  o[parts[parts.length - 1]] = value;
}

function rollSlot(key: string): void {
  const slot = d.slots.find((x) => x.key === key);
  if (!slot?.table) return;
  const rec: RollRec = s.rolls[key] && s.rolls[key].table === slot.table ? s.rolls[key] : { table: slot.table, values: [] };
  rec.values = slot.results.map((_, i) => rec.values[i]);
  if (rollsTwice(slot.table)) rec.offer = [roll(s, 100), roll(s, 100)];
  else rec.values.push(roll(s, 100));
  s.rolls[key] = rec;
}

// ——— Click actions ———
app.parentElement!.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el || el.tagName === 'SELECT' || (el as HTMLButtonElement).disabled) return;
  const a = el.dataset;
  const key = a.key ?? '';
  switch (a.act) {
    case 'goto':
      return goto(Number(a.val));
    case 'set': {
      const f = a.field as 'homeland' | 'people' | 'religion' | 'archetype' | 'environment' | 'living' | 'background';
      const v = f === 'background' ? Number(a.val) : a.val;
      (s as unknown as Record<string, unknown>)[f] = (s as unknown as Record<string, unknown>)[f] === v && f !== 'background' ? undefined : v;
      return commit();
    }
    case 'family':
      view.family = a.val as Family;
      return render();
    case 'rollHomeland':
      return void withRoll(100, 2, () => {
        s.homelandRolls = [roll(s, 100), roll(s, 100)];
        const hit = CONTENT.homelands.filter((h) => s.homelandRolls!.some((r) => r >= h.lo && r <= h.hi));
        if (hit.length === 1) s.homeland = hit[0].id;
      });
    case 'rollBg':
      return void withRoll(100, 2, () => {
        s.bgRolls = [roll(s, 100), roll(s, 100)];
        if (!s.bgRolls.includes(s.background ?? -1)) s.background = undefined;
        if (s.bgRolls[0] === s.bgRolls[1]) s.background = s.bgRolls[0];
      });
    case 'rollPeople':
      return void withRoll(100, 1, () => {
        const r = roll(s, 100);
        s.subRolls.people = [r];
        const p = CONTENT.peoples.find((x) => x.family === 'manniska' && x.lo !== undefined && r >= x.lo && r <= (x.hi ?? x.lo));
        if (p) s.people = p.id;
      });
    case 'rollSub':
      return void withRoll(Number(a.sides), 1, () => {
        let r = roll(s, Number(a.sides));
        if (key === 'arch') while (r === 10) r = roll(s, 10);
        s.subRolls[key] = [r];
        if (key === 'arch') s.archetype = CONTENT.archetypes[r - 1]?.id;
        if (key === 'env') s.environment = CONTENT.environments[r - 1]?.id;
      });
    case 'rollPick':
      return void withRoll(Number(a.sides), Number(a.times), () => {
        s.subRolls[key] = Array.from({ length: Number(a.times) }, () => roll(s, Number(a.sides)));
        const rec = d.picks.find((p) => p.key === key);
        if (rec && Number(a.times) === 1 && !rec.group.roll?.must) {
          const o = rec.group.options[s.subRolls[key][0] - 1];
          if (o) s.picks[key] = [o.id];
        }
      });
    case 'pick': {
      const need = Number(a.need);
      const id = a.id as string;
      const cur = s.picks[key] ?? [];
      const repeat = a.repeat === '1';
      if (need === 1) s.picks[key] = cur[0] === id ? [] : [id];
      else if (repeat) {
        if (cur.length < need) s.picks[key] = [...cur, id];
        else if (cur.includes(id)) {
          const i = cur.lastIndexOf(id);
          s.picks[key] = cur.filter((_, j) => j !== i);
        } else {
          toast(`Already ${need} chosen: tap a chosen one to remove it.`);
          return;
        }
      } else if (cur.includes(id)) s.picks[key] = cur.filter((x) => x !== id);
      else if (cur.length < need) s.picks[key] = [...cur, id];
      else s.picks[key] = [...cur.slice(1), id];
      return commit();
    }
    case 'choice':
      setChoice(key, Number(a.val));
      return commit();
    case 'choiceStr':
      setChoice(key, a.val);
      return commit();
    case 'choiceTextGo': {
      const input = el.parentElement?.querySelector('input') as HTMLInputElement | null;
      if (input?.value.trim()) {
        setChoice(key, input.value.trim());
        commit();
      }
      return;
    }
    case 'unchoose':
      unchoosePrefix(key);
      return commit();
    case 'unchooseKey':
      setChoice(key, undefined);
      return commit();
    case 'rollSlot':
      return void withRoll(100, 1, () => rollSlot(key));
    case 'rollAll': {
      const open = d.slots.filter((x) => x.needsRoll && x.table).length;
      return void withRoll(100, Math.min(open, 6), () => {
        // Roll until nothing more is open (results may add slots).
        for (let i = 0; i < 50; i++) {
          const dd = derive(s, CONTENT);
          const next = dd.slots.find((x) => x.needsRoll && x.table && !s.rolls[x.key]?.offer);
          if (!next) break;
          d = dd;
          rollSlot(next.key);
        }
      });
    }
    case 'reroll':
      if (s.rerollUsed && d.slots.some((x) => x.key === s.rerollUsed && x.results.length)) return toast('You have already used your one re-roll.');
      return void withRoll(100, 1, () => {
        const rec = s.rolls[key];
        if (!rec) return;
        if (rollsTwice(rec.table)) {
          rec.values = rec.values.slice(0, -1);
          rec.offer = [roll(s, 100), roll(s, 100)];
        } else rec.values = [...rec.values.slice(0, -1), roll(s, 100)];
        s.rerollUsed = key;
      });
    case 'keepOffer': {
      const rec = s.rolls[key];
      if (!rec?.offer) return;
      rec.values.push(Number(a.val));
      delete rec.offer;
      return commit();
    }
    case 'strike':
      if (s.choices[`strike:${key}`] === 1) delete s.choices[`strike:${key}`];
      else s.choices[`strike:${key}`] = 1;
      return commit();
    case 'toggleView': {
      const f = a.flag as 'showAllBackgrounds';
      view[f] = !view[f];
      return render();
    }
    case 'model':
      s.attrModel = a.val as PointModel;
      s.attrLump = {};
      s.attrExtra = {};
      return commit();
    case 'extra': {
      const at = a.attr as Attr;
      s.attrExtra[at] = Math.max(-10, (s.attrExtra[at] ?? 0) + Number(a.d));
      if (!s.attrExtra[at]) delete s.attrExtra[at];
      return commit();
    }
    case 'pool':
      view.pool = a.val ?? '';
      return render();
    case 'spend': {
      const pool = a.pool as string;
      const target = a.target as string;
      const m = (s.alloc[pool] ??= {});
      m[target] = Math.max(0, (m[target] ?? 0) + Number(a.d));
      if (!m[target]) delete m[target];
      return commit();
    }
    case 'addSpecial': {
      const g = a.group as string;
      const input = document.getElementById(`add-${g}`) as HTMLInputElement;
      const name = input.value.trim();
      if (!name) return;
      const m = (s.alloc[a.pool as string] ??= {});
      const id = `${g}:${name}`;
      m[id] = (m[id] ?? 0) + 1;
      return commit();
    }
    case 'wisdomBase':
    case 'wisdomIncomp': {
      const list = a.act === 'wisdomBase' ? s.wisdomBase : s.wisdomIncomp;
      const i = list.indexOf(a.val as string);
      if (i >= 0) list.splice(i, 1);
      else list.push(a.val as string);
      return commit();
    }
    case 'addLang': {
      const input = document.getElementById('lang-name') as HTMLInputElement;
      const name = input.value.trim();
      if (!name) return;
      (a.w === '1' ? s.languages.written : s.languages.spoken).push(name);
      return commit();
    }
    case 'dropLang': {
      const i = Number(a.i);
      if (i < s.languages.spoken.length) s.languages.spoken.splice(i, 1);
      else s.languages.written.splice(i - s.languages.spoken.length, 1);
      return commit();
    }
    case 'rollDrives':
      return void withRoll(100, 4, () => {
        s.subRolls.drives = Array.from({ length: 4 }, () => roll(s, 100));
      });
    case 'drive': {
      const v = a.val as string;
      if (s.drives.primary === v) s.drives.primary = undefined;
      else if (s.drives.secondary === v) s.drives.secondary = undefined;
      else if (!s.drives.primary) s.drives.primary = v;
      else if (!s.drives.secondary) s.drives.secondary = v;
      else return toast('You already have two drives: remove one first.');
      return commit();
    }
    case 'dropDrive':
      if (s.drives.primary === a.val) s.drives.primary = undefined;
      if (s.drives.secondary === a.val) s.drives.secondary = undefined;
      return commit();
    case 'armRoll':
      return void withRoll(10, 1, () => {
        s.details.armRoll = roll(s, 10);
        s.details.arm = s.details.armRoll === 10 ? 'vänster' : 'höger';
      });
    case 'arm':
      s.details.arm = a.val as 'höger' | 'vänster';
      return commit();
    case 'buy': {
      const n = (document.getElementById('buy-name') as HTMLInputElement).value.trim();
      const c = Number((document.getElementById('buy-cost') as HTMLInputElement).value) || 0;
      if (!n) return;
      s.equipment.bought.push({ name: n, cost: c, qty: 1 });
      return commit();
    }
    case 'dropBuy':
      s.equipment.bought.splice(Number(a.i), 1);
      return commit();
    case 'print':
      return window.print();
  }
});

// ——— Selects ———
app.addEventListener('change', (ev) => {
  const el = ev.target as HTMLInputElement | HTMLSelectElement;
  const a = el.dataset;
  if (a.actChange === 'set') {
    (s as unknown as Record<string, unknown>)[a.field as string] = el.value || undefined;
    return commit();
  }
  if (a.actChange === 'lump') {
    const at = a.attr as Attr;
    if (el.value === '') delete s.attrLump[at];
    else s.attrLump[at] = Number(el.value);
    return commit();
  }
  if (a.actChange === 'equip') {
    s.equipment[a.kind as 'packages'][a.key as string] = el.value;
    return commit();
  }
  if (a.actChange === 'lendView') {
    lendView[a.key as string] = el.value;
    return render();
  }
  if (a.actChange === 'mgear') {
    s.mysticGear[a.key as string] = el.value;
    return commit();
  }
  if (a.actInput === 'choiceText' && el.value.trim()) {
    setChoice(a.key as string, el.value.trim());
    return commit();
  }
});

// ——— Text fields: save as you type, no re-render (keeps the keyboard up) ———
app.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement | HTMLTextAreaElement;
  const a = el.dataset;
  if (a.bind) {
    setPath(a.bind, el.value);
    nameEl.textContent = charLabel(s);
    return commit(false);
  }
  if (a.bindMap) {
    (s[a.bindMap as 'circles'] as Record<string, string>)[a.key as string] = el.value;
    return commit(false);
  }
  if (a.actInput === 'equip') {
    s.equipment[a.kind as 'weapons'][a.key as string] = el.value;
    return commit(false);
  }
  if (a.actInput === 'mystery') {
    s.mysteries[Number(a.i)] = el.value;
    return commit(false);
  }
});

prevBtn.addEventListener('click', () => goto(s.step - 1));
nextBtn.addEventListener('click', () => goto(s.step + 1));

// ——— Characters menu ———
function openMenu(): void {
  menu.innerHTML = `<h2 style="margin-top:0">Characters</h2>
    <ul class="plain">${roster.chars
      .map(
        (c) => `<li class="row spread"><button type="button" class="link" data-m="open" data-id="${c.id}">${c.id === s.id ? '▶ ' : ''}${esc(charLabel(c))}</button>
        <button type="button" class="link small" data-m="del" data-id="${c.id}">delete</button></li>`,
      )
      .join('')}</ul>
    <div class="row"><button type="button" data-m="new">+ New character</button><button type="button" data-m="export">Export this one</button><button type="button" data-m="import">Import</button></div>
    <textarea id="code" placeholder="Export/import code" style="margin-top:8px"></textarea>
    <div class="row" style="margin-top:8px"><button type="button" data-m="close" class="primary">Close</button></div>`;
  menu.showModal();
}
document.getElementById('btn-menu')!.addEventListener('click', openMenu);
menu.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-m]');
  if (!el) return;
  const code = menu.querySelector('#code') as HTMLTextAreaElement;
  switch (el.dataset.m) {
    case 'open':
      s = roster.chars.find((c) => c.id === el.dataset.id) ?? s;
      delete app.dataset.famSet;
      menu.close();
      return commit();
    case 'del':
      if (!confirm('Delete this character?')) return;
      roster.chars = roster.chars.filter((c) => c.id !== el.dataset.id);
      if (s.id === el.dataset.id) s = roster.chars[0] ?? addChar();
      save();
      return openMenu();
    case 'new':
      s = addChar();
      delete app.dataset.famSet;
      menu.close();
      return commit();
    case 'export':
      code.value = exportChar(s);
      code.select();
      navigator.clipboard?.writeText(code.value).then(() => toast('Copied to clipboard'), () => undefined);
      return;
    case 'import':
      try {
        const c = importChar(code.value);
        c.id = `c${Date.now().toString(36)}`;
        roster.chars.push(c);
        s = c;
        delete app.dataset.famSet;
        menu.close();
        commit();
        toast('Imported');
      } catch {
        toast('That code could not be read');
      }
      return;
    case 'close':
      menu.close();
  }
});

// Debug hook for fuzz tests in the browser.
(window as unknown as { chargen: unknown }).chargen = {
  get state() {
    return s;
  },
  get derived() {
    return d;
  },
  content: CONTENT,
  render,
  tables: (id: TableId) => CONTENT.tables[id],
};

save();
render();
