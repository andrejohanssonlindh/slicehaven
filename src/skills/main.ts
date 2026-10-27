import { ATTR_EN } from '../core/chargen/derive';
import { difficultyName } from '../core/checks';
import { leaningsForSkill } from '../core/people';
import { type Context, linkedSkills, modesOf, relationsOf } from '../core/skillgraph';
import { SKILLS } from '../content/chargen/skills';
import { GATE_SCENE } from '../content/scenes/gate';
import { GENERIC_GUARD } from '../content/npcs';
import { byGroup, rollableName } from '../content/rollables';
import { FACETS, PEOPLE_LIBRARY } from '../content/people';
import { LIBRARY } from '../content/skillweb';
import { examplesOf, missingExamples } from '../content/skillweb/examples';
import { OUTCOME_TYPES, USE_MODES } from '../content/skillweb/uses';
import { TAGGED, TAG_INFO } from '../content/skillweb/tags';
import { esc } from '../ui/sheet';

/**
 * The skill map: pick a skill and see everything we have recorded about it: what kinds of effort it is
 * tagged for, which hooks and checks list it, what he can answer when you start a conflict with it,
 * where it shows up in challenges, and who has it. A way to gauge how skills relate.
 */
const cx: Context = {
  tags: TAGGED,
  library: LIBRARY,
  scenes: [GATE_SCENE],
  people: [GENERIC_GUARD],
};

const ALL = [...Object.keys(ATTR_EN).map((a) => `attr:${a}`), ...SKILLS.map((s) => s.id)];
const LINKED = linkedSkills(ALL, cx);

const root = document.getElementById('skills-root')!;
const view = { q: '', only: true, tag: '', pick: '' };

const name = (id: string) => esc(rollableName(id));
const names = (ids: string[]) => (ids.length ? ids.map(name).join(', ') : '—');
const dice = (d: { n: number; mod: number }) => `${d.n}D6${d.mod ? `+${d.mod}` : ''}`;

function coverage(): string {
  const total = Object.values(TAGGED).reduce((n, ids) => n + ids.length, 0);
  const missing = missingExamples().length;
  return `Examples written for ${total - missing} of ${total} skill/effort pairs.`;
}

function list(): string {
  const q = view.q.trim().toLowerCase();
  const pool = ALL.filter((id) => (!view.only || LINKED.has(id)) && (!view.tag || TAGGED[view.tag].includes(id)) && (!q || rollableName(id).toLowerCase().includes(q)));
  const groups = byGroup(pool);
  if (!groups.length) return '<p class="muted">Nothing matches.</p>';
  return groups
    .map((g) => `<h3>${esc(g.label)} (${g.ids.length})</h3><div class="chips">${g.ids
      .map((id) => `<button type="button" class="chip ${view.pick === id ? 'on' : ''} ${LINKED.has(id) ? '' : 'dim'}" data-skill="${esc(id)}">${name(id)}</button>`)
      .join('')}</div>`)
    .join('');
}

function tagChips(ids: string[]): string {
  return `<div class="chips">${ids.map((t) => `<button type="button" class="chip tag ${view.tag === t ? 'on' : ''}" data-tag="${esc(t)}" title="${esc(TAG_INFO[t]?.what ?? '')}">${esc(TAG_INFO[t]?.label ?? t)}</button>`).join('')}</div>`;
}

