/**
 * Weapons and armour (stats from the equipment tables). Damage strings use the
 * source's notation: G = your base damage, T6 = D6 (converted for display).
 */
import type { Rarity } from '../../core/chargen/grants';
import { diceText, type Dice } from '../../core/chargen/tables';

export interface Weapon {
  sv: string;
  en: string;
  /** Combat skill used. */
  skill: string;
  rarity: Rarity | '–';
  /** Peoples/families the weapon belongs to (rare for everyone else). */
  culture?: string[];
  /** Physique requirement one-handed / two-handed ('–' = not possible). */
  h1: string;
  h2: string;
  /** Melee: cut / crush / thrust damage. Ranged: range, damage type, damage. */
  melee?: { hugg: string; kross: string; stick: string };
  ranged?: { range: string; type: string; dmg: string };
  props: string;
  length: string;
  weight: string;
  price: number;
  /** Picture of the weapon, for later (sprite path under public/assets). Until then a drawn placeholder per type is shown. */
  art?: string;
}

type M = [sv: string, en: string, rarity: Rarity | '–', culture: string, h1: string, h2: string, hugg: string, kross: string, stick: string, props: string, length: string, weight: string, price: number];
type R = [sv: string, en: string, rarity: Rarity | '–', culture: string, h1: string, h2: string, range: string, type: string, dmg: string, props: string, length: string, weight: string, price: number];

const melee = (skill: string, rows: M[]): Weapon[] =>
  rows.map(([sv, en, rarity, culture, h1, h2, hugg, kross, stick, props, length, weight, price]) => ({ sv, en, skill, rarity, culture: culture ? culture.split(',') : undefined, h1, h2, melee: { hugg, kross, stick }, props, length, weight, price }));
const ranged = (skill: string, rows: R[]): Weapon[] =>
  rows.map(([sv, en, rarity, culture, h1, h2, range, type, dmg, props, length, weight, price]) => ({ sv, en, skill, rarity, culture: culture ? culture.split(',') : undefined, h1, h2, ranged: { range, type, dmg }, props, length, weight, price }));

const V = 'vanlig', O = 'ovanlig', S = 'sallsynt';

