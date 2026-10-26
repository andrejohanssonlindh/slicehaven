/**
 * derive(state, content) → everything about the character that follows from the
 * player's decisions and dice: open choices, unit pools, attributes, skills,
 * languages, gear slots and rule notes. Pure and deterministic.
 */
import {
  ATTRS,
  parseGrants,
  type Attr,
  type Item,
  type NumbCat,
  type Pool,
  type Rarity,
  type TableId,
  type Token,
} from './grants';
import type { CharState, RollRec } from './state';
import {
  attrDice,
  baseArmour,
  baseDamage,
  MAX_POINTS_PER_ATTR,
  MIN_ATTR,
  POINT_MODELS,
  skillDice,
  SKILL_MAX,
  wisdomRow,
  type Dice,
  type WisdomRow,
} from './tables';
import type {
  Archetype,
  Background,
  Environment,
  EventEntry,
  EventTable,
  FamilyDef,
  Homeland,
  Opt,
  People,
  PickGroup,
  Religion,
} from './types';
import type { Family } from './types';

export interface SkillInfo {
  id: string;
  en: string;
  group: string;
  base: 0 | 1;
}

export interface Content {
  homelands: Homeland[];
  backgrounds: Background[];
  families: Record<Family, FamilyDef>;
  peoples: People[];
  religions: Religion[];
  archetypes: Archetype[];
  environments: Environment[];
  tables: Partial<Record<TableId, EventTable>>;
  skill(id: string): SkillInfo | undefined;
  skills: SkillInfo[];
}

/** The creation steps in order; the last one is the finished sheet. */
export const STEPS = [
  'Preparation',
  'Homeland',
  'Background',
  'People',
  'Religion',
  'Archetype',
  'Environment',
  'Event tables',
  'Attributes',
  'Skills',
  'Languages & contacts',
  'Drives',
  'Name & details',
  'Equipment',
  'Mysticism & magic',
  'Character sheet',
] as const;
export const STEP = {
  prep: 0,
  homeland: 1,
  background: 2,
  people: 3,
  religion: 4,
  archetype: 5,
  environment: 6,
  events: 7,
  attributes: 8,
  skills: 9,
  languages: 10,
  drives: 11,
  details: 12,
  equipment: 13,
  magic: 14,
  sheet: 15,
} as const;

/** A resolved grant with a single target. */
export type Effect =
  | { k: 'skill'; skill: string; n: number }
  | { k: 'group'; pool: Pool; n: number }
  | { k: 'roll'; slot: string; table: TableId }
  | { k: 'attr'; attr: Attr; n: number }
  | { k: 'apoang'; n: number }
  | { k: 'sprak'; n: number }
  | { k: 'tal'; name: string }
  | { k: 'skrift'; name: string }
  | { k: 'numb'; cat: NumbCat; n: number }
  | { k: 'talang' | 'inkomp' | 'block'; skill: string }
  | { k: 'omstopt' }
  | { k: 'krets'; key: string; name: string }
  | { k: 'foljeslagare'; key: string; kind: string }
  | { k: 'vapen'; key: string; rarity: Rarity }
  | { k: 'rustning'; key: string; rarity: Rarity }
  | { k: 'paket'; key: string; name: string }
  | { k: 'mystikutr'; key: string }
  | { k: 'silver'; n: number }
  | { k: 'mysterier'; n: number; learned: boolean }
  | { k: 'religion'; ids: string[] }
  | { k: 'doktrin'; n: number }
  | { k: 'derived'; stat: 'grundrustning' | 'grundskada' | 'lakningstakt'; n: number }
  | { k: 'regel'; text: string }
  | { k: 'foremal'; text: string }
  | { k: 'lana'; key: string; people: string[] }
  | { k: 'doktrinx'; key: string; religions: string[]; n: number }
  | { k: 'stryk'; n: number }
  | { k: 'flagga'; name: string }
  | { k: 'grund'; skill: string; n: number };

export interface SourceRec {
  key: string;
  step: number;
  label: string;
  effects: Effect[];
}

export type Pending =
  | { k: 'pick'; key: string; step: number; label: string; group: PickGroup; need: number; have: string[] }
  | { k: 'option'; key: string; step: number; label: string; options: string[] }
  | { k: 'alt'; key: string; step: number; label: string; options: string[]; what: string }
  | { k: 'name'; key: string; step: number; label: string; kind: string; n: number }
  | { k: 'table'; key: string; step: number; label: string }
  | { k: 'roll'; key: string; step: number; label: string; table: TableId };

export interface Slot {
  key: string;
  /** Source label (where the roll came from). */
  from: string;
  table?: TableId;
  rec?: RollRec;
  /** Entries in order (an "again" entry is followed by another). */
  results: EventEntry[];
  needsRoll: boolean;
  /** Given up (e.g. for a shapeshifter or a twin). */
  struck: boolean;
}

export interface SkillRow {
  id: string;
  en: string;
  group: string;
  base: number;
  units: number;
  value: number;
  dice: Dice;
  talent: boolean;
  incompetent: boolean;
  blocked: boolean;
}

export interface PoolRow {
  pool: string;
  total: number;
  spent: number;
}

export interface PickRec {
  key: string;
  step: number;
  group: PickGroup;
  need: number;
  have: string[];
}

