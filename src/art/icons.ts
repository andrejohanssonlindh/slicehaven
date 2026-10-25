import { OUTLINE, P } from './palette';
import { Pix, sprite } from './pix';

/**
 * Face icons. Drawn without outlines; the outline is added automatically.
 * Keyed by face kind (see core/dice.ts FaceKind).
 */
const ICONS: Record<string, { rows: string[]; key: Record<string, string> }> = {
  attack: {
    rows: ['...a....', '...ab...', '...ab...', '...ab...', '...ab...', '...ab...', '.gggggg.', '...hh...', '...hh...', '...gg...'],
    key: { a: '#eef3f6', b: '#9aa6b4', g: '#d9a441', h: '#6b4423' },
  },
  shield: {
    rows: ['mmmmmmm', 'maabbbm', 'maabbbm', 'maabbcm', 'maabbcm', '.mabbm.', '.mabcm.', '..mbm..', '...m...'],
    key: { m: '#d0d6de', a: '#9fb6f0', b: '#5a78c0', c: '#34488a' },
  },
  heal: {
    rows: ['.aa...bb.', 'awab.bbbc', 'abbbbbbbc', 'bbbbbbbbc', '.bbbbbbc.', '..bbbbc..', '...bbc...', '....c....'],
    key: { a: '#ff9aa8', w: '#ffffff', b: '#e04a5a', c: '#a02a3a' },
  },
  move: {
    rows: ['.aaaaa...', '.abbb....', '.abbb....', '.abbb....', '.abbbb...', '.abbbbbbb', '.abbbbbbb', '.cccccccc'],
    key: { a: '#c9a06a', b: '#8a6238', c: '#4a3220' },
  },
  jump: {
    rows: ['..aaaa....', '.a....a...', 'a......a..', 'a......a..', 'a....aaaaa', 'a.....aaa.', 'a......a..'],
    key: { a: '#8fe0d0' },
  },
  range: {
    rows: ['.....hhhh', '......hhh', '.....s.hh', '....s...h', '...s.....', '..s......', 'fs.......', 'ff.......', 'f.f......'],
    key: { s: '#c9a06a', h: '#d0d6de', f: '#e04a5a' },
  },
  bleed: {
    rows: ['...b...', '...b...', '..abb..', '..abb..', '.abbbc.', 'awbbbbc', 'abbbbbc', '.bbbbc.', '..ccc..'],
    key: { a: P.danger[3], w: '#ffd0c0', b: P.danger[2], c: P.danger[1] },
  },
  poison: {
    rows: ['..kkk..', '..ggg..', '..glg..', '.gllmg.', 'glllmmg', 'gllmmmg', 'glmmmng', '.gmmng.', '..ggg..'],
    key: { k: '#7a5a38', g: '#c8d8e0', l: '#9fe070', m: '#5aa040', n: '#2f6a2a' },
  },
  rend: {
    rows: ['mmmmmmm', 'maaxbbm', 'maabxbm', 'maaxbbm', 'maxbbbm', '.maxbm.', '.maxbm.', '..mxm..', '...m...'],
    key: { m: '#d0d6de', a: '#9aa0aa', b: '#6a707c', x: P.danger[2] },
  },
  disease: {
    rows: ['..pp.....', '.pqqp....', '.pqyp.pp.', '..pp.pqqp', '.....pqyp', '..pp..pp.', '.pqqp....', '.pyqp....', '..pp.....'],
    key: { p: '#b48ad8', q: '#6a3a8a', y: '#c8d870' },
  },
  blank: {
    rows: ['a...a', '.a.a.', '..a..', '.a.a.', 'a...a'],
    key: { a: '#a89c88' },
  },
};

const iconCache = new Map<string, Pix>();

export function icon(kind: string): Pix {
  let p = iconCache.get(kind);
  if (!p) {
    const def = ICONS[kind] ?? ICONS.blank;
    p = sprite(def.rows, def.key).outlined(OUTLINE);
    iconCache.set(kind, p);
  }
  return p;
}

/** Tiny 3x5 digits (and '+'). */
const DIGITS: Record<string, string[]> = {
  '0': ['aaa', 'a.a', 'a.a', 'a.a', 'aaa'],
  '1': ['.a.', 'aa.', '.a.', '.a.', 'aaa'],
  '2': ['aaa', '..a', 'aaa', 'a..', 'aaa'],
  '3': ['aaa', '..a', '.aa', '..a', 'aaa'],
  '4': ['a.a', 'a.a', 'aaa', '..a', '..a'],
  '5': ['aaa', 'a..', 'aaa', '..a', 'aaa'],
  '6': ['aaa', 'a..', 'aaa', 'a.a', 'aaa'],
  '7': ['aaa', '..a', '.a.', '.a.', '.a.'],
  '8': ['aaa', 'a.a', 'aaa', 'a.a', 'aaa'],
  '9': ['aaa', 'a.a', 'aaa', '..a', 'aaa'],
  '+': ['...', '.a.', 'aaa', '.a.', '...'],
};

/** Render text in the tiny font, optionally with a 1px outline. */
export function tinyText(text: string, color = '#ffffff', outline = true): Pix {
  const w = text.length * 4 - 1;
  const p = new Pix(w, 5);
  [...text].forEach((ch, i) => {
    const g = DIGITS[ch];
    if (!g) return;
    g.forEach((row, y) => {
      for (let x = 0; x < 3; x++) if (row[x] === 'a') p.set(i * 4 + x, y, color);
    });
  });
  return outline ? p.outlined(OUTLINE) : p;
}
