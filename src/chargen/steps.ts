/** Renderers for each creation step. Pure string templates; main.ts wires the actions. */
import { ATTR_EN, baseTable, NUMB_EN, POOL_EN, poolAllows, rollsTwice, RARITY_EN, STEP, TABLE_EN, type Derived, type SkillRow, type SourceRec } from '../core/chargen/derive';
import { ATTRS, type Attr, type Rarity } from '../core/chargen/grants';
import { checkDetails, genderKey, typical } from '../core/chargen/details';
import type { CharState } from '../core/chargen/state';
import { diceText, MAX_POINTS_PER_ATTR, POINT_MODELS } from '../core/chargen/tables';
import type { Family } from '../core/chargen/types';
import { CONTENT } from '../content/chargen';
import { FAMILY_ORDER } from '../content/chargen/peoples';
import { DRIVE_REWARDS, DRIVES } from '../content/chargen/drives';
import { languageEn, SCRIPTS, SPOKEN } from '../content/chargen/languages';
import { DWARF_HOUSES, nameCultureOf } from '../content/chargen/names';
import { SKILLS } from '../content/chargen/skills';
import { armouryHtml, armouryView, slotSummary } from './armoury';
import { itemEn, PACKAGES, packageEn } from '../content/chargen/equipment';
import { die, esc, grants, pendingHtml, pickHtml, sourceHtml } from './ui';

/** UI-only state (not saved). */
export const view = {
  family: 'manniska' as Family,
  pool: '' as string,
  showAllBackgrounds: false,
  showAllHomelands: true,
  /** Card lists opened again after a choice was made (keyed by field). */
  open: {} as Record<string, boolean>,
};

const intro = (t: string) => `<p class="intro">${t}</p>`;

/**
 * A choose-one list of cards. Once something is chosen it folds down to that card,
 * so what the choice gives (and asks) sits right below it instead of under the whole list.
 */
function cardPicker(field: string, cards: { on: boolean; html: string }[]): string {
  const chosen = cards.filter((c) => c.on);
  if (!chosen.length) return `<div class="cards">${cards.map((c) => c.html).join('')}</div>`;
  if (view.open[field])
    return `<div class="row"><button type="button" class="small" data-act="fold" data-key="${field}">▲ Show only my choice</button></div><div class="cards">${cards.map((c) => c.html).join('')}</div>`;
  return `<div class="cards">${chosen.map((c) => c.html).join('')}</div>
    <div class="row"><button type="button" class="small" data-act="fold" data-key="${field}">▼ Change (show all ${cards.length})</button></div>`;
}
const sourcesFor = (d: Derived, step: number, skip: (s: SourceRec) => boolean = () => false) =>
  d.sources.filter((x) => x.step === step && !d.picks.some((p) => x.key.startsWith(`${p.key}.`)) && !skip(x));

function warningsHtml(d: Derived, step: number): string {
  const w = d.warnings.filter((x) => x.step === step);
  return w.length ? `<div class="box todo">${w.map((x) => `<p class="warn small">⚠ ${esc(x.text)}</p>`).join('')}</div>` : '';
}

// ——— Preparation ———
function prep(s: CharState): string {
  return `<h2>Preparation</h2>
  ${intro('Note down anything fixed before you start: what kind of adventure this is, any limits on what you may play, and how the characters know each other.')}
  <label class="field"><span>Notes, restrictions, agreements</span>
  <textarea data-bind="prep" placeholder="e.g. A campaign in Asharien; no pyromancers; we all serve the same merchant house…">${esc(s.prep)}</textarea></label>
  <div class="box"><h3>How this works</h3>
  <p>Some things you choose, some you roll for: tap a die button and the result is kept. Everything you pick feeds the later steps, and you can go back and change things. The later steps update by themselves.</p>
  <p class="small muted">Red dots in the step bar mark things still to do. Your character saves itself in this browser. Use ☰ for more characters or to export one.</p></div>`;
}

// ——— Homeland ———
function homeland(s: CharState, d: Derived): string {
  const rolls = s.homelandRolls ?? [];
  const hit = (lo: number, hi: number) => rolls.some((r) => r >= lo && r <= hi);
  const cards = CONTENT.homelands.map((h) => ({
    on: s.homeland === h.id,
    html: `<button type="button" class="card ${s.homeland === h.id ? 'on' : ''} ${hit(h.lo, h.hi) ? 'rolled' : ''}" data-act="set" data-field="homeland" data-val="${h.id}">
      <span class="name"><span class="num">${h.lo === h.hi ? h.lo : `${h.lo}–${h.hi}`}</span>${esc(h.en)}</span>
      <span class="what">${esc(h.blurb)}</span></button>`,
  }));
  const h = d.homeland;
  return `<h2>Homeland</h2>
  ${intro('Where in the world your character comes from. It gives you a language. Choose freely, or roll d100 twice and pick one of the results.')}
  <div class="row"><button type="button" data-act="rollHomeland">🎲 Roll 2 × d100</button>${rolls.length ? `<span class="dice">${rolls.map((r) => die(r)).join('')}</span>` : ''}</div>
  ${cardPicker('homeland', cards)}
  ${h ? `<div class="box hi"><h3>${esc(h.en)}</h3>
    <p class="small"><b>Peoples:</b> ${esc(h.peoples)}<br><b>Faiths:</b> ${esc(h.religions)}${h.places ? `<br><b>Places:</b> ${esc(h.places)}` : ''}</p>
    ${sourcesFor(d, STEP.homeland).map((x) => sourceHtml(x, d, s, { label: false })).join('')}</div>` : ''}`;
}

// ——— Background ———
function background(s: CharState, d: Derived): string {
  const rolls = s.bgRolls ?? [];
  const list = view.showAllBackgrounds ? CONTENT.backgrounds : CONTENT.backgrounds.filter((b) => rolls.includes(b.n));
  const cards = list
    .map(
      (b) => `<button type="button" class="card ${s.background === b.n ? 'on' : ''} ${rolls.includes(b.n) ? 'rolled' : ''}" data-act="set" data-field="background" data-val="${b.n}">
      <span class="name"><span class="num">${b.n}</span>${esc(b.en)}</span>
      <span class="what">${esc(b.blurb)}</span>
      <span class="what">1 roll on ${esc(TABLE_EN[b.table])}. Two of: ${b.opts.map((g) => grants(g)).join(' / ')}</span></button>`,
    )
    .join('');
  const pick = d.picks.find((p) => p.key === 'bg.p');
  return `<h2>Background</h2>
  ${intro('A piece of your past: a parent\'s trade, an earlier life. It is always rolled: d100 twice, then keep one. It gives one event-table roll, and you take two of its three skill options.')}
  <div class="row"><button type="button" class="${rolls.length ? '' : 'primary'}" data-act="rollBg">🎲 ${rolls.length ? 'Roll again' : 'Roll 2 × d100'}</button>
  ${rolls.length ? `<span class="dice">${rolls.map((r) => die(r)).join('')}</span>` : ''}
  <button type="button" class="link small" data-act="toggleView" data-flag="showAllBackgrounds">${view.showAllBackgrounds ? 'show only rolled' : 'show all 100'}</button></div>
  <div class="cards">${cards}</div>
  ${pick ? pickHtml(pick, d, s, `${d.background?.en}: take two`) : ''}
  ${sourcesFor(d, STEP.background).map((x) => sourceHtml(x, d, s)).join('')}`;
}

