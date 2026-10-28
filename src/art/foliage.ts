import type { Rng } from '../core/rng';

/** Leaf colours by season, shared by every leaf tree. Ramps run dark -> light. */
export const SEASONS = ['summer', 'spring', 'autumn'] as const;
export type Season = (typeof SEASONS)[number];

export const LEAF = ['#0f1d16', '#192f20', '#244428', '#335c2d', '#4a7634', '#6a9440', '#91b34c', '#bdd069'];
export const LEAF_OLIVE = ['#1b2412', '#2b3a19', '#40542a', '#5d7330', '#7f9238', '#a5ad48', '#cdc96a'];
const LEAF_RUST = ['#241a12', '#3b2a17', '#58411f', '#7b5a26', '#a07a30', '#c49a44'];
const SPRING_A = ['#1a3020', '#2c5030', '#44763a', '#68a048', '#92c860', '#bce080'];
const SPRING_B = ['#244028', '#3a6a38', '#58904a', '#80b862', '#aad880', '#d0f0a0'];
const AUT_A = ['#2a1810', '#5a2e1a', '#8a4a22', '#b8702c', '#d9962f', '#ecc24a'];
const AUT_B = ['#3a2a10', '#6a4a18', '#a07a22', '#d0a830', '#f0d050', '#fff0a0'];
const AUT_RED = ['#2a1014', '#5a1c20', '#8a2c28', '#b84a30', '#d87038', '#eca050'];

/** Silvery leaves for willows. */
export const WILLOW: Record<Season, readonly string[]> = {
  summer: ['#16241c', '#243a2c', '#3a5a3e', '#5a7e52', '#86a672', '#b4cca0'],
  spring: ['#1c3024', '#34543c', '#55805a', '#82ac78', '#b0d49c', '#d8f0c4'],
  autumn: ['#3a2e14', '#5e4a1c', '#8a7028', '#b09a3c', '#d0c060', '#eee498'],
};
/** Light, airy birch leaves. */
export const BIRCH: Record<Season, readonly string[]> = {
  summer: ['#1c2a18', '#2e4424', '#4a6a30', '#72923c', '#a0b84c', '#cfd870'],
  spring: ['#2a4024', '#487038', '#72a04c', '#a0cc68', '#cce890', '#eaf8b8'],
  autumn: AUT_B,
};

/** A palette for one clump: most are the main green, a few are off-colour, as in life. */
export function leafPalette(season: Season, rng: Rng): readonly string[] {
  const r = rng.next();
  switch (season) {
    case 'summer': return r < 0.18 ? LEAF_OLIVE : r < 0.22 ? LEAF_RUST : LEAF;
    case 'spring': return r < 0.5 ? SPRING_A : SPRING_B;
    case 'autumn': return r < 0.12 ? LEAF : r < 0.45 ? AUT_A : r < 0.75 ? AUT_B : AUT_RED;
  }
}
