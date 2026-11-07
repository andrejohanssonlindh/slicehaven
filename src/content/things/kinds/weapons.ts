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

/**
 * The family: a weapon is a tool (to the skill hooks), held in a hand, worn on a belt or back when not. Lying about,
 * one is noticed on an Alertness roll against 8 (`spot`); the small harder, the long easier (per row).
 */
const family: ThingDef = { id: 'weapon', is: 'tool', abstract: true, size: 'strapped', importance: 1, spot: 8 };

/** Every weapon, by the id of its kind: how it moves in the hand (its motions), its row in the table, a line for looking at it, and how hard it is to notice if not 8. */
const ROWS: Record<string, { moves: WayOfMoving; row: string; look: string; spot?: number }> = {
  'arming-sword': { moves: 'blade', row: 'Stridssvärd', look: 'An arming sword, plain and well kept.' },
  'short-sword': { moves: 'blade', row: 'Kortsvärd', look: 'A short sword, broad at the base.', spot: 10 },
  'hand-axe': { moves: 'axe-mace', row: 'Handyxa', look: 'A hand axe with a worn haft.', spot: 10 },
  cudgel: { moves: 'axe-mace', row: 'Påk', look: 'A cudgel of hard wood.', spot: 10 },
  quarterstaff: { moves: 'staff', row: 'Stridsstav', look: 'A quarterstaff, shod with iron at both ends.', spot: 6 },
  dagger: { moves: 'blade', row: 'Dolk', look: 'A dagger with a double edge.', spot: 12 },
  sabre: { moves: 'blade', row: 'Kroksabel', look: 'A sabre, its blade gently curved.' },
  rapier: { moves: 'blade', row: 'Värja', look: 'A rapier, long and thin, with a swept guard.' },
  'bastard-sword': { moves: 'blade', row: 'Slagsvärd', look: 'A bastard sword, its grip long enough for two hands.' },
  greatsword: { moves: 'two-hander', row: 'Storsvärd', look: 'A greatsword, nearly as tall as a man.', spot: 6 },
  'battle-axe': { moves: 'axe-mace', row: 'Stridsyxa', look: 'A battle axe with a deep, bearded head.' },
  'great-axe': { moves: 'two-hander', row: 'Storyxa', look: 'A great axe, double-bitted, on a long haft.', spot: 6 },
  'hunting-spear': { moves: 'spear', row: 'Jaktspjut', look: 'A hunting spear with a broad leaf head.', spot: 6 },
  'war-hammer': { moves: 'axe-mace', row: 'Stridshammare', look: 'A war hammer: a square face, a spike behind.' },
  'morning-star': { moves: 'axe-mace', row: 'Morgonstjärna', look: 'A morning star, its head set with studs.' },
  'steel-mace': { moves: 'axe-mace', row: 'Stålklubba', look: 'A short mace of steel.' },
  flail: { moves: 'axe-mace', row: 'Stridsgissel', look: 'A flail: an iron ball on a short chain.' },
};

const kg = (s: string): number => Number(/[\d.]+/.exec(s)?.[0] ?? 1);
const cm = (s: string): number => Number(/[\d.]+/.exec(s)?.[0] ?? 80);

/**
 * Every other melee weapon in the table, so whatever the hero owns from the creator can be drawn and fought with
 * (the director, 2026-11-07: "cannot use all my owned weapons"). Until it has a model of its own it is drawn with a
 * look-alike's (`standIn`), picked by its skill, its hands and its length; racks leave these out. A real model: give
 * it a line in `ROWS` above and a model file, and it stops being a stand-in.
 */
function lookAlike(skill: string, twoHanded: boolean, length: number): string | null {
  switch (skill) {
    case 'Svärd': return twoHanded ? 'greatsword' : length < 80 ? 'short-sword' : 'arming-sword';
    case 'Yxa': return twoHanded ? 'great-axe' : length < 75 ? 'hand-axe' : 'battle-axe';
    case 'Dolk': return 'dagger';
    case 'Spjut': return 'hunting-spear';
    case 'Stav': return 'quarterstaff';
    case 'Klubba': return twoHanded ? 'war-hammer' : length < 70 ? 'cudgel' : 'steel-mace';
    case 'Kedjevapen': return 'flail';
    default: return null; // brawling weapons, and ranged ones (B8d), wait
  }
}

const slug = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const modelled = new Set(Object.values(ROWS).map((w) => w.row));
const standIns: ThingDef[] = WEAPONS.flatMap((row): ThingDef[] => {
  if (!row.melee || modelled.has(row.sv)) return [];
  const twoHanded = row.h1 === '–';
  const like = lookAlike(row.skill, twoHanded, cm(row.length));
  const id = slug(row.en);
  if (!like || ROWS[id]) return [];
  const model = MODELS[like];
  return [{
    id, is: 'weapon', standIn: true, look: `${row.en}.`, name: row.en.toLowerCase(), weapon: row.sv, hands: twoHanded ? 2 : 1,
    moves: ROWS[like].moves, model, weight: kg(row.weight), value: row.price, ...(ROWS[like].spot ? { spot: ROWS[like].spot } : {}), draw: (p) => model.draw(p.seed),
  }];
});

export default [
  family,
  ...Object.entries(ROWS).map(([id, w]): ThingDef => {
    const row = WEAPONS.find((x) => x.sv === w.row);
    if (!row) throw new Error(`weapon ${id}: no row ${w.row} in the weapon table`);
    const model = MODELS[id];
    if (!model) throw new Error(`weapon ${id} has no model in content/things/models/${id}.ts`);
    return { id, is: 'weapon', look: w.look, name: row.en.toLowerCase(), weapon: row.sv, hands: row.h1 === '–' ? 2 : 1, moves: w.moves, model, weight: kg(row.weight), value: row.price, ...(w.spot ? { spot: w.spot } : {}), draw: (p) => model.draw(p.seed) };
  }),
  ...standIns,
] satisfies ThingDef[];