export const WEAPONS: Weapon[] = [
  ...melee('Svärd', [
    ['Adasierhuggare', 'Adasian hewer', O, 'adasier', '2T6', '1T6', 'G+2T6', 'G+2', 'G+1T6', 'Giftränna, Snabb', '100 cm', '1.1 kg', 60],
    ['Binja', 'Binja', O, 'arkipelagier', '2T6', '1T6', 'G+1T6+3', 'G+1', 'G+1T6', 'Böjlig, Skärande 5, Vådlig', '105 cm', '0.7 kg', 60],
    ['Carwelansvärd', 'Carwelan sword', S, 'alv', '3T6', '2T6', 'G+3T6', 'G+1', 'G+1T6+2', 'Måttande 1, Snabb', '110 cm', '1.3 kg', 300],
    ['Gûrdersvärd', 'Gûrd sword', V, 'tirak', '1T6', '0', 'G+3', 'G+1', 'G+1T6+3', 'Bräcklig 4, Vådlig', '75 cm', '1.1 kg', 48],
    ['Kortsvärd', 'Short sword', O, '', '1T6', '0', 'G+1T6', 'G+1', 'G+1T6+2', 'Precis 1, Vådlig', '60 cm', '0.9 kg', 50],
    ['Kraggsvärd', 'Kragg sword', S, 'kragg-eyrener', '8T6', '4T6', 'G+5T6', 'G+1T6+2', 'G+1T6', 'Kraftfull, Räckvidd 1', '190 cm', '4.8 kg', 384],
    ['Krell-lukh', 'Krell-lukh', S, 'dvarg', '2T6', '1T6', 'G+2T6', 'G+2', 'G+1T6+2', 'Precis 1, Vådlig', '80 cm', '1.0 kg', 190],
    ['Kroksabel', 'Sabre', O, '', '2T6', '1T6', 'G+2T6+3', 'G+1', 'G+1T6', 'Måttande 1', '100 cm', '1.1 kg', 90],
    ['Melorsvärd', 'Melor sword', S, 'cirefalier', '5T6', '3T6', 'G+3T6+1', 'G+2', 'G+1T6+2', 'Räckvidd 1, Utmanövrerande', '140 cm', '1.9 kg', 300],
    ['Slagsvärd', 'Bastard sword', S, '', '4T6', '2T6', 'G+3T6', 'G+3', 'G+1T6+2', 'Dubbelfattning', '120 cm', '1.7 kg', 180],
    ['Storsvärd', 'Greatsword', S, '', '6T6', '3T6', 'G+4T6', 'G+1T6+2', 'G+1T6+2', 'Splittrande 1, Räckvidd 1', '150 cm', '2.8 kg', 250],
    ['Stridssvärd', 'Arming sword', O, '', '2T6', '1T6', 'G+2T6+1', 'G+2', 'G+1T6+2', 'Måttande 1, Precis 1', '95 cm', '1.2 kg', 100],
    ['Värja', 'Rapier', O, 'jargier,sabrier', '2T6', '1T6', 'G+1T6+1', 'G+1', 'G+2T6+2', 'Måttande 1, Snabb', '100 cm', '1.1 kg', 110],
  ]),
  ...melee('Yxa', [
    ['Bredyxa', 'Broad axe', O, '', '2T6', '1T6', 'G+2T6+3', 'G+3', '–', 'Bräcklig 4, Splittrande 1', '60 cm', '2.2 kg', 24],
    ['Dubbelyxa', 'Double axe', S, '', '5T6', '3T6', 'G+4T6', 'G+3', '–', 'Bräcklig 4, Splittrande 2', '95 cm', '3.0 kg', 36],
    ['Handyxa', 'Hand axe', V, '', '1T6', '0', 'G+2T6+2', 'G+1T6', '–', 'Bräcklig 3, Otymplig, Svag', '50 cm', '1.0 kg', 5],
    ['Krell-kharz', 'Krell-kharz', O, 'dvarg', '4T6', '2T6', 'G+4T6', 'G+1T6', 'G+2T6', 'Dubbelfattning', '85 cm', '2.5 kg', 210],
    ['Storyxa', 'Great axe', S, '', '7T6', '3T6', 'G+4T6+2', 'G+1T6+3', '–', 'Bräcklig 4, Otymplig, Splittrande 2', '140 cm', '3.2 kg', 75],
    ['Stridshacka', 'War pick', O, '', '2T6', '1T6', 'G+1', 'G+1T6', 'G+2T6+2', 'Bräcklig 4, Genomslag S5', '65 cm', '2.0 kg', 35],
    ['Stridsyxa', 'Battle axe', O, '', '4T6', '2T6', 'G+3T6+2', 'G+3', 'G+1T6+2', 'Bräcklig 4, Splittrande 1', '90 cm', '2.5 kg', 40],
    ['Tirakkrok', 'Tirak hook', O, 'tirak', '4T6', '2T6', 'G+4T6', 'G+1T6', '–', 'Bräcklig 4, Sargande 1', '85 cm', '2.4 kg', 24],
    ['Zoriányxa', 'Zorián axe', O, 'asharier', '3T6', '2T6', 'G+3T6', 'G+3', '–', 'Bräcklig 4, Splittrande 1, Versatil', '65 cm', '2.3 kg', 30],
  ]),
  ...melee('Dolk', [
    ['Dolk', 'Dagger', V, '', '0', '–', 'G+1', 'G+1', 'G+1T6', 'Begränsad, Precis 2, Vådlig', '30 cm', '0.3 kg', 10],
    ['Huggkniv', 'Cleaver knife', V, '', '1T6', '0', 'G+1T6', 'G+1', 'G', 'Begränsad, Kraftfull', '45 cm', '0.7 kg', 8],
    ['Kniv', 'Knife', V, '', '0', '–', 'G+1', 'G', 'G+2', 'Begränsad, Precis 2, Svag', '20 cm', '0.2 kg', 3],
    ['Parerdolk', 'Parrying dagger', S, '', '0', '–', 'G+1', 'G+1', 'G+1', 'Avväpnande 1, Begränsad, Kontrande', '40 cm', '0.3 kg', 10],
    ['Stilett', 'Stiletto', O, '', '0', '–', '–', '–', 'G+2', 'Begränsad, Diskret 16, Precis 3, Snabbdragen, Svag', '25 cm', '0.3 kg', 8],
    ['Zhinabagdh', 'Zhinabagdh', O, 'muhadiner', '0', '–', 'G+3', 'G+1', 'G+2', 'Begränsad, Snabb, Vådlig', '35 cm', '0.3 kg', 12],
  ]),
  ...melee('Spjut', [
    ['Eyrenklyvare', 'Eyren cleaver', S, 'kragg-eyrener', '5T6', '2T6', 'G+3T6', 'G+1T6', 'G+2T6', 'Bräcklig 3, Räckvidd 2, Snärjande 1', '235 cm', '2.7 kg', 32],
    ['Hillebard', 'Halberd', O, '', '6T6', '3T6', 'G+3T6+3', 'G+3', 'G+2T6', 'Bräcklig 3, Genomslag S5, Räckvidd 3, Otymplig', '250 cm', '3.2 kg', 28],
    ['Jaktspjut', 'Hunting spear', V, '', '5T6', '3T6', 'G+1', 'G+2', 'G+3T6+2', 'Bräcklig 3, Räckvidd 2, Sargande 1', '180 cm', '3.0 kg', 10],
    ['Kamorspjut', 'Kamor spear', V, 'kamorianer', '3T6', '1T6', 'G+1T6', 'G+1', 'G+2T6+1', 'Bräcklig 3, Måttande 1, Räckvidd 1', '150 cm', '2.0 kg', 5],
    ['Riddarlans', 'Knight\'s lance', O, '', '5T6', '3T6', '–', '–', 'G+2T6', 'Bräcklig 2, Kraftfull, Ryttarvapen, Räckvidd 4', '400 cm', '2.3 kg', 50],
    ['Ryttarglav', 'Rider\'s glaive', O, '', '3T6', '2T6', 'G+2T6+3', 'G+3', 'G+1T6+2', 'Bräcklig 3, Dubbelfattning, Ryttarvapen, Räckvidd 1', '120 cm', '1.6 kg', 30],
    ['Stridslans', 'War lance', O, '', '4T6', '2T6', '–', '–', 'G+2T6+2', 'Bräcklig 3, Dubbelfattning, Ryttarvapen, Räckvidd 3', '300 cm', '3.0 kg', 8],
  ]),
  ...melee('Stav', [['Stridsstav', 'Quarterstaff', O, '', '6T6', '2T6', '–', 'G+2T6', '–', 'Bräcklig 4, Kontrande, Snabb', '180 cm', '2.1 kg', 10]]),
  ...melee('Kedjevapen', [
    ['Petya', 'Petya (elven whip)', O, 'alv', '–', '2T6', '–', 'G+2T6', '–', 'Avväpnande 1, Böjlig, Räckvidd 2', '360 cm', '3.5 kg', 50],
    ['Piska', 'Whip', V, '', '1T6', '0', 'G+1', '–', '–', 'Avväpnande 1, Begränsad, Bräcklig 3, Räckvidd 1, Snärjande 1, Svag, Ytlig', '300 cm', '0.7 kg', 3],
    ['Stridsgissel', 'Flail', S, '', '4T6', '2T6', '–', 'G+3T6', '–', 'Böjlig, Svag', '90 cm', '2.1 kg', 70],
  ]),
  ...melee('Klubba', [
    ['Binderakkhammare', 'Binderakk hammer', O, 'tirak', '7T6', '4T6', '–', 'G+4T6+2', '–', 'Bräcklig 4, Kraftfull, Otymplig, Räckvidd 1, Splittrande 2', '165 cm', '5.2 kg', 70],
    ['Genverklubba', 'Genver club', V, 'genver', '4T6', '2T6', '–', 'G+3T6+2', '–', 'Brutal 1, Bräcklig 4', '120 cm', '3.1 kg', 10],
    ['Morgonstjärna', 'Morning star', S, '', '4T6', '2T6', '–', 'G+3T6+1', 'G+1T6', 'Bräcklig 4, Sargande 1', '110 cm', '2.9 kg', 60],
    ['Påk', 'Cudgel', V, '', '2T6', '1T6', '–', 'G+1T6+2', '–', 'Bräcklig 3, Måttande 1', '100 cm', '1.5 kg', 1],
    ['Storhammare', 'Great hammer', S, '', '6T6', '3T6', '–', 'G+4T6+2', 'G+2T6', 'Bräcklig 4, Otymplig, Splittrande 2', '140 cm', '3.5 kg', 80],
    ['Stridshammare', 'War hammer', O, '', '3T6', '2T6', '–', 'G+3T6', 'G+1T6+2', 'Bräcklig 4, Splittrande 1', '80 cm', '2.1 kg', 40],
    ['Stridsklubba', 'War club', O, '', '2T6', '1T6', '–', 'G+2T6+3', '–', 'Måttande 1', '70 cm', '2.5 kg', 30],
    ['Stålklubba', 'Steel mace', O, '', '1T6', '0', '–', 'G+1T6+2', '–', 'Brutal 1', '50 cm', '1.2 kg', 15],
  ]),
  ...melee('Slagsmål', [
    ['Knogjärn', 'Knuckle-duster', V, '', '0', '0', '–', 'G', '–', 'Begränsad, Snabb', '–', '0.1 kg', 5],
    ['Stridsklo', 'Battle claw', O, 'kamorianer', '0', '0', 'G+3', '–', '–', 'Begränsad, Bräcklig 2, Sargande 1, Snabb', '40 cm', '0.1 kg', 5],
    ['Stridsarmband', 'Battle bracelet', S, 'tosher', '0', '0', 'G', '–', '–', 'Begränsad, Skärande 3', '–', '0.1 kg', 3],
    ['Tillhygge', 'Improvised weapon', V, '', '1T6', '0', '–', 'G+1T6', '–', 'Begränsad, Bräcklig 2–4', 'varies', 'varies', 0],
  ]),
  ...ranged('Kastvapen', [
    ['Kastklubba', 'Throwing club', O, '', '2T6', '1T6', 'Medium', 'Kross', 'G+1T6+2', 'Bräcklig 3', '65 cm', '1.0 kg', 5],
    ['Kastkniv', 'Throwing knife', V, '', '1T6', '–', 'Medium', 'Stick', '4T6+2', 'Snabbdragen', '25 cm', '0.2 kg', 10],
    ['Kastsnara', 'Bola / lasso', V, '', '–', '1T6', 'Medium', 'special', 'special', 'Bräcklig 3, Fångar', '800 cm', '1.5 kg', 3],
    ['Kastspjut', 'Javelin', O, '', '2T6', '–', 'Long', 'Stick', 'G+2T6+2', 'Bräcklig 3', '170 cm', '0.6 kg', 8],
    ['Kastyxa', 'Throwing axe', O, '', '3T6', '2T6', 'Medium', 'Hugg', 'G+3T6', 'Bräcklig 3', '65 cm', '1.3 kg', 15],
    ['Slunga', 'Sling', V, '', '1T6', '0', 'Long', 'Kross', '3T6+2', 'Bräcklig 2, Vådlig', '50 cm', '0.1 kg', 1],
    ['Zoriányxa (kastad)', 'Zorián axe (thrown)', O, 'asharier', '4T6', '3T6', 'Medium', 'Hugg', 'G+3T6', 'Bräcklig 4, Splittrande 1, Versatil', '65 cm', '2.3 kg', 30],
  ]),
  ...ranged('Blåsrör', [
    ['Adasiskt blåsrör', 'Adasian blowpipe', O, 'adasier', '0', '–', 'Short', 'Stick', '1T6', 'Blåsrör, Bräcklig 3, Bågpil, Precis 2, Snabbdragen, Ytlig', '30 cm', '0.3 kg', 4],
    ['Blåsrör', 'Blowpipe', O, '', '1T6', '0', 'Medium', 'Stick', '1T6+1', 'Blåsrör, Bräcklig 2, Bågpil, Precis 2, Ytlig', '150 cm', '0.5 kg', 10],
  ]),
  ...ranged('Armborst', [
    ['Cineramozin', 'Cineramozin (hand crossbow)', O, 'cirefalier', '2T6', '1T6', 'Medium', 'Stick', '4T6', 'Bräcklig 2, Omladdning 6', '50 cm', '0.5 kg', 60],
    ['Krell-spaz', 'Krell-spaz', S, 'dvarg', '–', '4T6', 'Very long', 'Stick', '5T6+2', 'Bräcklig 2, Magasin 12, Omladdning 14', '95 cm', '3.9 kg', 750],
    ['Lätt armborst', 'Light crossbow', O, '', '–', '2T6', 'Very long', 'Stick', '6T6', 'Bräcklig 2, Lättsiktad, Omladdning 6', '95 cm', '3.2 kg', 30],
    ['Tungt armborst', 'Heavy crossbow', S, '', '–', '3T6', 'Very long', 'Stick', '7T6', 'Bräcklig 2, Genomslag S10, Omladdning 14', '100 cm', '5.5 kg', 200],
  ]),
  ...ranged('Båge', [
    ['Adasierbåge', 'Adasian bow', O, 'adasier', '–', '2T6', 'Long', 'Stick', '4T6', 'Bräcklig 2, Snabbskjuten, Ryttarbåge', '110 cm', '0.8 kg', 35],
    ['Kavalleribåge', 'Cavalry bow', O, 'thalasker,raunlanningar', '–', '4T6', 'Very long', 'Stick', '6T6', 'Bräcklig 2, Bågpil, Ryttarbåge', '100 cm', '1.5 kg', 150],
    ['Kortbåge', 'Short bow', V, '', '–', '2T6', 'Long', 'Stick', '4T6+2', 'Bräcklig 2, Bågpil', '120 cm', '0.9 kg', 10],
    ['Långbåge', 'Longbow', S, '', '–', '4T6', 'Very long', 'Stick', '6T6+1', 'Bräcklig 2, Bågpil', '180 cm', '1.4 kg', 80],
    ['Noloinbåge', 'Noloin bow', O, 'alv', '–', '2T6', 'Long', 'Stick', '4T6+3', 'Bräcklig 2, Bågpil, Måttande 1', '80 cm', '0.8 kg', 450],
    ['Serinebåge', 'Serine bow', S, 'alv', '–', '4T6', 'Very long', 'Stick', '6T6+2', 'Bräcklig 2, Bågpil, Måttande 1', '170 cm', '1.3 kg', 800],
    ['Stridsbåge', 'War bow', O, '', '–', '3T6', 'Very long', 'Stick', '5T6+1', 'Bräcklig 2, Bågpil', '150 cm', '1.2 kg', 25],
  ]),
];

