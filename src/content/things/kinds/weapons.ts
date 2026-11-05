import type { WayOfMoving } from '../../../core/world3d/motion';
import type { ThingDef } from '../../../core/world3d/things';
import { WEAPONS } from '../../chargen/equipment';
import { MODELS } from '../models';

/**
 * Weapons as things (plan B8a): a sword in the world is a thing like a stool, that can lie on the sand, be picked up
 * and held. Each names its row in the weapon table (`weapon`), which gives what it does in a fight
 * (`core/combat.ts`); its weight and worth come from that row too. Its model is the file of the same name in
 * `things/models/`. A new weapon: a line here and a model file.
 */

/** The family: a weapon is a tool (to the skill hooks), held in a hand, worn on a belt or back when not. */
const family: ThingDef = { id: 'weapon', is: 'tool', abstract: true, size: 'strapped', importance: 1 };

/** Every weapon, by the id of its kind: how it moves in the hand (its motions), its row in the table and a line for looking at it. */
const ROWS: Record<string, { moves: WayOfMoving; row: string; look: string }> = {
  'arming-sword': { moves: 'blade', row: 'Stridssvärd', look: 'An arming sword, plain and well kept.' },
  'short-sword': { moves: 'blade', row: 'Kortsvärd', look: 'A short sword, broad at the base.' },
  'hand-axe': { moves: 'axe-mace', row: 'Handyxa', look: 'A hand axe with a worn haft.' },
  cudgel: { moves: 'axe-mace', row: 'Påk', look: 'A cudgel of hard wood.' },
  quarterstaff: { moves: 'staff', row: 'Stridsstav', look: 'A quarterstaff, shod with iron at both ends.' },
  dagger: { moves: 'blade', row: 'Dolk', look: 'A dagger with a double edge.' },
  sabre: { moves: 'blade', row: 'Kroksabel', look: 'A sabre, its blade gently curved.' },
  rapier: { moves: 'blade', row: 'Värja', look: 'A rapier, long and thin, with a swept guard.' },
  'bastard-sword': { moves: 'blade', row: 'Slagsvärd', look: 'A bastard sword, its grip long enough for two hands.' },
  greatsword: { moves: 'two-hander', row: 'Storsvärd', look: 'A greatsword, nearly as tall as a man.' },
  'battle-axe': { moves: 'axe-mace', row: 'Stridsyxa', look: 'A battle axe with a deep, bearded head.' },
  'great-axe': { moves: 'two-hander', row: 'Storyxa', look: 'A great axe, double-bitted, on a long haft.' },
  'hunting-spear': { moves: 'spear', row: 'Jaktspjut', look: 'A hunting spear with a broad leaf head.' },
  'war-hammer': { moves: 'axe-mace', row: 'Stridshammare', look: 'A war hammer: a square face, a spike behind.' },
  'morning-star': { moves: 'axe-mace', row: 'Morgonstjärna', look: 'A morning star, its head set with studs.' },
  'steel-mace': { moves: 'axe-mace', row: 'Stålklubba', look: 'A short mace of steel.' },
  flail: { moves: 'axe-mace', row: 'Stridsgissel', look: 'A flail: an iron ball on a short chain.' },
};

const kg = (s: string): number => Number(/[\d.]+/.exec(s)?.[0] ?? 1);

export default [
  family,
  ...Object.entries(ROWS).map(([id, w]): ThingDef => {
    const row = WEAPONS.find((x) => x.sv === w.row);
    if (!row) throw new Error(`weapon ${id}: no row ${w.row} in the weapon table`);
    const model = MODELS[id];
    if (!model) throw new Error(`weapon ${id} has no model in content/things/models/${id}.ts`);
    return { id, is: 'weapon', look: w.look, name: row.en.toLowerCase(), weapon: row.sv, hands: row.h1 === '–' ? 2 : 1, moves: w.moves, model, weight: kg(row.weight), value: row.price, draw: (p) => model.draw(p.seed) };
  }),
] satisfies ThingDef[];