function detail(): string {
  if (!view.pick) return '<p class="muted">Pick a skill to see how it relates to the rest.</p>';
  const id = view.pick;
  const r = relationsOf(id, cx);
  const parts: string[] = [`<h2>${name(id)}</h2>`];
  parts.push(r.tags.length ? `<p class="muted">Tagged for:</p>${tagChips(r.tags)}${r.tags.map((t) => `<p class="muted"><b>${esc(TAG_INFO[t]?.label ?? t)}</b>: ${esc(TAG_INFO[t]?.what ?? '')}</p>`).join('')}` : '<p class="muted">Not tagged for any kind of effort yet.</p>');
  const ex = examplesOf(id);
  const exTags = new Set(ex.map((e) => e.tag));
  if (ex.length) parts.push('<h3>What it looks like</h3>', ...ex.map((e) => `<div class="card"><b>${esc(TAG_INFO[e.tag]?.label ?? e.tag)}</b><ul>${e.ways.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`));
  const bare = r.tags.filter((t) => !exTags.has(t));
  if (bare.length) parts.push(`<p class="muted">No examples yet for: ${bare.map((t) => esc(TAG_INFO[t]?.label ?? t)).join(', ')}.</p>`);
  if (id.startsWith('attr:')) parts.push('<p class="muted">An attribute: a fallback roll (the locked roll, Presence, Physique when aggressive, and a few by difficulty).</p>');

  const where = r.tags
    .map((t) => ({ t, rows: leaningsForSkill(id, t, PEOPLE_LIBRARY) }))
    .filter((x) => x.rows.length);
  if (where.length) {
    parts.push('<h3>Who and where it works</h3>', '<p class="muted">Easier (+) and harder (−) for this effort, by kind of person or place. Marked ★ when it names this skill.</p>');
    parts.push(...where.map(({ t, rows }) => `<details><summary>${esc(TAG_INFO[t]?.label ?? t)} (${rows.length})</summary><ul>${rows
      .map(({ l, specific }) => `<li><b>${l.shift > 0 ? '+' : '−'}${Math.abs(l.shift)}</b> ${esc(FACETS[l.who]?.label ?? l.who)}${specific ? ' ★' : ''} <span class="muted">${esc(l.why)}</span></li>`)
      .join('')}</ul></details>`));
  }

  const modes = modesOf(r);
  parts.push('<h3>Ways it can be used</h3>', modes.length
    ? `<div class="chips">${modes.map((k) => `<span class="chip tag" title="${esc(USE_MODES[k].what)}">${esc(USE_MODES[k].label)}</span>`).join('')}</div>`
    : '<p class="muted">Not used in any way yet.</p>');
  parts.push('<h3>Start a conflict with it</h3>');
  if (r.asYours.length) {
    parts.push(...r.asYours.map((l) => `<div class="card"><b>${esc(l.approach)}</b> with ${esc(l.who)} <span class="muted">(${esc(l.scene)})</span>`
      + `${l.locked ? ' · <b>locked roll</b>' : ''}${l.aggressive ? ' · aggressive' : ''}`
      + `<div>He might answer with: ${names(l.answers)}${l.fallback ? ' <span class="muted">(none of his skills fit: an attribute)</span>' : ''}</div></div>`));
  } else parts.push('<p class="muted">Not listed for any conflict.</p>');

  parts.push('<h3>When he uses it</h3>');
  parts.push(r.asHis.length
    ? r.asHis.map((l) => `<div class="card">${esc(l.who)} ${l.role === 'answer' ? 'answers with it' : 'can start the round with it'} in <b>${esc(l.approach)}</b>.`
      + `<div>You could ${l.role === 'answer' ? 'have started with' : 'answer with'}: ${names(l.yours)}</div></div>`).join('')
    : '<p class="muted">Not used by anyone against you yet.</p>');

  parts.push('<h3>Library hooks (what it can do to things)</h3>');
  parts.push(r.hooks.length
    ? `<ul>${r.hooks.map((h) => `<li><b>${esc(h.label.replace('{name}', '…'))}</b>: on ${esc(h.kind)}${h.facet ? ` (${esc(FACETS[h.facet]?.label ?? h.facet)})` : ''}, ${esc(difficultyName(h.difficulty))} (${h.difficulty})${h.social ? ', social' : ''}${h.hidden ? ', hidden read' : ''}</li>`).join('')}</ul>`
    : '<p class="muted">No library hook lists it.</p>');

  parts.push('<h3>Written into scenes</h3>');
  parts.push(r.checks.length ? `<ul>${r.checks.map((c) => `<li>${esc(c.scene)}: <b>${esc(c.label)}</b> on ${esc(c.thing)} (${difficultyName(c.difficulty)} ${c.difficulty})</li>`).join('')}</ul>` : '<p class="muted">None.</p>');

  parts.push('<h3>Challenges against a place</h3>');
  parts.push(r.challenges.length
    ? `<ul>${r.challenges.map((c) => `<li><b>${esc(c.challenge.label)}</b> (${esc(c.scene)})${c.locked ? ', locked roll' : ''}${c.time ? `, only at ${c.time.join(' / ')}` : ''}</li>`).join('')}</ul>`
    : '<p class="muted">None.</p>');

  parts.push('<h3>Edges it gives</h3>');
  parts.push(r.edges.length ? `<ul>${r.edges.map((e) => `<li>${esc(e.challenge)} (${esc(e.scene)}): ${e.control > 0 ? '+' : '−'}${Math.abs(e.control)} Control. ${esc(e.note)}</li>`).join('')}</ul>` : '<p class="muted">None.</p>');
  parts.push('<h3>Who has it</h3>');
  parts.push(r.owners.length ? `<ul>${r.owners.map((o) => `<li>${esc(o.name)}: ${dice(o)}</li>`).join('')}</ul>` : '<p class="muted">No sheet we have lists it.</p>');
  return parts.join('');
}