export interface Shield {
  sv: string;
  en: string;
  rarity: Rarity;
  h1: string;
  h2: string;
  melee: string;
  ranged: string;
  cover: string;
  dmg: string;
  props: string;
  price: number;
}

export const SHIELDS: Shield[] = [
  { sv: 'Bucklare', en: 'Buckler', rarity: V, h1: '1T6', h2: '0', melee: '+2', ranged: '+2', cover: '+2', dmg: 'G+2', props: '', price: 10 },
  { sv: 'Liten rundsköld', en: 'Small round shield', rarity: V, h1: '2T6', h2: '1T6', melee: '+3', ranged: '+1T6', cover: '+4', dmg: 'G+2', props: 'Bräcklig 3', price: 5 },
  { sv: 'Riddarsköld', en: "Knight's shield", rarity: V, h1: '3T6', h2: '2T6', melee: '+1T6', ranged: '+2', cover: '+6', dmg: 'G+1T6', props: 'Bräcklig 3, Säker', price: 10 },
  { sv: 'Stor rundsköld', en: 'Large round shield', rarity: V, h1: '3T6', h2: '2T6', melee: '+1T6', ranged: '±0', cover: '+8', dmg: 'G+3', props: 'Bräcklig 3', price: 7 },
  { sv: 'Välvd sköld', en: 'Curved shield', rarity: V, h1: '3T6', h2: '2T6', melee: '+3', ranged: '±0', cover: '+10', dmg: 'G+2', props: 'Bräcklig 3, Säker', price: 15 },
];

