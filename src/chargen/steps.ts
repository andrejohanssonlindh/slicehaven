/** Renderers for each creation step. Pure string templates; main.ts wires the actions. */
import { ATTR_EN, NUMB_EN, POOL_EN, poolAllows, RARITY_EN, STEP, TABLE_EN, type Derived, type SourceRec } from '../core/chargen/derive';
import { ATTRS, type Attr } from '../core/chargen/grants';
import type { CharState } from '../core/chargen/state';
import { diceText, MAX_POINTS_PER_ATTR, POINT_MODELS } from '../core/chargen/tables';
import type { Family } from '../core/chargen/types';
import { CONTENT } from '../content/chargen';
import { FAMILY_ORDER } from '../content/chargen/peoples';
import { SKILLS } from '../content/chargen/skills';
import { die, esc, grants, pendingHtml, pickHtml, sourceHtml } from './ui';

/** UI-only state (not saved). */
export const view = {
  family: 'manniska' as Family,
  pool: '' as string,
  showAllBackgrounds: false,
  showAllHomelands: true,
};

const intro = (t: string) => `<p class="intro">${t}</p>`;
const sourcesFor = (d: Derived, step: number, skip: (s: SourceRec) => boolean = () => false) =>
  d.sources.filter((x) => x.step === step && !d.picks.some((p) => x.key.startsWith(`${p.key}.`)) && !skip(x));

function warningsHtml(d: Derived, step: number): string {
  const w = d.warnings.filter((x) => x.step === step);
  return w.length ? `<div class="box todo">${w.map((x) => `<p class="warn small">⚠ ${esc(x.text)}</p>`).join('')}</div>` : '';
}

// ——— 0 Preparation ———
function prep(s: CharState): string {
  return `<h2>1. Preparation</h2>
  ${intro('Talk with your game master and the other players before you start: what kind of adventures, any limits on what you may play, and how the characters know each other.')}
  <label class="field"><span>Campaign notes, restrictions, the group's agreements</span>
  <textarea data-bind="prep" placeholder="e.g. A campaign in Asharien; no pyromancers; we all serve the same merchant house…">${esc(s.prep)}</textarea></label>
  <div class="box"><h3>How this works</h3>
  <p>Fourteen steps, like the book. Some things you choose, some you roll for: tap a die button and the result is kept. Everything you pick feeds the later steps, and you can go back and change things. The later steps update by themselves.</p>
  <p class="small muted">Red dots in the step bar mark things still to do. Your character saves itself in this browser. Use ☰ for more characters or to export one.</p></div>`;
}

// ——— 1 Homeland ———
function homeland(s: CharState, d: Derived): string {
  const rolls = s.homelandRolls ?? [];
  const hit = (lo: number, hi: number) => rolls.some((r) => r >= lo && r <= hi);
  const cards = CONTENT.homelands
    .map(
      (h) => `<button type="button" class="card ${s.homeland === h.id ? 'on' : ''} ${hit(h.lo, h.hi) ? 'rolled' : ''}" data-act="set" data-field="homeland" data-val="${h.id}">
      <span class="name"><span class="num">${h.lo === h.hi ? h.lo : `${h.lo}–${h.hi}`}</span>${esc(h.en)}</span>
      <span class="what">${esc(h.blurb)}</span></button>`,
    )
    .join('');
  const h = d.homeland;
  return `<h2>2. Homeland</h2>
  ${intro('Where in the world your character comes from. It gives you a language. Choose freely, or roll d100 twice and pick one of the results.')}
  <div class="row"><button type="button" data-act="rollHomeland">🎲 Roll 2 × d100</button>${rolls.length ? `<span class="dice">${rolls.map((r) => die(r)).join('')}</span>` : ''}</div>
  ${h ? `<div class="box hi"><h3>${esc(h.en)}</h3><p>${esc(h.blurb)}</p>
    <p class="small"><b>Peoples:</b> ${esc(h.peoples)}<br><b>Faiths:</b> ${esc(h.religions)}${h.places ? `<br><b>Places:</b> ${esc(h.places)}` : ''}</p>
    ${sourcesFor(d, STEP.homeland).map((x) => sourceHtml(x, d, s, { label: false })).join('')}</div>` : ''}
  <div class="cards">${cards}</div>`;
}