// ——— People ———
function people(s: CharState, d: Derived): string {
  const fam = CONTENT.families[view.family];
  const list = CONTENT.peoples.filter((p) => p.family === view.family);
  const rollRow =
    view.family === 'manniska'
      ? `<div class="row"><button type="button" class="small" data-act="rollPeople">🎲 Roll d100 for a human people</button>${s.subRolls.people ? die(s.subRolls.people[0], 'small') : ''}</div>`
      : '';
  const cards = list.map((p) => {
    const rolled = s.subRolls.people && p.lo !== undefined && s.subRolls.people[0] >= p.lo && s.subRolls.people[0] <= (p.hi ?? p.lo);
    return {
      on: s.people === p.id,
      html: `<button type="button" class="card ${s.people === p.id ? 'on' : ''} ${rolled ? 'rolled' : ''}" data-act="set" data-field="people" data-val="${p.id}">
      <span class="name">${p.lo !== undefined ? `<span class="num">${p.lo}–${p.hi}</span>` : ''}${esc(p.en)}${p.marvel ? ' <span class="tag">marvellous</span>' : ''}</span>
      <span class="what">${esc(p.blurb)}</span></button>`,
    };
  });
  const p = d.people;
  let detail = '';
  if (p) {
    const famDef = CONTENT.families[p.family];
    const attrs = p.attrs ?? famDef.attrs ?? [];
    const others = CONTENT.peoples.filter((x) => x.id !== p.id && (x.culture.length || x.picks.length));
    const needsCulture = !p.culture.length && !p.picks.length;
    detail = `<div class="box hi"><h3>${esc(p.en)}</h3>${p.build ? `<p class="small muted">${esc(p.build)}</p>` : ''}
      <table class="t"><tr>${ATTRS.map((a) => `<th class="n">${esc(ATTR_EN[a].slice(0, 4))}</th>`).join('')}</tr>
      <tr>${attrs.map((v) => `<td class="n">${v}</td>`).join('')}</tr></table>
      <label class="field"><span>Raised by another people? (adoption or a mixed household: keep your attributes and innate traits, take the other people's culture)${needsCulture ? ' <b class="warn">— needed for this people</b>' : ''}</span>
      <select data-act-change="set" data-field="cultureFrom"><option value="">No, raised among my own</option>${others
        .map((x) => `<option value="${x.id}" ${s.cultureFrom === x.id ? 'selected' : ''}>${esc(x.en)}</option>`)
        .join('')}</select></label>
      <h4>What you get</h4>
      ${sourcesFor(d, STEP.people).map((x) => sourceHtml(x, d, s)).join('')}
      </div>
      ${d.picks
        .filter((r) => r.step === STEP.people && !d.picks.some((o) => o !== r && r.key.startsWith(`${o.key}.`)))
        .map((r) => pickHtml(r, d, s))
        .join('')}`;
  }
  const folded = !!p && p.family === view.family && !view.open.people;
  return `<h2>People</h2>
  ${intro('Your people gives your starting attributes, innate and cultural traits and a language (if it is your homeland\'s language you get 1 free unit instead). Then choose two of its five optional traits. ★ marks a quick pick.')}
  <div class="chips">${FAMILY_ORDER.map((f) => `<button type="button" class="${view.family === f ? 'on' : ''}" data-act="family" data-val="${f}">${esc(CONTENT.families[f].en)}</button>`).join('')}</div>
  ${folded ? '' : `<p class="small muted">${esc(fam.blurb)}</p>
  ${fam.innate.length ? `<p class="small"><b>All ${esc(fam.en.toLowerCase())}:</b> ${fam.innate.map((o) => `${esc(o.en)} (${grants(o.g)})`).join('; ')}</p>` : ''}
  ${rollRow}`}
  ${cardPicker('people', cards)}
  ${detail}`;
}

// ——— Religion ———
function religion(s: CharState, d: Derived): string {
  if (d.godless) {
    return `<h2>Religion</h2><div class="box hi"><p>Elves are <b>godless</b>: they live by the elven code of honour and skip this step.</p>
    <p class="small muted">An elf may still follow a faith but gets no doctrines. Take an optional trait such as Converts to have a real religion.</p></div>`;
  }
  const forced = d.forcedReligion;
  const cards = CONTENT.religions.map((r) => {
    const parent = r.parent ? CONTENT.religions.find((x) => x.id === r.parent)?.en ?? 'Forbidden cults' : '';
    const ok = !forced || forced.includes(r.id) || forced.includes(r.parent ?? '');
    return {
      on: s.religion === r.id,
      html: `<button type="button" class="card ${s.religion === r.id ? 'on' : ''} ${ok ? '' : 'dim'}" data-act="set" data-field="religion" data-val="${r.id}">
        <span class="name">${esc(r.en)}${parent ? ` <span class="tag">${esc(parent)}</span>` : ''}${r.ethnic ? ' <span class="tag">ethnic</span>' : ''}</span>
        <span class="what">${esc(r.blurb)}</span></button>`,
    };
  });
  const picks = d.picks.filter((p) => p.step === STEP.religion);
  return `<h2>Religion</h2>
  ${intro('Choose a faith (unless a trait already decided it). Then two doctrines, each from a list of two options. The same doctrine twice is fine, with different options. Ethnic faiths are only for their own people.')}
  ${forced ? `<div class="box hi"><p>A trait you chose ties you to <b>${forced.map((id) => esc(CONTENT.religions.find((r) => r.id === id)?.en ?? id)).join(' or ')}</b>.</p></div>` : ''}
  ${warningsHtml(d, STEP.religion)}
  ${cardPicker('religion', cards)}
  ${picks.map((r) => pickHtml(r, d, s)).join('')}`;
}

const subSources = (d: Derived, s: CharState, key: string) => d.sources.filter((x) => x.key === key).map((x) => sourceHtml(x, d, s, { label: false })).join('');

