/**
 * Grant mini-language. Every bracketed reward in the rulebook ("[Berättarkonst (2),
 * Charm (2) och Simma (2).]") is written in the data as one compact line:
 *
 *   "Berättarkonst 2; Charm 2; Simma 2"
 *
 * Grammar
 *   grants  := item (';' item)*
 *   item    := 'välj(' option ('|' option)* ')'   -> the player picks one option
 *            | token
 *   option  := [label '::'] token (',' token)*     (',' because skill names contain '&')
 *
 * Tokens (N may be negative where it makes sense; A/B means "pick one of"):
 *   <Skill> N            units in a skill, e.g. "Jakt & fiske 2", "E:Förskingra 4", "Aspekt? 2"
 *   E:? N  F:? N  H:? N  K:? N   units in a specialist skill the player names
 *   grp:<g>[/<g>] N      units in a skill group (kunskap mystik rorelse social strid vildmark E F H K)
 *   valfri N             free units
 *   slag:<t> N           event-table rolls (fa ii mu sd sl th vf valfri)
 *   attr:<A> N           attribute modifier (Förflyttning Intryck Kroppsbyggnad Livskraft
 *                        Reaktion Självkontroll Vaksamhet Visdom; A/B = pick one)
 *   apoang N             extra attribute points
 *   sprak N              free language picks;  tal:<name>  skrift:<name>  (a spoken/written language)
 *   avtr:<c> N           hardening crosses (utsatthet vald overnaturligt valfri)
 *   talang:<skill>[/..]  talent;  inkomp:<skill>[/..]  incompetence;  block:<skill>
 *   omstopt              becomes attuned (base 1 in Förnimma)
 *   krets:<name|?>       a circle;  foljeslagare:<kind>  a companion
 *   vapen:<r> N  rustning:<r> N   weapon/armour picks of rarity vanlig/ovanlig/sallsynt
 *   paket:<name|?> N     equipment packages;  mystikutr N  mystic equipment sets
 *   silver N             silver;  mysterier N  mysteries (not yet learned unless 'lärda')
 *   religion:<id>[/id]   the religion is forced;  doktrin N  extra doctrine picks
 *   grundrustning N  grundskada N  lakningstakt N   derived modifiers
 *   regel:<text>         a rule note for the sheet (our own wording, English)
 *   foremal:<text>       an item
 *   lana:<people>        take one optional trait from another people's list
 *   doktrinx:<rel>[/..] N  N doctrines from other religions ('valfri' = any)
 *   stryk N              give up N event-table rolls
 *   flagga:<name>        a special mechanic: vapenhojning (weapon picks one rarity higher),
 *                        religios (an elf who is not godless)
 *   grund:<skill> N      the skill's base value becomes N
 */

export const TABLES = ['fa', 'ii', 'mu', 'sd', 'sl', 'th', 'vf', 'valfri'] as const;
export type TableId = (typeof TABLES)[number];
export const ATTRS = ['Förflyttning', 'Intryck', 'Kroppsbyggnad', 'Livskraft', 'Reaktion', 'Självkontroll', 'Vaksamhet', 'Visdom'] as const;
export type Attr = (typeof ATTRS)[number];
export const GROUPS = ['kunskap', 'mystik', 'rorelse', 'social', 'strid', 'vildmark', 'E', 'F', 'H', 'K', 'valfri'] as const;
export type Pool = (typeof GROUPS)[number];
export const NUMB = ['utsatthet', 'vald', 'overnaturligt', 'valfri'] as const;
export type NumbCat = (typeof NUMB)[number];
export const RARITY = ['vanlig', 'ovanlig', 'sallsynt'] as const;
export type Rarity = (typeof RARITY)[number];

export type Token =
  | { k: 'skill'; skill: string[]; n: number }
  | { k: 'named'; kind: 'E' | 'F' | 'H' | 'K' | 'Aspekt'; n: number }
  | { k: 'group'; group: Pool[]; n: number }
  | { k: 'roll'; table: TableId; n: number }
  | { k: 'attr'; attr: Attr[]; n: number }
  | { k: 'apoang'; n: number }
  | { k: 'sprak'; n: number }
  | { k: 'tal'; name: string }
  | { k: 'skrift'; name: string }
  | { k: 'numb'; cat: NumbCat[]; n: number }
  | { k: 'talang' | 'inkomp' | 'block'; skill: string[] }
  | { k: 'omstopt' }
  | { k: 'krets'; name: string }
  | { k: 'foljeslagare'; kind: string }
  | { k: 'vapen' | 'rustning'; rarity: Rarity; n: number }
  | { k: 'paket'; name: string; n: number }
  | { k: 'mystikutr'; n: number }
  | { k: 'silver'; n: number }
  | { k: 'mysterier'; n: number; learned: boolean }
  | { k: 'religion'; ids: string[] }
  | { k: 'doktrin'; n: number }
  | { k: 'derived'; stat: 'grundrustning' | 'grundskada' | 'lakningstakt'; n: number }
  | { k: 'regel'; text: string }
  | { k: 'foremal'; text: string }
  /** Take one optional trait from another people's list. */
  | { k: 'lana'; people: string[] }
  /** Extra doctrine picks from other religions (the chosen one excluded). */
  | { k: 'doktrinx'; religions: string[]; n: number }
  /** Give up N event-table rolls. */
  | { k: 'stryk'; n: number }
  /** A named special mechanic the UI knows about. */
  | { k: 'flagga'; name: string }
  /** Override a skill's base value. */
  | { k: 'grund'; skill: string; n: number };