export interface Armour {
  sv: string;
  en: string;
  rarity: Rarity;
  /** Armour against cut / crush / thrust. */
  h: number;
  k: number;
  s: number;
  /** Full suit: load and price. */
  load: number;
  price: number;
}

export const ARMOUR: Armour[] = [
  { sv: 'Vadderat tyg', en: 'Padded cloth', rarity: V, h: 2, k: 4, s: 2, load: 8, price: 24 },
  { sv: 'Päls', en: 'Fur', rarity: V, h: 4, k: 2, s: 2, load: 8, price: 32 },
  { sv: 'Mjukt läder', en: 'Soft leather', rarity: V, h: 3, k: 3, s: 2, load: 8, price: 40 },
  { sv: 'Härdat läder', en: 'Hardened leather', rarity: V, h: 6, k: 5, s: 6, load: 16, price: 120 },
  { sv: 'Förstärkt läder', en: 'Reinforced leather', rarity: V, h: 6, k: 6, s: 4, load: 16, price: 160 },
  { sv: 'Ringläder', en: 'Ringed leather', rarity: V, h: 7, k: 5, s: 4, load: 16, price: 160 },
  { sv: 'Fjällpansar', en: 'Scale armour', rarity: O, h: 10, k: 8, s: 6, load: 24, price: 280 },
  { sv: 'Lamellpansar', en: 'Lamellar armour', rarity: O, h: 10, k: 6, s: 8, load: 24, price: 320 },
  { sv: 'Ringbrynja', en: 'Mail', rarity: O, h: 12, k: 4, s: 8, load: 24, price: 400 },
  { sv: 'Tunnplåt', en: 'Light plate', rarity: S, h: 10, k: 7, s: 10, load: 24, price: 800 },
  { sv: 'Plåt', en: 'Plate', rarity: S, h: 15, k: 12, s: 15, load: 32, price: 1000 },
];

