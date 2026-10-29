import { fbm, white } from './noise';
import { P } from './palette';
import { ramp } from './pix';

/** Ground kinds the painters know (the 3D ground mixes them by its splat). */
export type Ground = 'grass' | 'forest' | 'path' | 'tallgrass' | 'flowers' | 'mud';

function grassColor(wx: number, wy: number, bias = 0): string {
  // A blade: bright pixel, with a dark pixel under it.
  if (white(wx, wy, 3) < 0.07) return P.grass[4];
  if (white(wx, wy - 1, 3) < 0.07) return P.grass[1];
  const n = fbm(wx / 18, wy / 12, 1);
  const v = 0.2 + n * 0.6 + (white(wx, wy, 1) - 0.5) * 0.2 + bias;
  return ramp(P.grass.slice(1, 5), v, wx, wy);
}

/** The colour of one ground texel at world pixel (wx, wy). */
export function groundColor(ground: Ground, wx: number, wy: number): string {
  switch (ground) {
    case 'grass':
      return grassColor(wx, wy);
    case 'tallgrass':
      return grassColor(wx, wy, -0.18);
    case 'flowers': {
      const w = white(wx, wy, 11);
      if (w < 0.045) return P.flower[Math.floor(white(wx, wy, 12) * 4)];
      if (white(wx, wy - 1, 11) < 0.045) return P.grass[1];
      return grassColor(wx, wy, 0.05);
    }
    case 'forest': {
      const m = fbm(wx / 10, wy / 7, 2);
      if (m > 0.55) {
        return ramp(P.moss, (m - 0.55) * 2.2 + (white(wx, wy, 4) - 0.5) * 0.3 + 0.25, wx, wy);
      }
      if (white(wx, wy, 5) < 0.13) return P.leaf[Math.floor(white(wx, wy, 6) * 4)];
      return ramp(P.floor.slice(1), 0.25 + fbm(wx / 6, wy / 4, 7) * 0.5 + (white(wx, wy, 8) - 0.5) * 0.25, wx, wy);
    }
    case 'mud': {
      // Stamped mud: dark, churned by boots and hooves, with puddles of standing water and the odd cart rut.
      const pud = fbm(wx / 7, wy / 4, 41);
      if (pud > 0.7) return ramp(['#2a2622', '#3c362f', '#5a5a5c', '#7a8088'], 0.25 + (pud - 0.7) * 3 + (white(wx, wy, 42) - 0.5) * 0.3, wx, wy);
      if (white(wx, wy, 43) < 0.05) return P.dirt[0];
      if (fbm(wx / 3, wy / 2, 44) > 0.72) return P.dirt[1];
      return ramp(P.dirt.slice(1, 5), 0.12 + fbm(wx / 6, wy / 4, 45) * 0.5 + (white(wx, wy, 46) - 0.5) * 0.26, wx, wy);
    }
    case 'path': {
      if (white(wx, wy, 9) < 0.04) return P.stone[4];
      if (white(wx, wy - 1, 9) < 0.04) return P.dirt[1];
      return ramp(P.dirt.slice(2, 6), 0.2 + fbm(wx / 8, wy / 5, 10) * 0.55 + (white(wx, wy, 10) - 0.5) * 0.2, wx, wy);
    }
  }
}
