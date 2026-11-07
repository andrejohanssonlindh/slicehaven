import { ARMOUR, SHIELDS, WEAPONS } from '../../content/chargen/equipment';
import { THINGS } from '../../content/things';
import { baseArmour, baseDamage, type Dice } from '../../core/chargen/tables';
import { type Fight, type Fighter, type FightItem, loadDiceOf, shieldFromRow } from '../../core/combat';
import { unhurt } from '../../core/damage';
import type { Hero } from '../../core/hero';
import { type RolledSheet, sheetDice } from '../../core/npcsheet';
import type { SpikeWorld } from '../../engine3d/world';

/**
 * Building the fighters a fight starts with, from the world and the sheets (plan B8a): the hero as they stand, someone
 * of the map with their own gear drawn, and the weapons lying about. Nothing here draws the page.
 */

/** The pools a fight reads from a sheet: every combat skill, dodging, the shield, and the attributes it rolls. */
const FIGHT_IDS = ['Svärd', 'Yxa', 'Dolk', 'Spjut', 'Stav', 'Kedjevapen', 'Klubba', 'Slagsmål', 'Sköld', 'Undvika', 'attr:Reaktion', 'attr:Livskraft', 'attr:Förflyttning', 'attr:Kroppsbyggnad'];
/** An improvised weapon: anything held that is no weapon (a stool swung). */
const IMPROVISED = 'Tillhygge';
/** How far round the fight weapons lying about count as within reach of it, metres. */
export const GROUND_REACH = 25;

const rowOf = (sv: string) => WEAPONS.find((w) => w.sv === sv);
/** The weapon row of a kind of thing held (an improvised one for anything else). */
const rowOfKind = (kind: string) => rowOf(THINGS.has(kind) ? THINGS.get(kind).weapon ?? IMPROVISED : IMPROVISED);
/** The kind of thing that is this row (a sword in the world for the sheet's sword). */
const kindOfRow = (sv: string): string | null => THINGS.placeable.find((k) => THINGS.get(k).weapon === sv) ?? null;
/** The kind of thing that is this shield row (a buckler in the world for the sheet's buckler). */
const kindOfShield = (sv: string): string | null => THINGS.placeable.find((k) => THINGS.get(k).shield === sv) ?? null;
/** Dice as units (4 a die), to compare pools. */
export const units = (d: Dice) => d.n * 4 + d.mod;

/** A thing as the fight sees it: a shield's block, else a weapon's row (anything else held is an improvised weapon). */
export function itemOf(id: string, kind: string): FightItem | null {
  const sv = THINGS.has(kind) ? THINGS.get(kind).shield : undefined;
  const sh = sv ? SHIELDS.find((s) => s.sv === sv) : undefined;
  if (sh) return { id, shield: shieldFromRow(sh) };
  const row = rowOfKind(kind);
  return row ? { id, weapon: row } : null;
}

/** Is the hand for this item free (the left for a shield, the right for anything else)? */
export const slotFree = (f: Fighter, item: FightItem): boolean => (item.shield ? !f.shield : !f.weapon);

/** The hero as a fighter: their sheet, what they hold, no armour yet (the hero has none in the world). */
export function heroFighter(w: SpikeWorld, hero: Hero, at: { x: number; z: number }): Fighter {
  const phys = hero.dice['attr:Kroppsbyggnad'] ?? { n: 2, mod: 0 };
  const held = w.wieldedBy('hero');
  const row = held ? rowOfKind(held.kind) : undefined;
  const sh = w.shieldOf('hero');
  return {
    id: 'hero', side: 0, x: at.x, z: at.z, pools: Object.fromEntries(FIGHT_IDS.map((id) => [id, hero.dice[id] ?? { n: 0, mod: 0 }])),
    physique: phys, baseDamage: baseDamage(units(phys)), baseArmour: baseArmour(units(phys)), armour: { cut: 0, crush: 0, thrust: 0 }, loadDice: 0,
    weapon: held && row ? { id: held.id, weapon: row } : null, shield: sh ? itemOf(sh.id, sh.kind) : null, injuries: w.injuriesOf('hero') ?? unhurt(), drew: false,
    belt: w.stowed.flatMap((s) => { const it = itemOf(s.id, s.kind); return it && it.weapon?.sv !== IMPROVISED ? [it] : []; }),
  };
}

/** Someone of the map as a fighter: their own sheet, their weapon drawn (a thing from now on), their armour. */
export function personFighter(w: SpikeWorld, id: string, sheet: RolledSheet | null, at: { x: number; z: number }): Fighter {
  const dice = (s: string): Dice => (sheet ? sheetDice(sheet, s) : { n: 0, mod: 0 });
  const phys = dice('attr:Kroppsbyggnad');
  const own = sheet?.gear.weapon ? rowOf(sheet.gear.weapon) : undefined;
  const kind = own ? kindOfRow(own.sv) : null;
  const held = w.wieldedBy(id) ?? (kind ? (w.drawWeapon(id, kind), w.wieldedBy(id)) : null);
  const row = held ? rowOfKind(held.kind) : undefined;
  const armour = sheet?.gear.armour ? ARMOUR.find((a) => a.sv === sheet.gear.armour) : undefined;
  // Their own shield, if their sheet has one and their weapon leaves a hand for it.
  const shieldKind = sheet?.gear.shield ? kindOfShield(sheet.gear.shield) : null;
  const sh = w.shieldOf(id) ?? (shieldKind && !(held && THINGS.has(held.kind) && THINGS.get(held.kind).hands === 2) ? (w.drawShield(id, shieldKind), w.shieldOf(id)) : null);
  return {
    id, side: 1, x: at.x, z: at.z, pools: Object.fromEntries(FIGHT_IDS.map((s) => [s, dice(s)])),
    physique: phys, baseDamage: baseDamage(units(phys)), baseArmour: baseArmour(units(phys)),
    armour: armour ? { cut: armour.h, crush: armour.k, thrust: armour.s } : { cut: 0, crush: 0, thrust: 0 }, loadDice: loadDiceOf(armour?.load ?? 0),
    weapon: held && row ? { id: held.id, weapon: row } : null, shield: sh ? itemOf(sh.id, sh.kind) : null, injuries: w.injuriesOf(id) ?? unhurt(), drew: false,
  };
}

/** What lies about the fight: weapons on the ground near it, as the rules see them. */
export function groundNear(w: SpikeWorld, x: number, z: number): Fight['ground'] {
  return w.weaponsLying(x, z, GROUND_REACH).flatMap((g) => {
    const it = itemOf(g.id, g.kind);
    return it ? [{ ...it, x: g.x, z: g.z } satisfies FightItem & { x: number; z: number }] : [];
  });
}