export interface Derived {
  sources: SourceRec[];
  pending: Pending[];
  /** Every pick group met, finished or not, in order. */
  picks: PickRec[];
  slots: Slot[];
  homeland?: Homeland;
  background?: Background;
  people?: People;
  religion?: Religion;
  archetype?: Archetype;
  environment?: Environment;
  godless: boolean;
  forcedReligion?: string[];
  attuned: boolean;
  attrs: {
    attr: Attr;
    base: number;
    mods: number;
    points: number;
    value: number;
    dice: Dice;
  }[];
  attrPoints: { total: number; spent: number; extra: number };
  wisdom: WisdomRow;
  derived: { armour: number; damage: Dice; healing: number };
  skills: SkillRow[];
  pools: PoolRow[];
  numb: Record<Exclude<NumbCat, 'valfri'>, number>;
  numbFree: number;
  languages: { spoken: string[]; written: string[]; picks: number; boughtWithUnits: number };
  circles: { key: string; name: string }[];
  companions: { key: string; kind: string }[];
  weapons: { key: string; rarity: Rarity }[];
  armour: { key: string; rarity: Rarity }[];
  packages: { key: string; name: string }[];
  mysticGear: { key: string }[];
  silver: number;
  mysteries: { n: number; unlearned: number; bought: number };
  rules: { text: string; from: string }[];
  items: { text: string; from: string }[];
  extraDoctrines: number;
  warnings: { step: number; text: string }[];
  /** Number of unresolved things per step (for the progress bar). */
  openByStep: number[];
}

const NUMB_CATS = ['utsatthet', 'vald', 'overnaturligt'] as const;

/** Which unit pools may buy what. */
export function poolAllows(pool: string, target: string, skill: (id: string) => SkillInfo | undefined): boolean {
  if (target === 'sprak') return pool === 'kunskap' || pool === 'valfri';
  if (target === 'mysterier') return pool === 'mystik' || pool === 'valfri';
  if (target.startsWith('avtr:')) {
    const c = target.slice(5);
    if (pool === 'valfri') return true;
    if (c === 'overnaturligt') return pool === 'mystik';
    if (c === 'utsatthet') return pool === 'social' || pool === 'vildmark';
    if (c === 'vald') return pool === 'strid';
    return false;
  }
  const s = skill(target);
  if (!s) return false;
  const g = s.group;
  switch (pool) {
    case 'valfri':
      return g !== 'F';
    case 'kunskap':
      return g === 'kunskap' || g === 'E';
    case 'mystik':
      return g === 'mystik';
    case 'rorelse':
      return g === 'rorelse' || g === 'H';
    case 'social':
      return g === 'social' || g === 'K';
    case 'strid':
      return g === 'strid';
    case 'vildmark':
      return g === 'vildmark' || g === 'H';
    default:
      return g === pool;
  }
}