export interface Option {
  label?: string;
  tokens: Token[];
}
export type Item = { k: 'token'; token: Token } | { k: 'choice'; options: Option[] };

export class GrantError extends Error {}

function num(s: string, src: string): number {
  const n = Number(s.replace('−', '-').replace('+', ''));
  if (!Number.isFinite(n)) throw new GrantError(`Bad number "${s}" in "${src}"`);
  return n;
}

function oneOf<T extends string>(list: readonly T[], v: string, src: string): T {
  if (!(list as readonly string[]).includes(v)) throw new GrantError(`Unknown "${v}" in "${src}" (expected ${list.join(', ')})`);
  return v as T;
}

/** Split on a separator that is not inside parentheses. */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x.length > 0);
}

export function parseToken(raw: string): Token {
  const s = raw.trim();
  const colon = s.indexOf(':');
  const head = colon > 0 ? s.slice(0, colon) : '';
  const rest = colon > 0 ? s.slice(colon + 1).trim() : '';
  // Keyword tokens with text payloads first (their text may contain anything).
  if (head === 'regel') return { k: 'regel', text: rest };
  if (head === 'foremal') return { k: 'foremal', text: rest };
  if (head === 'krets') return { k: 'krets', name: rest || '?' };
  if (head === 'foljeslagare') return { k: 'foljeslagare', kind: rest || '?' };
  if (head === 'tal') return { k: 'tal', name: rest };
  if (head === 'skrift') return { k: 'skrift', name: rest };
  if (head === 'religion') return { k: 'religion', ids: rest.split('/') };
  if (head === 'talang' || head === 'inkomp' || head === 'block') return { k: head, skill: rest.split('/') };
  if (s === 'omstopt') return { k: 'omstopt' };
  if (head === 'lana') return { k: 'lana', people: rest.split('/') };
  if (head === 'flagga') return { k: 'flagga', name: rest };

  const m = /^(.*?)\s+([+\-−]?\d+)$/.exec(s);
  if (!m) throw new GrantError(`Can't read "${s}"`);
  const body = m[1].trim();
  const n = num(m[2], s);
  const bcolon = body.indexOf(':');
  const bh = bcolon > 0 ? body.slice(0, bcolon) : body;
  const br = bcolon > 0 ? body.slice(bcolon + 1) : '';
  switch (bh) {
    case 'valfri':
      return { k: 'group', group: ['valfri'], n };
    case 'grp':
      return { k: 'group', group: br.split('/').map((g) => oneOf(GROUPS, g, s)), n };
    case 'slag':
      return { k: 'roll', table: oneOf(TABLES, br, s), n };
    case 'attr':
      return { k: 'attr', attr: br.split('/').map((a) => oneOf(ATTRS, a, s)), n };
    case 'apoang':
      return { k: 'apoang', n };
    case 'sprak':
      return { k: 'sprak', n };
    case 'avtr':
      return { k: 'numb', cat: br.split('/').map((c) => oneOf(NUMB, c, s)), n };
    case 'vapen':
    case 'rustning':
      return { k: bh, rarity: oneOf(RARITY, br, s), n };
    case 'paket':
      return { k: 'paket', name: br || '?', n };
    case 'mystikutr':
      return { k: 'mystikutr', n };
    case 'silver':
      return { k: 'silver', n };
    case 'mysterier':
      return { k: 'mysterier', n, learned: br === 'lärda' };
    case 'doktrin':
      return { k: 'doktrin', n };
    case 'doktrinx':
      return { k: 'doktrinx', religions: br.split('/'), n };
    case 'stryk':
      return { k: 'stryk', n };
    case 'grund':
      return { k: 'grund', skill: br, n };
    case 'grundrustning':
    case 'grundskada':
    case 'lakningstakt':
      return { k: 'derived', stat: bh, n };
  }
  if (body === 'Aspekt?') return { k: 'named', kind: 'Aspekt', n };
  const named = /^([EFHK]):\?$/.exec(body);
  if (named) return { k: 'named', kind: named[1] as 'E', n };
  return { k: 'skill', skill: body.split('/').map((x) => x.trim()), n };
}

/** Rule and item texts may contain ';' — glue pieces that aren't tokens back onto them. */
function splitItems(src: string): string[] {
  const out: string[] = [];
  for (const part of splitTop(src, ';')) {
    const prev = out[out.length - 1];
    if (prev && /^(regel|foremal):/.test(prev) && !/^välj\(/.test(part)) {
      try {
        parseToken(part);
      } catch {
        out[out.length - 1] = `${prev}; ${part}`;
        continue;
      }
    }
    out.push(part);
  }
  return out;
}

export function parseGrants(src: string): Item[] {
  return splitItems(src).map((part): Item => {
    const vm = /^välj\((.*)\)$/s.exec(part);
    if (!vm) return { k: 'token', token: parseToken(part) };
    const options = splitTop(vm[1], '|').map((opt): Option => {
      let label: string | undefined;
      let body = opt;
      const lm = /^([^:,]+?)\s*::\s*(.*)$/s.exec(opt);
      if (lm) {
        label = lm[1].trim();
        body = lm[2];
      }
      return { label, tokens: splitTop(body, ',').map(parseToken) };
    });
    return { k: 'choice', options };
  });
}

/** Every skill id a token refers to (for validation). */
export function tokenSkills(t: Token): string[] {
  if (t.k === 'skill' || t.k === 'talang' || t.k === 'inkomp' || t.k === 'block') return t.skill;
  return [];
}
