/** The finished character sheet: four parts like the paper form, readable on phone, PC and paper. */
import { ATTR_EN, NUMB_EN, TABLE_EN, type Derived } from '../core/chargen/derive';
import type { CharState } from '../core/chargen/state';
import { diceText, ENCUMBRANCE } from '../core/chargen/tables';
import { ARMOUR, DAMAGE_TYPE_EN, propsEn, SHIELDS, WEAPONS } from '../content/chargen/equipment';
import { CONTENT } from '../content/chargen';
import { DRIVES } from '../content/chargen/drives';
import { languageEn } from '../content/chargen/languages';
import { esc } from './ui';

const GROUPS: [string, string][] = [
  ['kunskap', 'Knowledge'],
  ['mystik', 'Mystic'],
  ['rorelse', 'Movement'],
  ['social', 'Social'],
  ['strid', 'Combat'],
  ['vildmark', 'Wilderness'],
  ['E', 'Expertises'],
  ['F', 'Abilities'],
  ['H', 'Crafts'],
  ['K', 'Marks'],
];

/** Weapon damage with your base damage added: "G+2T6+1" + 2D6+2 → "4D6+3". */
function totalDmg(dmg: string, bd: { n: number; mod: number }): string {
  if (!/^G|T6|^\d/.test(dmg)) return dmg;
  let n = 0;
  let mod = 0;
  let rest = dmg;
  if (rest.startsWith('G')) {
    n += bd.n;
    mod += bd.mod;
    rest = rest.slice(1);
  }
  for (const m of rest.matchAll(/([+-]?)(\d+)(T6)?/g)) {
    const v = Number(m[2]) * (m[1] === '-' ? -1 : 1);
    if (m[3]) n += v;
    else mod += v;
  }
  return diceText({ n, mod });
}

function combatHtml(s: CharState, d: Derived): string {
  const skill = (id: string) => d.skills.find((x) => x.id === id);
  const bd = d.derived.damage;
  const owned = [...Object.values(s.equipment.weapons), ...s.equipment.bought.map((b) => b.name)].filter(Boolean);
  const weapons = owned.map((n) => WEAPONS.find((w) => w.sv === n)).filter((w): w is NonNullable<typeof w> => !!w);
  const shields = owned.map((n) => SHIELDS.find((w) => w.sv === n)).filter((w): w is NonNullable<typeof w> => !!w);
  const free = Object.values(s.equipment.weapons).filter((n) => n && !WEAPONS.some((w) => w.sv === n) && !SHIELDS.some((w) => w.sv === n));
  const brawl = skill('Slagsmål');
  const rows = [
    `<tr><td>Unarmed</td><td class="n">${brawl ? esc(diceText(brawl.dice)) : ''}</td><td class="n">–</td><td class="n">${esc(diceText(bd))}</td><td class="n">–</td><td class="note">Limited, Unarmed, Quick</td></tr>`,
    ...weapons.map((w) => {
      const sk = skill(w.skill);
      const dmg = (x: string) => (x === '–' ? '–' : esc(totalDmg(x, bd)));
      const cells = w.melee
        ? `<td class="n">${dmg(w.melee.hugg)}</td><td class="n">${dmg(w.melee.kross)}</td><td class="n">${dmg(w.melee.stick)}</td>`
        : `<td colspan="3" class="n">${esc(w.ranged!.range)} · ${esc(DAMAGE_TYPE_EN[w.ranged!.type] ?? w.ranged!.type)} ${dmg(w.ranged!.dmg)}</td>`;
      return `<tr><td>${esc(w.en)}<br><span class="note">${esc(CONTENT.skill(w.skill)?.en ?? w.skill)} · 1H ${esc(w.h1.replace('T6', 'D6'))} / 2H ${esc(w.h2.replace('T6', 'D6'))}</span></td><td class="n">${sk ? esc(diceText(sk.dice)) : ''}</td>${cells}<td class="note">${esc(propsEn(w.props))}</td></tr>`;
    }),
  ];
  const armourOwned = [...Object.values(s.equipment.armour), ...s.equipment.bought.map((b) => b.name)].map((n) => ARMOUR.find((a) => a.sv === n)).filter((a): a is NonNullable<typeof a> => !!a);
  const best = armourOwned.sort((a, b) => b.h + b.k + b.s - (a.h + a.k + a.s))[0];
  const dwarf = d.people?.family === 'dvarg';
  const load = best ? Math.max(0, best.load - (dwarf ? 8 : 0)) : 0;
  const enc = [...ENCUMBRANCE].find((e) => load <= e.max) ?? ENCUMBRANCE[ENCUMBRANCE.length - 1];
  const A = d.derived.armour;
  return `<h3>Weapons</h3><table><tr><th>Weapon</th><th class="n">Skill</th><th class="n">Cut</th><th class="n">Crush</th><th class="n">Thrust</th><th>Properties</th></tr>${rows.join('')}</table>
    ${free.length ? `<p class="note">Also: ${free.map(esc).join(', ')}</p>` : ''}
    ${shields.length ? `<h3>Shields</h3><ul>${shields.map((x) => `<li>${esc(x.en)}: melee ${esc(x.melee.replace('T6', 'D6'))}, ranged ${esc(x.ranged.replace('T6', 'D6'))}, cover ${esc(x.cover)}${x.props ? ` · ${esc(propsEn(x.props))}` : ''}</li>`).join('')}</ul>` : ''}
    <h3>Armour</h3>
    ${best ? `<p>${esc(best.en)} (full suit)</p>` : '<p class="note">No armour.</p>'}
    ${dl([
      ['Protection (cut/crush/thrust)', `${(best?.h ?? 0) + A} / ${(best?.k ?? 0) + A} / ${(best?.s ?? 0) + A}`],
      ['Load', `${load}${dwarf && best ? ' (dwarf −8)' : ''}`],
      ['Encumbrance', `${enc.penalty} on Speed, Reaction and movement · base fatigue ${enc.baseFatigue}`],
    ])}
    <p class="note">Damage includes your base damage (${esc(diceText(bd))}); protection includes base armour ${A}.</p>`;
}

