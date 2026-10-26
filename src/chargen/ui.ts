/** Small DOM/HTML helpers and the generic choice widgets for the character creator. */
import { ATTR_EN, describe, NUMB_EN, POOL_EN, RARITY_EN, TABLE_EN, type Derived, type Effect, type Pending, type PickRec, type SourceRec } from '../core/chargen/derive';
import type { CharState } from '../core/chargen/state';
import { CONTENT } from '../content/chargen';
import { packageEn } from '../content/chargen/equipment';
import { PICKABLE_TABLES } from '../content/chargen/events';
import { languageEn, SCRIPTS, SPOKEN } from '../content/chargen/languages';
import { ASPECTS, SKILLS } from '../content/chargen/skills';

export function esc(s: string | number | undefined | null): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function grants(g: string): string {
  return g ? esc(describe(g, CONTENT)) : '';
}

export function skillName(id: string): string {
  return CONTENT.skill(id)?.en ?? id.replace(/^[EFHK]:/, '');
}

export function die(v: number | string | undefined, cls = ''): string {
  return `<span class="die ${cls}">${v === undefined ? '?' : esc(v)}</span>`;
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

/** One resolved effect in English. */
export function effectText(e: Effect, s: CharState): string {
  switch (e.k) {
    case 'skill':
      return `${skillName(e.skill)} (${e.n})`;
    case 'group':
      return `${POOL_EN[e.pool]} units (${e.n})`;
    case 'roll':
      return `a roll on ${TABLE_EN[e.table]}`;
    case 'attr':
      return `${ATTR_EN[e.attr]} ${sign(e.n)}`;
    case 'apoang':
      return `${sign(e.n)} attribute points`;
    case 'sprak':
      return `${e.n} language${e.n === 1 ? '' : 's'} of your choice`;
    case 'tal':
      return `speaks ${langName(e.name)}`;
    case 'skrift':
      return `writes ${langName(e.name)}`;
    case 'numb':
      return `${e.n} hardening (${NUMB_EN[e.cat]})`;
    case 'talang':
      return `talent in ${skillName(e.skill)}`;
    case 'inkomp':
      return `incompetent in ${skillName(e.skill)}`;
    case 'block':
      return `blocked in ${skillName(e.skill)}`;
    case 'omstopt':
      return 'attuned (base 1 in Sensing)';
    case 'krets':
      return `circle: ${esc(s.circles[e.key] || (e.name === '?' ? 'to name' : e.name))}`;
    case 'foljeslagare':
      return `companion: ${e.kind}`;
    case 'vapen':
      return `a ${RARITY_EN[e.rarity]} weapon`;
    case 'rustning':
      return `a ${RARITY_EN[e.rarity]} armour`;
    case 'paket':
      return e.name === '?' ? 'an equipment package' : `equipment: ${esc(packageEn(e.name))}`;
    case 'mystikutr':
      return 'a set of mystic equipment';
    case 'silver':
      return `${e.n} silver`;
    case 'mysterier':
      return `${e.n} myster${e.n === 1 ? 'y' : 'ies'}${e.learned ? '' : ' (not yet learned)'}`;
    case 'religion':
      return `religion: ${e.ids.map((id) => CONTENT.religions.find((r) => r.id === id)?.en ?? id).join(' or ')}`;
    case 'doktrin':
      return `${e.n} extra doctrine${e.n === 1 ? '' : 's'}`;
    case 'derived':
      return `${{ grundrustning: 'Base armour', grundskada: 'Base damage', lakningstakt: 'Healing rate' }[e.stat]} ${sign(e.n)}`;
    case 'regel':
    case 'foremal':
      return e.text;
    case 'lana':
      return 'a borrowed trait (below)';
    case 'doktrinx':
      return `${e.n} doctrine${e.n === 1 ? '' : 's'} from another faith`;
    case 'stryk':
      return `give up ${e.n} event roll${e.n === 1 ? '' : 's'}`;
    case 'flagga':
      return { vapenhojning: 'your weapon picks may be one rarity higher', religios: 'not godless: you choose a religion' }[e.name] ?? e.name;
    case 'grund':
      return `${skillName(e.skill)} base ${e.n}`;
  }
}

/** Display name for a language (data keeps the source names). */
export function langName(sv: string): string {
  return languageEn(sv);
}

function suggestions(kind: string): string[] {
  if (kind === 'Aspekt') return ASPECTS.map(([sv]) => sv);
  if (kind === 'tal') return SPOKEN.map((l) => l.sv);
  if (kind === 'skrift') return SCRIPTS.map((l) => l.sv);
  return SKILLS.filter((x) => x.group === kind).map((x) => x.id.slice(2));
}

function suggestionLabel(kind: string, v: string): string {
  if (kind === 'Aspekt') return ASPECTS.find(([sv]) => sv === v)?.[1] ?? v;
  if (kind === 'tal' || kind === 'skrift') return languageEn(v);
  return CONTENT.skill(`${kind}:${v}`)?.en ?? v;
}

const KIND_EN: Record<string, string> = { E: 'expertise', F: 'ability', H: 'craft', K: 'mark', Aspekt: 'aspect', tal: 'spoken language', skrift: 'written language' };

/** A widget for one open choice. */
export function pendingHtml(p: Pending): string {
  switch (p.k) {
    case 'alt':
      return `<div class="pending"><div class="label">Choose a ${esc(p.what)}:</div><div class="chips">${p.options
        .map((o, i) => `<button type="button" data-act="choice" data-key="${esc(p.key)}" data-val="${i}">${esc(o)}</button>`)
        .join('')}</div></div>`;
    case 'option':
      if (!p.options.length) return '';
      return `<div class="pending"><div class="label">Choose one:</div><div class="cards">${p.options
        .map((o, i) => `<button type="button" class="card" data-act="choice" data-key="${esc(p.key)}" data-val="${i}"><span class="what">${esc(o)}</span></button>`)
        .join('')}</div></div>`;
    case 'name': {
      const list = suggestions(p.kind);
      const id = `dl-${p.kind}`;
      return `<div class="pending"><div class="label">Name ${p.n ? `the ${KIND_EN[p.kind] ?? p.kind} for ${p.n} units` : `a ${KIND_EN[p.kind] ?? p.kind}`}:</div>
        <div class="row"><input class="grow" list="${id}" data-act-input="choiceText" data-key="${esc(p.key)}" placeholder="Type or pick…" />
        <button type="button" class="small" data-act="choiceTextGo" data-key="${esc(p.key)}">OK</button></div>
        <datalist id="${id}">${list.map((v) => `<option value="${esc(v)}">${esc(suggestionLabel(p.kind, v))}</option>`).join('')}</datalist></div>`;
    }
    case 'table':
      return `<div class="pending"><div class="label">Which table?</div><div class="chips">${PICKABLE_TABLES.map(
        (t) => `<button type="button" data-act="choiceStr" data-key="${esc(p.key)}" data-val="${t}">${esc(TABLE_EN[t])}</button>`,
      ).join('')}</div></div>`;
    case 'roll':
    case 'pick':
      return '';
  }
}

/** Choices already made under a key prefix (so they can be undone). */
export function madeChoices(s: CharState, prefix: string): string[] {
  return Object.keys(s.choices).filter((k) => k.startsWith(`${prefix}#`) || k.startsWith(`${prefix}@`));
}

/** A source: its label, what it gives, and any open choices inside it. */
export function sourceHtml(src: SourceRec, d: Derived, s: CharState, opts: { label?: boolean } = {}): string {
  const open = d.pending.filter((p) => p.key.startsWith(`${src.key}#`) && p.k !== 'pick' && p.k !== 'roll' && p.step === src.step);
  const made = madeChoices(s, src.key);
  const eff = src.effects.filter((e) => e.k !== 'roll' || true).map((e) => `<b>${esc(effectText(e, s))}</b>`);
  return `<div class="src">
    ${opts.label === false ? '' : `<div><strong>${esc(src.label)}</strong></div>`}
    ${eff.length ? `<div class="grants">${eff.join(' · ')}</div>` : ''}
    ${open.map(pendingHtml).join('')}
    ${made.length ? `<button type="button" class="link small" data-act="unchoose" data-key="${esc(src.key)}">change choices</button>` : ''}
  </div>`;
}

/** UI-only: which people a borrowed-trait list is showing. */
export const lendView: Record<string, string> = {};

/** A pick-N-of group as cards, with the chosen options' own open choices underneath. */
export function pickHtml(rec: PickRec, d: Derived, s: CharState, title?: string): string {
  const g = rec.group;
  const rolled = s.subRolls[rec.key] ?? [];
  const count = (id: string) => rec.have.filter((x) => x === id).length;
  const full = rec.have.length >= rec.need;
  const rollBtn = g.roll
    ? `<div class="row">${rolled.length ? `<span class="dice">${rolled.map((v) => die(v, 'd10 small')).join('')}</span>` : ''}
       <button type="button" class="small" data-act="rollPick" data-key="${esc(rec.key)}" data-sides="${g.roll.sides}" data-times="${g.roll.times}">${rolled.length ? 'Roll again' : `Roll ${g.roll.times > 1 ? `${g.roll.times}×` : ''}d${g.roll.sides}`}</button></div>`
    : '';
  const mustRoll = !!g.roll?.must;
  // Borrowed traits: filter by the lending people (default: one common in the homeland).
  let filterHtml = '';
  let shown = g.options;
  if (g.id === 'lana') {
    const lenders = [...new Set(g.options.map((o) => o.id.split('.')[0]))];
    const chosen = rec.have[0]?.split('.')[0];
    const homeText = d.homeland?.peoples ?? '';
    const guess = lenders.find((id) => homeText.includes(CONTENT.peoples.find((p) => p.id === id)?.en ?? '§'));
    const cur = lendView[rec.key] ?? chosen ?? guess ?? lenders[0];
    shown = g.options.filter((o) => o.id.startsWith(`${cur}.`));
    filterHtml = `<label class="field"><span>Borrow from (pick a people common in your homeland${d.homeland ? `: ${esc(homeText)}` : ''})</span>
      <select data-act-change="lendView" data-key="${esc(rec.key)}">${lenders
        .map((id) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(CONTENT.peoples.find((p) => p.id === id)?.en ?? id)}</option>`)
        .join('')}</select></label>`;
  }
  const cards = shown
    .map((o) => {
      const i = g.options.indexOf(o);
      const what = grants(o.g);
      const n = count(o.id);
      const isRolled = rolled.includes(i + 1);
      const locked = mustRoll && !isRolled && !n;
      return `<button type="button" class="card ${n ? 'on' : ''} ${isRolled ? 'rolled' : ''} ${locked ? 'dim' : ''}" ${locked ? 'disabled' : ''}
        data-act="pick" data-key="${esc(rec.key)}" data-id="${esc(o.id)}" data-need="${rec.need}" data-repeat="${g.repeat ? 1 : 0}">
        <span class="name">${g.roll ? `<span class="num">${i + 1}</span>` : ''}${o.star ? '<span class="star">★</span> ' : ''}${esc(o.en)}${n > 1 ? ` ×${n}` : ''}</span>
        ${what && what !== esc(o.en) ? `<span class="what">${what}</span>` : ''}
        ${o.note ? `<span class="what"><i>${esc(o.note)}</i></span>` : ''}
      </button>`;
    })
    .join('');
  const sub = d.sources
    .filter((x) => x.key.startsWith(`${rec.key}.`))
    .map((x) => {
      const open = d.pending.some((p) => p.key.startsWith(`${x.key}#`));
      const made = madeChoices(s, x.key).length;
      return open || made ? sourceHtml(x, d, s) : '';
    })
    .join('');
  const nested = d.picks.filter((p) => p.key.startsWith(`${rec.key}.`) && p !== rec).map((p) => pickHtml(p, d, s)).join('');
  const status = g.optional
    ? rec.have.length
      ? '<span class="done-mark">✓</span>'
      : '<span class="muted small">(optional)</span>'
    : full
      ? '<span class="done-mark">✓</span>'
      : `<span class="warn small">choose ${rec.need - rec.have.length} more</span>`;
  return `<div class="box ${full || g.optional ? '' : 'todo'}">
    <div class="row spread"><h3 style="margin:0">${esc(title ?? g.en)}</h3>${status}</div>
    ${g.note ? `<p class="small muted">${esc(g.note)}</p>` : ''}
    ${rollBtn}${filterHtml}
    <div class="cards">${cards}</div>
    ${sub}${nested}
  </div>`;
}

export function toast(msg: string): void {
  const el = document.getElementById('toast') as HTMLElement;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout((toast as unknown as { t?: number }).t);
  (toast as unknown as { t?: number }).t = window.setTimeout(() => (el.hidden = true), 2200);
}