function glossary(): string {
  const row = (k: string) => {
    const u = USE_MODES[k];
    return `<div class="card"><b>${esc(u.label)}</b> <span class="muted">(${u.status === 'built' ? 'built' : 'planned'})</span><div>${esc(u.what)}</div><div class="muted">${esc(u.shape)}</div><div class="muted">${esc(u.where)}</div></div>`;
  };
  const keys = Object.keys(USE_MODES);
  return `<h2>All the ways a skill can be used</h2>
    ${keys.filter((k) => USE_MODES[k].status === 'built').map(row).join('')}
    <h3>Planned</h3>${keys.filter((k) => USE_MODES[k].status === 'planned').map(row).join('')}
    <h2>What a use can result in</h2>
    <ul>${OUTCOME_TYPES.map((o) => `<li>${esc(o.label)} <span class="muted">(${o.status})</span></li>`).join('')}</ul>`;
}

function render(): void {
  root.innerHTML = `<h1>Skill map</h1>
    <p class="muted">How skills relate: what each is tagged for, where it is used and what he answers with. Dimmed skills have no link yet. ${coverage()}</p>
    <input type="search" id="q" placeholder="Search a skill…" value="${esc(view.q)}" />
    <label class="check"><input type="checkbox" id="only" ${view.only ? 'checked' : ''} /> only skills with a link</label>
    <h3>Kinds of effort</h3>${tagChips(Object.keys(TAGGED))}
    ${view.tag ? `<p class="muted"><b>${esc(TAG_INFO[view.tag]?.label ?? view.tag)}</b>: ${esc(TAG_INFO[view.tag]?.what ?? '')} <button type="button" class="chip" data-tag="">show all</button></p>` : ''}
    ${list()}<div id="detail">${detail()}</div>${glossary()}`;
  const q = root.querySelector<HTMLInputElement>('#q')!;
  q.addEventListener('input', () => {
    view.q = q.value;
    const pos = q.selectionStart;
    render();
    const again = root.querySelector<HTMLInputElement>('#q')!;
    again.focus();
    again.setSelectionRange(pos, pos);
  });
  root.querySelector<HTMLInputElement>('#only')!.addEventListener('change', (e) => {
    view.only = (e.target as HTMLInputElement).checked;
    render();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach((b) => b.addEventListener('click', () => {
    view.pick = b.dataset.skill!;
    render();
    document.getElementById('detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((b) => b.addEventListener('click', () => {
    view.tag = view.tag === b.dataset.tag ? '' : b.dataset.tag!;
    render();
  }));
}

render();
