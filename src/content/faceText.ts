import type { Face, FaceKind } from '../core/dice';

/** Player-facing rules text for die faces. Draft wording. */
const KIND_TEXT: Record<FaceKind, { name: string; text: (v: number) => string }> = {
  attack: { name: 'Attack', text: (v) => `Deal ${v} damage to an adjacent enemy.` },
  range: { name: 'Ranged attack', text: (v) => `Deal ${v} damage to an enemy within 3 hexes, in line of sight.` },
  move: { name: 'Walk', text: (v) => `Move up to ${v} hexes along any path. Can't pass through obstacles or enemies.` },
  jump: { name: 'Jump', text: (v) => `Jump up to ${v} hexes in a straight line, over obstacles and enemies.` },
  heal: { name: 'Heal', text: (v) => `Restore ${v} HP to yourself or an adjacent ally.` },
  shield: { name: 'Shield', text: (v) => `Block the next ${v} damage you take this round.` },
  bleed: { name: 'Bleed', text: (v) => `An adjacent enemy bleeds: it loses ${v} HP at the start of each of its turns.` },
  poison: { name: 'Poison', text: (v) => `Poison an adjacent enemy: all damage it takes is increased by ${v}.` },
  rend: { name: 'Rend armour', text: (v) => `Strip ${v} armour from an adjacent enemy. Unarmoured enemies take 1 damage instead.` },
  disease: { name: 'Disease', text: (v) => `Sicken an adjacent enemy: its physical attacks deal ${v} less damage.` },
  blank: { name: 'Blank', text: () => 'Nothing happens. Gear can replace blank faces.' },
};

const TAG_TEXT: Record<string, (v: number) => string> = {
  bleed: (v) => `Bleed ${v}: the target loses ${v} HP at the start of its turns.`,
  poison: (v) => `Poison ${v}: the target takes +${v} damage from all sources.`,
  rend: (v) => `Rend ${v}: removes ${v} armour first. Strong against armoured foes.`,
  disease: (v) => `Disease ${v}: the target's physical attacks deal ${v} less.`,
  push: (v) => `Push ${v || 1}: shove the target away from you.`,
  pierce: (v) => `Pierce ${v}: ignores ${v} armour.`,
  stun: () => 'Stun: the target skips its next turn.',
  lose: () => 'Lose: a strong face, but the whole die is lost for the rest of the scenario after use.',
};

export function faceTitle(face: Face): string {
  const k = KIND_TEXT[face.kind];
  return face.kind === 'blank' ? k.name : `${k.name} ${face.value}`;
}

export function faceRules(face: Face): string[] {
  const lines = [KIND_TEXT[face.kind].text(face.value)];
  for (const tag of face.tags ?? []) {
    const [name, n] = tag.split(':');
    const t = TAG_TEXT[name];
    if (t) lines.push(t(Number(n ?? 0)));
  }
  return lines;
}
