import type { Opt, Religion } from '../../core/chargen/types';

/**
 * Religions and cults. Each has three doctrines with two options; the player takes
 * two (doctrine, option) pairs (the same doctrine twice only with different options).
 * Blurbs are our own short summaries.
 */

type D = [sv: string, en: string, a: string, b: string, star?: 0 | 1];
function doctrines(...ds: D[]): Religion['doctrines'] {
  return ds.map(([sv, en, a, b, star]) => ({
    sv,
    en,
    options: [a, b].map((g, i): Opt => ({ id: String(i), sv: '', en: '', g, star: star === i })),
  }));
}

// Shared doctrines (the same idea recurs across faiths).
const BESJALAD = (star?: 0 | 1): D => ['Besjälad natur', 'Living nature', 'E:Härma 4', 'Naturlära 2', star];
const FORFADER = (star?: 0 | 1): D => ['Förfädersandar', 'Ancestor spirits', 'E:Begravningsriter 4', 'Berättarkonst 2', star];
const TRANCE = (star?: 0 | 1): D => ['Trance & extas', 'Trance & ecstasy', 'Dansa 2', 'Gifter & droger 2', star];
const HELIG_KAMP = (star?: 0 | 1, units = 2): D => ['Helig kamp', 'Holy struggle', 'Krigföring 2', `grp:strid ${units}`, star];
const FRUKTBARHET = (star?: 0 | 1): D => ['Fruktbarhetsriter', 'Fertility rites', 'E:Behaga 4', 'Charm 2', star];
const BLODSRITER = (star?: 0 | 1): D => ['Blodsriter', 'Blood rites', 'Dolk 2', 'avtr:vald 2', star];
const ARBETE = (star?: 0 | 1): D => ['Arbete är bön', 'Work is prayer', 'Fingerfärdighet 2', 'E:Slita & släpa 4', star];
const TRANSCENDENS = (star?: 0 | 1): D => ['Transcendens', 'Transcendence', 'Filosofi 2', 'E:Meditera 4', star];
const SJALVTILL = (star?: 0 | 1): D => ['Självtillräcklighet', 'Self-reliance', 'Ledarskap 2', 'Vildmarksvana 2', star];
const SKRIFT = (star?: 0 | 1): D => ['Skriftlärdhet', 'Scriptural learning', 'Teologi 2', 'sprak 2', star];
const VALLFARD = (star?: 0 | 1): D => ['Vallfärd', 'Pilgrimage', 'Geografi 2', 'Marsch 2', star];
const MYSTERIE = (star?: 0 | 1): D => ['Mysteriekult', 'Mystery cult', 'Dupera 2', 'Ockultism 2', star];
const ANTINOMISM = (star?: 0 | 1): D => ['Antinomism', 'Antinomianism', 'Injaga fruktan 2', 'E:Perversiteter 4', star];
const FORBARMANDE = (star?: 0 | 1): D => ['Förbarmande', 'Mercy', 'Läkekonst 2', 'Undervisa 2', star];
const PLAGA = (star?: 0 | 1): D => ['Plåga & försakelse', 'Pain & renunciation', 'E:Flagellera 4', 'avtr:utsatthet 2', star];
const STJARNOR = (star?: 0 | 1): D => ['Stjärnskådning', 'Stargazing', 'E:Astrologi 4', 'Orientering 2', star];
const DJUPEN = (star?: 0 | 1): D => ['Djupens visdom', 'Wisdom of the deep', 'Simma 2', 'Sjömannaskap 2', star];
const SOLDYRKAN = (star?: 0 | 1): D => ['Soldyrkan', 'Sun worship', 'Sång & musik 2', 'E:Väderkännedom 4', star];
const RENHET = (star?: 0 | 1): D => ['Rituell renhet', 'Ritual purity', 'Ceremoni 2', 'E:Städa & tvätta 4', star];
const PRAKT = (star?: 0 | 1): D => ['Prakt & skönhet', 'Splendour & beauty', 'Handel 2', 'grp:H 4', star];
const ELDDYRKAN = (star?: 0 | 1): D => ['Elddyrkan', 'Fire worship', 'Genomskåda 2', 'E:Ingjuta mod 4', star];
const LEGALISM = (star?: 0 | 1): D => ['Legalism', 'Legalism', 'Argumentera 2', 'Lagkunskap 2', star];

