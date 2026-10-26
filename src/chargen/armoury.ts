/**
 * The armoury: a browsable chooser for weapons, shields and armour, used both for the
 * weapons and armour your past gave you and for buying more with silver.
 */
import { RARITY_EN, type Derived } from '../core/chargen/derive';
import type { Rarity } from '../core/chargen/grants';
import type { CharState } from '../core/chargen/state';
import type { Family } from '../core/chargen/types';
import { diceText, ENCUMBRANCE } from '../core/chargen/tables';
import { CONTENT } from '../content/chargen';
import {
  ARMOUR,
  DAMAGE_TYPE_EN,
  physiqueCheck,
  propList,
  rarityRank,
  SHIELDS,
  WEAPON_TYPES,
  weaponRank,
  WEAPONS,
  withBaseDamage,
  type Armour,
  type Shield,
  type Weapon,
} from '../content/chargen/equipment';
import { esc } from './ui';

export type ArmouryKind = 'weapons' | 'armour' | 'buy';

/** UI-only state for the open chooser. */
export const armouryView = {
  /** Slot key being filled, or 'shop' for buying. */
  slot: '' as string,
  kind: 'weapons' as ArmouryKind,
  type: 'Svärd',
  showAll: false,
  /** Item whose details are unfolded. */
  open: '',
};

const SHIELD_TYPE = 'shield';
const ARMOUR_TYPE = 'armour';
const RANK_EN = ['common', 'uncommon', 'rare'];

/** A drawn stand-in for the item's picture until there is real art (Weapon.art). */
function art(glyph: string, src?: string): string {
  return src ? `<img class="wart" src="${import.meta.env.BASE_URL}${esc(src)}" alt="" />` : `<span class="wart" aria-hidden="true">${glyph}</span>`;
}

const dice = (t: string) => t.replace(/T6/g, 'D6');

interface Ctx {
  s: CharState;
  d: Derived;
  /** Highest rarity rank you may take here (Infinity when buying). */
  max: number;
  buying: boolean;
  left: number;
}

function rankOf(w: Weapon, d: Derived): number {
  return weaponRank(w, d.people?.id, d.people?.family);
}

function takeBtn(ctx: Ctx, kind: string, sv: string, price: number, allowed: boolean, why: string): string {
  if (ctx.buying)
    return `<button type="button" class="small ${price <= ctx.left ? 'primary' : ''}" data-act="armBuy" data-kind="${kind}" data-val="${esc(sv)}">Buy · ${price} silver</button>${price > ctx.left ? '<span class="small warn">more than you have</span>' : ''}`;
  return allowed
    ? `<button type="button" class="small primary" data-act="armTake" data-val="${esc(sv)}">Take this</button>`
    : `<span class="small muted">${esc(why)}</span>`;
}

function weaponCard(w: Weapon, ctx: Ctx): string {
  const { d } = ctx;
  const type = WEAPON_TYPES.find((t) => t.skill === w.skill);
  const bd = d.derived.damage;
  const phys = d.attrs.find((a) => a.attr === 'Kroppsbyggnad')!.dice;
  const rank = rankOf(w, d);
  const allowed = rank <= ctx.max;
  const cultural = !!w.culture && rank > rarityRank(w.rarity === '–' ? 'vanlig' : w.rarity);
  const sk = d.skills.find((x) => x.id === w.skill);
  const hands = (['h1', 'h2'] as const)
    .map((h) => {
      const c = physiqueCheck(w[h], phys);
      const label = h === 'h1' ? 'One hand' : 'Two hands';
      if (!c) return `<span class="muted">${label}: no</span>`;
      return `<span class="${c.penalty ? 'warn' : 'good'}">${label}: Physique ${w[h] === '0' ? 'any' : dice(w[h])} ${c.penalty ? `(you −${c.penalty}D6)` : '✓'}</span>`;
    })
    .join(' · ');
  const dmg = (x: string) => (x === '–' ? '<span class="muted">–</span>' : `<b>${esc(withBaseDamage(x, bd))}</b>`);
  const damage = w.melee
    ? `<table class="t fit dmg"><tr><th>Cut</th><th>Crush</th><th>Thrust</th></tr><tr><td>${dmg(w.melee.hugg)}</td><td>${dmg(w.melee.kross)}</td><td>${dmg(w.melee.stick)}</td></tr></table>`
    : `<table class="t fit dmg"><tr><th>Range</th><th>Damage</th></tr><tr><td>${esc(w.ranged!.range)}</td><td>${dmg(w.ranged!.dmg)} <span class="small muted">${esc(DAMAGE_TYPE_EN[w.ranged!.type] ?? w.ranged!.type)}</span></td></tr></table>`;
  const props = propList(w.props);
  const open = armouryView.open === w.sv;
  const chosen = !ctx.buying && ctx.s.equipment.weapons[armouryView.slot] === w.sv;
  return `<div class="wcard ${allowed || ctx.buying ? '' : 'dim'} ${chosen ? 'on' : ''}">
    <div class="whead" data-act="armExpand" data-val="${esc(w.sv)}">${art(type?.glyph ?? '⚔', w.art)}
      <div class="grow"><b>${esc(w.en)}</b> <span class="tag">${esc(RANK_EN[rank])}</span>${w.culture ? `<span class="tag">${cultural ? 'cultural' : 'yours'}</span>` : ''}
      <div class="small muted">${esc(CONTENT.skill(w.skill)?.en ?? w.skill)}${sk ? ` ${esc(diceText(sk.dice))}` : ''} · ${esc(w.length)} · ${esc(w.weight)} · ${w.price} silver</div></div>
      <span class="small muted">${open ? '▲' : '▼'}</span></div>
    ${damage}
    <div class="chips props">${props.map((p) => `<span class="prop">${esc(p.en)}</span>`).join('')}</div>
    ${open ? `<div class="small">${hands}</div><ul class="small plain pinfo">${props.map((p) => `<li><b>${esc(p.en)}:</b> ${esc(p.info)}</li>`).join('')}</ul>
      ${w.culture ? `<p class="small muted">A weapon of the ${esc(w.culture.map((c) => CONTENT.peoples.find((x) => x.id === c)?.en ?? CONTENT.families[c as Family]?.en ?? c).join(', '))}: rare for everyone else.</p>` : ''}` : ''}
    <div class="row">${takeBtn(ctx, 'w', w.sv, w.price, allowed, `Too rare (${RANK_EN[rank]}) for this pick`)}</div>
  </div>`;
}