export function derive(state: CharState, c: Content): Derived {
  const sources: SourceRec[] = [];
  const pending: Pending[] = [];
  const picks: PickRec[] = [];
  const slots: Slot[] = [];
  const warnings: Derived['warnings'] = [];
  const cache = new Map<string, Item[]>();
  const parse = (g: string): Item[] => {
    let v = cache.get(g);
    if (!v) cache.set(g, (v = parseGrants(g)));
    return v;
  };

  const homeland = c.homelands.find((h) => h.id === state.homeland);
  const background = c.backgrounds.find((b) => b.n === state.background);
  const people = c.peoples.find((p) => p.id === state.people);
  const cultureSrc = c.peoples.find((p) => p.id === state.cultureFrom) ?? people;
  const archetype = c.archetypes.find((a) => a.id === state.archetype);
  const environment = c.environments.find((e) => e.id === state.environment);

  /** Resolve one token into effects, registering any choices it needs. */
  function resolveToken(t: Token, key: string, step: number, label: string, out: Effect[]): void {
    const alt = <T>(list: T[], what: string, names: string[]): T | undefined => {
      if (list.length === 1) return list[0];
      const v = state.choices[key];
      if (typeof v === 'number' && v >= 0 && v < list.length) return list[v];
      pending.push({ k: 'alt', key, step, label, options: names, what });
      return undefined;
    };
    const expand = (list: string[]) =>
      list.flatMap((x) =>
        x === '*' ? c.skills.filter((k) => k.group.length > 1).map((k) => k.id) : x.startsWith('@') ? c.skills.filter((k) => k.group === x.slice(1)).map((k) => k.id) : [x],
      );
    switch (t.k) {
      case 'skill': {
        const list = expand(t.skill);
        const s = alt(list, 'skill', list.map((x) => c.skill(x)?.en ?? x));
        if (s) out.push({ k: 'skill', skill: s, n: t.n });
        return;
      }
      case 'named': {
        const v = state.choices[key];
        if (typeof v === 'string' && v.trim()) {
          const id = t.kind === 'Aspekt' ? v : `${t.kind}:${v}`;
          out.push({ k: 'skill', skill: id, n: t.n });
          if (t.kind === 'Aspekt') out.push({ k: 'omstopt' });
        } else pending.push({ k: 'name', key, step, label, kind: t.kind, n: t.n });
        return;
      }
      case 'group': {
        const g = alt(t.group, 'group', t.group);
        if (g) out.push({ k: 'group', pool: g, n: t.n });
        return;
      }
      case 'attr': {
        const a = alt(t.attr, 'attribute', t.attr);
        if (a) out.push({ k: 'attr', attr: a, n: t.n });
        return;
      }
      case 'numb': {
        const n = alt(t.cat, 'hardening', t.cat);
        if (n) out.push({ k: 'numb', cat: n, n: t.n });
        return;
      }
      case 'talang':
      case 'inkomp':
      case 'block': {
        const nm = t.skill.length === 1 ? /^([EFHK]):\?$/.exec(t.skill[0]) : null;
        if (nm) {
          const v = state.choices[key];
          if (typeof v === 'string' && v.trim()) out.push({ k: t.k, skill: `${nm[1]}:${v.trim()}` });
          else pending.push({ k: 'name', key, step, label, kind: nm[1], n: 0 });
          return;
        }
        const list = expand(t.skill);
        const s = alt(list, 'skill', list.map((x) => c.skill(x)?.en ?? x));
        if (s) out.push({ k: t.k, skill: s });
        return;
      }
      case 'tal':
      case 'skrift': {
        if (t.name === '?') {
          const v = state.choices[key];
          if (typeof v === 'string' && v.trim()) out.push({ k: t.k, name: v.trim() });
          else pending.push({ k: 'name', key, step, label, kind: t.k, n: 1 });
          return;
        }
        const names = t.name.split('/');
        const n = alt(names, 'language', names);
        if (n) out.push({ k: t.k, name: n });
        return;
      }
      case 'roll':
        for (let i = 0; i < t.n; i++) out.push({ k: 'roll', slot: `${key}@${i}`, table: t.table });
        return;
      case 'krets':
        out.push({ k: 'krets', key, name: t.name });
        return;
      case 'foljeslagare':
        out.push({ k: 'foljeslagare', key, kind: t.kind });
        return;
      case 'vapen':
      case 'rustning':
        for (let i = 0; i < t.n; i++) out.push({ k: t.k, key: `${key}@${i}`, rarity: t.rarity });
        return;
      case 'paket':
        for (let i = 0; i < t.n; i++) out.push({ k: 'paket', key: `${key}@${i}`, name: t.name });
        return;
      case 'mystikutr':
        for (let i = 0; i < t.n; i++) out.push({ k: 'mystikutr', key: `${key}@${i}` });
        return;
      case 'lana':
        out.push({ k: 'lana', key, people: t.people });
        return;
      case 'doktrinx':
        out.push({ k: 'doktrinx', key, religions: t.religions, n: t.n });
        return;
      default:
        out.push(t as Effect);
    }
  }

  function addSource(key: string, step: number, label: string, g: string): SourceRec {
    const effects: Effect[] = [];
    parse(g).forEach((item, i) => {
      const ik = `${key}#${i}`;
      if (item.k === 'token') resolveToken(item.token, ik, step, label, effects);
      else {
        const v = state.choices[ik];
        if (typeof v === 'number' && item.options[v]) {
          item.options[v].tokens.forEach((t, j) => resolveToken(t, `${ik}.${j}`, step, label, effects));
        } else {
          pending.push({ k: 'option', key: ik, step, label, options: item.options.map((o) => o.label ?? describeTokens(o.tokens, c)) });
        }
      }
    });
    const rec = { key, step, label, effects };
    sources.push(rec);
    return rec;
  }

  function addPick(key: string, step: number, group: PickGroup, need = group.pick): void {
    const have = (state.picks[key] ?? []).filter((id) => group.options.some((o) => o.id === id));
    const used = have.slice(0, need);
    picks.push({ key, step, group, need, have: used });
    if (group.optional && !used.length) return;
    used.forEach((id, i) => {
      const o = group.options.find((x) => x.id === id) as Opt;
      addSource(`${key}.${group.repeat ? i : id}`, step, `${group.en}: ${o.en}`, o.g);
    });
    if (used.length < need) pending.push({ k: 'pick', key, step, label: group.en, group, need, have: used });
  }

  // 1 — Homeland
  if (homeland) addSource('hl', STEP.homeland, homeland.en, `tal:${homeland.language}`);
  else pending.push({ k: 'option', key: 'homeland', step: STEP.homeland, label: 'Choose a homeland', options: [] });

  // 2 — Background
  if (background) {
    addSource('bg', STEP.background, background.en, `slag:${background.table} 1`);
    const group: PickGroup = {
      id: 'bg',
      sv: background.sv,
      en: background.en,
      pick: 2,
      options: background.opts.map((g, i) => ({ id: String(i), sv: '', en: describe(g, c), g })),
    };
    addPick('bg.p', STEP.background, group);
  } else pending.push({ k: 'option', key: 'background', step: STEP.background, label: 'Roll your background', options: [] });

  // 3 — People
  let godless = false;
  if (people) {
    const fam = c.families[people.family];
    const useFamily = !(people.family === 'manniska' && people.marvel);
    const add = (prefix: string, list: Opt[]) => list.forEach((o) => addSource(`${prefix}.${o.id}`, STEP.people, o.en, o.g));
    // Innate traits come from the people you were born to…
    if (useFamily) {
      add('fam.i', fam.innate);
      fam.picks.filter((pg) => pg.id.startsWith('innate')).forEach((pg) => addPick(`fam.p.${pg.id}`, STEP.people, pg));
    }
    add('ppl.i', people.innate);
    people.picks.filter((pg) => pg.id.startsWith('innate')).forEach((pg) => addPick(`ppl.p.${pg.id}`, STEP.people, pg));
    // …cultural traits from the people that raised you (usually the same).
    const cs = cultureSrc ?? people;
    const cfam = c.families[cs.family];
    add('fam.c', cfam.culture);
    cfam.picks.filter((pg) => !pg.id.startsWith('innate')).forEach((pg) => addPick(`fam.p.${pg.id}`, STEP.people, pg));
    add('ppl.c', cs.culture);
    cs.picks.filter((pg) => !pg.id.startsWith('innate')).forEach((pg) => addPick(`ppl.p.${pg.id}`, STEP.people, pg));
    // Language: if it's the homeland's majority language you get 1 free unit instead.
    const homeSpoken = spokenFrom(sources.filter((s) => s.key === 'hl'));
    const langSrc = addSource('ppl.lang', STEP.people, `${cs.en}: language`, `tal:${cs.language}`);
    const pl = langSrc.effects.find((e) => e.k === 'tal');
    if (pl && pl.k === 'tal' && homeSpoken.includes(pl.name)) {
      langSrc.label = `${cs.en}: same language as the homeland, 1 free unit instead`;
      langSrc.effects = [{ k: 'group', pool: 'valfri', n: 1 }];
    }
    // Borrowed traits ("integrated", "missla-friends"): one option from another people's list.
    const borrowed = new Set<string>();
    for (let pass = 0; pass < 3; pass++) {
      for (const e of sources.flatMap((s) => s.effects)) {
        if (e.k !== 'lana' || borrowed.has(e.key)) continue;
        borrowed.add(e.key);
        const lenders = c.peoples.filter((p) => e.people.includes(p.id) || e.people.includes(p.family));
        const options: Opt[] = lenders.flatMap((p) =>
          p.picks.filter((pg) => pg.id === 'val').flatMap((pg) => pg.options.filter((o) => !o.g.includes('lana:')).map((o) => ({ ...o, id: `${p.id}.${o.id}`, en: `${p.en}: ${o.en}` }))),
        );
        addPick(`${e.key}.lana`, STEP.people, { id: 'lana', sv: 'Lånad egenskap', en: 'Borrowed trait', pick: 1, options });
      }
    }
    const religious = sources.some((s) => s.effects.some((e) => e.k === 'flagga' && e.name === 'religios'));
    godless = [...cfam.culture, ...cs.culture].some((o) => o.id === 'gudlos') && !religious;
  } else pending.push({ k: 'option', key: 'people', step: STEP.people, label: 'Choose a people', options: [] });

  // Forced religion (from traits chosen so far).
  const forced = sources.flatMap((s) => s.effects).filter((e): e is Extract<Effect, { k: 'religion' }> => e.k === 'religion');
  const forcedReligion = forced.length ? forced[forced.length - 1].ids : undefined;

  // 4 — Religion
  const religion = c.religions.find((r) => r.id === state.religion);
  if (religion && !godless) {
    if (forcedReligion && !forcedReligion.includes(religion.id) && !forcedReligion.includes(religion.parent ?? '')) {
      warnings.push({ step: STEP.religion, text: `A trait you chose requires ${forcedReligion.map((id) => c.religions.find((r) => r.id === id)?.en ?? id).join(' or ')}.` });
    }
    addSource('rel', STEP.religion, religion.en, '');
  } else if (!religion && !godless) pending.push({ k: 'option', key: 'religion', step: STEP.religion, label: 'Choose a religion', options: [] });

  // 5 — Archetype and environment
  if (archetype) {
    addSource('arch', STEP.archetype, archetype.en, archetype.g);
    addPick('arch.x', STEP.archetype, archetype.extras);
  } else pending.push({ k: 'option', key: 'archetype', step: STEP.archetype, label: 'Choose an archetype', options: [] });
  if (environment) {
    addSource('env', STEP.environment, environment.en, environment.g);
    addPick('env.x', STEP.environment, environment.extras);
  } else pending.push({ k: 'option', key: 'environment', step: STEP.environment, label: 'Choose an environment', options: [] });

  // Doctrines come after archetype so extra doctrine grants from anywhere count.
  if (religion && !godless) {
    let extra = sources.flatMap((s) => s.effects).reduce((n, e) => (e.k === 'doktrin' ? n + e.n : n), 0);
    const doctrineOpts = (r: Religion): Opt[] =>
      r.doctrines.flatMap((d, di) => d.options.map((o, oi) => ({ ...o, id: `${r.id}.${di}.${oi}`, en: `${r.en} · ${d.en}: ${o.en || describe(o.g, c)}` })));
    for (const e of sources.flatMap((s) => s.effects)) {
      if (e.k !== 'doktrinx') continue;
      const own = [religion.id, religion.parent ?? ''];
      const others = c.religions.filter((r) => (e.religions.includes('valfri') || e.religions.includes(r.id)) && !own.includes(r.id));
      // Only your own religion listed (dwarves and the Vontar faith): it's just another doctrine pick.
      if (!others.length || (e.religions.length === 1 && own.includes(e.religions[0]))) extra += e.n;
      else addPick(`${e.key}.dx`, STEP.religion, { id: 'dx', sv: 'Doktriner', en: 'Doctrines from another faith', pick: e.n, options: others.flatMap(doctrineOpts) });
    }
    const group: PickGroup = {
      id: 'doctrines',
      sv: 'Doktriner',
      en: 'Doctrines',
      pick: 2 + extra,
      options: religion.doctrines.flatMap((d, di) => d.options.map((o, oi) => ({ ...o, id: `${di}.${oi}`, en: `${d.en}: ${o.en || describe(o.g, c)}` }))),
    };
    addPick('rel.d', STEP.religion, group);
  }

  // 6 — Event tables. Slots come from every roll effect, including the results' own.
  const seen = new Set<string>();
  const queue = (): Effect[] => sources.flatMap((s) => s.effects).filter((e) => e.k === 'roll' && !seen.has(e.slot));
  let guard = 0;
  for (let next = queue(); next.length && guard < 200; next = queue(), guard++) {
    for (const e of next) {
      if (e.k !== 'roll') continue;
      seen.add(e.slot);
      const from = sources.find((s) => s.effects.includes(e))?.label ?? '';
      const declared = e.table;
      const struck = state.choices[`strike:${e.slot}`] === 1;
      let table: TableId | undefined = declared === 'valfri' ? undefined : declared;
      if (declared === 'valfri') {
        const v = state.choices[`${e.slot}.t`];
        if (typeof v === 'string' && c.tables[v as TableId]) table = v as TableId;
        else if (!struck) pending.push({ k: 'table', key: `${e.slot}.t`, step: STEP.events, label: `Roll from ${from}` });
      }
      const rec = state.rolls[e.slot];
      const slot: Slot = { key: e.slot, from, table, rec: rec && rec.table === table ? rec : undefined, results: [], needsRoll: !!table && !struck, struck };
      if (struck) {
        slots.push(slot);
        continue;
      }
      const t = table ? c.tables[baseTable(table)] : undefined;
      if (slot.rec && table) {
        for (const v of slot.rec.values) {
          const entry = t?.entries.find((x) => v >= x.lo && v <= x.hi);
          if (!entry) break;
          slot.results.push(entry);
          const idx = slot.results.length - 1;
          // Friends & Foes: the person's skills, just the person, or a circle named after them.
          const g = table === 'vfn' ? '' : table === 'vfk' ? `krets:${entry.en}` : entry.g;
          addSource(`${e.slot}:${idx}`, STEP.events, `${t?.en ?? table} ${v}: ${entry.en}`, g);
          if (!entry.again) break;
        }
        const last = slot.results[slot.results.length - 1];
        slot.needsRoll = !last || !!last.again;
      }
      if (slot.needsRoll && table) pending.push({ k: 'roll', key: e.slot, step: STEP.events, label: `${t?.en ?? table} (from ${from})`, table });
      slots.push(slot);
    }
  }

  // ——— Totals ———
  const all = sources.flatMap((s) => s.effects.map((e) => ({ e, s })));
  const sum = (k: Effect['k'], f: (e: Effect) => number = (e) => ('n' in e ? (e as { n: number }).n : 1)) =>
    all.filter((x) => x.e.k === k).reduce((n, x) => n + f(x.e), 0);
  // Attuned by a mystic archetype or an attuning trait: Sensing starts at base 1.
  const attunedByTrait = all.some((x) => x.e.k === 'omstopt') || !!archetype?.mystic;
  let attuned = attunedByTrait;

  const toStrike = sum('stryk');
  const struckN = slots.filter((s) => s.struck).length;
  if (struckN < toStrike) warnings.push({ step: STEP.events, text: `Give up ${toStrike - struckN} more event roll${toStrike - struckN === 1 ? '' : 's'} (tap "give up" on a roll).` });
  if (struckN > toStrike) warnings.push({ step: STEP.events, text: `You gave up ${struckN - toStrike} roll${struckN - toStrike === 1 ? '' : 's'} too many.` });
  const baseOverride = new Map<string, number>();
  for (const { e } of all) if (e.k === 'grund') baseOverride.set(e.skill, e.n);

  // Attributes
  const fam = people ? c.families[people.family] : undefined;
  const baseAttrs = people?.attrs ?? fam?.attrs ?? [8, 8, 8, 8, 8, 8, 8, 8];
  const extraPoints = sum('apoang');
  const modelPoints = state.attrModel === 'fria' ? 40 : 40;
  const attrPoints = { total: modelPoints + extraPoints, spent: 0, extra: extraPoints };
  const attrs = ATTRS.map((attr, i) => {
    const mods = all.filter((x) => x.e.k === 'attr' && x.e.attr === attr).reduce((n, x) => n + (x.e as { n: number }).n, 0);
    let points = state.attrExtra[attr] ?? 0;
    if (state.attrModel && state.attrModel !== 'fria') {
      const li = state.attrLump[attr];
      if (li !== undefined) points += POINT_MODELS[state.attrModel][li] ?? 0;
    }
    attrPoints.spent += points;
    const value = baseAttrs[i] + mods + points;
    return { attr, base: baseAttrs[i], mods, points, value, dice: attrDice(value) };
  });
  if (state.attrModel) {
    for (const a of attrs) {
      if (a.points > MAX_POINTS_PER_ATTR) warnings.push({ step: STEP.attributes, text: `At most ${MAX_POINTS_PER_ATTR} points on ${ATTR_EN[a.attr]}.` });
      if (a.value < MIN_ATTR) warnings.push({ step: STEP.attributes, text: `${ATTR_EN[a.attr]} must end at ${MIN_ATTR} or more.` });
    }
  }
  const attrOf = (a: Attr) => attrs.find((x) => x.attr === a)!.value;
  const wisdom = wisdomRow(attrOf('Visdom'));

  // Skills
  const talents = new Map<string, number>();
  const incomp = new Map<string, number>();
  const blocked = new Set<string>();
  for (const { e } of all) {
    if (e.k === 'talang') talents.set(e.skill, (talents.get(e.skill) ?? 0) + 1);
    if (e.k === 'inkomp') incomp.set(e.skill, (incomp.get(e.skill) ?? 0) + 1);
    if (e.k === 'block') blocked.add(e.skill);
  }
  for (const id of state.wisdomIncomp) incomp.set(id, (incomp.get(id) ?? 0) + 1);

  const pools = new Map<string, number>();
  const addPool = (p: string, n: number) => pools.set(p, (pools.get(p) ?? 0) + n);
  for (const { e } of all) if (e.k === 'group') addPool(e.pool, e.n);
  if (wisdom.extraUnits) addPool('kunskap', wisdom.extraUnits);
  if (wisdom.expertise) addPool('E', wisdom.expertise);
  // The hardening crosses "to spread freely" are their own little pool.
  const numbFree = all.filter((x) => x.e.k === 'numb' && x.e.cat === 'valfri').reduce((n, x) => n + (x.e as { n: number }).n, 0);
  if (numbFree) addPool('avtr', numbFree);

  const specific = new Map<string, number>();
  for (const { e } of all) if (e.k === 'skill') specific.set(e.skill, (specific.get(e.skill) ?? 0) + e.n);
  for (const [id, n] of talents) if (n >= 2) specific.set(id, (specific.get(id) ?? 0) + 2 * (n - 1));

  // Spending from pools.
  const spentTo = new Map<string, number>();
  const poolRows: PoolRow[] = [];
  for (const [pool, targets] of Object.entries(state.alloc)) {
    let spent = 0;
    for (const [target, n] of Object.entries(targets)) {
      if (!n) continue;
      if (pool !== 'avtr' && !poolAllows(pool, target, c.skill)) {
        warnings.push({ step: STEP.skills, text: `${POOL_EN[pool] ?? pool} units can't be spent on ${c.skill(target)?.en ?? target}.` });
        continue;
      }
      spent += n;
      spentTo.set(target, (spentTo.get(target) ?? 0) + n);
    }
    void spent;
  }

  const baseOf = (id: string, def: SkillInfo): number => {
    if (id === 'Förnimma') return attunedByTrait ? 1 : 0;
    const o = baseOverride.get(id);
    if (o !== undefined) return o;
    if (def.group === 'kunskap') {
      if (wisdom.base1 === 'all' || state.wisdomBase.includes(id)) return 1;
      return 0;
    }
    return def.base;
  };

  // Spending even one unit on Sensing attunes you (the unit becomes the base 1).
  if (!attuned && ((specific.get('Förnimma') ?? 0) > 0 || (spentTo.get('Förnimma') ?? 0) > 0)) attuned = true;

  const ids = new Set<string>([...c.skills.map((s) => s.id), ...specific.keys(), ...[...spentTo.keys()].filter((t) => !t.startsWith('avtr:') && t !== 'sprak' && t !== 'mysterier'), ...talents.keys(), ...incomp.keys(), ...blocked]);
  let overflow = 0;
  const skills: SkillRow[] = [];
  for (const id of ids) {
    const def = c.skill(id);
    if (!def) {
      warnings.push({ step: STEP.skills, text: `Unknown skill ${id}.` });
      continue;
    }
    const inc = (incomp.get(id) ?? 0) > 0 && (talents.get(id) ?? 0) === 0;
    const tal = (talents.get(id) ?? 0) > 0 && (incomp.get(id) ?? 0) === 0;
    const doubleInc = (incomp.get(id) ?? 0) >= 2;
    let base = baseOf(id, def);
    let spec = specific.get(id) ?? 0;
    let bought = spentTo.get(id) ?? 0;
    if (id === 'Förnimma' && base === 0 && spec + bought > 0) {
      // The first unit is replaced by the base value 1.
      base = 1;
      if (spec > 0) spec -= 1;
      else bought -= 1;
    }
    const cap = Math.max(base, doubleInc ? base : inc ? 1 : SKILL_MAX);
    let units = spec;
    if (base + units > cap) {
      overflow += base + units - cap;
      units = cap - base;
    }
    if (base + units + bought > cap) warnings.push({ step: STEP.skills, text: `${def.en} can't go above ${cap}.` });
    units += bought;
    const value = Math.min(cap, base + units);
    if (needsAttunementInfo(def) && value > 0 && !attuned) warnings.push({ step: STEP.skills, text: `${def.en} needs you to be attuned.` });
    if (value === 0 && !tal && !inc && !blocked.has(id) && !c.skills.some((s) => s.id === id)) continue;
    skills.push({ id, en: def.en, group: def.group, base, units, value, dice: skillDice(value), talent: tal, incompetent: inc, blocked: blocked.has(id) });
  }
  if (overflow) addPool('valfri', overflow);

  for (const [pool, total] of pools) {
    const spent = Object.values(state.alloc[pool] ?? {}).reduce((a, b) => a + (b || 0), 0);
    poolRows.push({ pool, total, spent });
    if (spent > total) warnings.push({ step: STEP.skills, text: `Too many ${POOL_EN[pool] ?? pool} units spent (${spent}/${total}).` });
  }
  for (const pool of Object.keys(state.alloc)) if (!pools.has(pool) && Object.values(state.alloc[pool]).some((n) => n > 0)) warnings.push({ step: STEP.skills, text: `No ${POOL_EN[pool] ?? pool} units to spend.` });

  // Knowledge from Wisdom.
  if (typeof wisdom.base1 === 'number' && state.wisdomBase.length > wisdom.base1) warnings.push({ step: STEP.skills, text: `Wisdom allows ${wisdom.base1} knowledge skills at base 1.` });
  if (typeof wisdom.incompetent === 'number' && state.wisdomIncomp.length < wisdom.incompetent) warnings.push({ step: STEP.skills, text: `Low Wisdom: mark ${wisdom.incompetent} knowledge skills incompetent.` });

  // Hardening.
  const numb = { utsatthet: 0, vald: 0, overnaturligt: 0 };
  for (const { e } of all) if (e.k === 'numb' && e.cat !== 'valfri') numb[e.cat] += e.n;
  for (const cat of NUMB_CATS) numb[cat] += (spentTo.get(`avtr:${cat}`) ?? 0) + (state.alloc.avtr?.[cat] ?? 0);

  // Languages.
  const spoken = spokenFrom(sources);
  const written = all.filter((x) => x.e.k === 'skrift').map((x) => (x.e as { name: string }).name);
  const boughtLangs = spentTo.get('sprak') ?? 0;
  const languages = { spoken: [...new Set(spoken)], written: [...new Set(written)], picks: sum('sprak') + boughtLangs, boughtWithUnits: boughtLangs };

  const list = <K extends Effect['k']>(k: K) => all.filter((x) => x.e.k === k).map((x) => x.e as Extract<Effect, { k: K }>);
  const derivedMods = list('derived');
  const physique = attrOf('Kroppsbyggnad');
  const dmg = baseDamage(physique);
  const dmgMod = derivedMods.filter((d) => d.stat === 'grundskada').reduce((n, d) => n + d.n, 0);

  const derived: Derived = {
    sources,
    pending,
    picks,
    slots,
    homeland,
    background,
    people,
    religion: godless ? undefined : religion,
    archetype,
    environment,
    godless,
    forcedReligion,
    attuned,
    attrs,
    attrPoints,
    wisdom,
    derived: {
      armour: baseArmour(physique) + derivedMods.filter((d) => d.stat === 'grundrustning').reduce((n, d) => n + d.n, 0),
      damage: { n: dmg.n, mod: dmg.mod + dmgMod },
      healing: 1 + derivedMods.filter((d) => d.stat === 'lakningstakt').reduce((n, d) => n + d.n, 0),
    },
    skills,
    pools: poolRows,
    numb,
    numbFree,
    languages,
    circles: list('krets').map((e) => ({ key: e.key, name: e.name })),
    companions: list('foljeslagare').map((e) => ({ key: e.key, kind: e.kind })),
    weapons: list('vapen').map((e) => ({ key: e.key, rarity: e.rarity })),
    armour: list('rustning').map((e) => ({ key: e.key, rarity: e.rarity })),
    packages: list('paket').map((e) => ({ key: e.key, name: e.name })),
    mysticGear: list('mystikutr').map((e) => ({ key: e.key })),
    silver: sum('silver'),
    mysteries: {
      n: list('mysterier').filter((m) => m.learned).reduce((n, m) => n + m.n, 0),
      unlearned: list('mysterier').filter((m) => !m.learned).reduce((n, m) => n + m.n, 0),
      bought: spentTo.get('mysterier') ?? 0,
    },
    rules: all.filter((x) => x.e.k === 'regel').map((x) => ({ text: (x.e as { text: string }).text, from: x.s.label })),
    items: all.filter((x) => x.e.k === 'foremal').map((x) => ({ text: (x.e as { text: string }).text, from: x.s.label })),
    extraDoctrines: sum('doktrin'),
    warnings,
    openByStep: [],
  };
  derived.openByStep = STEPS.map((_, i) => pending.filter((p) => p.step === i).length + warnings.filter((w) => w.step === i).length);
  return derived;
}