// ——— 2 Background ———
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
  return `<h2>3. Background</h2>
  ${intro('A piece of your past: a parent\'s trade, an earlier life. It is always rolled: d100 twice, then keep one. It gives one event-table roll, and you take two of its three skill options.')}
  <div class="row"><button type="button" class="${rolls.length ? '' : 'primary'}" data-act="rollBg">🎲 ${rolls.length ? 'Roll again' : 'Roll 2 × d100'}</button>
  ${rolls.length ? `<span class="dice">${rolls.map((r) => die(r)).join('')}</span>` : ''}
  <button type="button" class="link small" data-act="toggleView" data-flag="showAllBackgrounds">${view.showAllBackgrounds ? 'show only rolled' : 'GM allows a free choice: show all 100'}</button></div>
  <div class="cards">${cards}</div>
  ${pick ? pickHtml(pick, d, s, `${d.background?.en}: take two`) : ''}
  ${sourcesFor(d, STEP.background).map((x) => sourceHtml(x, d, s)).join('')}`;
}

// ——— 3 People ———
function people(s: CharState, d: Derived): string {
  const fam = CONTENT.families[view.family];
  const list = CONTENT.peoples.filter((p) => p.family === view.family);
  const rollRow =
    view.family === 'manniska'
      ? `<div class="row"><button type="button" class="small" data-act="rollPeople">🎲 Roll d100 for a human people</button>${s.subRolls.people ? die(s.subRolls.people[0], 'small') : ''}</div>`
      : '';
  const cards = list
    .map((p) => {
      const rolled = s.subRolls.people && p.lo !== undefined && s.subRolls.people[0] >= p.lo && s.subRolls.people[0] <= (p.hi ?? p.lo);
      return `<button type="button" class="card ${s.people === p.id ? 'on' : ''} ${rolled ? 'rolled' : ''}" data-act="set" data-field="people" data-val="${p.id}">
      <span class="name">${p.lo !== undefined ? `<span class="num">${p.lo}–${p.hi}</span>` : ''}${esc(p.en)}${p.marvel ? ' <span class="tag">marvellous</span>' : ''}</span>
      <span class="what">${esc(p.blurb)}</span></button>`;
    })
    .join('');
  const p = d.people;
  let detail = '';
  if (p) {
    const famDef = CONTENT.families[p.family];
    const attrs = p.attrs ?? famDef.attrs ?? [];
    const others = CONTENT.peoples.filter((x) => x.id !== p.id && (x.culture.length || x.picks.length));
    const needsCulture = !p.culture.length && !p.picks.length;
    detail = `<div class="box hi"><h3>${esc(p.en)}</h3><p>${esc(p.blurb)}</p>${p.build ? `<p class="small muted">${esc(p.build)}</p>` : ''}
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
  return `<h2>4. People</h2>
  ${intro('Your people gives your starting attributes, innate and cultural traits and a language (if it is your homeland\'s language you get 1 free unit instead). Then choose two of its five optional traits. ★ marks a quick pick.')}
  <div class="chips">${FAMILY_ORDER.map((f) => `<button type="button" class="${view.family === f ? 'on' : ''}" data-act="family" data-val="${f}">${esc(CONTENT.families[f].en)}</button>`).join('')}</div>
  <p class="small muted">${esc(fam.blurb)}</p>
  ${fam.innate.length ? `<p class="small"><b>All ${esc(fam.en.toLowerCase())}:</b> ${fam.innate.map((o) => `${esc(o.en)} (${grants(o.g)})`).join('; ')}</p>` : ''}
  ${rollRow}
  ${detail}
  <div class="cards">${cards}</div>`;
}

// ——— 4 Religion ———
function religion(s: CharState, d: Derived): string {
  if (d.godless) {
    return `<h2>5. Religion</h2><div class="box hi"><p>Elves are <b>godless</b>: they live by the elven code of honour and skip this step.</p>
    <p class="small muted">An elf may still follow a faith but gets no doctrines. Take an optional trait such as Converts to have a real religion.</p></div>`;
  }
  const forced = d.forcedReligion;
  const cards = CONTENT.religions
    .map((r) => {
      const parent = r.parent ? CONTENT.religions.find((x) => x.id === r.parent)?.en ?? 'Forbidden cults' : '';
      const ok = !forced || forced.includes(r.id) || forced.includes(r.parent ?? '');
      return `<button type="button" class="card ${s.religion === r.id ? 'on' : ''} ${ok ? '' : 'dim'}" data-act="set" data-field="religion" data-val="${r.id}">
        <span class="name">${esc(r.en)}${parent ? ` <span class="tag">${esc(parent)}</span>` : ''}${r.ethnic ? ' <span class="tag">ethnic</span>' : ''}</span>
        <span class="what">${esc(r.blurb)}</span></button>`;
    })
    .join('');
  const picks = d.picks.filter((p) => p.step === STEP.religion);
  return `<h2>5. Religion</h2>
  ${intro('Choose a faith (unless a trait already decided it). Then two doctrines, each from a list of two options. The same doctrine twice is fine, with different options. Ethnic faiths are only for their own people.')}
  ${forced ? `<div class="box hi"><p>A trait you chose ties you to <b>${forced.map((id) => esc(CONTENT.religions.find((r) => r.id === id)?.en ?? id)).join(' or ')}</b>.</p></div>` : ''}
  ${warningsHtml(d, STEP.religion)}
  ${picks.map((r) => pickHtml(r, d, s)).join('')}
  <div class="cards">${cards}</div>`;
}

// ——— 5 Archetype, environment, living standard ———
function archetype(s: CharState, d: Derived): string {
  const arch = CONTENT.archetypes
    .map(
      (a, i) => `<button type="button" class="card ${s.archetype === a.id ? 'on' : ''} ${s.subRolls.arch?.[0] === i + 1 ? 'rolled' : ''}" data-act="set" data-field="archetype" data-val="${a.id}">
      <span class="name"><span class="num">${i + 1}</span>${esc(a.en)}${a.mystic ? ' <span class="tag">mystic</span>' : ''}</span>
      <span class="what">${esc(a.blurb)}</span></button>`,
    )
    .join('');
  const env = CONTENT.environments
    .map(
      (e, i) => `<button type="button" class="card ${s.environment === e.id ? 'on' : ''} ${s.subRolls.env?.[0] === i + 1 ? 'rolled' : ''}" data-act="set" data-field="environment" data-val="${e.id}">
      <span class="name"><span class="num">${i + 1}</span>${esc(e.en)}</span><span class="what">${esc(e.blurb)}</span></button>`,
    )
    .join('');
  const liv = CONTENT.living
    .map(
      (l) => `<button type="button" class="card ${s.living === l.id ? 'on' : ''}" data-act="set" data-field="living" data-val="${l.id}">
      <span class="name">${esc(l.en)} <span class="tag">${l.silver.toLocaleString('en')} silver</span></span>
      <span class="what">${esc(l.blurb)}</span></button>`,
    )
    .join('');
  const a = d.archetype;
  const e = d.environment;
  const l = d.living;
  const sub = (key: string) => d.sources.filter((x) => x.key === key).map((x) => sourceHtml(x, d, s, { label: false })).join('');
  const xa = d.picks.find((p) => p.key === 'arch.x');
  const xe = d.picks.find((p) => p.key === 'env.x');
  const occ = a && e ? a.occupations[e.id] : '';
  return `<h2>6. Archetype, environment & living</h2>
  ${intro('Your archetype is your path in life, your environment the world you lived and worked in. Together they make your occupation. Choose freely or roll.')}
  <h3>Archetype</h3>
  <div class="row"><button type="button" class="small" data-act="rollSub" data-key="arch" data-sides="10">🎲 Roll d10</button>${s.subRolls.arch ? die(s.subRolls.arch[0], 'd10 small') : ''}<span class="small muted">(10 = roll again)</span></div>
  ${a ? `<div class="box hi"><h3>${esc(a.en)}</h3>${sub('arch')}${(a.notes ?? []).map((n) => `<p class="small muted">${esc(n)}</p>`).join('')}</div>${xa ? pickHtml(xa, d, s) : ''}` : ''}
  <div class="cards">${arch}</div>
  <h3>Environment</h3>
  <div class="row"><button type="button" class="small" data-act="rollSub" data-key="env" data-sides="10">🎲 Roll d10</button>${s.subRolls.env ? die(s.subRolls.env[0], 'd10 small') : ''}</div>
  ${e ? `<div class="box hi"><h3>${esc(e.en)}</h3>${sub('env')}</div>${xe ? pickHtml(xe, d, s) : ''}` : ''}
  <div class="cards">${env}</div>
  <h3>Occupation</h3>
  <label class="field"><span>Your occupation, from your archetype and environment${occ ? `: e.g. ${esc(occ)}` : ''}</span>
  <input data-bind="occupation" value="${esc(s.occupation)}" placeholder="e.g. Art historian" /></label>
  <h3>Living standard</h3>
  ${l ? `<div class="box hi"><h3>${esc(l.en)}: ${l.silver.toLocaleString('en')} silver</h3><p class="small">${esc(l.clothes)}<br>${esc(l.lodging)}<br>${esc(l.monthly)}</p>${sub('liv')}</div>` : ''}
  <div class="cards">${liv}</div>`;
}

// ——— 6 Event tables ———
function events(s: CharState, d: Derived): string {
  const toStrike = d.sources.flatMap((x) => x.effects).reduce((n, e) => (e.k === 'stryk' ? n + e.n : n), 0);
  const rows = d.slots
    .map((slot, i) => {
      const t = slot.table ? CONTENT.tables[slot.table] : undefined;
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
      const canReroll = !s.rerollUsed && slot.results.length > 0;
      return `<div class="box ${slot.needsRoll || tablePick ? 'todo' : ''}">
        <div class="row spread"><strong>${i + 1}. ${t ? esc(t.en) : 'Any table'}</strong><span class="small muted">from ${esc(slot.from)}</span></div>
        ${slot.struck ? `<p class="muted">Given up. <button type="button" class="link small" data-act="strike" data-key="${esc(slot.key)}">take it back</button></p>` : `
        ${tablePick ? pendingHtml(tablePick) : slot.table && s.choices[`${slot.key}.t`] ? `<button type="button" class="link small" data-act="unchooseKey" data-key="${esc(slot.key)}.t">change table</button>` : ''}
        ${results}
        <div class="row">
          ${slot.needsRoll ? `<button type="button" class="primary" data-act="rollSlot" data-key="${esc(slot.key)}">🎲 Roll d100</button>` : ''}
          ${canReroll ? `<button type="button" class="small" data-act="reroll" data-key="${esc(slot.key)}">Re-roll (once per character)</button>` : ''}
          ${s.rerollUsed === slot.key ? '<span class="small muted">re-rolled</span>' : ''}
          ${toStrike ? `<button type="button" class="link small" data-act="strike" data-key="${esc(slot.key)}">give up this roll</button>` : ''}
        </div>`}
      </div>`;
    })
    .join('');
  const empty = !CONTENT.tables.fa?.entries.length;
  const open = d.slots.filter((x) => x.needsRoll && x.table).length;
  return `<h2>7. Event tables</h2>
  ${intro('Your past, rolled up: travels, intrigues, battles, studies, miracles and sorcery. Your background, people, archetype and environment gave you these rolls. Some results give more rolls. You may re-roll <b>one</b> result you don\'t like.')}
  ${empty ? '<div class="box todo"><p class="warn">The event tables are still being written. Coming in the next update.</p></div>' : ''}
  ${warningsHtml(d, STEP.events)}
  ${open > 1 ? `<div class="row"><button type="button" data-act="rollAll">🎲 Roll all ${open} open rolls</button></div>` : ''}
  ${rows || '<p class="muted">No rolls yet. They come from the earlier steps.</p>'}`;
}

// ——— 7 Attributes ———
function attributes(s: CharState, d: Derived): string {
  const model = s.attrModel;
  const lumps = model && model !== 'fria' ? POINT_MODELS[model] : [];
  const usedLumps = new Set(Object.values(s.attrLump));
  const rows = d.attrs
    .map((a) => {
      const li = s.attrLump[a.attr];
      const sel = lumps.length
        ? `<select data-act-change="lump" data-attr="${a.attr}"><option value="">–</option>${lumps
            .map((v, i) => `<option value="${i}" ${li === i ? 'selected' : ''} ${usedLumps.has(i) && li !== i ? 'disabled' : ''}>+${v}</option>`)
            .join('')}</select>`
        : '';
      const ex = s.attrExtra[a.attr] ?? 0;
      return `<tr><td>${esc(ATTR_EN[a.attr])}</td><td class="n">${a.base}</td><td class="n">${a.mods ? (a.mods > 0 ? `+${a.mods}` : `−${-a.mods}`) : ''}</td>
        <td class="n">${sel}</td>
        <td class="n"><span class="stepper"><button type="button" data-act="extra" data-attr="${a.attr}" data-d="-1">−</button><span class="v">${ex}</span><button type="button" data-act="extra" data-attr="${a.attr}" data-d="1">+</button></span></td>
        <td class="n"><b>${a.value}</b></td><td class="n">${a.attr === 'Visdom' ? '–' : esc(diceText(a.dice))}</td></tr>`;
    })
    .join('');
  const p = d.attrPoints;
  const extraSpent = ATTRS.reduce((n, a) => n + (s.attrExtra[a] ?? 0), 0);
  const extraBudget = model === 'fria' ? p.total : p.extra;
  const w = d.wisdom;
  const modelBtn = (m: string, label: string, sub: string) =>
    `<button type="button" class="card ${model === m ? 'on' : ''}" data-act="model" data-val="${m}"><span class="name">${label}</span><span class="what">${sub}</span></button>`;
  return `<h2>8. Attributes</h2>
  ${intro(`Start from your people's values, add the changes from your environment and events, then spend 40 points. Use one of the two lump patterns: each lump goes on a different attribute. At most ${MAX_POINTS_PER_ATTR} points on one attribute, and every attribute must end at 4 or more. 12 is an average human.`)}
  <div class="cards">
    ${modelBtn('balanserad', 'Balanced', POINT_MODELS.balanserad.map((v) => `+${v}`).join(' '))}
    ${modelBtn('fokuserad', 'Focused', POINT_MODELS.fokuserad.map((v) => `+${v}`).join(' '))}
    ${modelBtn('fria', 'Free points (optional rule)', '40 single points, spend freely')}
  </div>
  ${model ? `<div class="box">
    <table class="t"><tr><th>Attribute</th><th class="n">People</th><th class="n">Mods</th><th class="n">${lumps.length ? 'Lump' : ''}</th><th class="n">${model === 'fria' ? 'Points' : 'Extra'}</th><th class="n">Value</th><th class="n">Dice</th></tr>${rows}</table>
    <p class="small">${model === 'fria' ? `Points: ${extraSpent} / ${extraBudget}` : `Lumps placed: ${Object.keys(s.attrLump).length} / 8 · Extra points (from traits): ${extraSpent} / ${extraBudget}`}</p>
  </div>` : ''}
  ${warningsHtml(d, STEP.attributes)}
  <div class="box"><h3>Derived</h3>
  <p>Base armour <b>${d.derived.armour}</b> · Base damage <b>${esc(diceText(d.derived.damage))}</b> · Healing rate <b>${d.derived.healing}</b></p>
  <p class="small">Wisdom ${d.attrs.find((a) => a.attr === 'Visdom')?.value}: ${w.incompetent === 'all' ? 'incompetent in all knowledge skills' : w.incompetent ? `incompetent in ${w.incompetent} knowledge skills` : 'no incompetences'}, ${
    w.base1 === 'all' ? 'base 1 in all knowledge skills' : `base 1 in ${w.base1} knowledge skills`
  }${w.extraUnits ? `, +${w.extraUnits} knowledge units` : ''}${w.expertise ? `, +${w.expertise} expertise units` : ''}. New knowledge in play costs ${w.newKnowledgeXp} experience.</p></div>`;
}

// ——— 8 Skills ———
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
  const byId = new Map(d.skills.map((x) => [x.id, x]));
  const groups = GROUP_ORDER.map((g) => {
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
    return `<div class="box"><h3>${GROUP_TITLE[g]}</h3>
      <table class="t"><tr><th>Skill</th><th class="n">Base</th><th class="n">Units</th><th class="n">Value</th><th class="n">Dice</th>${buyable || specialist ? '<th class="n">Spend</th>' : ''}</tr>
      ${visible
        .map((r) => {
          const can = pool && poolAllows(pool, r.id, CONTENT.skill);
          return `<tr><td>${esc(r.en)}${r.talent ? '<span class="tag t">T</span>' : ''}${r.incompetent ? '<span class="tag i">I</span>' : ''}${r.blocked ? '<span class="tag i">B</span>' : ''}</td>
          <td class="n">${r.base}</td><td class="n">${r.units || ''}</td><td class="n"><b>${r.value}</b></td><td class="n">${esc(diceText(r.dice))}</td>
          ${buyable || specialist ? `<td class="n">${can ? stepper(r.id) : ''}</td>` : ''}</tr>`;
        })
        .join('')}</table>${add}</div>`;
  }).join('');
  void byId;
  const extras: string[] = [];
  for (const cat of ['utsatthet', 'vald', 'overnaturligt'] as const) {
    const t = `avtr:${cat}`;
    if (pool === 'avtr' || (pool && poolAllows(pool, t, CONTENT.skill)))
      extras.push(`<tr><td>Hardening: ${NUMB_EN[cat]}</td><td class="n">${d.numb[cat]}</td><td class="n">${pool === 'avtr' ? stepperAvtr(s, cat) : stepper(t)}</td></tr>`);
  }
  if (pool && poolAllows(pool, 'sprak', CONTENT.skill)) extras.push(`<tr><td>Extra language</td><td class="n">${d.languages.picks}</td><td class="n">${stepper('sprak')}</td></tr>`);
  if (pool && poolAllows(pool, 'mysterier', CONTENT.skill)) extras.push(`<tr><td>Mystery</td><td class="n">${d.mysteries.n + d.mysteries.bought}</td><td class="n">${stepper('mysterier')}</td></tr>`);
  return `<h2>9. Skills</h2>
  ${intro('Units tied to a skill are already in. Now spend the group units, then the free ones. Pick a pool below and tap + on what it can buy. Skills go to 8 at most (1 if incompetent). Extra units above the cap become free units automatically.')}
  <div class="pools">${poolBtns || '<span class="muted">No units yet.</span>'}</div>
  ${warningsHtml(d, STEP.skills)}
  ${wis}${inc}
  ${extras.length ? `<div class="box"><h3>Other things units can buy</h3><table class="t">${extras.join('')}</table></div>` : ''}
  ${groups}
  <p class="small muted">${d.attuned ? 'You are attuned: you can learn mystic skills.' : 'You are not attuned. Spending a unit on Sensing attunes you (that unit becomes the base 1).'}</p>`;
}

function stepperAvtr(s: CharState, cat: string): string {
  const v = s.alloc.avtr?.[cat] ?? 0;
  return `<span class="stepper"><button type="button" data-act="spend" data-pool="avtr" data-target="${cat}" data-d="-1" ${v ? '' : 'disabled'}>−</button><span class="v">${v || ''}</span><button type="button" data-act="spend" data-pool="avtr" data-target="${cat}" data-d="1">+</button></span>`;
}

// ——— 9 Languages & contacts ———
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
  return `<h2>10. Languages & contacts</h2>
  ${intro('Languages you were given, plus free picks. A spoken language and a script are separate picks, though one script can serve several tongues. Circles are groups you have friends in. Companions are loyal people at your side.')}
  <div class="box"><h3>Languages</h3>
  <p><b>Speaks:</b> ${L.spoken.map(esc).join(', ') || '–'}<br><b>Writes:</b> ${L.written.map(esc).join(', ') || '–'}</p>
  <p class="small">Free picks: <b>${chosen.length} / ${L.picks}</b>${L.boughtWithUnits ? ` (${L.boughtWithUnits} bought with units)` : ''}</p>
  <ul class="plain">${chosen.map((c, i) => `<li class="row spread"><span>${c.w ? 'Writes' : 'Speaks'} ${esc(c.n)}</span><button type="button" class="link small" data-act="dropLang" data-i="${i}">remove</button></li>`).join('')}</ul>
  ${chosen.length < L.picks ? `<div class="row"><input class="grow" id="lang-name" placeholder="Language or script name" /><button type="button" class="small" data-act="addLang" data-w="0">+ Spoken</button><button type="button" class="small" data-act="addLang" data-w="1">+ Written</button></div>` : ''}
  ${chosen.length > L.picks ? '<p class="warn small">More languages than picks.</p>' : ''}
  </div>
  <div class="box"><h3>Circles</h3>${circles || '<p class="muted">None from your choices.</p>'}</div>
  <div class="box"><h3>Companions</h3>${comps || '<p class="muted">None from your choices.</p>'}</div>`;
}

// ——— 10 Drives ———
function drives(s: CharState): string {
  return `<h2>11. Drives</h2>
  ${intro('Your primary drive is the core of who you are; the secondary one is easier to give up. Each has three levels of deeds. Fulfilling them restores Focus and Wellbeing and heals the mind.')}
  <label class="field"><span>Primary drive</span><input data-bind="drives.primary" value="${esc(s.drives.primary ?? '')}" placeholder="e.g. Thirst for knowledge" /></label>
  <label class="field"><span>Secondary drive</span><input data-bind="drives.secondary" value="${esc(s.drives.secondary ?? '')}" placeholder="e.g. Joy of creation" /></label>
  <p class="small muted">The list of drives with their levels is coming in a later update.</p>`;
}

// ——— 11 Details ———
function details(s: CharState): string {
  const f = (path: string, label: string, ph = '') => `<label class="field"><span>${label}</span><input data-bind="details.${path}" value="${esc((s.details as unknown as Record<string, string>)[path] ?? '')}" placeholder="${esc(ph)}" /></label>`;
  const t = (path: string, label: string, ph = '') => `<label class="field"><span>${label}</span><textarea data-bind="details.${path}" placeholder="${esc(ph)}">${esc((s.details as unknown as Record<string, string>)[path] ?? '')}</textarea></label>`;
  return `<h2>12. Name & details</h2>
  ${intro('The things that don\'t change the numbers but make the person.')}
  ${f('name', 'Name')}
  <div class="row"><div class="grow">${f('age', 'Age')}</div><div class="grow">${f('gender', 'Gender')}</div></div>
  ${f('home', 'Home town or region')}
  <div class="row"><div class="grow">${f('height', 'Height')}</div><div class="grow">${f('weight', 'Weight')}</div></div>
  <div class="box"><h3>Weapon arm</h3><div class="row"><button type="button" class="small" data-act="armRoll">🎲 Roll d10</button>${s.details.armRoll ? die(s.details.armRoll, 'd10 small') : ''}
  <span class="chips"><button type="button" class="${s.details.arm === 'höger' ? 'on' : ''}" data-act="arm" data-val="höger">Right</button><button type="button" class="${s.details.arm === 'vänster' ? 'on' : ''}" data-act="arm" data-val="vänster">Left</button></span></div>
  <p class="small muted">On a 10 you are left-handed.</p></div>
  ${t('appearance', 'Appearance and quirks')}
  ${t('family', 'Family', 'Mother, father, siblings, the rest of the family…')}
  ${t('relations', 'Relations to the other characters')}
  ${t('story', 'Background story', 'Take inspiration from your event results.')}`;
}

// ——— 12 Equipment ———
function equipment(s: CharState, d: Derived): string {
  const PACKAGES = ['Djur', 'Fiskeutrustning', 'Forskningsutrustning', 'Hantverksutrustning', 'Jaktutrustning', 'Medicinsk utrustning', 'Musikinstrument', 'Mystikutrustning', 'Skrivutrustning', 'Skönhetsutrustning', 'Tjuvutrustning', 'Underhållningsutrustning', 'Vildmarksutrustning', 'Vapenvårdsutrustning'];
  const PACKAGES_EN: Record<string, string> = { Djur: 'Animal', Fiskeutrustning: 'Fishing gear', Forskningsutrustning: 'Research gear', Hantverksutrustning: 'Craft tools', Jaktutrustning: 'Hunting gear', 'Medicinsk utrustning': 'Medical kit', Musikinstrument: 'Musical instrument', Mystikutrustning: 'Mystic gear', Skrivutrustning: 'Writing kit', Skönhetsutrustning: 'Beauty kit', Tjuvutrustning: "Thief's tools", Underhållningsutrustning: "Entertainer's kit", Vildmarksutrustning: 'Wilderness gear', Vapenvårdsutrustning: 'Weapon care kit' };
  const pk = d.packages
    .map(
      (p) => `<label class="field"><span>Package${p.name !== '?' ? '' : ' (your choice)'}</span>${
        p.name !== '?'
          ? `<b>${esc(PACKAGES_EN[p.name] ?? p.name)}</b>`
          : `<select data-act-change="equip" data-kind="packages" data-key="${esc(p.key)}"><option value="">Choose…</option>${PACKAGES.map((x) => `<option value="${x}" ${s.equipment.packages[p.key] === x ? 'selected' : ''}>${esc(PACKAGES_EN[x])}</option>`).join('')}</select>`
      }</label>`,
    )
    .join('');
  const upgrade = d.sources.some((x) => x.effects.some((e) => e.k === 'flagga' && e.name === 'vapenhojning'));
  const slot = (kind: 'weapons' | 'armour', key: string, rarity: string) =>
    `<label class="field"><span>${kind === 'weapons' ? 'Weapon' : 'Armour'}: ${esc(RARITY_EN[rarity as 'vanlig'])} or lower${upgrade && kind === 'weapons' ? ' (one step higher allowed)' : ''}</span><input data-act-input="equip" data-kind="${kind}" data-key="${esc(key)}" value="${esc(s.equipment[kind][key] ?? '')}" placeholder="${kind === 'weapons' ? 'e.g. dagger, spear, short bow' : 'e.g. padded cloth, leather'}" /></label>`;
  const items = d.items.map((i) => `<li>${esc(i.text)} <span class="small muted">(${esc(i.from)})</span></li>`).join('');
  const spent = s.equipment.bought.reduce((n, b) => n + b.cost * b.qty, 0);
  return `<h2>13. Equipment</h2>
  ${intro('Equipment packages are bundles of the everyday things your character owns. Weapons and armour are picked up to the rarity you were given. Anything more is bought with silver.')}
  <div class="box"><h3>Packages</h3>${pk || '<p class="muted">None.</p>'}</div>
  <div class="box"><h3>Weapons</h3>${d.weapons.map((w) => slot('weapons', w.key, w.rarity)).join('') || '<p class="muted">None.</p>'}
  <p class="small muted">The weapon and armour lists with their stats are coming in a later update. For now, write the name.</p></div>
  <div class="box"><h3>Armour</h3>${d.armour.map((w) => slot('armour', w.key, w.rarity)).join('') || '<p class="muted">None.</p>'}</div>
  ${items ? `<div class="box"><h3>Items from your past</h3><ul>${items}</ul></div>` : ''}
  <div class="box"><h3>Purchases</h3>
  <p>Silver: <b>${d.silver - spent}</b> of ${d.silver}</p>
  <ul class="plain">${s.equipment.bought.map((b, i) => `<li class="row spread"><span>${b.qty > 1 ? `${b.qty}× ` : ''}${esc(b.name)} (${b.cost * b.qty} silver)</span><button type="button" class="link small" data-act="dropBuy" data-i="${i}">remove</button></li>`).join('')}</ul>
  <div class="row"><input class="grow" id="buy-name" placeholder="Item" /><input id="buy-cost" type="number" min="0" style="width:90px" placeholder="Silver" /><button type="button" class="small" data-act="buy">Buy</button></div></div>
  <label class="field"><span>Equipment notes</span><textarea data-bind="equipment.notes">${esc(s.equipment.notes)}</textarea></label>`;
}

// ——— 13 Mysticism ———
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
  return `<h2>14. Mysticism & magic</h2>
  ${intro('Only for magicians, invokers and those who gained mysteries or mystic gear some other way. Mysteries can only be used if you are attuned and know the right mystic skills (Channelling for prayers, an aspect for spells).')}
  ${any ? '' : '<div class="box"><p class="muted">Nothing here for this character. You can skip this step.</p></div>'}
  ${gear ? `<div class="box"><h3>Mystic equipment</h3>${gear}</div>` : ''}
  ${slots ? `<div class="box"><h3>Mysteries</h3>${slots}<p class="small muted">The full list of mysteries per aspect and faith is coming in a later update.</p></div>` : ''}`;
}

export const STEP_RENDER: ((s: CharState, d: Derived) => string)[] = [prep, homeland, background, people, religion, archetype, events, attributes, skills, languages, drives, details, equipment, magic];

export function attrOrder(): Attr[] {
  return [...ATTRS];
}
