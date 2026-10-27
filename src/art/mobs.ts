import { OUTLINE } from './palette';
import { Pix, sprite } from './pix';
import { FRAMES, type Sprite } from './props';

/**
 * Hand-placed pixel sprites for characters and monsters. They stand upright on
 * the hex (feet on the hex centre) to give the board a slight isometric feel.
 */

/** Idle "breathing": the upper body dips 1px for half the cycle. */
function breathe(base: Pix, splitRow: number, ax: number, ay: number, shadow: number): Sprite {
  const dip = new Pix(base.w, base.h);
  for (let y = 0; y < base.h; y++) {
    for (let x = 0; x < base.w; x++) {
      const src = y < splitRow ? y - 1 : y; // rows above the split move down by one
      if (src < 0) continue;
      const i = (src * base.w + x) * 4;
      if (base.data[i + 3]) dip.set(x, y, [base.data[i], base.data[i + 1], base.data[i + 2], base.data[i + 3]]);
    }
  }
  const frames = Array.from({ length: FRAMES }, (_, f) => (f < FRAMES / 2 ? base : dip));
  return { frames, ax, ay, shadow };
}

const SHEPHERD_BODY = [
  '.....oooooo.....',
  '....oHHHHhho....',
  '...oHHHhhhhdo...',
  '...oHdssssSdho..',
  '...oHdseseSdho..',
  '...oHdssssSdho..',
  '...oHhdsSSdhho..',
  '....oHhdddhhdo..',
  '...oHHhhhhhhddo.',
  '..oHHhwwwwWhddo.',
  '..oHhhwwwwWWhdo.',
  '.osHhwwwwwWWhdso',
  '.oSHhbbbbbbbhdSo',
  '..oHhwwwwwWWhdo.',
  '..oHhwwwwWWWhdo.',
  '..oHhhwwwWWhhdo.',
  '..oHhhhwWWhhhdo.',
  '...oHhppppphdo..',
  '...ohhpppPPhdo..',
  '....oppp.PPPo...',
  '....oppo.oPPo...',
  '....obbo.obbo...',
  '...obbbo.obbbo..',
  '...oooo...oooo..',
];

/** Palette swaps of the villager body (old-school recolouring). */
export const VILLAGER_COLORS: Record<string, Record<string, string>> = {
  shepherd: {},
  herbalist: { H: '#79a85a', h: '#4f7a3c', d: '#2f4f28', w: '#e2d4ac', W: '#b8a882', s: '#e8b88e', S: '#b88460' },
  // Gate guard: steel coif, red tabard.
  guard: { H: '#a8aebb', h: '#6e7484', d: '#41455a', w: '#a8322c', W: '#6e1e1e', b: '#2a1a12', p: '#4a4038', s: '#e0a882', S: '#a87458' },
  tinker: { H: '#7a5a8a', h: '#56406a', d: '#382a48', w: '#a8824f', W: '#7a5a38' },
  crone: { H: '#6e6a74', h: '#4c4852', d: '#2e2c36', w: '#5a6e7a', W: '#3c4c58', s: '#e8c0a0', S: '#b08870' },
  drifter: { H: '#6a5a46', h: '#4a3e30', d: '#2c241c', w: '#7a6a52', W: '#51463a', s: '#d09a78', S: '#98705a' },
  youth: { H: '#4b7d40', h: '#36623a', d: '#1c3326', w: '#c9a66b', W: '#a8824f', s: '#d8a078', S: '#a07050' },
};

/** What a villager holds in the right hand. */
type Tool = 'crook' | 'spear' | 'stick';

function makeTool(tool: Tool): Pix {
  const staff = new Pix(20, 31);
  if (tool === 'spear') {
    // Tall shaft with a steel head.
    for (let y = 5; y < 31; y++) staff.set(17, y, y % 6 === 0 ? '#5a4028' : '#8a6a44');
    for (const [x, y, c] of [[17, 0, '#e8ecf0'], [17, 1, '#bcc2cc'], [16, 2, '#8e93a1'], [17, 2, '#bcc2cc'], [18, 2, '#686b7b'],
      [16, 3, '#8e93a1'], [17, 3, '#bcc2cc'], [18, 3, '#686b7b'], [17, 4, '#4b4c5b']] as const) staff.set(x, y, c);
  } else if (tool === 'stick') {
    for (let y = 8; y < 31; y++) staff.set(17 - (y < 12 ? 1 : 0), y, '#86613c');
  } else {
    // 1px shaft; the hook curls over to the left at the top.
    for (let y = 7; y < 31; y++) staff.set(17, y, y % 5 === 0 ? '#7a5a38' : '#b08a5a');
    for (const [x, y] of [[17, 6], [16, 5], [15, 5], [14, 6], [14, 7], [14, 8]] as const) staff.set(x, y, '#b08a5a');
  }
  return staff.outlined(OUTLINE);
}

