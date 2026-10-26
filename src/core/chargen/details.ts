/** Name & details: reading the free-text fields and checking them against what is typical for the people. */

export interface Body {
  /** Typical [height cm, weight kg] for women and men. */
  f: [number, number];
  m: [number, number];
  age?: { min: number; typical: readonly [number, number]; max: number };
}

export interface DetailCheck {
  field: 'name' | 'age' | 'height' | 'weight';
  text: string;
}

/** How far from typical still counts as plausible. */
export const HEIGHT_SPREAD = 0.12;
export const WEIGHT_SPREAD = 0.35;

/** "woman", "female", "kvinna" → f; "man", "male" → m; anything else (non-binary, blank) → in between. */
export function genderKey(g: string): 'f' | 'm' | undefined {
  const s = g.trim().toLowerCase();
  if (/^(f|w|k)|wom|fem|kvin|girl|lady|^she|^hon/.test(s)) return 'f';
  if (/^m|male|\bman\b|boy|^he\b|^han\b/.test(s)) return 'm';
  return undefined;
}

/** Typical [height, weight] for the character's gender (average of both when not given). */
export function typical(body: Body, gender: string): [number, number] {
  const k = genderKey(gender);
  if (k) return body[k];
  return [Math.round((body.f[0] + body.m[0]) / 2), Math.round((body.f[1] + body.m[1]) / 2)];
}

/** Plausible [min, max] around a typical value. */
export function span(v: number, spread: number): [number, number] {
  return [Math.round(v * (1 - spread)), Math.round(v * (1 + spread))];
}

/** A number from free text: "172", "172 cm", "1.72 m" (→ 172), "65kg". NaN if none. */
export function readNumber(text: string, metresToCm = false): number {
  const m = /(\d+(?:[.,]\d+)?)/.exec(text);
  if (!m) return NaN;
  const v = Number(m[1].replace(',', '.'));
  return metresToCm && v < 3 ? Math.round(v * 100) : v;
}

export function checkDetails(d: { name: string; age: string; gender: string; height: string; weight: string }, body: Body | undefined): DetailCheck[] {
  const out: DetailCheck[] = [];
  if (!d.name.trim()) out.push({ field: 'name', text: 'Your character needs a name.' });
  const num = (field: DetailCheck['field'], text: string, unit: string, lo: number, hi: number, metres = false) => {
    if (!text.trim()) return;
    const v = readNumber(text, metres);
    if (Number.isNaN(v)) out.push({ field, text: `${cap(field)} should be a number${unit ? ` (${unit})` : ''}.` });
    else if (v < lo || v > hi) out.push({ field, text: `${cap(field)} ${v}${unit ? ` ${unit}` : ''} is far from usual for your people (about ${lo}–${hi}${unit ? ` ${unit}` : ''}). Fine if it's on purpose; check with your game master.` });
  };
  if (body?.age) num('age', d.age, '', body.age.min, body.age.max);
  else num('age', d.age, '', 1, 2000);
  if (body) {
    const [h, w] = typical(body, d.gender);
    // Without a gender, allow the whole span of both.
    const hs = genderKey(d.gender) ? span(h, HEIGHT_SPREAD) : [span(Math.min(body.f[0], body.m[0]), HEIGHT_SPREAD)[0], span(Math.max(body.f[0], body.m[0]), HEIGHT_SPREAD)[1]];
    const ws = genderKey(d.gender) ? span(w, WEIGHT_SPREAD) : [span(Math.min(body.f[1], body.m[1]), WEIGHT_SPREAD)[0], span(Math.max(body.f[1], body.m[1]), WEIGHT_SPREAD)[1]];
    num('height', d.height, 'cm', hs[0], hs[1], true);
    num('weight', d.weight, 'kg', ws[0], ws[1]);
  }
  return out;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