const dl = (rows: [string, string | undefined][]) =>
  `<dl>${rows
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
    .join('')}</dl>`;

export function sheetHtml(s: CharState, d: Derived): string {
  const D = s.details;
  const name = D.name || 'Unnamed';
  const people = d.people ? esc(d.people.en) + (s.cultureFrom && d.people.id !== s.cultureFrom ? ` <span class="note">(raised among ${esc(CONTENT.peoples.find((p) => p.id === s.cultureFrom)?.en ?? s.cultureFrom)})</span>` : '') : '';
  const relig = d.godless ? 'Godless' : d.religion ? esc(d.religion.en) : '';
  const doctrines = d.sources.filter((x) => x.key.startsWith('rel.d.')).map((x) => esc(x.label.replace(/^Doctrines: /, '')));

  const attrs = d.attrs
    .map((a) => `<tr><td>${esc(ATTR_EN[a.attr])}</td><td class="n">${a.value}</td><td class="n">${a.attr === 'Visdom' ? '–' : esc(diceText(a.dice))}</td></tr>`)
    .join('');

  const skillGroups = GROUPS.map(([g, title]) => {
    const rows = d.skills.filter((x) => x.group === g && (x.value > 0 || x.talent || x.incompetent || x.blocked));
    if (!rows.length) return '';
    return `<div class="skillgroup"><h3>${title}</h3><table>${rows
      .map(
        (r) =>
          `<tr><td>${esc(r.en)}${r.talent ? ' <b>T</b>' : ''}${r.incompetent ? ' <b>I</b>' : ''}${r.blocked ? ' <b>B</b>' : ''}</td><td class="n">${r.value}</td><td class="n">${esc(diceText(r.dice))}</td></tr>`,
      )
      .join('')}</table></div>`;
  }).join('');

  const langs = [...d.languages.spoken, ...s.languages.spoken];
  const scripts = [...d.languages.written, ...s.languages.written];
  const circles = d.circles.map((c) => s.circles[c.key] || (c.name !== '?' ? c.name : '')).filter(Boolean);
  const companions = d.companions.map((c) => `${esc(c.kind)}${s.companions[c.key] ? `: ${esc(s.companions[c.key])}` : ''}`);
  const packages = d.packages.map((p) => esc(p.name !== '?' ? p.name : s.equipment.packages[p.key] || '(package, not chosen)'));
  const spent = s.equipment.bought.reduce((n, b) => n + b.cost * b.qty, 0);
  const events = d.slots
    .filter((x) => x.results.length)
    .flatMap((x) => x.results.map((r, i) => `<li><b>${esc(x.table ? TABLE_EN[x.table] : '')} ${x.rec?.values[i] ?? ''}</b>: ${esc(r.en)}</li>`));
  const mysteries = s.mysteries.filter(Boolean);
  const gear = d.mysticGear.map((g) => esc(s.mysticGear[g.key] || '(mystic equipment, not chosen)'));
  const unresolved = d.pending.length + d.warnings.length;

  return `<div class="sheet">
  ${unresolved ? `<p class="note noprint">⚠ ${unresolved} thing${unresolved === 1 ? '' : 's'} left open in the earlier steps (see the red dots).</p>` : ''}
  <h2>${esc(name)}</h2>
  <div class="cols">
    <div>${dl([
      ['People', people],
      ['Gender', esc(D.gender)],
      ['Age', esc(D.age)],
      ['Religion', relig],
      ['Occupation', esc(s.occupation)],
      ['Homeland', d.homeland ? esc(d.homeland.en) : ''],
      ['Home', esc(D.home)],
    ])}</div>
    <div>${dl([
      ['Background', d.background ? esc(d.background.en) : ''],
      ['Archetype', d.archetype ? esc(d.archetype.en) : ''],
      ['Environment', d.environment ? esc(d.environment.en) : ''],
      ['Living standard', d.living ? esc(d.living.en) : ''],
      ['Height / weight', [D.height, D.weight].filter(Boolean).map(esc).join(' / ')],
      ['Weapon arm', D.arm ? (D.arm === 'höger' ? 'Right' : 'Left') : ''],
    ])}</div>
  </div>
  ${doctrines.length ? `<p><b>Doctrines:</b> ${doctrines.join('; ')}</p>` : ''}
  ${[['Primary drive', s.drives.primary], ['Secondary drive', s.drives.secondary]]
    .filter(([, v]) => v)
    .map(([label, v]) => {
      const dr = DRIVES.find((x) => x.sv === v);
      return `<p><b>${label}: ${esc(dr?.en ?? v)}</b>${dr ? `<br><span class="note">I ${esc(dr.levels[0])} · II ${esc(dr.levels[1])} · III ${esc(dr.levels[2])}</span>` : ''}</p>`;
    })
    .join('')}
  ${D.appearance ? `<p><b>Appearance:</b> ${esc(D.appearance)}</p>` : ''}

  <h2>Attributes & skills</h2>
  <div class="cols">
    <div><table><tr><th>Attribute</th><th class="n">Value</th><th class="n">Dice</th></tr>${attrs}</table>
    ${dl([
      ['Base armour', String(d.derived.armour)],
      ['Base damage', esc(diceText(d.derived.damage))],
      ['Healing rate', String(d.derived.healing)],
      ['New knowledge', `${d.wisdom.newKnowledgeXp} experience`],
      ['Attuned', d.attuned ? 'Yes' : 'No'],
    ])}
    <h3>Hardening</h3>${dl((['utsatthet', 'vald', 'overnaturligt'] as const).map((c) => [NUMB_EN[c], String(d.numb[c])]))}
    <h3>Languages</h3>${dl([
      ['Speaks', langs.map((l) => esc(languageEn(l))).join(', ')],
      ['Writes', scripts.map((l) => esc(languageEn(l))).join(', ') || '–'],
    ])}
    ${circles.length ? `<h3>Circles</h3><ul>${circles.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${companions.length ? `<h3>Companions</h3><ul>${companions.map((c) => `<li>${c}</li>`).join('')}</ul>` : ''}
    </div>
    <div>${skillGroups}</div>
  </div>
  <p class="note">T = talent (+1D6 extra when you spend Focus) · I = incompetent (max 2D6) · B = blocked</p>
  ${d.rules.length ? `<h3>Special traits</h3><ul>${d.rules.map((r) => `<li>${esc(r.text)} <span class="note">(${esc(r.from)})</span></li>`).join('')}</ul>` : ''}

  <h2>Combat & magic</h2>
  <div class="cols">
    <div>${combatHtml(s, d)}</div>
    <div>${gear.length ? `<h3>Mystic equipment</h3><ul>${gear.map((g) => `<li>${g}</li>`).join('')}</ul>` : ''}
    ${mysteries.length ? `<h3>Mysteries</h3><ul>${mysteries.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}</div>
  </div>

  <h2>Equipment & notes</h2>
  <div class="cols">
    <div>${dl([
      ['Silver', `${d.silver - spent}`],
      ['Packages', packages.join(', ')],
      ['Clothes', d.living ? esc(d.living.clothes) : ''],
      ['Lodging', d.living ? esc(d.living.lodging) : ''],
      ['Living costs', d.living ? esc(d.living.monthly) : ''],
    ])}
    ${d.items.length || s.equipment.bought.length ? `<h3>Belongings</h3><ul>${d.items.map((i) => `<li>${esc(i.text)}</li>`).join('')}${s.equipment.bought.map((b) => `<li>${b.qty > 1 ? `${b.qty}× ` : ''}${esc(b.name)}</li>`).join('')}</ul>` : ''}
    ${s.equipment.notes ? `<p>${esc(s.equipment.notes)}</p>` : ''}</div>
    <div>${events.length ? `<h3>Life events</h3><ul>${events.join('')}</ul>` : ''}</div>
  </div>
  ${D.family ? `<h3>Family</h3><p>${esc(D.family)}</p>` : ''}
  ${D.relations ? `<h3>Relations</h3><p>${esc(D.relations)}</p>` : ''}
  ${D.story ? `<h3>Story</h3><p>${esc(D.story)}</p>` : ''}
  </div>
  <div class="row noprint" style="margin-top:10px"><button type="button" data-act="print">🖨 Print / save as PDF</button></div>`;
}