// ——— Archetype ———
function archetype(s: CharState, d: Derived): string {
  const cards = CONTENT.archetypes.map((a, i) => ({
    on: s.archetype === a.id,
    html: `<button type="button" class="card ${s.archetype === a.id ? 'on' : ''} ${s.subRolls.arch?.[0] === i + 1 ? 'rolled' : ''}" data-act="set" data-field="archetype" data-val="${a.id}">
      <span class="name"><span class="num">${i + 1}</span>${esc(a.en)}${a.mystic ? ' <span class="tag">mystic</span>' : ''}</span>
      <span class="what">${esc(a.blurb)}</span></button>`,
  }));
  const a = d.archetype;
  const xa = d.picks.find((p) => p.key === 'arch.x');
  return `<h2>Archetype</h2>
  ${intro('Your archetype is your path in life: what you trained for and spent your years doing. Choose freely or roll.')}
  <div class="row"><button type="button" class="small" data-act="rollSub" data-key="arch" data-sides="10">🎲 Roll d10</button>${s.subRolls.arch ? die(s.subRolls.arch[0], 'd10 small') : ''}<span class="small muted">(10 = roll again)</span></div>
  ${cardPicker('archetype', cards)}
  ${a ? `<div class="box hi"><h3>${esc(a.en)}: what you get</h3>${subSources(d, s, 'arch')}${(a.notes ?? []).map((n) => `<p class="small muted">${esc(n)}</p>`).join('')}</div>${xa ? pickHtml(xa, d, s) : ''}` : ''}`;
}

// ——— Environment & occupation ———
function environment(s: CharState, d: Derived): string {
  const cards = CONTENT.environments.map((e, i) => ({
    on: s.environment === e.id,
    html: `<button type="button" class="card ${s.environment === e.id ? 'on' : ''} ${s.subRolls.env?.[0] === i + 1 ? 'rolled' : ''}" data-act="set" data-field="environment" data-val="${e.id}">
      <span class="name"><span class="num">${i + 1}</span>${esc(e.en)}</span><span class="what">${esc(e.blurb)}</span></button>`,
  }));
  const a = d.archetype;
  const e = d.environment;
  const xe = d.picks.find((p) => p.key === 'env.x');
  const occ = a && e ? a.occupations[e.id] : '';
  return `<h2>Environment</h2>
  ${intro('The world you lived and worked in. Together with your archetype it makes your occupation. Choose freely or roll.')}
  <div class="row"><button type="button" class="small" data-act="rollSub" data-key="env" data-sides="10">🎲 Roll d10</button>${s.subRolls.env ? die(s.subRolls.env[0], 'd10 small') : ''}</div>
  ${cardPicker('environment', cards)}
  ${e ? `<div class="box hi"><h3>${esc(e.en)}: what you get</h3>${subSources(d, s, 'env')}</div>${xe ? pickHtml(xe, d, s) : ''}` : ''}
  <div class="box"><h3>Occupation</h3>
  <label class="field"><span>${a && e ? `${esc(a.en)} + ${esc(e.en)}${occ ? `: e.g. ${esc(occ)}` : ''}` : 'From your archetype and environment'}</span>
  <input data-bind="occupation" value="${esc(s.occupation)}" placeholder="e.g. Art historian" /></label></div>`;
}