/** The real table behind a table id (the Friends & Foes variants share one). */
export function baseTable(t: TableId): TableId {
  return t === 'vfn' || t === 'vfk' ? 'vf' : t;
}

/** Tables that are rolled twice, keeping one of the two. */
export function rollsTwice(t: TableId | undefined): boolean {
  return t === 'vf' || t === 'vfn' || t === 'vfk';
}

function needsAttunementInfo(def: SkillInfo): boolean {
  return def.group === 'mystik' && def.id !== 'Ceremoni';
}

function spokenFrom(sources: SourceRec[]): string[] {
  return sources.flatMap((s) => s.effects).filter((e): e is Extract<Effect, { k: 'tal' }> => e.k === 'tal').map((e) => e.name);
}

// ——— Describing grants in English ———

const TABLE_EN: Record<TableId, string> = {
  fa: 'Travels & Adventures',
  ii: 'Intrigues & Misdeeds',
  mu: 'Miracles & Revelations',
  sd: 'Battles & Skirmishes',
  sl: 'Studies & Learning',
  th: 'Sorcery & Witchcraft',
  vf: 'Friends & Foes',
  vfn: 'Friends & Foes',
  vfk: 'Friends & Foes (as a circle)',
  valfri: 'any table',
};
export const POOL_EN: Record<string, string> = {
  kunskap: 'Knowledge',
  mystik: 'Mystic',
  rorelse: 'Movement',
  social: 'Social',
  strid: 'Combat',
  vildmark: 'Wilderness',
  E: 'Expertise',
  F: 'Ability',
  H: 'Craft',
  K: 'Mark',
  valfri: 'Free',
  avtr: 'Free hardening',
};
export const ATTR_EN: Record<Attr, string> = {
  Förflyttning: 'Speed',
  Intryck: 'Presence',
  Kroppsbyggnad: 'Physique',
  Livskraft: 'Vitality',
  Reaktion: 'Reaction',
  Självkontroll: 'Composure',
  Vaksamhet: 'Alertness',
  Visdom: 'Wisdom',
};
export const NUMB_EN: Record<NumbCat, string> = { utsatthet: 'Hardship', vald: 'Violence', overnaturligt: 'Supernatural', valfri: 'any' };
export const RARITY_EN: Record<Rarity, string> = { vanlig: 'common', ovanlig: 'uncommon', sallsynt: 'rare' };
export { TABLE_EN };

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