export const RELIGIONS: Religion[] = [
  {
    id: 'animism', sv: 'Animism', en: 'Animism',
    blurb: 'Many shamanic faiths in which nature, weather and ancestors are alive with spirits. Common among nomads and hunters.',
    doctrines: doctrines(BESJALAD(1), FORFADER(), TRANCE(1)),
  },
  {
    id: 'mahktah', sv: 'Mahktahdyrkan', en: 'Mahktah worship', parent: 'animism', ethnic: 'tirak',
    blurb: 'The tirak goddess of darkness who made the world and bore tirak and trolls. Might makes right; cowardice is shameful.',
    doctrines: doctrines(FRUKTBARHET(), FORFADER(1), HELIG_KAMP(1)),
  },
  {
    id: 'muarak', sv: 'Muaraktron', en: 'The faith of Muarak', parent: 'animism', ethnic: 'adasier',
    blurb: 'The fish-like god of the Adasians and his twelve rules of life.',
    doctrines: doctrines(ARBETE(), BESJALAD(1), DJUPEN(0)),
  },
  {
    id: 'raun', sv: 'Raunatron', en: 'The Raun faith', parent: 'animism', ethnic: 'raunlanningar',
    blurb: 'A steppe pantheon of paired spirits; every offering must be balanced by one to its opposite.',
    doctrines: doctrines(BESJALAD(1), BLODSRITER(1), TRANCE()),
  },
  {
    id: 'siron', sv: 'Sirontron', en: 'The faith of Siron', parent: 'animism', ethnic: 'kragg-eyrener',
    blurb: 'The Kragg-Eyren warrior god with a male and a female side, who delights in blood offerings.',
    doctrines: doctrines(BLODSRITER(1), FRUKTBARHET(), HELIG_KAMP(1)),
  },
  {
    id: 'antiteism', sv: 'Antiteism', en: 'Antitheism',
    blurb: 'An old movement that sees the gods as deceitful beings to resist, not worship. State creed in Ebhron and Thalamur.',
    doctrines: doctrines(SJALVTILL(), SKRIFT(1), TRANSCENDENS(0)),
  },
  {
    id: 'cirzavell', sv: 'Cirzavell', en: 'Cirzavell', ethnic: 'cirefalier',
    blurb: 'The Cirefalian ethnic faith with its holy book of laws. It does not seek converts.',
    doctrines: doctrines(LEGALISM(0), PRAKT(), SKRIFT(1)),
  },
  {
    id: 'daak', sv: 'Daakkyrkan', en: 'The Daak church',
    blurb: 'The great monotheist church of the one god and his four prophets, led from the holy city in the empire. Confession, crusades and holy orders.',
    doctrines: doctrines(ELDDYRKAN(), HELIG_KAMP(1), VALLFARD(1)),
  },
  {
    id: 'draktro', sv: 'Draktron', en: 'The Dragon faith',
    blurb: 'An ancient faith of an eternal, cyclic world and the great dragon who keeps it turning. Druids among the Léaram elves.',
    doctrines: doctrines(FORFADER(1), SJALVTILL(1), TRANSCENDENS()),
  },
  {
    id: 'blodskult', sv: 'Blodskulterna', en: 'The blood cults', parent: 'forbjudna',
    blurb: 'Forbidden cults of blood offerings, found almost everywhere in secret.',
    doctrines: doctrines(BLODSRITER(0), MYSTERIE(1), RENHET()),
  },
  {
    id: 'xinu', sv: 'Xinukulten', en: 'The Xinu cult', parent: 'forbjudna',
    blurb: 'An ancient forbidden cult in hidden cells, worshipping pain and transgression.',
    doctrines: doctrines(ANTINOMISM(), MYSTERIE(0), PLAGA(1)),
  },
  {
    id: 'hedendom', sv: 'Hedendomen', en: 'The old pagan faith',
    blurb: 'Many local pantheons and cults of old gods tied to nature and the seasons.',
    doctrines: doctrines(BESJALAD(1), FORFADER(1), SJALVTILL()),
  },
  {
    id: 'arachna', sv: 'Arachnas folk', en: "Arachna's folk", parent: 'hedendom',
    blurb: 'Quiet offerings to the cruel, capricious spider goddess.',
    doctrines: doctrines(BESJALAD(1), MYSTERIE(1), TRANSCENDENS()),
  },
  {
    id: 'fordarvade', sv: 'De fördärvade', en: 'The Corrupted', parent: 'hedendom',
    blurb: 'A mystery cult that turns the world\'s order upside down and scorns possessions.',
    doctrines: doctrines(ANTINOMISM(), ['Armod', 'Poverty', 'Genomsöka 2', 'E:Tigga 4', 0], MYSTERIE(1)),
  },
  {
    id: 'dibuk', sv: 'Dibukkulten', en: 'The Dibuk cult', parent: 'hedendom',
    blurb: 'Worship of the grim lord of death, protector of the departed.',
    doctrines: doctrines(FORFADER(), HELIG_KAMP(0), TRANSCENDENS(0)),
  },
  {
    id: 'jordmodern', sv: 'Jordmoderns kloster', en: 'The Earth Mother cloisters', parent: 'hedendom',
    blurb: 'Worship of the goddess of life and harvest, spread among farmers under many names.',
    doctrines: doctrines(BESJALAD(1), FRUKTBARHET(), FORBARMANDE(0)),
  },
  {
    id: 'kadarier', sv: 'Kadarierna', en: 'The Kadarians', parent: 'hedendom',
    blurb: 'A wandering priesthood of fertility and animal spirits, above all the horse.',
    doctrines: doctrines(BESJALAD(), FRUKTBARHET(1), VALLFARD(0)),
  },
  {
    id: 'mansystrar', sv: 'Månsystrarna', en: 'The Moon Sisters', parent: 'hedendom',
    blurb: 'Ecstatic rites of the moon goddesses, who reveal their will in the stars.',
    doctrines: doctrines(BESJALAD(), STJARNOR(1), TRANCE(0)),
  },
  {
    id: 'navare', sv: 'Navarekulten', en: 'The Navare cult', parent: 'hedendom',
    blurb: 'The god of working sailors, who dwells in the sea.',
    doctrines: doctrines(ARBETE(0), DJUPEN(1), STJARNOR()),
  },
  {
    id: 'rotrax', sv: 'Rotraxkulten', en: 'The Rotrax cult', parent: 'hedendom',
    blurb: 'The fool-king of lies and tricksters, worshipped in carnival.',
    doctrines: doctrines(ANTINOMISM(), MYSTERIE(0), TRANCE(0)),
  },
  {
    id: 'soldyrkare', sv: 'Soldyrkarna', en: 'The Sun Worshippers', parent: 'hedendom',
    blurb: 'A stern sun god and his two children, served by scripture and self-denial.',
    doctrines: doctrines(PLAGA(1), SKRIFT(0), SOLDYRKAN()),
  },
  {
    id: 'imay', sv: 'Imaytron', en: 'The faith of Imay',
    blurb: 'The god-child of Forion and his message of forgiveness, love and non-violence.',
    doctrines: doctrines(FORBARMANDE(1), TRANSCENDENS(), VALLFARD(0)),
  },
  {
    id: 'mhim', sv: 'Mhîmrätten', en: 'The Law of Mhîm',
    blurb: 'The thousand-eyed lord of the heavenly fire, of law, script and purity; the state faith of Mûhad.',
    doctrines: doctrines(ELDDYRKAN(0), PRAKT(), RENHET(0)),
  },
  {
    id: 'samorism', sv: 'Samorismen', en: 'Samorism',
    blurb: 'The faith of the eternal cycle and the two sun gods of dawn and dusk. Peaceful, tolerant, hard-working.',
    doctrines: doctrines(ARBETE(0), FORBARMANDE(), SOLDYRKAN(0)),
  },
  {
    id: 'vind', sv: 'Vindtron', en: 'The Wind faith',
    blurb: 'Balance between the five winds within and without, taught by wind monks in mountain cloisters.',
    doctrines: doctrines(BESJALAD(), TRANSCENDENS(0), VALLFARD(1)),
  },
  {
    id: 'vontar', sv: 'Vontartron', en: 'The Vontar faith', ethnic: 'dvarg',
    blurb: 'The dwarves\' god of the four elements and his 512 rules of life. Only dwarves follow it.',
    doctrines: doctrines(ARBETE(), HELIG_KAMP(0, 4), LEGALISM(1)),
  },
];
