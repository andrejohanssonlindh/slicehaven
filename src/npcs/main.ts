import { ATTR_EN } from '../core/chargen/derive';
import { diceText } from '../core/chargen/tables';
import { PERSON_LEVELS, type PersonLevel, type RolledSheet, SHEET_ATTRS, type SheetSpan, derived, rollSheet, sheetSpan, unitsDice } from '../core/npcsheet';
import { Rng } from '../core/rng';
import { ARMOUR, SHIELDS, WEAPONS } from '../content/chargen/equipment';
import { nameCultureOf } from '../content/chargen/names';
import { FACETS, FACET_LIST, PERSON_KINDS } from '../content/people';
import { FAMILY_KIND } from '../content/people/facets';
import { ARCHETYPE_SHEETS, GROUP_ARCHETYPE } from '../content/people/sheets';
import { rollableName } from '../content/rollables';
import { t } from '../i18n';
import { esc } from '../ui/sheet';

/**
 * Kinds of person, as sheets: pick a people, a kind (a calling, or a kind made by hand like a guard with a bow) and a
 * level, and see the span every such person falls within, with one person rolled inside it. "Another" rolls the
 * next. The choice is kept in the address, so a link shows the same person. Rules: `core/npcsheet.ts`.
 */

const root = document.getElementById('npcs-root')!;
const params = new URLSearchParams(location.search);
const view = {
  people: params.get('people') ?? 'human',
  kind: params.get('kind') ?? 'guard-sword',
  level: (params.get('level') as PersonLevel) ?? 'capable',
  seed: Number(params.get('seed') ?? 1) || 1,
};
if (!PERSON_LEVELS.includes(view.level)) view.level = 'capable';

const LEVEL_EN: Record<PersonLevel | 'untrained', string> = {
  untrained: t('npcs.level.untrained', 'Untrained'),
  novice: t('npcs.level.novice', 'Novice'),
  capable: t('npcs.level.capable', 'Capable'),
  skilled: t('npcs.level.skilled', 'Skilled'),
  master: t('npcs.level.master', 'Master'),
};
const SLOT_EN: Record<string, string> = {
  weapon: t('npcs.slot.weapon', 'Weapon'), sidearm: t('npcs.slot.sidearm', 'Sidearm'), shield: t('npcs.slot.shield', 'Shield'), armour: t('npcs.slot.armour', 'Armour'), item: t('npcs.slot.item', 'Item'),
};

const dice = (u: number): string => diceText(unitsDice(u));
const span = ([lo, hi]: readonly [number, number]): string => (lo === hi ? dice(lo) : `${dice(lo)}–${dice(hi)}`);
const skillName = (id: string): string => esc(rollableName(id).replace(/^[EFHK]:/, ''));
const gearName = (sv: string): string =>
  esc(WEAPONS.find((w) => w.sv === sv)?.en ?? SHIELDS.find((s) => s.sv === sv)?.en ?? ARMOUR.find((a) => a.sv === sv)?.en ?? sv);

/** Peoples, each family with its peoples under it. */
function peopleOptions(): string {
  const fams = Object.values(FAMILY_KIND);
  return fams.map((f) => {
    const under = FACET_LIST.filter((x) => x.dim === 'people' && x.parent === f);
    return `<optgroup label="${esc(FACETS[f].label)}"><option value="${f}">${esc(FACETS[f].label)} (any)</option>${under.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}</optgroup>`;
  }).join('');
}

/** A hand-made kind's name: `guard-bow` is "Guard (bow)". */
const kindLabel = (id: string): string => {
  const [head, ...rest] = id.split('-');
  return `${head[0].toUpperCase()}${head.slice(1)}${rest.length ? ` (${rest.join(' ')})` : ''}`;
};

/** Kinds made by hand first, then every calling under its group. */
function kindOptions(): string {
  const hand = PERSON_KINDS.kinds.filter((k) => !FACETS[k]).sort();
  const groups = FACET_LIST.filter((f) => f.dim === 'station' && f.parent === 'station');
  return `<optgroup label="${esc(t('npcs.handmade', 'Made by hand'))}">${hand.map((k) => `<option value="${k}">${esc(kindLabel(k))}</option>`).join('')}</optgroup>`
    + groups.map((g) => `<optgroup label="${esc(g.label)}">${FACET_LIST.filter((f) => f.parent === g.id).map((f) => `<option value="${f.id}">${esc(f.label)}</option>`).join('')}</optgroup>`).join('');
}

/** A name to go with them, from their people's naming culture (if the creator has one). */
function nameFor(chain: string[], seed: number): string {
  const people = chain.filter((id) => FACETS[id]?.dim === 'people').pop();
  const fam = Object.entries(FAMILY_KIND).find(([, k]) => chain.includes(k))?.[0];
  const rng = Rng.fromSeed(`name${seed}`);
  // A family with no naming culture of its own ("humans, any") borrows one of its peoples'.
  const peoples = FACET_LIST.filter((f) => f.dim === 'people' && f.parent === FAMILY_KIND[fam ?? '']).map((f) => f.id);
  const c = nameCultureOf(people, fam) ?? nameCultureOf(peoples.length ? rng.pick(peoples) : undefined, fam);
  const all = [...(c?.f ?? []), ...(c?.m ?? []), ...(c?.n ?? [])];
  return all.length ? rng.pick(all) : t('npcs.noname', 'Someone');
}