// ——— Event tables ———
function events(s: CharState, d: Derived): string {
  const toStrike = d.sources.flatMap((x) => x.effects).reduce((n, e) => (e.k === 'stryk' ? n + e.n : n), 0);
  const rows = d.slots
    .map((slot, i) => {
      const t = slot.table ? CONTENT.tables[baseTable(slot.table)] : undefined;
      const tablePick = d.pending.find((p) => p.key === `${slot.key}.t`);
      const vals = slot.rec?.values ?? [];
      const results = slot.results
        .map((r, j) => {
          const src = d.sources.find((x) => x.key === `${slot.key}:${j}`);
          return `<div class="box hi"><div class="row">${die(vals[j])}<div class="grow"><strong>${esc(r.en)}</strong>${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ''}</div></div>
            ${src ? sourceHtml(src, d, s, { label: false }) : ''}
            ${d.picks.filter((p) => src && p.key.startsWith(`${src.key}#`)).map((p) => pickHtml(p, d, s)).join('')}
            ${r.again ? '<p class="small warn">…and roll this one again.</p>' : ''}</div>`;
        })
        .join('');
      const offer = s.rolls[slot.key]?.offer;
      const offerHtml = offer
        ? `<div class="pending"><div class="label">Rolled twice: keep one</div><div class="cards">${offer
            .map((v) => {
              const e = t?.entries.find((x) => v >= x.lo && v <= x.hi);
              const g = slot.table === 'vf' ? grants(e?.g ?? '') : slot.table === 'vfk' ? 'a circle named after them' : '';
              return `<button type="button" class="card" data-act="keepOffer" data-key="${esc(slot.key)}" data-val="${v}"><span class="name"><span class="num">${v}</span>${esc(e?.en ?? '')}</span>${g ? `<span class="what">${g}</span>` : ''}</button>`;
            })
            .join('')}</div></div>`
        : '';
      const rerollTaken = !!s.rerollUsed && d.slots.some((x) => x.key === s.rerollUsed && x.results.length > 0);
      const canReroll = !rerollTaken && slot.results.length > 0;
      return `<div class="box ${slot.needsRoll || tablePick ? 'todo' : ''}">
        <div class="row spread"><strong>${i + 1}. ${t ? esc(t.en) : 'Any table'}</strong><span class="small muted">from ${esc(slot.from)}</span></div>
        ${slot.struck ? `<p class="muted">Given up. <button type="button" class="link small" data-act="strike" data-key="${esc(slot.key)}">take it back</button></p>` : `
        ${tablePick ? pendingHtml(tablePick) : slot.table && s.choices[`${slot.key}.t`] ? `<button type="button" class="link small" data-act="unchooseKey" data-key="${esc(slot.key)}.t">change table</button>` : ''}
        ${results}${offerHtml}
        <div class="row">
          ${slot.needsRoll && !offer ? `<button type="button" class="primary" data-act="rollSlot" data-key="${esc(slot.key)}">🎲 Roll ${rollsTwice(slot.table) ? '2 × ' : ''}d100</button>` : ''}
          ${canReroll ? `<button type="button" class="small" data-act="reroll" data-key="${esc(slot.key)}">Re-roll (once per character)</button>` : ''}
          ${s.rerollUsed === slot.key ? '<span class="small muted">re-rolled</span>' : ''}
          ${toStrike ? `<button type="button" class="link small" data-act="strike" data-key="${esc(slot.key)}">give up this roll</button>` : ''}
        </div>`}
      </div>`;
    })
    .join('');
  const empty = !CONTENT.tables.fa?.entries.length;
  const open = d.slots.filter((x) => x.needsRoll && x.table).length;
  return `<h2>Event tables</h2>
  ${intro('Your past, rolled up: travels, intrigues, battles, studies, miracles and sorcery. Your background, people, archetype and environment gave you these rolls. Some results give more rolls. You may re-roll <b>one</b> result you don\'t like.')}
  ${empty ? '<div class="box todo"><p class="warn">The event tables are still being written. Coming in the next update.</p></div>' : ''}
  ${warningsHtml(d, STEP.events)}
  ${open > 1 ? `<div class="row"><button type="button" data-act="rollAll">🎲 Roll all ${open} open rolls</button></div>` : ''}
  ${rows || '<p class="muted">No rolls yet. They come from the earlier steps.</p>'}`;
}

// ——— Attributes ———
function attributes(s: CharState, d: Derived): string {
  const model = s.attrModel;
  const lumps = model && model !== 'fria' ? POINT_MODELS[model] : [];
  const usedLumps = new Set(Object.values(s.attrLump));
  const p = d.attrPoints;
  const extraSpent = ATTRS.reduce((n, a) => n + (s.attrExtra[a] ?? 0), 0);
  const extraBudget = model === 'fria' ? p.total : p.extra;
  // The extra-points column only shows when there is something to spend (keeps the table phone-narrow).
  const showExtra = model === 'fria' || extraBudget > 0 || extraSpent !== 0;
  const sgn = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  const rows = d.attrs
    .map((a) => {
      const li = s.attrLump[a.attr];
      const sel = lumps.length
        ? `<select data-act-change="lump" data-attr="${a.attr}"><option value="">–</option>${lumps
            .map((v, i) => `<option value="${i}" ${li === i ? 'selected' : ''} ${usedLumps.has(i) && li !== i ? 'disabled' : ''}>+${v}</option>`)
            .join('')}</select>`
        : '';
      const ex = s.attrExtra[a.attr] ?? 0;
      return `<tr><td>${esc(ATTR_EN[a.attr])}</td>
        <td class="n">${a.base + a.mods}${a.mods ? `<span class="sub">${a.base}${sgn(a.mods)}</span>` : ''}</td>
        ${lumps.length ? `<td class="n">${sel}</td>` : ''}
        ${showExtra ? `<td class="n"><span class="stepper"><button type="button" data-act="extra" data-attr="${a.attr}" data-d="-1">−</button><span class="v">${ex}</span><button type="button" data-act="extra" data-attr="${a.attr}" data-d="1" ${extraSpent >= extraBudget ? 'disabled' : ''}>+</button></span></td>` : ''}
        <td class="n"><b>${a.value}</b><span class="sub">${a.attr === 'Visdom' ? '–' : esc(diceText(a.dice))}</span></td></tr>`;
    })
    .join('');
  const w = d.wisdom;
  const modelBtn = (m: string, label: string, sub: string) =>
    `<button type="button" class="card ${model === m ? 'on' : ''}" data-act="model" data-val="${m}"><span class="name">${label}</span><span class="what">${sub}</span></button>`;
  return `<h2>Attributes</h2>
  ${intro(`Start from your people's values, add the changes from your environment and events, then spend 40 points. Use one of the two lump patterns: each lump goes on a different attribute. At most ${MAX_POINTS_PER_ATTR} points on one attribute, and every attribute must end at 4 or more. 12 is an average human.`)}
  <div class="cards">
    ${modelBtn('balanserad', 'Balanced', POINT_MODELS.balanserad.map((v) => `+${v}`).join(' '))}
    ${modelBtn('fokuserad', 'Focused', POINT_MODELS.fokuserad.map((v) => `+${v}`).join(' '))}
    ${modelBtn('fria', 'Free points (optional rule)', '40 single points, spend freely')}
  </div>
  ${model ? `<div class="box">
    <table class="t fit"><tr><th>Attribute</th><th class="n">Start</th>${lumps.length ? '<th class="n">Lump</th>' : ''}${showExtra ? `<th class="n">${model === 'fria' ? 'Points' : 'Extra'}</th>` : ''}<th class="n">Value</th></tr>${rows}</table>
    <p class="small">${model === 'fria' ? `Points: ${extraSpent} / ${extraBudget}` : `Lumps placed: ${Object.keys(s.attrLump).length} / 8${showExtra ? ` · Extra points (from traits): ${extraSpent} / ${extraBudget}` : ''}`}</p>
    <p class="small muted">Start = your people's value plus changes from traits and events. Value shows the dice below it.</p>
  </div>` : ''}
  ${warningsHtml(d, STEP.attributes)}
  <div class="box"><h3>Derived</h3>
  <p>Base armour <b>${d.derived.armour}</b> · Base damage <b>${esc(diceText(d.derived.damage))}</b> · Healing rate <b>${d.derived.healing}</b></p>
  <p class="small">Wisdom ${d.attrs.find((a) => a.attr === 'Visdom')?.value}: ${w.incompetent === 'all' ? 'incompetent in all knowledge skills' : w.incompetent ? `incompetent in ${w.incompetent} knowledge skills` : 'no incompetences'}, ${
    w.base1 === 'all' ? 'base 1 in all knowledge skills' : `base 1 in ${w.base1} knowledge skills`
  }${w.extraUnits ? `, +${w.extraUnits} knowledge units` : ''}${w.expertise ? `, +${w.expertise} expertise units` : ''}. New knowledge in play costs ${w.newKnowledgeXp} experience.</p></div>`;
}

// ——— Skills ———
const GROUP_ORDER = ['kunskap', 'mystik', 'rorelse', 'social', 'strid', 'vildmark', 'E', 'F', 'H', 'K'] as const;
const GROUP_TITLE: Record<string, string> = { kunskap: 'Knowledge', mystik: 'Mystic', rorelse: 'Movement', social: 'Social', strid: 'Combat', vildmark: 'Wilderness', E: 'Expertises', F: 'Abilities', H: 'Crafts', K: 'Marks' };

function skills(s: CharState, d: Derived): string {
  const pools = d.pools.filter((p) => p.total > 0);
  if (!view.pool || !pools.some((p) => p.pool === view.pool)) view.pool = pools[0]?.pool ?? '';
  const pool = view.pool;
  const poolBtns = pools
    .map((p) => `<button type="button" class="${pool === p.pool ? 'on' : ''} ${p.spent > p.total ? 'over' : ''}" data-act="pool" data-val="${p.pool}">${esc(POOL_EN[p.pool] ?? p.pool)}<small>${p.total - p.spent} left of ${p.total}</small></button>`)
    .join('');
  const spent = (target: string) => s.alloc[pool]?.[target] ?? 0;
  const cur = pools.find((p) => p.pool === pool);
  const left = cur ? cur.total - cur.spent : 0;
  const capped = (target: string) => {
    const r = d.skills.find((x) => x.id === target);
    return !!r && r.value >= (r.incompetent ? 1 : 8);
  };
  const stepper = (target: string) =>
    `<span class="stepper"><button type="button" data-act="spend" data-pool="${pool}" data-target="${esc(target)}" data-d="-1" ${spent(target) ? '' : 'disabled'}>−</button><span class="v">${spent(target) || ''}</span><button type="button" data-act="spend" data-pool="${pool}" data-target="${esc(target)}" data-d="1" ${left > 0 && !capped(target) ? '' : 'disabled'}>+</button></span>`;
  const w = d.wisdom;
  const knowledge = SKILLS.filter((x) => x.group === 'kunskap');
  // Wisdom choices go to the top until they are made.
  const wisdomOpen = (typeof w.base1 === 'number' && s.wisdomBase.length < w.base1) || (typeof w.incompetent === 'number' && s.wisdomIncomp.length < w.incompetent);
  const wis =
    typeof w.base1 === 'number' && w.base1 > 0
      ? `<div class="box"><h3>Wisdom: base 1 in ${w.base1} knowledge skill${w.base1 === 1 ? '' : 's'}</h3><div class="chips">${knowledge
          .map((k) => `<button type="button" class="${s.wisdomBase.includes(k.id) ? 'on' : ''}" data-act="wisdomBase" data-val="${esc(k.id)}">${esc(k.en)}</button>`)
          .join('')}</div><p class="small muted">${s.wisdomBase.length} / ${w.base1} chosen</p></div>`
      : w.base1 === 'all'
        ? '<p class="small good">Your Wisdom gives base 1 in every knowledge skill.</p>'
        : '';
  const inc =
    typeof w.incompetent === 'number' && w.incompetent > 0
      ? `<div class="box todo"><h3>Low Wisdom: incompetent in ${w.incompetent} knowledge skills</h3><div class="chips">${knowledge
          .map((k) => `<button type="button" class="${s.wisdomIncomp.includes(k.id) ? 'on' : ''}" data-act="wisdomIncomp" data-val="${esc(k.id)}">${esc(k.en)}</button>`)
          .join('')}</div></div>`
      : '';
  const canBuyGroup = (g: string) => !!pool && SKILLS.some((x) => x.group === g && poolAllows(pool, x.id, CONTENT.skill));
  const groupHtml = (g: (typeof GROUP_ORDER)[number]) => {
    const rows = d.skills.filter((x) => x.group === g);
    const buyable = pool && rows.some((r) => poolAllows(pool, r.id, CONTENT.skill));
    const specialist = g.length === 1;
    const visible = rows.filter((r) => r.value > 0 || r.talent || r.incompetent || (pool && poolAllows(pool, r.id, CONTENT.skill) && !specialist) || spent(r.id));
    if (!visible.length && !(specialist && pool && poolAllows(pool, `${g}:x`, (id) => CONTENT.skill(id)))) return '';
    const add =
      specialist && pool && poolAllows(pool, `${g}:${SKILLS.find((x) => x.group === g)?.id.slice(2)}`, CONTENT.skill)
        ? `<div class="row"><input class="grow" list="dl-add-${g}" id="add-${g}" placeholder="Add a${g === 'E' ? 'n expertise' : g === 'H' ? ' craft' : g === 'K' ? ' mark' : 'n ability'}…" />
           <button type="button" class="small" data-act="addSpecial" data-group="${g}" data-pool="${pool}">Add</button></div>
           <datalist id="dl-add-${g}">${SKILLS.filter((x) => x.group === g).map((x) => `<option value="${esc(x.id.slice(2))}">${esc(x.en)}</option>`).join('')}</datalist>`
        : '';
    const from = (r: SkillRow) => (r.base && r.units ? `base ${r.base} + ${r.units}` : r.base ? 'base' : r.units ? `${r.units} unit${r.units === 1 ? '' : 's'}` : '');
    return `<div class="box ${canBuyGroup(g) ? 'hi' : ''}"><h3>${GROUP_TITLE[g]}${canBuyGroup(g) ? ` <span class="tag">${esc(POOL_EN[pool] ?? pool)} units</span>` : ''}</h3>
      <table class="t fit"><tr><th>Skill</th><th class="n">Value</th>${buyable || specialist ? '<th class="n">Spend</th>' : ''}</tr>
      ${visible
        .map((r) => {
          const can = pool && poolAllows(pool, r.id, CONTENT.skill);
          return `<tr><td>${esc(r.en)}${r.talent ? '<span class="tag t">T</span>' : ''}${r.incompetent ? '<span class="tag i">I</span>' : ''}${r.blocked ? '<span class="tag i">B</span>' : ''}${from(r) ? `<span class="sub">${from(r)}</span>` : ''}</td>
          <td class="n"><b>${r.value}</b><span class="sub">${esc(diceText(r.dice))}</span></td>
          ${buyable || specialist ? `<td class="n">${can ? stepper(r.id) : ''}</td>` : ''}</tr>`;
        })
        .join('')}</table>${add}</div>`;
  };
  // The groups the chosen pool can buy come first, then the other things it buys, then the rest.
  const first = GROUP_ORDER.filter(canBuyGroup);
  const rest = GROUP_ORDER.filter((g) => !canBuyGroup(g));
  const extras: string[] = [];
  for (const cat of ['utsatthet', 'vald', 'overnaturligt'] as const) {
    const t = `avtr:${cat}`;
    if (pool === 'avtr' || (pool && poolAllows(pool, t, CONTENT.skill)))
      extras.push(`<tr><td>Hardening: ${NUMB_EN[cat]}</td><td class="n">${d.numb[cat]}</td><td class="n">${pool === 'avtr' ? stepperAvtr(s, cat) : stepper(t)}</td></tr>`);
  }
  if (pool && poolAllows(pool, 'sprak', CONTENT.skill)) extras.push(`<tr><td>Extra language</td><td class="n">${d.languages.picks}</td><td class="n">${stepper('sprak')}</td></tr>`);
  if (pool && poolAllows(pool, 'mysterier', CONTENT.skill)) extras.push(`<tr><td>Mystery</td><td class="n">${d.mysteries.n + d.mysteries.bought}</td><td class="n">${stepper('mysterier')}</td></tr>`);
  return `<h2>Skills</h2>
  ${intro('Units tied to a skill are already in. Now spend the group units, then the free ones. Pick a pool below and tap + on what it can buy. Skills go to 8 at most (1 if incompetent). Extra units above the cap become free units automatically.')}
  <div class="pools">${poolBtns || '<span class="muted">No units yet.</span>'}</div>
  ${warningsHtml(d, STEP.skills)}
  ${wisdomOpen ? wis + inc : ''}
  ${first.map(groupHtml).join('')}
  ${extras.length ? `<div class="box hi"><h3>Other things ${esc(POOL_EN[pool] ?? pool)} units can buy</h3><table class="t fit">${extras.join('')}</table></div>` : ''}
  ${wisdomOpen ? '' : wis + inc}
  <p class="small muted legend"><span class="tag t">T</span> Talent: in play you get +1D6 extra when you spend Focus on the skill. It doesn't raise the value. <span class="tag i">I</span> Incompetent: the skill can go no higher than 1. <span class="tag i">B</span> Blocked: no Focus on it, and it can't be raised in play.</p>
  ${rest.map(groupHtml).join('')}
  <p class="small muted">${d.attuned ? 'You are attuned: you can learn mystic skills.' : 'You are not attuned. Spending a unit on Sensing attunes you (that unit becomes the base 1).'}</p>`;
}

function stepperAvtr(s: CharState, cat: string): string {
  const v = s.alloc.avtr?.[cat] ?? 0;
  return `<span class="stepper"><button type="button" data-act="spend" data-pool="avtr" data-target="${cat}" data-d="-1" ${v ? '' : 'disabled'}>−</button><span class="v">${v || ''}</span><button type="button" data-act="spend" data-pool="avtr" data-target="${cat}" data-d="1">+</button></span>`;
}

// ——— Languages & contacts ———
function languages(s: CharState, d: Derived): string {
  const L = d.languages;
  const chosen = [...s.languages.spoken.map((n) => ({ n, w: false })), ...s.languages.written.map((n) => ({ n, w: true }))];
  const circles = d.circles
    .map(
      (c) => `<label class="field"><span>Circle${c.name !== '?' ? ` (suggested: ${esc(c.name)})` : ''}</span><input data-bind-map="circles" data-key="${esc(c.key)}" value="${esc(s.circles[c.key] ?? (c.name === '?' ? '' : c.name))}" placeholder="e.g. Students, the dockers of Camard…" /></label>`,
    )
    .join('');
  const comps = d.companions
    .map((c) => `<label class="field"><span>Companion: ${esc(c.kind)}</span><input data-bind-map="companions" data-key="${esc(c.key)}" value="${esc(s.companions[c.key] ?? '')}" placeholder="Name and a line about them" /></label>`)
    .join('');
  return `<h2>Languages & contacts</h2>
  ${intro('Languages you were given, plus free picks. A spoken language and a script are separate picks, though one script can serve several tongues. Circles are groups you have friends in. Companions are loyal people at your side.')}
  <div class="box"><h3>Languages</h3>
  <p><b>Speaks:</b> ${L.spoken.map((x) => esc(languageEn(x))).join(', ') || '–'}<br><b>Writes:</b> ${L.written.map((x) => esc(languageEn(x))).join(', ') || '–'}</p>
  <p class="small">Free picks: <b>${chosen.length} / ${L.picks}</b>${L.boughtWithUnits ? ` (${L.boughtWithUnits} bought with units)` : ''}</p>
  <ul class="plain">${chosen.map((c, i) => `<li class="row spread"><span>${c.w ? 'Writes' : 'Speaks'} ${esc(languageEn(c.n))}</span><button type="button" class="link small" data-act="dropLang" data-i="${i}">remove</button></li>`).join('')}</ul>
  ${chosen.length < L.picks ? `<div class="row"><input class="grow" id="lang-name" list="dl-langs" placeholder="Language or script" /><button type="button" class="small" data-act="addLang" data-w="0">+ Spoken</button><button type="button" class="small" data-act="addLang" data-w="1">+ Written</button></div>
  <datalist id="dl-langs">${SPOKEN.map((l) => `<option value="${esc(l.sv)}">${esc(l.en)}, ${esc(l.where)}${l.scripts.length ? `, written in ${l.scripts.map(languageEn).join(' / ')}` : ', no script'}</option>`).join('')}${SCRIPTS.map((x) => `<option value="${esc(x.sv)}">${esc(x.en)} (script)</option>`).join('')}</datalist>` : ''}
  <p class="small muted">To read and write you need both a script and a spoken language written in it.${scriptHint(L.spoken.concat(s.languages.spoken), L.written.concat(s.languages.written))}</p>
  ${chosen.length > L.picks ? '<p class="warn small">More languages than picks.</p>' : ''}
  </div>
  <div class="box"><h3>Circles</h3>${circles || '<p class="muted">None from your choices.</p>'}</div>
  <div class="box"><h3>Companions</h3>${comps || '<p class="muted">None from your choices.</p>'}</div>`;
}

/** Which of your spoken languages you can also read, given your scripts. */
function scriptHint(spoken: string[], written: string[]): string {
  const can = spoken.filter((sp) => SPOKEN.find((l) => l.sv === sp)?.scripts.some((x) => written.includes(x)));
  return can.length ? ` You can read and write: ${can.map(languageEn).join(', ')}.` : ' You can\'t read or write yet.';
}

// ——— Drives ———
function drives(s: CharState, d: Derived): string {
  const rolls = s.subRolls.drives ?? [];
  const locked = d.rules.filter((r) => /as (one of your drives|a drive)/.test(r.text));
  const chosen = (sv?: string) => DRIVES.find((x) => x.sv === sv);
  const box = (label: string, sv?: string) => {
    const dr = chosen(sv);
    if (!sv) return `<div class="box todo"><h3>${label}</h3><p class="muted small">Tap a drive below.</p></div>`;
    return `<div class="box hi"><div class="row spread"><h3 style="margin:0">${label}: ${esc(dr?.en ?? sv)}</h3><button type="button" class="link small" data-act="dropDrive" data-val="${esc(sv)}">remove</button></div>
      ${dr ? `<p class="small muted">${esc(dr.blurb)}</p><ol class="small">${dr.levels.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}</div>`;
  };
  const cards = DRIVES.map((x) => {
    const on = s.drives.primary === x.sv || s.drives.secondary === x.sv;
    const rolled = rolls.some((r) => r >= x.lo && r <= x.hi);
    return `<button type="button" class="card ${on ? 'on' : ''} ${rolled ? 'rolled' : ''}" data-act="drive" data-val="${esc(x.sv)}"><span class="name"><span class="num">${x.lo}–${x.hi}</span>${esc(x.en)}</span><span class="what">${esc(x.blurb)}</span></button>`;
  }).join('');
  return `<h2>Drives</h2>
  ${intro('Your primary drive is the core of who you are; the secondary one is easier to give up. Each has three levels of deeds, and fulfilling them restores Focus and Wellbeing and heals the mind. Choose freely, or roll four times and keep two.')}
  ${locked.length ? `<div class="box todo"><h3>Required by your past</h3>${locked.map((r) => `<p class="small">${esc(r.text)} <span class="muted">(${esc(r.from)})</span></p>`).join('')}</div>` : ''}
  ${box('Primary', s.drives.primary)}${box('Secondary', s.drives.secondary)}
  <div class="box"><p class="small">${DRIVE_REWARDS.map(esc).join('<br>')}</p></div>
  <div class="row"><button type="button" data-act="rollDrives">🎲 Roll 4 × d100</button>${rolls.length ? `<span class="dice">${rolls.map((r) => die(r, 'small')).join('')}</span>` : ''}</div>
  <div class="cards">${cards}</div>`;
}

// ——— Details ———
function details(s: CharState, d: Derived): string {
  const D = s.details as unknown as Record<string, string>;
  const p = d.people;
  const body = CONTENT.body(p?.id, p?.family);
  const checks = checkDetails(s.details, body);
  const warn = (field: string) => checks.filter((c) => c.field === field).map((c) => `<span class="warn small">⚠ ${esc(c.text)}</span>`).join('');
  const f = (path: string, label: string, ph = '', mode = '') =>
    `<label class="field"><span>${label}</span><input data-bind="details.${path}" value="${esc(D[path] ?? '')}" placeholder="${esc(ph)}" ${mode ? `inputmode="${mode}"` : ''} />${warn(path)}</label>`;
  const t = (path: string, label: string, ph = '') => `<label class="field"><span>${label}</span><textarea data-bind="details.${path}" placeholder="${esc(ph)}">${esc(D[path] ?? '')}</textarea></label>`;
  const chip = (field: string, val: string, label = val) => `<button type="button" class="${D[field] === val ? 'on' : ''}" data-act="detail" data-key="${field}" data-val="${esc(val)}">${esc(label)}</button>`;

  // Names: suggestions for your culture (the people that raised you).
  const raisedBy = CONTENT.peoples.find((x) => x.id === s.cultureFrom) ?? p;
  const nc = nameCultureOf(raisedBy?.id, raisedBy?.family);
  const g = genderKey(s.details.gender);
  const lists = nc ? ([g !== 'm' && nc.f ? ['Women', nc.f] : null, g !== 'f' && nc.m ? ['Men', nc.m] : null, nc.n ? ['Any', nc.n] : null].filter(Boolean) as [string, string[]][]) : [];
  const fams = nc?.family ?? (raisedBy?.family === 'dvarg' ? DWARF_HOUSES[raisedBy.id] : undefined);
  const names = nc
    ? `<div class="box"><h3>${esc(nc.en)} names</h3><p class="small muted">${esc(nc.custom)}</p>
      ${lists.map(([label, ns]) => `<p class="small"><b>${label}:</b></p><div class="chips">${ns.map((n) => chip('name', n)).join('')}</div>`).join('')}
      ${fams ? `<p class="small"><b>${raisedBy?.family === 'dvarg' ? 'Houses' : 'Families and houses'}:</b></p><div class="chips">${fams.map((x) => `<button type="button" data-act="nameAdd" data-val="${esc(x)}">+ ${esc(x)}</button>`).join('')}</div>` : ''}
      <div class="row"><button type="button" class="small" data-act="randName">🎲 Random name</button><span class="small muted">Tap a name to use it, then edit it as you like.</span></div></div>`
    : p ? '' : '<p class="small muted">Choose a people first to get name suggestions.</p>';

  // Height and weight: what is typical, and a quick way to fill them in.
  let size = '';
  if (body) {
    const [h, w] = typical(body, s.details.gender);
    const sameBoth = body.f[0] === body.m[0] && body.f[1] === body.m[1];
    size = `<p class="small muted">Typical for ${esc(p?.en ?? '')}: ${sameBoth ? `about ${body.f[0]} cm and ${body.f[1]} kg` : `women about ${body.f[0]} cm, ${body.f[1]} kg; men about ${body.m[0]} cm, ${body.m[1]} kg`}.</p>
      <div class="row"><button type="button" class="small" data-act="body" data-h="${h}" data-w="${w}">Use typical (${h} cm, ${w} kg)</button><button type="button" class="small" data-act="body" data-roll="1">🎲 Roll a build</button></div>`;
  }
  const age = body?.age;
  return `<h2>Name & details</h2>
  ${intro('The things that don\'t change the numbers but make the person.')}
  ${f('name', 'Name')}
  ${names}
  <label class="field"><span>Gender</span><div class="chips">${chip('gender', 'Woman')}${chip('gender', 'Man')}${chip('gender', 'Non-binary')}</div>
  <input data-bind="details.gender" value="${esc(D.gender ?? '')}" placeholder="or write your own" /></label>
  ${f('age', 'Age', age ? `usually ${age.typical[0]}–${age.typical[1]}` : '', 'numeric')}
  ${f('home', 'Home town or region', d.homeland?.places ? `e.g. ${d.homeland.places.split(/[,;]/)[0].trim()}` : '')}
  <div class="row top"><div class="grow">${f('height', 'Height (cm)', body ? String(typical(body, s.details.gender)[0]) : '', 'numeric')}</div><div class="grow">${f('weight', 'Weight (kg)', body ? String(typical(body, s.details.gender)[1]) : '', 'numeric')}</div></div>
  ${size}
  <div class="box"><h3>Weapon arm</h3><div class="row"><button type="button" class="small" data-act="armRoll">🎲 Roll d10</button>${s.details.armRoll ? die(s.details.armRoll, 'd10 small') : ''}
  <span class="chips"><button type="button" class="${s.details.arm === 'höger' ? 'on' : ''}" data-act="arm" data-val="höger">Right</button><button type="button" class="${s.details.arm === 'vänster' ? 'on' : ''}" data-act="arm" data-val="vänster">Left</button></span></div>
  <p class="small muted">On a 10 you are left-handed.</p></div>
  ${t('appearance', 'Appearance and quirks', p?.build ?? '')}
  ${t('family', 'Family', 'Mother, father, siblings, the rest of the family…')}
  ${t('relations', 'Relations to the other characters')}
  ${t('story', 'Background story', 'Take inspiration from your event results.')}`;
}

// ——— Equipment ———
function equipment(s: CharState, d: Derived): string {
  const pk = d.packages
    .map(
      (p) => `<label class="field"><span>Package${p.name !== '?' ? '' : ' (your choice)'}</span>${
        p.name !== '?'
          ? `<b>${esc(packageEn(p.name))}</b>`
          : `<select data-act-change="equip" data-kind="packages" data-key="${esc(p.key)}"><option value="">Choose…</option>${PACKAGES.map((x) => `<option value="${x}" ${s.equipment.packages[p.key] === x ? 'selected' : ''}>${esc(packageEn(x))}</option>`).join('')}</select>`
      }</label>`,
    )
    .join('');
  const upgrade = d.sources.some((x) => x.effects.some((e) => e.k === 'flagga' && e.name === 'vapenhojning'));
  const spent = s.equipment.bought.reduce((n, b) => n + b.cost * b.qty, 0);
  const left = d.silver - spent;
  const slot = (kind: 'weapons' | 'armour', key: string, rarity: Rarity, n: number) => {
    const cur = s.equipment[kind][key];
    const open = armouryView.slot === key;
    const label = `${kind === 'weapons' ? 'Weapon' : 'Armour'} ${n}: ${esc(RARITY_EN[rarity])} or lower${upgrade && kind === 'weapons' ? ' (one step higher allowed)' : ''}`;
    return `<div class="slot ${cur ? '' : 'empty'}"><div class="small muted">${label}</div>
      <div class="row spread"><span class="row">${slotSummary(cur, d)}</span>
      <span class="row">${cur ? `<button type="button" class="link small" data-act="armClear" data-kind="${kind}" data-key="${esc(key)}">remove</button>` : ''}
      <button type="button" class="small ${cur ? '' : 'primary'}" data-act="armOpen" data-kind="${kind}" data-key="${esc(key)}">${open ? 'Close' : cur ? 'Change' : 'Choose'}</button></span></div>
      ${open ? armouryHtml(s, d, { kind, rarity, upgrade, left }) : ''}</div>`;
  };
  const items = d.items.map((i) => `<li>${esc(i.text)} <span class="small muted">(${esc(i.from)})</span></li>`).join('');
  return `<h2>Equipment</h2>
  ${intro('Equipment packages are bundles of the everyday things your character owns. Weapons and armour are picked up to the rarity you were given. Anything more is bought with silver.')}
  <div class="box"><h3>Packages</h3>${pk || '<p class="muted">None.</p>'}</div>
  <div class="box"><h3>Weapons</h3>${d.weapons.map((w, i) => slot('weapons', w.key, w.rarity, i + 1)).join('') || '<p class="muted">None.</p>'}
  <p class="small muted">Bows and crossbows come with a quiver of 20 arrows or bolts; a thrown weapon means three of them. Cultural weapons count as rare unless they belong to your people.</p></div>
  <div class="box"><h3>Armour</h3>${d.armour.map((w, i) => slot('armour', w.key, w.rarity, i + 1)).join('') || '<p class="muted">None.</p>'}</div>
  ${items ? `<div class="box"><h3>Items from your past</h3><ul>${items}</ul></div>` : ''}
  <div class="box"><h3>Purchases</h3>
  <p>Silver: <b>${left}</b> of ${d.silver}${d.silver ? '' : ' <span class="small muted">(silver comes from your archetype and events)</span>'}</p>
  <ul class="plain">${s.equipment.bought.map((b, i) => `<li class="row spread"><span>${b.qty > 1 ? `${b.qty}× ` : ''}${esc(itemEn(b.name))} (${b.cost * b.qty} silver)</span><button type="button" class="link small" data-act="dropBuy" data-i="${i}">remove</button></li>`).join('')}</ul>
  <div class="row"><button type="button" class="small" data-act="armOpen" data-kind="buy" data-key="shop">${armouryView.slot === 'shop' ? 'Close the armoury' : '⚔ Browse weapons and armour to buy'}</button></div>
  ${armouryView.slot === 'shop' ? armouryHtml(s, d, { kind: 'buy', left }) : ''}
  <div class="row"><input class="grow" id="buy-name" placeholder="Other item" /><input id="buy-cost" type="number" min="0" style="width:90px" placeholder="Silver" /><button type="button" class="small" data-act="buy">Buy</button></div></div>
  <label class="field"><span>Equipment notes</span><textarea data-bind="equipment.notes">${esc(s.equipment.notes)}</textarea></label>`;
}

// ——— Mysticism ———
function magic(s: CharState, d: Derived): string {
  const total = d.mysteries.n + d.mysteries.bought;
  const any = total || d.mysteries.unlearned || d.mysticGear.length;
  const GEAR = ['Ceremoniell utrustning', 'Heligt föremål', 'Ritualutrustning', 'Familiar', 'Kongelat'];
  const GEAR_EN: Record<string, string> = { 'Ceremoniell utrustning': 'Ceremonial equipment', 'Heligt föremål': 'Holy object', Ritualutrustning: 'Ritual implements', Familiar: 'Familiar', Kongelat: 'Congelate' };
  const gear = d.mysticGear
    .map((g) => `<label class="field"><span>Mystic equipment</span><select data-act-change="mgear" data-key="${esc(g.key)}"><option value="">Choose…</option>${GEAR.map((x) => `<option value="${x}" ${s.mysticGear[g.key] === x ? 'selected' : ''}>${esc(GEAR_EN[x])}</option>`).join('')}</select></label>`)
    .join('');
  const slots = Array.from({ length: total + d.mysteries.unlearned }, (_, i) => {
    const learned = i < total;
    return `<label class="field"><span>Mystery ${i + 1}${learned ? '' : ' (written down, not yet learned)'}</span><input data-act-input="mystery" data-i="${i}" value="${esc(s.mysteries[i] ?? '')}" placeholder="Name of the mystery" /></label>`;
  }).join('');
  return `<h2>Mysticism & magic</h2>
  ${intro('Only for magicians, invokers and those who gained mysteries or mystic gear some other way. Mysteries can only be used if you are attuned and know the right mystic skills (Channelling for prayers, an aspect for spells).')}
  ${any ? '' : '<div class="box"><p class="muted">Nothing here for this character. You can skip this step.</p></div>'}
  ${gear ? `<div class="box"><h3>Mystic equipment</h3>${gear}</div>` : ''}
  ${slots ? `<div class="box"><h3>Mysteries</h3>${slots}<p class="small muted">The full list of mysteries per aspect and faith is coming in a later update.</p></div>` : ''}`;
}

export const STEP_RENDER: ((s: CharState, d: Derived) => string)[] = [prep, homeland, background, people, religion, archetype, environment, events, attributes, skills, languages, drives, details, equipment, magic];

export function attrOrder(): Attr[] {
  return [...ATTRS];
}