const PROPS: Record<string, string> = {
  Avväpnande: 'Disarming', Begränsad: 'Limited', Blåsrör: 'Blowpipe', Brutal: 'Brutal', Bräcklig: 'Fragile', Bågpil: 'Arrow', Böjlig: 'Flexible', Diskret: 'Discreet',
  Dubbelfattning: 'Double grip', Fångar: 'Entangles', Genomslag: 'Piercing', Giftränna: 'Poison groove', Kontrande: 'Countering', Kraftfull: 'Powerful', Lättsiktad: 'Easy aim',
  Magasin: 'Magazine', Måttande: 'Measured', Obeväpnad: 'Unarmed', Omladdning: 'Reload', Otymplig: 'Unwieldy', Precis: 'Precise', Ryttarbåge: 'Horse bow', Ryttarvapen: 'Cavalry weapon',
  Räckvidd: 'Reach', Sargande: 'Wounding', Skärande: 'Cutting', Snabb: 'Quick', Snabbdragen: 'Quick-draw', Snabbskjuten: 'Quick-shot', Snärjande: 'Snaring', Splittrande: 'Shattering',
  Svag: 'Weak', Säker: 'Secure', Utmanövrerande: 'Outmanoeuvring', Versatil: 'Versatile', Vådlig: 'Dangerous', Ytlig: 'Shallow',
};