function render(): void {
  history.replaceState(null, '', `?people=${view.people}&kind=${view.kind}&level=${view.level}&seed=${view.seed}`);
  const spec = { is: [view.people, view.kind] };
  let body: string;
  try {
    const sheet = PERSON_KINDS.sheet(spec);
    const chain = PERSON_KINDS.resolve(spec).chain;
    const s = sheetSpan(sheet, view.level);
    const p = rollSheet(s, `${view.people}|${view.kind}|${view.level}|${view.seed}`);
    body = sheetHtml(chain, s, p);
  } catch (e) {
    body = `<div class="card bad">${esc((e as Error).message)}</div>`;
  }
  root.innerHTML = `
    <h1>${esc(t('npcs.title', 'Kinds of person'))}</h1>
    <p class="muted">${esc(t('npcs.lead', 'Pick a people, a kind and a level: the spans are what every such person falls within, and below them one person rolled inside. Main skills sit at the level, side skills a step below.'))}</p>
    <div class="pickers">
      <label>${esc(t('npcs.people', 'People'))}<select id="people">${peopleOptions()}</select></label>
      <label>${esc(t('npcs.kind', 'Kind'))}<select id="kind">${kindOptions()}</select></label>
      <div class="levels">${PERSON_LEVELS.map((l) => `<button type="button" data-level="${l}" class="${l === view.level ? 'on' : ''}">${LEVEL_EN[l]}</button>`).join('')}</div>
      <button type="button" id="again" class="again">${esc(t('npcs.again', 'Another'))} ↻</button>
    </div>
    ${body}`;
  const people = root.querySelector<HTMLSelectElement>('#people')!, kind = root.querySelector<HTMLSelectElement>('#kind')!;
  people.value = view.people;
  kind.value = view.kind;
  people.onchange = () => { view.people = people.value; render(); };
  kind.onchange = () => { view.kind = kind.value; render(); };
  root.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((b) => (b.onclick = () => { view.level = b.dataset.level as PersonLevel; render(); }));
  root.querySelector<HTMLButtonElement>('#again')!.onclick = () => { view.seed++; render(); };
}

function sheetHtml(chain: string[], s: SheetSpan, p: RolledSheet): string {
  const group = chain.find((id) => GROUP_ARCHETYPE[id]);
  const arch = group ? ARCHETYPE_SHEETS[GROUP_ARCHETYPE[group]].en : '';
  const shown = chain.filter((id) => id !== 'station' && id !== 'humanoid').map((id) => esc(FACETS[id]?.label ?? kindLabel(id)));
  const about = chain.map((id) => PERSON_KINDS.def(id)?.about).filter(Boolean).pop();
  const d = derived(p.attrs);
  const attrRows = SHEET_ATTRS.map((a) => `<tr><td>${esc(ATTR_EN[a])}</td><td class="span">${span(s.attrs[a])}</td><td class="val">${dice(p.attrs[a])}</td></tr>`).join('');
  const skillRows = s.skills.map((k) => `<tr><td>${skillName(k.id)} <i class="lean ${k.lean}">${k.lean}</i></td><td class="span">${span(k.span)}</td><td class="val">${dice(p.skills[k.id])}</td></tr>`).join('');
  const knackRows = s.knacks.ids.map((id) => {
    const has = p.knacks.includes(id);
    return `<tr class="${has ? '' : 'dim'}"><td>${skillName(id)}</td><td class="span">${has ? span(s.knacks.span) : ''}</td><td class="val">${has ? dice(p.skills[id]) : '—'}</td></tr>`;
  }).join('');
  const gearRows = Object.entries(s.gear).map(([slot, choices]) =>
    `<tr><td>${esc(SLOT_EN[slot] ?? slot)}</td><td colspan="2">${choices.map((c) => (c === p.gear[slot] ? `<b>${gearName(c)}</b>` : `<span class="dim">${gearName(c)}</span>`)).join(', ')}</td></tr>`).join('');
  return `
    <div class="card who">
      <div class="name">${esc(nameFor(chain, view.seed))}</div>
      ${about ? `<div>${esc(about)}</div>` : ''}
      <div class="muted">${esc(LEVEL_EN[s.level])} · ${shown.join(' › ')}${arch ? ` · ${esc(t('npcs.archetype', 'archetype'))}: ${esc(arch)}` : ''}</div>
      <div class="muted">${esc(t('npcs.derived', 'Base damage {d}, base armour {a}', { d: diceText(d.damage), a: d.armour }))}</div>
    </div>
    <table class="sheet">
      <thead><tr><th>${esc(t('npcs.attrs', 'Attributes'))}</th><th>${esc(t('npcs.span', 'Span'))}</th><th>${esc(t('npcs.this', 'This one'))}</th></tr></thead>
      <tbody>${attrRows}</tbody>
      <thead><tr><th colspan="3">${esc(t('npcs.skills', 'Skills'))}</th></tr></thead>
      <tbody>${skillRows || `<tr><td colspan="3" class="dim">${esc(t('npcs.noskills', 'None named'))}</td></tr>`}</tbody>
      ${s.knacks.count ? `<thead><tr><th colspan="3">${esc(t('npcs.knacks', 'Knacks: {n} of these, at side level', { n: s.knacks.count }))}</th></tr></thead><tbody>${knackRows}</tbody>` : ''}
      ${gearRows ? `<thead><tr><th colspan="3">${esc(t('npcs.gear', 'Gear: one of each'))}</th></tr></thead><tbody>${gearRows}</tbody>` : ''}
    </table>
    <p class="muted">${esc(t('npcs.untrained', 'Every other skill: untrained.'))}</p>`;
}

render();
