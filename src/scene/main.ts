import { derive } from '../core/chargen/derive';
import { loadRoster } from '../core/chargen/state';
import type { Hero } from '../core/hero';
import { CONTENT } from '../content/chargen';
import { defaultHero, heroFromChar } from '../content/rollables';
import { GATE_KINDS, GATE_SCENE } from '../content/scenes/gate';
import { startScene } from '../engine/scene';

/**
 * The village gate test scene. Plays your current character from the creator
 * if you have one (tap your hero to switch), otherwise a default shepherd.
 */
const PICK_KEY = 'slicehaven.sceneHero';

function rosterHeroes(): { id: string; label: string; sub: string; make: () => Hero }[] {
  const roster = loadRoster();
  return roster.chars.map((c) => ({
    id: c.id,
    label: c.details.name || 'Unnamed hero',
    sub: 'From the character creator',
    make: () => heroFromChar(c.details.name, derive(c, CONTENT)),
  }));
}

function firstHero(): Hero {
  const pick = localStorage.getItem(PICK_KEY);
  const list = rosterHeroes();
  if (pick === 'default') return defaultHero();
  const chosen = list.find((h) => h.id === pick) ?? list.find((h) => h.id === loadRoster().current);
  try {
    return chosen ? chosen.make() : defaultHero();
  } catch (err) {
    console.error('[scene] could not load character', err);
    return defaultHero();
  }
}

startScene(GATE_SCENE, GATE_KINDS, firstHero(), {
  heroChoices: () => [
    {
      label: 'Shepherd', sub: 'Default hero: good climber, so-so talker',
      pick: () => {
        localStorage.setItem(PICK_KEY, 'default');
        return defaultHero();
      },
    },
    ...rosterHeroes().map((h) => ({
      label: h.label, sub: h.sub,
      pick: () => {
        localStorage.setItem(PICK_KEY, h.id);
        return h.make();
      },
    })),
  ],
});