export function propsEn(props: string): string {
  return props.replace(/[A-ZÅÄÖ][a-zåäö]+/g, (w) => PROPS[w] ?? w);
}

export const DAMAGE_TYPE_EN: Record<string, string> = { Hugg: 'cut', Kross: 'crush', Stick: 'thrust' };

/** "G+2T6+1" → "BD+2D6+1" (BD = base damage). */
export function dmgEn(d: string): string {
  return d.replace(/T6/g, 'D6').replace(/^G/, 'BD');
}

const RANK: Record<string, number> = { vanlig: 0, ovanlig: 1, sallsynt: 2, '–': 0 };

/** Effective rarity: cultural weapons count as rare outside their culture. */
export function weaponRank(w: Weapon, peopleId?: string, family?: string): number {
  const own = !w.culture || (peopleId && w.culture.includes(peopleId)) || (family && w.culture.includes(family)) || (peopleId && w.culture.some((c) => peopleId.startsWith(c)));
  return own ? RANK[w.rarity] : 2;
}

export function rarityRank(r: Rarity): number {
  return RANK[r];
}

/** Weapon types in display order: the combat skill they use, an English label and a placeholder glyph. */
export const WEAPON_TYPES: { skill: string; en: string; glyph: string; ranged?: boolean }[] = [
  { skill: 'Svärd', en: 'Swords', glyph: '🗡' },
  { skill: 'Yxa', en: 'Axes', glyph: '🪓' },
  { skill: 'Dolk', en: 'Daggers & knives', glyph: '🔪' },
  { skill: 'Spjut', en: 'Spears & polearms', glyph: '🔱' },
  { skill: 'Stav', en: 'Staffs', glyph: '🦯' },
  { skill: 'Kedjevapen', en: 'Whips & flails', glyph: '⛓' },
  { skill: 'Klubba', en: 'Clubs & hammers', glyph: '🔨' },
  { skill: 'Slagsmål', en: 'Brawling', glyph: '👊' },
  { skill: 'Kastvapen', en: 'Thrown', glyph: '🎯', ranged: true },
  { skill: 'Blåsrör', en: 'Blowpipes', glyph: '🎋', ranged: true },
  { skill: 'Armborst', en: 'Crossbows', glyph: '🏹', ranged: true },
  { skill: 'Båge', en: 'Bows', glyph: '🏹', ranged: true },
];