function shieldCard(x: Shield, ctx: Ctx): string {
  const phys = ctx.d.attrs.find((a) => a.attr === 'Kroppsbyggnad')!.dice;
  const allowed = rarityRank(x.rarity) <= ctx.max;
  const c = physiqueCheck(x.h1, phys);
  const props = propList(x.props);
  return `<div class="wcard ${allowed || ctx.buying ? '' : 'dim'}">
    <div class="whead">${art('🛡')}<div class="grow"><b>${esc(x.en)}</b> <span class="tag">${esc(RARITY_EN[x.rarity])}</span>
      <div class="small muted">Shield · ${x.price} silver · ${c ? `<span class="${c.penalty ? 'warn' : 'good'}">Physique ${x.h1 === '0' ? 'any' : dice(x.h1)} ${c.penalty ? `(you −${c.penalty}D6)` : '✓'}</span>` : ''}</div></div></div>
    <table class="t fit dmg"><tr><th>Melee</th><th>Ranged</th><th>Cover</th><th>Bash</th></tr><tr><td><b>${esc(dice(x.melee))}</b></td><td><b>${esc(dice(x.ranged))}</b></td><td>${esc(x.cover)}</td><td>${esc(withBaseDamage(x.dmg, ctx.d.derived.damage))}</td></tr></table>
    ${props.length ? `<ul class="small plain pinfo">${props.map((p) => `<li><b>${esc(p.en)}:</b> ${esc(p.info)}</li>`).join('')}</ul>` : ''}
    <div class="row">${takeBtn(ctx, 'h', x.sv, x.price, allowed, 'Too rare for this pick')}</div></div>`;
}

function armourCard(x: Armour, ctx: Ctx): string {
  const A = ctx.d.derived.armour;
  const allowed = rarityRank(x.rarity) <= ctx.max;
  const dwarf = ctx.d.people?.family === 'dvarg';
  const load = Math.max(0, x.load - (dwarf ? 8 : 0));
  const enc = ENCUMBRANCE.find((e) => load <= e.max) ?? ENCUMBRANCE[ENCUMBRANCE.length - 1];
  const chosen = !ctx.buying && ctx.s.equipment.armour[armouryView.slot] === x.sv;
  return `<div class="wcard ${allowed || ctx.buying ? '' : 'dim'} ${chosen ? 'on' : ''}">
    <div class="whead">${art('🥋')}<div class="grow"><b>${esc(x.en)}</b> <span class="tag">${esc(RARITY_EN[x.rarity])}</span>
      <div class="small muted">Full suit · load ${load}${dwarf ? ' (dwarf −8)' : ''} · ${x.price} silver</div></div></div>
    <table class="t fit dmg"><tr><th>vs Cut</th><th>vs Crush</th><th>vs Thrust</th></tr><tr><td><b>${x.h + A}</b></td><td><b>${x.k + A}</b></td><td><b>${x.s + A}</b></td></tr></table>
    <p class="small muted">Includes your base armour ${A}. Worn: ${enc.penalty === '–' ? 'no penalty' : `${enc.penalty} on Speed, Reaction and movement`}, base fatigue ${enc.baseFatigue}.</p>
    <div class="row">${takeBtn(ctx, 'a', x.sv, x.price, allowed, 'Too rare for this pick')}</div></div>`;
}

