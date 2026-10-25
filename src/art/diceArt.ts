import type { Face, FaceKind } from '../core/dice';
import { icon, tinyText } from './icons';
import { white } from './noise';
import { OUTLINE } from './palette';
import { Pix, type RGBA, rgba } from './pix';

export const FACE_SIZE = 28;

/** Border colour per face kind: [light, mid, dark]. */
const KIND_COLORS: Record<FaceKind, [string, string, string]> = {
  attack: ['#ef6a48', '#c43a2e', '#7a1e1e'],
  range: ['#f2a24a', '#c9742a', '#7a4418'],
  move: ['#d8b47a', '#a8824f', '#5e4428'],
  jump: ['#8fe0d0', '#4aa898', '#24645a'],
  heal: ['#9fe070', '#5aa040', '#2f6a2a'],
  shield: ['#9fb6f0', '#5a78c0', '#2c3c78'],
  bleed: ['#d84a4a', '#8a1e22', '#4a1014'],
  poison: ['#c8e070', '#7aa040', '#3c5a22'],
  rend: ['#d0d6de', '#8e93a1', '#4b4c5b'],
  disease: ['#c8a0e8', '#8a5ab0', '#4a2a6a'],
  blank: ['#b8ac98', '#8a7e6c', '#4e4639'],
};

const TAG_COLORS: Record<string, string> = {
  bleed: '#d84a4a', poison: '#9fe070', rend: '#d0d6de', disease: '#b48ad8',
  push: '#f2c94c', lose: '#f4f0e2', pierce: '#86c6e0', stun: '#f2d75c',
};

export function kindColors(kind: FaceKind): [string, string, string] {
  return KIND_COLORS[kind];
}

/** One die face as a square pixel tile. */
export function renderFace(face: Face | null): Pix {
  const S = FACE_SIZE;
  const p = new Pix(S, S);
  if (!face) {
    // Missing face (e.g. a D5): an empty socket.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1;
        if (edge && (x + y) % 3 === 0) p.set(x, y, '#5a4e60');
      }
    }
    return p;
  }
  const [light, mid, dark] = KIND_COLORS[face.kind];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      let c: string;
      if (e === 0) c = OUTLINE;
      else if (e <= 2) c = x + y < S - 1 ? (e === 1 ? light : mid) : (e === 1 ? dark : mid);
      else {
        // Bone-white face with a little grain, darker toward the bottom-right.
        const v = white(x, y, 77);
        c = v < 0.12 ? '#d6c8a6' : x + y > S * 1.3 ? '#e2d6b8' : '#efe5cc';
      }
      p.set(x, y, c);
    }
  }
  // Corner rivets.
  for (const [x, y] of [[3, 3], [S - 4, 3], [3, S - 4], [S - 4, S - 4]]) p.set(x, y, mid);

  const ic = icon(face.kind);
  const hasValue = face.kind !== 'blank' && face.value > 0;
  if (hasValue) {
    // Icon and a double-size number side by side.
    const t = tinyText(String(face.value), dark, false).scaled(2);
    const x0 = Math.floor((S - (ic.w + 1 + t.w)) / 2);
    p.blit(ic, x0, Math.floor((S - ic.h) / 2) + 1);
    p.blit(t, x0 + ic.w + 1, Math.floor((S - t.h) / 2) + 1);
  } else {
    p.blit(ic, Math.floor((S - ic.w) / 2), Math.floor((S - ic.h) / 2));
  }
  // Tags as coloured pips along the top-left.
  (face.tags ?? []).forEach((tag, i) => {
    const name = tag.split(':')[0];
    const c = TAG_COLORS[name] ?? '#ffffff';
    const x = 4 + i * 4;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) p.set(x + dx, 4 + dy, c);
    p.set(x + 2, 4, OUTLINE); p.set(x + 2, 5, OUTLINE); p.set(x, 6, OUTLINE); p.set(x + 1, 6, OUTLINE);
  });
  return p;
}

function shade(c: RGBA, k: number, warm = 0): RGBA {
  return [
    Math.min(255, c[0] * k + warm),
    Math.min(255, c[1] * k + warm * 0.8),
    Math.min(255, c[2] * k + warm * 0.5),
    c[3],
  ];
}

/**
 * Pseudo-3D cube showing three faces (top, front, right), oblique projection.
 * `faces` = [top, front, right].
 */
export function renderCube(faces: [Face | null, Face | null, Face | null], body: string): Pix {
  const S = FACE_SIZE;
  const D = Math.round(S * 0.6); // depth of the receding faces
  const [top, front, right] = faces.map((f) => (f ? renderFace(f) : solidFace(body)));
  const p = new Pix(S + D + 2, S + D + 2);

  // Top face: rows recede upward, each shifted right by one pixel.
  for (let j = 0; j < D; j++) {
    const shift = D - 1 - j;
    for (let u = 0; u < S; u++) {
      const c = top.get(u, Math.min(S - 1, Math.floor((j * S) / D)));
      if (c[3]) p.set(1 + shift + u, 1 + j, shade(c, 1.05, 18));
    }
  }
  // Right face: columns recede rightward, each shifted up by one pixel.
  for (let i = 0; i < D; i++) {
    const shift = i + 1;
    for (let v = 0; v < S; v++) {
      const c = right.get(Math.min(S - 1, Math.floor((i * S) / D)), v);
      if (c[3]) p.set(1 + S + i, 1 + D - shift + v + 1, shade(c, 0.68));
    }
  }
  // Front face.
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(1 + x, 1 + D + y, front.get(x, y));
  return p;
}

function solidFace(color: string): Pix {
  const p = new Pix(FACE_SIZE, FACE_SIZE);
  const c = rgba(color);
  for (let y = 0; y < FACE_SIZE; y++) for (let x = 0; x < FACE_SIZE; x++) p.set(x, y, c);
  return p;
}