/** Villager body in a palette and with a tool (guard, travellers…). */
export function makeVillager(variant: string, tool: Tool = 'crook'): Sprite {
  const body = sprite(SHEPHERD_BODY, {
    o: OUTLINE,
    H: '#a7773f', h: '#7a532c', d: '#50351d',
    s: '#f2cba2', S: '#c99570', e: OUTLINE,
    w: '#eee6d4', W: '#bdb29c',
    b: '#3a2618', p: '#5c5248', P: '#3f3832',
    ...VILLAGER_COLORS[variant],
  });
  const p = makeTool(tool);
  p.blit(body, 2, 8);
  return breathe(p, 21, 10, 31, 14);
}

export const makeGuard = (): Sprite => makeVillager('guard', 'spear');

export function makeShepherd(variant = 'shepherd'): Sprite {
  const body = sprite(SHEPHERD_BODY, {
    o: OUTLINE,
    H: '#a7773f', h: '#7a532c', d: '#50351d',
    s: '#f2cba2', S: '#c99570', e: OUTLINE,
    w: '#eee6d4', W: '#bdb29c',
    b: '#3a2618', p: '#5c5248', P: '#3f3832',
    ...VILLAGER_COLORS[variant],
  });
  // Crook (staff with a hook), drawn behind the right hand.
  const staff = new Pix(20, 27);
  // 1px shaft; the hook curls over to the left at the top.
  for (let y = 3; y < 27; y++) staff.set(17, y, y % 5 === 0 ? '#7a5a38' : '#b08a5a');
  for (const [x, y] of [[17, 2], [16, 1], [15, 1], [14, 2], [14, 3], [14, 4]] as const) staff.set(x, y, '#b08a5a');
  const p = staff.outlined(OUTLINE);
  p.blit(body, 2, 4);
  return breathe(p, 17, 10, 27, 14);
}

export function makeRat(): Sprite {
  // A big cellar rat (dog-sized, as cellar rats in stories always are).
  const p = sprite([
    '....oo..................',
    '...oGgo..ooooooo........',
    '..oGppgooGGGGgggoo......',
    '.oGGGGgoGGGGggggggdo....',
    'oGeGGGGGGGgggggggggdo...',
    'oGGGGGGGgggggggggggddo..',
    'nGGGGgggggggggggddddddo.',
    '.ooGgggggggggggdddddddo.',
    '...oggggogggggodddddddoo',
    '...oggo.oggo.oddo.oddo.t',
    '...odo..odo..odo..odo.t.',
    '..ooo..ooo..ooo..oo.tt..',
    '..................tt....',
  ], {
    o: OUTLINE, G: '#958d9a', g: '#665e70', d: '#433c4c', e: '#ff5a4a', n: '#e290a0', p: '#c98290', t: '#c98290',
  });
  return breathe(p, 8, 10, 11, 18);
}

export function makeWolf(): Sprite {
  const p = sprite([
    '..o.o...................',
    '.oFoFo..................',
    '.oFFffo.................',
    'oFFeFffoooooooooo.......',
    'nFFFFffFFFFFFFffdoo.....',
    'owFFfffFFFfffffffddoo...',
    '.owwfffffffffffffdddDo..',
    '..owwfffffffffffddDDoFo.',
    '...owfffdddffffdddDo.oFo',
    '...ofddo.oddddddDDo...oo',
    '...ofdo...odddo.odo.....',
    '...ofo....odo...odo.....',
    '..offo....odo...odo.....',
    '..ooo....oddo..oddo.....',
    '.........ooo...ooo......',
  ], {
    o: OUTLINE, F: '#b4b0b8', f: '#86828e', d: '#5a5664', D: '#3d3a46', e: '#f2c94c', w: '#e6e2dc', n: OUTLINE,
  });
  return breathe(p, 9, 12, 14, 22);
}

export function makeSkeleton(): Sprite {
  const p = sprite([
    '.....oooooo.....',
    '....oBBBBBbo....',
    '...oBBBBBbbxo...',
    '...oBgeBBgexo...',
    '...oBggBbggxo...',
    '...oBBBgbbbxo...',
    '....oBgBgBxo....',
    '.....oxbxxo.....',
    '......obxo......',
    '..oBBbbBbbbxxo..',
    '.oBo.oBBbxo.oxo.',
    '.oBo.ogBbgo.oxo.',
    '.oBo.oBBbxo.oxo.',
    '.oBo.ogBbgo.oxo.',
    '.oBo.oBBbxo.oxo.',
    '.oBo..obxo..oxo.',
    '.oBBo.obxo.oxxo.',
    '..oo.oBBbxo..oo.',
    '....oBboobxo....',
    '....oBo..obo....',
    '....oBo..obo....',
    '....oBo..oxo....',
    '...oBBo..oxxo...',
    '...oooo..oooo...',
  ], {
    o: OUTLINE, B: '#ece6cf', b: '#bdb59a', x: '#837b66', g: '#2a2030', e: '#7fe8ff',
  });
  return breathe(p, 18, 8, 23, 14);
}
