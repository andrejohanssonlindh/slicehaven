import type { PersonKindDef } from '../../../core/persons';

/**
 * Armed kinds of person: a calling with a weapon of its own. Each is a kind of the calling (a `guard-bow` is a guard)
 * and stacks a main weapon skill, a side one, and the gear for it on the calling's sheet (which has the guard's own
 * skills from the creator, and the warrior's attributes from its group). Weapons and armour are named as in
 * `content/chargen/equipment.ts`. The look is the calling's until the art has swords and bows to hold.
 */
const MAIL = ['Ringbrynja', 'Förstärkt läder', 'Härdat läder'];
const LEATHER = ['Mjukt läder', 'Härdat läder'];

const kinds: PersonKindDef[] = [
  {
    id: 'guard-sword', is: ['job-guard'], about: 'A guard with sword and shield.',
    sheet: { skills: { Svärd: 'main', Sköld: 'side' }, gear: { weapon: ['Stridssvärd', 'Kortsvärd'], shield: ['Liten rundsköld', 'Stor rundsköld'], armour: MAIL } },
  },
  {
    id: 'guard-spear', is: ['job-guard'], about: 'A guard with a spear, or a halberd at a gate.',
    sheet: { skills: { Spjut: 'main', Sköld: 'side' }, gear: { weapon: ['Jaktspjut', 'Hillebard'], shield: ['Stor rundsköld'], armour: MAIL } },
  },
  {
    id: 'guard-bow', is: ['job-guard'], about: 'A guard on the wall with a bow.',
    sheet: { skills: { Båge: 'main', Dolk: 'side' }, gear: { weapon: ['Kortbåge', 'Stridsbåge'], sidearm: ['Dolk', 'Kortsvärd'], armour: LEATHER } },
  },
  {
    id: 'guard-crossbow', is: ['job-guard'], about: 'A guard with a crossbow.',
    sheet: { skills: { Armborst: 'main', Dolk: 'side' }, gear: { weapon: ['Lätt armborst'], sidearm: ['Dolk', 'Kortsvärd'], armour: MAIL } },
  },
  {
    id: 'brigand-axe', is: ['job-brigand'], about: 'A brigand with an axe, waiting by a lonely road.',
    sheet: { skills: { Yxa: 'main', Kastvapen: 'side' }, gear: { weapon: ['Handyxa', 'Bredyxa', 'Stridsyxa'], sidearm: ['Kastkniv', 'Kastyxa'], armour: LEATHER } },
  },
  {
    id: 'brigand-bow', is: ['job-brigand'], about: 'A brigand who shoots from cover.',
    sheet: { skills: { Båge: 'main', Dolk: 'side' }, gear: { weapon: ['Kortbåge'], sidearm: ['Dolk', 'Huggkniv'], armour: LEATHER } },
  },
  {
    id: 'soldier-pike', is: ['job-soldier'], about: 'A soldier of the line, with a long spear.',
    sheet: { skills: { Spjut: 'main', Sköld: 'side', Svärd: 'side' }, gear: { weapon: ['Jaktspjut', 'Hillebard'], sidearm: ['Kortsvärd', 'Handyxa'], shield: ['Stor rundsköld'], armour: MAIL } },
  },
];

export default kinds;