export function describeToken(t: Token, c: Pick<Content, 'skill'>): string {
  const sk = (ids: string[]) => ids.map((x) => c.skill(x)?.en ?? x.replace(/^[EFHK]:/, '')).join(' or ');
  switch (t.k) {
    case 'skill':
      return `${sk(t.skill)} (${t.n})`;
    case 'named':
      return `${t.kind === 'Aspekt' ? 'an aspect of your choice' : `a ${POOL_EN[t.kind].toLowerCase()} of your choice`} (${t.n})`;
    case 'group':
      return `${t.group.map((g) => POOL_EN[g]).join(' or ')} units (${t.n})`;
    case 'roll':
      return `${t.n} roll${t.n === 1 ? '' : 's'} on ${TABLE_EN[t.table]}`;
    case 'attr':
      return `${t.attr.map((a) => ATTR_EN[a]).join(' or ')} ${sign(t.n)}`;
    case 'apoang':
      return `${sign(t.n)} attribute points`;
    case 'sprak':
      return `${t.n} language${t.n === 1 ? '' : 's'}`;
    case 'tal':
      return `speaks ${t.name.split('/').join(' or ')}`;
    case 'skrift':
      return `writes ${t.name.split('/').join(' or ')}`;
    case 'numb':
      return `${t.n} hardening (${t.cat.map((x) => NUMB_EN[x]).join(' or ')})`;
    case 'talang':
      return `talent in ${sk(t.skill)}`;
    case 'inkomp':
      return `incompetent in ${sk(t.skill)}`;
    case 'block':
      return `blocked in ${sk(t.skill)}`;
    case 'omstopt':
      return 'attuned';
    case 'krets':
      return t.name === '?' ? 'a circle' : `circle: ${t.name}`;
    case 'foljeslagare':
      return `companion (${t.kind})`;
    case 'vapen':
      return `${t.n} ${RARITY_EN[t.rarity]} weapon${t.n === 1 ? '' : 's'}`;
    case 'rustning':
      return `${t.n} ${RARITY_EN[t.rarity]} armour`;
    case 'paket':
      return t.name === '?' ? `${t.n} equipment package${t.n === 1 ? '' : 's'}` : `equipment: ${t.name}`;
    case 'mystikutr':
      return `${t.n} set${t.n === 1 ? '' : 's'} of mystic equipment`;
    case 'silver':
      return `${t.n} silver`;
    case 'mysterier':
      return `${t.n} myster${t.n === 1 ? 'y' : 'ies'}${t.learned ? '' : ' (not yet learned)'}`;
    case 'religion':
      return `religion must be ${t.ids.join(' or ')}`;
    case 'doktrin':
      return `${t.n} extra doctrine${t.n === 1 ? '' : 's'}`;
    case 'derived':
      return `${{ grundrustning: 'Base armour', grundskada: 'Base damage', lakningstakt: 'Healing rate' }[t.stat]} ${sign(t.n)}`;
    case 'regel':
      return t.text;
    case 'foremal':
      return t.text;
    case 'lana':
      return `a trait borrowed from ${t.people.map((p) => (p === 'manniska' ? 'a human people' : p)).join(' or ')}`;
    case 'doktrinx':
      return `${t.n} doctrine${t.n === 1 ? '' : 's'} from ${t.religions.includes('valfri') ? 'another religion' : t.religions.join('/')}`;
    case 'stryk':
      return `give up ${t.n} event roll${t.n === 1 ? '' : 's'}`;
    case 'flagga':
      return { vapenhojning: 'weapon picks one rarity higher', religios: 'not godless: choose a religion' }[t.name] ?? t.name;
    case 'grund':
      return `${sk([t.skill])} has base value ${t.n}`;
  }
}

export function describeTokens(ts: Token[], c: Pick<Content, 'skill'>): string {
  return ts.map((t) => describeToken(t, c)).join(', ');
}

export function describe(g: string, c: Pick<Content, 'skill'>): string {
  return parseGrants(g)
    .map((it) => (it.k === 'token' ? describeToken(it.token, c) : `one of: ${it.options.map((o) => o.label ?? describeTokens(o.tokens, c)).join(' / ')}`))
    .join(', ');
}
