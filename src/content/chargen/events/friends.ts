import { BACKGROUNDS } from '../backgrounds';
import { table, type Row } from './util';

/**
 * Friends & Foes: who a friend, enemy, lover or contact is. Same callings as the
 * background table, each with two skills (only used when the result says so).
 * Always rolled twice, keep one.
 */
const SKILLS: Record<number, string> = {
  1: 'Handel 2; Lagkunskap 2', 2: 'E:Huskurer 4; Naturlära 2', 3: 'Dansa 2; Hovliv 2', 4: 'H:Arkitekt 4; Kalkylera 2', 5: 'H:Balsamerare 4; Fingerfärdighet 2',
  6: 'H:Barberare 4; K:Välvårdat hår 4', 7: 'E:Barnuppfostran 4; Sång & musik 2', 8: 'Dupera 2; H:Förfalskare 4', 9: 'Ceremoni 2; Teoretisk magi 2', 10: 'Genomsöka 2; sprak 2',
  11: 'H:Jordbrukare 4; Naturlära 2', 12: 'H:Boskapsskötare 4; Speja 2', 13: 'H:Florist 4; Gifter & droger 2', 14: 'H:Byggare 4; H:Timmerman 4', 15: 'Lagkunskap 2; E:Muta 4',
  16: 'Dansa 2; K:Graciös 4', 17: 'Gömma 2; E:Simulant 4', 18: 'E:Diplomati 4; Kulturkännedom 2', 19: 'Filosofi 2; E:Meditera 4', 20: 'Ceremoni 2; Ockultism 2',
  21: 'Argumentera 2; Filosofi 2', 22: 'Jakt & fiske 2; H:Nätknytare 4', 23: 'E:Bokhållning 4; grp:strid 2', 24: 'Injaga fruktan 2; E:Rep & knopar 4', 25: 'E:Kirurgi 4; Läkekonst 2',
  26: 'F:? 2; Förnimma 2; omstopt', 27: 'E:Duellera 4; grp:strid 2', 28: 'Charm 2; E:Kränga 4', 29: 'Smyga 2; E:Vädja 4', 30: 'E:Kända krigare 4; grp:strid 2',
  31: 'Genomsöka 2; E:Gravplundring 4', 32: 'E:Grottsystem 4; Klättra 2', 33: 'Filosofi 2; E:Häda 4', 34: 'E:Akrobatik 4; E:Gyckla 4', 35: 'Handel 2; E:Köra vagn 4',
  36: 'Genomskåda 2; E:Gåtor 4', 37: 'Slagsmål 2; E:Supa 4', 38: 'Ceremoni 2; Läkekonst 2', 39: 'Teologi 2; grp:strid 2', 40: 'E:Heraldik 4; Hovliv 2',
  41: 'Hovliv 2; Ledarskap 2', 42: 'Naturlära 2; Ockultism 2', 43: 'Genomskåda 2; grp:strid 2', 44: 'Kalkylera 2; H:Mekaniker 4', 45: 'Jakt & fiske 2; Spåra 2',
  46: 'Geografi 2; H:Kartograf 4', 47: 'H:Målare 4; H:Snidare 4', 48: 'H:Kock 4; K:Välkomnande leende 4', 49: 'Historia 2; sprak 2', 50: 'Dupera 2; E:Läppläsning 4',
  51: 'Geografi 2; Rida 2', 52: 'E:Behaga 4; Charm 2', 53: 'Argumentera 2; Lagkunskap 2', 54: 'Genomskåda 2; grp:strid 2', 55: 'Undervisa 2; E:Utskällningar 4',
  56: 'Gifter & droger 2; grp:strid 2', 57: 'Marsch 2; Vildmarksvana 2', 58: 'E:Anatomi 4; Läkekonst 2', 59: 'Berättarkonst 2; sprak 2', 60: 'Dupera 2; H:Mjölnare 4',
  61: 'E:Monsterkunskap 4; Naturlära 2', 62: 'Teologi 2; grp:H 4', 63: 'E:Komponera musik 4; Sång & musik 2', 64: 'Sjömannaskap 2; grp:strid 2', 65: 'E:Poesi 4; K:Romantiker 4',
  66: 'Spåra 2; grp:strid 2', 67: 'Dansa 2; E:Flörta 4', 68: 'E:Begravningsriter 4; Teologi 2', 69: 'Skumraskaffärer 2; H:Slaktare 4', 70: 'Hovliv 2; grp:strid 2',
  71: 'Hovliv 2; E:Supa 4', 72: 'E:Bakhåll 4; Vildmarksvana 2', 73: 'H:Gruvbrytare 4; Krigföring 2', 74: 'Sjömannaskap 2; E:Sjömanshistorier 4', 75: 'H:Skogshuggare 4; Yxa 2',
  76: 'H:Skrivare 4; sprak 2', 77: 'Ledarskap 2; grp:H 4', 78: 'H:Brodör 4; H:Skräddare 4', 79: 'Berättarkonst 2; E:Skådespel 4', 80: 'H:Grovsmed 4; H:Klensmed 4',
  81: 'Gömma 2; Skumraskaffärer 2', 82: 'Marsch 2; grp:strid 2', 83: 'Speja 2; Vildmarksvana 2', 84: 'E:Fuska 4; Spel & dobbel 2', 85: 'E:Astrologi 4; Kalkylera 2',
  86: 'Krigföring 2; E:Logistik 4', 87: 'grp:kunskap 2; sprak 2', 88: 'Aspekt? 2; Injaga fruktan 2', 89: 'Gömma 2; E:Tigga 4', 90: 'Fingerfärdighet 2; E:Låsdyrkning 4',
  91: 'E:Slita & släpa 4; E:Städa & tvätta 4', 92: 'Kulturkännedom 2; sprak 2', 93: 'H:Tryckare 4; E:Uppvigla 4', 94: 'E:Djurträning 4; K:Djurvän 4', 95: 'Kanalisera 2; omstopt; F:? 2',
  96: 'Genomsöka 2; Speja 2', 97: 'Undervisa 2; E:Vapenkata 4', 98: 'H:Vapensmed 4; grp:strid 2', 99: 'E:Genvägar 4; Orientering 2', 100: 'Hoppa 2; Klättra 2',
};

const ROWS: Row[] = BACKGROUNDS.map((b) => [b.n, b.n, b.sv, b.en, SKILLS[b.n]]);

export const FRIENDS = table('vf', 'Vänner & fiender', 'Friends & Foes', ROWS);
