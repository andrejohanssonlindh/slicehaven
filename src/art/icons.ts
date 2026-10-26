import { OUTLINE, P } from './palette';
import { Pix, sprite } from './pix';

/**
 * Action icons for the sandbox toolbar. Drawn without outlines; the outline is added automatically.
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
  // --- UI icons (engine toolbar) ---
  fire: {
    rows: ['....r....', '...rr....', '...ryr...', '..ryyr.r.', '.rryyyrr.', '.ryywyyr.', 'rryywwyrr', 'ryywwwyyr', '.ryyyyyr.'],
    key: { r: '#c43a2e', y: '#f2a24a', w: '#fff2a0' },
  },
  bolt: {
    rows: ['....yyy', '...yyw.', '..yyw..', '.yyyyyy', '....yw.', '...yw..', '..yw...', '.yw....', 'y......'],
    key: { y: '#f2d75c', w: '#fffbe0' },
  },
  sun: {
    rows: ['....y....', '.y..y..y.', '..yyyyy..', '..ywwwy..', 'yyywwwyyy', '..ywwwy..', '..yyyyy..', '.y..y..y.', '....y....'],
    key: { y: '#f2c94c', w: '#fff2a0' },
  },
  cloud: {
    rows: ['...www...', '..wwwww..', '.wwwwwwwg', 'wwwwwwwgg', 'gggggggg.'],
    key: { w: '#e8eef2', g: '#9aa6b4' },
  },
  rain: {
    rows: ['...www...', '..wwwww..', '.wwwwwwwg', 'gggggggg.', '.b..b..b.', 'b..b..b..', '.b..b..b.'],
    key: { w: '#c8d0d8', g: '#7a8494', b: '#6fb3d6' },
  },
  storm: {
    rows: ['...ggg...', '..ggggg..', '.ggggggdg', 'dddddddd.', '..b.yy.b.', '.b.yy..b.', '...yyyy..', '.b...y.b.', '....y....'],
    key: { g: '#7a8494', d: '#4b4c5b', b: '#6fb3d6', y: '#f2d75c' },
  },
  moon: {
    rows: ['..www..', '.ww....', 'ww.....', 'ww.....', 'ww.....', '.ww....', '..www..'],
    key: { w: '#e6e8f6' },
  },
  dusk: {
    rows: ['...ooo...', '..ooooo..', '.ooyyyoo.', 'ppppppppp', '.ppp.ppp.', '..p...p..'],
    key: { o: '#ef8a48', y: '#f2c94c', p: '#8a5ab0' },
  },
  foe: {
    rows: ['.bbbbb.', 'bbbbbbb', 'brbbrbb', 'bbbbbbb', '.bxbxb.', '.bbbbb.'],
    key: { b: '#ece6cf', r: '#c43a2e', x: '#4a3e3a' },
  },
  friend: {
    rows: ['..sss..', '..sss..', '...s...', '.ggggg.', 'g.ggg.g', '..ggg..', '..g.g..', '..g.g..'],
    key: { s: '#f2cba2', g: '#79a85a' },
  },
  wind: {
    rows: ['wwwww....', '.....w...', 'wwwwww...', '......ww.', 'wwwwwwww.', '.......w.', 'www..ww..'],
    key: { w: '#c8f0f4' },
  },
  roof: {
    rows: ['...r...', '..rrr..', '.rrrrr.', 'rrrrrrr', '.wwwww.', '.wdwww.', '.wdwww.'],
    key: { r: '#a35f2a', w: '#d8c8a0', d: '#56351e' },
  },
  off: {
    rows: ['.ggggg.', 'g.....g', 'g.g.g.g', 'g..g..g', 'g.g.g.g', 'g.....g', '.ggggg.'],
    key: { g: '#a89c88' },
  },
  // Aspect glyphs (Magic tab).
  'a-bio': {
    rows: ['....gg', '..gglg', '.gglg.', '.glgg.', 'glgg..', 'g.....'],
    key: { g: '#4f8a3a', l: '#9fe070' },
  },
  'a-foto': {
    rows: ['y..y..y', '.y.y.y.', '..www..', 'yywwwyy', '..www..', '.y.y.y.', 'y..y..y'],
    key: { y: '#f2c94c', w: '#fff6c0' },
  },
  'a-geo': {
    rows: ['...s...', '..sSs..', '.sSssd.', 'sSsssdd', 'ssssddd'],
    key: { s: '#a8a0a0', S: '#e0dcd8', d: '#6a6470' },
  },
  'a-hydro': {
    rows: ['..b..', '..b..', '.bbb.', 'bwbbb', 'bwbbb', '.bbb.'],
    key: { b: '#4c9bc8', w: '#d4f1f6' },
  },
  'a-nekro': {
    rows: ['.bbbbb.', 'bbbbbbb', 'bpbbbpb', 'bbbbbbb', '.bpbpb.', '.bbbbb.'],
    key: { b: '#cfc4e0', p: '#4a2a6a' },
  },
  'a-pneumo': {
    rows: ['..ccc..', '.c...c.', 'c..cc.c', 'c.c..c.', 'c..cc..', '.c.....', '..cccc.'],
    key: { c: '#c8f0f4' },
  },
  'a-pyro': {
    rows: ['...r...', '..rr...', '..ryr..', '.ryyrr.', 'rryyyrr', 'ryywyyr', '.ryyyr.'],
    key: { r: '#e0552e', y: '#f2a24a', w: '#fff2a0' },
  },
  'a-skoto': {
    rows: ['..vvv..', '.vv....', 'vv.....', 'vv...e.', 'vv.....', '.vv....', '..vvv..'],
    key: { v: '#8a6ad8', e: '#d0c0ff' },
  },
  turn: {
    rows: ['bbbbbbb', '.byyyb.', '..byb..', '...b...', '..b.b..', '.byyyb.', 'bbbbbbb'],
    key: { b: '#c9a06a', y: '#f2d75c' },
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
  '-': ['...', '...', 'aaa', '...', '...'],
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