/** What each weapon property does, in short (our own words). */
export const PROP_INFO: Record<string, string> = {
  Avväpnande: 'Good for tearing weapons and shields out of hands: disarming costs X less.',
  Begränsad: 'Short reach: against big creatures you roll twice on the turn table and take the worse.',
  Blåsrör: 'Made for poison darts: a hit that deals fatigue gives a serious poisoning.',
  Brutal: 'Never leaves light wounds: when it deals fatigue, add X more.',
  Bräcklig: 'Wood or other weak material: an enemy can break it by spending X advantage.',
  Bågpil: 'With a quiver at hand you can draw an arrow for 1 fatigue instead of an action.',
  Böjlig: 'Bends around guards: the defender gets −1D6 (not when dodging).',
  Diskret: 'Easy to hide: finding it takes a search roll against X.',
  Dubbelfattning: 'Grips for two hands: +2 damage when used two-handed.',
  Fångar: 'Barbs or snares: a hit leaves the target grappled.',
  Genomslag: "Punches through armour: the target's protection against that damage type drops by X.",
  Giftränna: 'Poison grooves: a poisoned blade stays poisoned all fight.',
  Kontrande: 'Quick to strike back: counter-attacks without a penalty.',
  Kraftfull: 'Deadly with a full swing: +1D6 damage on powerful attacks.',
  Lättsiktad: 'Easy to aim, even untrained: aiming gives +1D6 instead of +2.',
  Magasin: 'A magazine: X shots before reloading (if you meet the Physique need).',
  Måttande: 'Easy to place: precise hits cost X less.',
  Obeväpnad: 'A natural weapon: serious wounds use the brawling table.',
  Omladdning: 'Slow to reload: a full round and a skill roll against X.',
  Otymplig: 'Big and heavy: no quick attacks.',
  Precis: 'Finds gaps in armour: exploiting an opening costs X less.',
  Ryttarbåge: 'Made for horseback: no Physique penalty when shooting from the saddle.',
  Ryttarvapen: 'Made for horseback: a cavalry charge gives +2D6 instead of +1D6.',
  Räckvidd: 'Long reach: +XD6 on the reaction roll when a fight starts.',
  Sargande: 'Leaves terrible wounds: +X on the injury and turn tables.',
  Skärande: 'Cruel against the unarmoured: counts as piercing X (cut and thrust) when they wear no armour.',
  Snabb: 'Fast and balanced: quick attacks cost no fatigue.',
  Snabbdragen: 'Drawn in a blink: no action and no penalty to draw it.',
  Snabbskjuten: 'Light draw: drawing an arrow costs no action and no fatigue.',
  Snärjande: 'Catches arms and legs: tripping costs X less.',
  Splittrande: 'Heavy enough to smash shields and weak weapons: breaking costs X less.',
  Svag: 'Poor for parrying: −1D6 defending against armed attacks.',
  Säker: "Strapped on: you can't drop it, and disarming you costs 1 more.",
  Utmanövrerande: 'Good against many foes: group attacks without a penalty.',
  Versatil: 'Works both in melee and thrown.',
  Vådlig: 'Lethal in the right hands: increased damage gives +1D6 instead of +2.',
  Ytlig: 'Hard to drive deep: deals only fatigue, never serious wounds.',
};