/** The chooser, opened for one slot (or the shop). */
export function armouryHtml(s: CharState, d: Derived, opts: { kind: ArmouryKind; rarity?: Rarity; upgrade?: boolean; left: number }): string {
  const buying = opts.kind === 'buy';
  const max = buying ? Infinity : rarityRank(opts.rarity ?? 'vanlig') + (opts.upgrade && opts.kind === 'weapons' ? 1 : 0);
  const ctx: Ctx = { s, d, max, buying, left: opts.left };
  const types = [
    ...(opts.kind !== 'armour' ? WEAPON_TYPES.map((t) => ({ id: t.skill, en: t.en, glyph: t.glyph, n: WEAPONS.filter((w) => w.skill === t.skill && (buying ? w.price > 0 : rankOf(w, d) <= max)).length })) : []),
    ...(opts.kind !== 'armour' ? [{ id: SHIELD_TYPE, en: 'Shields', glyph: '🛡', n: SHIELDS.filter((x) => buying || rarityRank(x.rarity) <= max).length }] : []),
    ...(opts.kind !== 'weapons' ? [{ id: ARMOUR_TYPE, en: 'Armour', glyph: '🥋', n: ARMOUR.filter((x) => buying || rarityRank(x.rarity) <= max).length }] : []),
  ];
  if (!types.some((t) => t.id === armouryView.type)) armouryView.type = types[0].id;
  const type = armouryView.type;
  let cards = '';
  if (type === ARMOUR_TYPE) cards = ARMOUR.filter((x) => buying || armouryView.showAll || rarityRank(x.rarity) <= max).map((x) => armourCard(x, ctx)).join('');
  else if (type === SHIELD_TYPE) cards = SHIELDS.filter((x) => buying || armouryView.showAll || rarityRank(x.rarity) <= max).map((x) => shieldCard(x, ctx)).join('');
  else
    cards = WEAPONS.filter((w) => w.skill === type && (buying ? w.price > 0 : armouryView.showAll || rankOf(w, d) <= max))
      .sort((a, b) => rankOf(a, d) - rankOf(b, d) || a.en.localeCompare(b.en))
      .map((w) => weaponCard(w, ctx))
      .join('');
  const hidden = !buying && !armouryView.showAll;
  return `<div class="armoury">
    <div class="row spread"><b>${buying ? 'Buy with silver' : `Choose: ${esc(RANK_EN[Math.min(2, max)])} or lower`}</b><button type="button" class="link small" data-act="armClose">close</button></div>
    <div class="chips">${types.map((t) => `<button type="button" class="${t.id === type ? 'on' : ''}" data-act="armType" data-val="${esc(t.id)}" ${t.n ? '' : 'disabled'}>${t.glyph} ${esc(t.en)} <small>${t.n}</small></button>`).join('')}</div>
    ${!buying ? `<button type="button" class="link small" data-act="armAll">${hidden ? 'also show the ones too rare for this pick' : 'show only what I can take'}</button>` : ''}
    <p class="small muted">Damage already includes your base damage (${esc(diceText(d.derived.damage))}). Tap a weapon's name for what its properties do and whether you are strong enough for it.</p>
    <div class="wcards">${cards || '<p class="muted">Nothing here.</p>'}</div>
  </div>`;
}

/** One line for what is in a slot. */
export function slotSummary(sv: string | undefined, d: Derived): string {
  if (!sv) return '<span class="muted">Nothing chosen yet</span>';
  const w = WEAPONS.find((x) => x.sv === sv);
  if (w) {
    const t = WEAPON_TYPES.find((x) => x.skill === w.skill);
    const best = w.melee ? [w.melee.hugg, w.melee.kross, w.melee.stick].filter((x) => x !== '–')[0] : w.ranged!.dmg;
    return `${art(t?.glyph ?? '⚔', w.art)} <span><b>${esc(w.en)}</b> <span class="small muted">${esc(withBaseDamage(best ?? '', d.derived.damage))}</span></span>`;
  }
  const sh = SHIELDS.find((x) => x.sv === sv);
  if (sh) return `${art('🛡')} <b>${esc(sh.en)}</b>`;
  const a = ARMOUR.find((x) => x.sv === sv);
  if (a) return `${art('🥋')} <span><b>${esc(a.en)}</b> <span class="small muted">${a.h}/${a.k}/${a.s}</span></span>`;
  return esc(sv);
}
