import type { Cell } from '../core/battle';
import type { Sprite } from './props';
import {
  COTTAGE_WINDOW, GATE_TORCH, makeCampfire, makeCottage, makeGate, makeHandcart, makeIvyRock, makePalisade,
} from './village';

/**
 * Scenery art by key, as named in scene data. Lights are offsets from the
 * sprite's anchor: a flame flickers and throws sparks, a glow is steady.
 */
export interface SceneArt {
  make: (wind: number, seed: number) => Sprite;
  /** What the rules see on these hexes (magic, fire). */
  feature?: Cell['feature'];
  flame?: { dx: number; dy: number; size: number };
  glow?: { dx: number; dy: number; r: number; color: [number, number, number] };
}

export const SCENE_ART: Record<string, SceneArt> = {
  palisade: { make: (_w, seed) => makePalisade(seed), feature: 'wall' },
  gate: { make: () => makeGate(false), feature: 'gate', flame: { dx: GATE_TORCH.dx, dy: GATE_TORCH.dy + 1, size: 0.4 } },
  'gate-open': { make: () => makeGate(true), feature: 'gate', flame: { dx: GATE_TORCH.dx, dy: GATE_TORCH.dy + 1, size: 0.4 } },
  'ivy-rock': { make: (_w, seed) => makeIvyRock(seed), feature: 'rock' },
  handcart: { make: () => makeHandcart(), feature: 'cart' },
  campfire: { make: () => makeCampfire(true), feature: 'campfire', flame: { dx: 0, dy: -4, size: 1 } },
  'campfire-out': { make: () => makeCampfire(false), feature: 'campfire' },
  cottage: {
    make: (_w, seed) => makeCottage(seed),
    feature: 'house',
    glow: { dx: COTTAGE_WINDOW.dx, dy: COTTAGE_WINDOW.dy + 6, r: 22, color: [0.7, 0.5, 0.2] },
  },
};