/** Split "Bräcklig 4, Precis 1" into [{ sv: 'Bräcklig', en: 'Fragile 4', info }]. */
export function propList(props: string): { sv: string; en: string; info: string }[] {
  return props
    .split(/,\s*/)
    .filter(Boolean)
    .map((p) => {
      const sv = /^[A-ZÅÄÖ][a-zåäö]+/.exec(p)?.[0] ?? p;
      const x = /(\d+(?:–\d+)?)\s*$/.exec(p)?.[1];
      const info = PROP_INFO[sv] ?? '';
      return { sv, en: propsEn(p), info: x ? info.replace(/X/g, x) : info };
    });
}

/** Weapon damage with your base damage added: "G+2T6+1" + 2D6+2 → "4D6+3". Non-dice text is returned as it is. */
export function withBaseDamage(dmg: string, bd: Dice): string {
  if (!/^G|T6|^\d/.test(dmg)) return dmg;
  let n = 0;
  let mod = 0;
  let rest = dmg;
  if (rest.startsWith('G')) {
    n += bd.n;
    mod += bd.mod;
    rest = rest.slice(1);
  }
  for (const m of rest.matchAll(/([+-]?)(\d+)(T6)?/g)) {
    const v = Number(m[2]) * (m[1] === '-' ? -1 : 1);
    if (m[3]) n += v;
    else mod += v;
  }
  return diceText({ n, mod });
}

/**
 * Physique need for one or two hands, against your Physique dice.
 * undefined = can't be used that way; otherwise the penalty in D6 (0 = none).
 */
export function physiqueCheck(need: string, physique: Dice): { penalty: number } | undefined {
  if (need === '–') return undefined;
  const req = need === '0' ? 0 : Number(/(\d+)T6/.exec(need)?.[1] ?? 0);
  return { penalty: Math.max(0, req - physique.n) };
}

/** English name for a weapon, shield or armour key; other text as it is. */
export function itemEn(sv: string): string {
  return WEAPONS.find((x) => x.sv === sv)?.en ?? SHIELDS.find((x) => x.sv === sv)?.en ?? ARMOUR.find((x) => x.sv === sv)?.en ?? sv;
}
