import type { Family, FamilyDef, Opt, People, PickGroup } from '../../core/chargen/types';

/**
 * Peoples. Grants follow the book's tables; notes and rule texts are our own words.
 * Attribute order: Speed, Presence, Physique, Vitality, Reaction, Composure, Alertness, Wisdom.
 */

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** A trait. */
function t(sv: string, en: string, g: string, note?: string): Opt {
  return { id: slug(sv), sv, en, g, note };
}
/** A starred (quick-pick) trait. */
function s(sv: string, en: string, g: string, note?: string): Opt {
  return { ...t(sv, en, g, note), star: true };
}
/** The usual "choose two of five" list. */
function val(...options: Opt[]): PickGroup {
  return { id: 'val', sv: 'Välj två', en: 'Choose two traits', pick: 2, options };
}
function one(id: string, sv: string, en: string, options: Opt[], extra: Partial<PickGroup> = {}): PickGroup {
  return { id, sv, en, pick: 1, options, ...extra };
}

const RELIC = 'When used it gives +1D6 on one relevant skill (not Dodge, mystic or combat skills).';
const DEVOUT = 'Devout: you do your best to live by the faith.';

// ——— Families ———

export const FAMILIES: Record<Family, FamilyDef> = {
  manniska: {
    id: 'manniska',
    sv: 'Människor',
    en: 'Humans',
    attrs: [8, 8, 8, 8, 8, 8, 8, 8],
    innate: [t('Anpassningsbara', 'Adaptable', 'apoang 4; slag:valfri 1', 'Humans thrive anywhere.')],
    culture: [],
    picks: [],
    blurb: 'The great majority, in countless peoples with their own tongues and customs. "Marvellous" peoples have their own attributes and traits.',
  },
  alv: {
    id: 'alv',
    sv: 'Alver',
    en: 'Elves',
    innate: [
      t('Alviska ögat', 'The elven eye', 'F:Alviska ögat 2', 'People feel an elf\'s gaze, and an elf feels theirs. The ability controls it.'),
      t('Biotropiskt fält', 'Life field', 'regel:When you bleed, roll Vitality against the bleeding\'s difficulty in the end phase; success stops it.'),
      t('Evig ungdom', 'Eternal youth', 'regel:You do not noticeably age.'),
      t('Förbannelsens folk', 'People of the curse', 'regel:You can\'t raise Wellbeing at the start of a session; regain it in other ways, e.g. by fulfilling drives.'),
      t('Nattsyn', 'Night vision', 'F:Nattsyn 4'),
    ],
    culture: [{ id: 'gudlos', sv: 'Gudlösa', en: 'Godless', g: 'regel:Godless: you follow the elven code of honour instead of a religion.', note: 'Most elves skip the religion step.' }],
    picks: [],
    blurb: 'Ageless, fine-boned, with pointed ears and intense eyes. Six tribes, mostly in their own realms.',
  },
  dvarg: {
    id: 'dvarg',
    sv: 'Dvärgar',
    en: 'Dwarves',
    innate: [
      t('Fast mark', 'Solid ground', 'inkomp:Simma; inkomp:Sjömannaskap; grund:Rida 0; regel:Seasick and travel-sick: −2D6 on all rolls aboard a ship, −1D6 when riding or in a wagon.'),
      t('Kort och kraftig', 'Short and stout', 'regel:Subtract 8 from your load when working out encumbrance (minimum 0).'),
      t('Mörkersyn', 'Darkvision', 'F:Mörkersyn 4', 'Your eyes glow red in the dark.'),
      t('Vandrare', 'Walker', 'talang:Marsch'),
    ],
    culture: [
      t('Vontars levnadsregler', "Vontar's rules of life", 'Teologi 1; doktrinx:vontar 1', 'One extra doctrine from the Vontar faith (another pick if that is your religion).'),
      t('Runristare', 'Rune-carvers', 'grp:kunskap 2; skrift:Rukh-nekh', 'Every dwarf child learns to read.'),
    ],
    picks: [],
    blurb: 'Short, bearded and stubborn as the mountain; long-lived, and prone to grand obsessions. Four great clans share one tongue and one god.',
  },
  tirak: {
    id: 'tirak',
    sv: 'Tirakfolk',
    en: 'Tirak',
    innate: [
      t('Gifttåliga', 'Poison-tough', 'regel:In combat, only a Serious wound can poison you.'),
      t('Glupare', 'Glutton', 'regel:Once per session, eat twice what you need to raise Healing rate by 2 for a day; you can\'t spend Focus until you\'ve had a proper nap.'),
      t('Klor & betar', 'Claws & tusks', 'regel:Your unarmed attacks gain the property Dangerous.'),
      t('Mahktahs försvar', "Mahktah's protection", 'regel:You can never become a lamia, and your blood is undrinkable to them.'),
      t('Motståndskraft', 'Hardy', 'regel:+1D6 on rolls to shake off infections and disease and to resist poisons and drugs.'),
      t('Skarpa sinnen', 'Keen senses', 'F:Luktsinne 4; F:Mörkersyn 4'),
    ],
    culture: [],
    picks: [],
    blurb: 'Three kinds (small gûrder, strong tirak, giant trukher) in matriarchal houses: heavy jaws, claws, red-glowing eyes and a huge appetite.',
  },
  missla: {
    id: 'missla',
    sv: 'Misslor',
    en: 'Misslor',
    attrs: [7, 11, 4, 8, 10, 8, 12, 8],
    innate: [
      t('Absolut gehör', 'Perfect pitch', 'talang:Sång & musik'),
      t('Empatisk beröring', 'Empathic touch', 'F:Empatisk beröring 4', 'Calm animals, comfort children, or stir up anger with a touch.'),
      t('Liten i maten', 'Small eater', 'regel:Your daily food and drink cost half.'),
      t('Luktsinne', 'Keen smell', 'F:Luktsinne 4'),
      t('Utbyta minnen', 'Sharing memories', 'regel:Sharing memories with another missla restores up to 2 Focus per session.'),
    ],
    culture: [
      t('Alla känner alla', 'Everyone knows everyone', 'krets:?', 'A circle named after the village or quarter you grew up in.'),
      t('Identifierbar', 'Recognisable', 'grp:K 2; talang:K:?', 'Talent in a mark of your choice, e.g. animal friend, grotesque appearance, cute, gap-toothed or scars.'),
    ],
    picks: [],
    blurb: 'Small, big-eyed folk who sense and sway feelings by touch; open-hearted, trusting, and baffled by fences and rules.',
  },
};

// ——— Humans ———

const HUMANS: People[] = [
  {
    id: 'adasier', sv: 'Adasier', en: 'Adasians', family: 'manniska', marvel: true, lo: 1, hi: 4,
    attrs: [11, 6, 8, 10, 11, 8, 8, 6],
    blurb: 'A marvellous swamp people with green-tinged skin and webbed fingers, living by the twelve rules of their god.',
    build: 'Slender, 155–160 cm, about 50 kg.',
    language: 'Adask',
    innate: [
      t('Böjlig', 'Supple', 'K:Böjlig 4'),
      t('Dricka saltvatten', 'Drinks salt water', 'regel:You can drink and live on brackish and salt water.'),
      t('Lungstyrka', 'Strong lungs', 'regel:+3D6 on all rolls to hold your breath.'),
      t('Simhud', 'Webbing', 'talang:Simma'),
    ],
    culture: [],
    picks: [
      one('totem', 'Djurandarnas lärdomar', 'Teachings of the animal spirits', [
        t('Jätteormen', 'The giant serpent', 'H:Byggare 4; Vildmarksvana 2', 'The gift of building a tribe.'),
        t('Krokodilen', 'The crocodile', 'Jakt & fiske 2; E:Ro & paddla 4', 'The gift of fishing luck.'),
        t('Landbläckfisken', 'The land octopus', 'E:Fällor 4; Krigföring 2', 'The gift of stratagems.'),
        t('Träskmyggan', 'The swamp mosquito', 'E:Genvägar 4; Marsch 2', 'The gift of quickness.'),
        t('Tusenfotingen', 'The centipede', 'E:Bakhåll 4; Gifter & droger 2', 'The gift of cunning.'),
      ]),
      val(
        s('Som fisken i vattnet', 'Like a fish in water', 'Simma 4'),
        s('Träskens faror', 'Perils of the swamp', 'Vildmarksvana 2; grp:strid 2'),
        t('Gudfruktigt hem', 'A godly home', 'Sång & musik 2; grp:H 4', 'E.g. body painter, potter, mask maker, sculptor or carver.'),
        t('Arvegods', 'Heirloom', `Historia 2; foremal:A tribal heirloom. ${RELIC} It returns to the tribe when you die.`),
        t('Muaraks folk', "Muarak's people", 'religion:muarak; regel:Regain 1 Focus per session by sinking a tenth of your catch or goods in running water.', DEVOUT),
      ),
    ],
  },
  {
    id: 'arkipelagier', sv: 'Arkipelagier', en: 'Archipelagians', family: 'manniska', lo: 5, hi: 9,
    blurb: 'Island peoples of many local cultures, restless sailors, warriors and traders.',
    build: 'Sturdy; women about 160 cm, men about 170 cm.',
    language: 'Lohemiska',
    innate: [],
    culture: [t('Arkipelagens legender', 'Legends of the archipelago', 'Berättarkonst 2; Charm 2; Simma 2')],
    picks: [
      val(
        s('Sjöbitna', 'Sea-struck', 'E:Ro & paddla 4; Sjömannaskap 2'),
        s('Universitetsutbildade', 'University-trained', 'grp:kunskap 2; sprak 2', 'Perhaps one of the scripts Tengrim, Orongo hongo or Umingo.'),
        t('Kroppskonst', 'Body art', 'Historia 2; grp:K 4', 'E.g. body jewellery, tattoos or scars.'),
        t('Milisträning', 'Militia training', 'grp:strid 3; vapen:ovanlig 1', 'E.g. a binja or javelin.'),
        t('Religiös synkretism', 'Religious syncretism', 'doktrinx:valfri 2', 'Two extra doctrines from another religion.'),
      ),
    ],
  },
  {
    id: 'asharier', sv: 'Asharier', en: 'Asharians', family: 'manniska', lo: 10, hi: 14,
    blurb: 'A patchwork culture that prizes freedom, self-reliance and new ideas.',
    build: 'Men about 170 cm, women 160 cm; famine has left many gaunt.',
    language: 'Ashariska',
    innate: [],
    culture: [t('Ashaslättens betvingare', 'Tamers of the Asha plain', 'Marsch 2; Speja 2; Vildmarksvana 2')],
    picks: [
      val(
        s('Bland skrån och gillen', 'Among guilds', 'grp:E/H 4; krets:?', 'Also a circle tied to a guild, e.g. an armourers\' guild.'),
        s('Milisträning', 'Militia training', 'grp:strid 3; vapen:ovanlig 1', 'E.g. a broad axe or war bow.'),
        t('Boskapsfösare', 'Drover', 'H:Boskapsskötare 4; Rida 2'),
        t('De många folkens rike', 'Realm of many peoples', 'Kulturkännedom 3; sprak 1', 'E.g. Felya sanari, La\'itha, Rukh or Sakhra.'),
        t('Sin egen lyckas smed', 'Maker of your own luck', 'religion:samorism; regel:Once per session, after a roll (not damage) and any opposing roll, lower Wellbeing by 1 to re-roll both the highest and the lowest die.', DEVOUT),
      ),
    ],
  },
  {
    id: 'cirefalier', sv: 'Cirefalier', en: 'Cirefalians', family: 'manniska', lo: 15, hi: 19,
    blurb: 'Proud, rich traders and sailors who guard their bloodlines, sometimes at a cost.',
    build: 'Slender; men about 175 cm, women 165 cm.',
    language: 'Faliska',
    innate: [],
    culture: [t('Falisk skolgång', 'Falian schooling', 'grp:kunskap 5; sprak 1')],
    picks: [
      one('innate-falt', 'Fältstörning', 'Field disturbance (optional)', [
        t('Albino', 'Albino', 'slag:valfri 1; attr:Reaktion -2; inkomp:Speja'),
        t('Benskör', 'Brittle bones', 'slag:valfri 1; attr:Kroppsbyggnad -1; regel:Serious wounds to arms and legs always risk a break (10), and other break and amputation checks are 4 harder.'),
        t('Blödarsjuk', 'Bleeder', 'slag:valfri 1; attr:Livskraft -1; regel:−1D6 on all rolls to stop your bleeding.'),
        t('Fjädervikt', 'Featherweight', 'slag:valfri 1; attr:Kroppsbyggnad -4; K:Utmärglad 4'),
        t('Hörselskadad', 'Hard of hearing', 'slag:valfri 1; attr:Vaksamhet -4; E:Läppläsning 4'),
        t('Klumpfot', 'Club foot', 'slag:valfri 1; attr:Förflyttning -3; inkomp:Dansa; inkomp:Marsch'),
        t('Missbildad', 'Malformed', 'slag:valfri 1; attr:Intryck -4; K:Missbildning 4'),
        t('Sinnessjuk', 'Mentally ill', 'slag:valfri 1; attr:Självkontroll -2; regel:You have a permanent disorder (roll twice on the rulebook\'s disorder table and pick one). It never heals.'),
        t('Sjuklig', 'Sickly', 'slag:valfri 1; attr:Livskraft -4; K:Sjukligt utseende 4'),
        t('Skrivsvårigheter', 'Word-blind', 'slag:valfri 1; attr:Visdom -2; regel:You can\'t take written languages or writing skills; such event results may be re-rolled.'),
      ], { optional: true, roll: { sides: 10, times: 2, must: true }, note: 'Take a random inherited flaw for an extra roll on any event table. Roll 2d10 and pick one.' }),
      val(
        s('Företagsamma', 'Enterprising', 'Dupera 2; Handel 2'),
        s('Lite finare, lite bättre', 'A little finer, a little better', 'Hovliv 2; E:Undergräva självförtroende 4'),
        t('Havens mästare', 'Masters of the seas', 'E:Navigation 4; Sjömannaskap 2'),
        t('Medicinska pionjärer', 'Medical pioneers', 'E:Kirurgi 6; paket:Medicinsk utrustning 1'),
        t('Tzorlacks lärdomar', "Tzorlack's teachings", 'religion:cirzavell; regel:Once per session, re-roll a skill roll where every die shows 1 or 2.', DEVOUT),
      ),
    ],
  },
  {
    id: 'damarier', sv: 'Damarier', en: 'Damarians', family: 'manniska', lo: 20, hi: 24,
    blurb: 'Long enslaved and long at war: a tight-lipped, superstitious and wary people.',
    build: 'Short and sturdy; women about 160 cm, men 170 cm.',
    language: 'Lägre jargiska/Targatiska/Vallanboriska',
    innate: [],
    culture: [],
    picks: [
      one('makten', 'Relation till makten', 'Stance toward the ruler', [
        t('Lojalist', 'Loyalist', 'Genomsöka 2; Injaga fruktan 2; Jakt & fiske 2'),
        t('Neutral', 'Neutral', 'Charm 2; Dupera 2; Speja 2'),
        t('Opportunist', 'Opportunist', 'Argumentera 2; Genomskåda 2; Handel 2'),
        t('Rebell', 'Rebel', 'Gömma 2; Ledarskap 2; Skumraskaffärer 2'),
      ]),
      val(
        s('Luttrad', 'Seasoned', 'valfri 2; avtr:valfri 2'),
        s('Strikta byråkrater', 'Strict bureaucrats', 'E:Bokhållning 4; Lagkunskap 2'),
        t('Dvärgavän', 'Dwarf-friend', 'Kulturkännedom 3; tal:Rukh'),
        t('Religionsfrihet', 'Freedom of faith', 'religion:daak/hedendom/vind; doktrinx:daak/hedendom/vind 2', 'One doctrine from each of the other two faiths.'),
        t('Vampyrjägare', 'Vampire hunter', 'E:Monsterkunskap 6; vapen:ovanlig 1', 'E.g. a broad axe or light crossbow.'),
      ),
    ],
  },
  {
    id: 'ebhroniter', sv: 'Ebhroniter', en: 'Ebhronites', family: 'manniska', lo: 25, hi: 30,
    blurb: 'Heirs of ancient city-states who compete in brilliance, wealth and beauty.',
    build: 'Small and slim; women about 150 cm, men 160 cm.',
    language: 'Linga lomena',
    innate: [],
    culture: [t('Österns ljus', 'Light of the East', 'grp:kunskap 5; sprak 1', 'E.g. Linga cena or the script Logayam.')],
    picks: [
      val(
        s('Andlig odling', 'Cultivated spirit', 'Argumentera 2; Filosofi 2'),
        s('Kabaluppfostran', 'Cabal upbringing', 'sprak 1; avtr:overnaturligt 2; mystikutr 1'),
        t('Städernas prakt', 'Splendour of the cities', 'Hovliv 2; grp:H 4', 'E.g. architect, mechanic, mosaicist or gardener.'),
        t('Lomenah', 'Lomenah', 'Skumraskaffärer 2; grp:E 4', 'The city poor. E.g. grave robbing, sewers, mending, begging or service.'),
        t('Sund rivalitet', 'Healthy rivalry', 'religion:antiteism; regel:When behind in a social conflict you may take +1D6 on one roll; if you then lose, Wellbeing −1.', DEVOUT),
      ),
    ],
  },
  {
    id: 'fedaker', sv: 'Fedaker', en: 'Fedaks', family: 'manniska', lo: 31, hi: 35,
    blurb: 'A wandering trading people who cling to their songs and sayings.',
    build: 'Short and slim; amber-gold eyes.',
    language: 'Vannai',
    innate: [],
    culture: [t('På resande fot', 'On the road', 'Marsch 2; Handel 2; E:Köra vagn 4')],
    picks: [
      val(
        s('Lidandets lärdomar', 'Lessons of suffering', 'Berättarkonst 3; avtr:utsatthet 1'),
        s('Ovälkomna gäster', 'Unwelcome guests', 'E:Flyktvägar 4; Kulturkännedom 2'),
        t('Ljusbringarens ättlingar', "Children of the Light-bringer", 'religion:daak; regel:+1 on the turning table when fighting demons, undead or Shadowland beings.', DEVOUT),
        t('Skugglandets band', 'Bond with the Shadowland', 'E:Skugglandsvana 6; avtr:overnaturligt 1'),
        t('Sysslolösa händer', 'Idle hands', 'grp:H 4; Fingerfärdighet 1; paket:Hantverksutrustning 1'),
      ),
    ],
  },
  {
    id: 'forianer', sv: 'Forianer', en: 'Forians', family: 'manniska', lo: 36, hi: 40,
    blurb: 'The god-child\'s chosen: generous, wary of strangers, slow to spill blood.',
    build: 'Tall and strong; women about 165 cm, men 175 cm.',
    language: 'Forianska',
    innate: [],
    culture: [t('Fredsivrare', 'Peacemakers', 'Argumentera 2; E:Diplomati 4; Filosofi 2')],
    picks: [
      val(
        s('Arochbibliotekets lärdomar', 'Learning of the Aroch library', 'grp:kunskap 4'),
        s('Det forna Dabus gåvor', 'Gifts of old Dabu', `E:Gravplundring 4; foremal:A find from a jungle ruin. ${RELIC}`),
        t('Djungelns rikedomar', 'Riches of the jungle', 'Gifter & droger 2; Vildmarksvana 2'),
        t('Savannens faror', 'Perils of the savannah', 'grp:strid 3; avtr:vald 1'),
        t('Selif Sabins sanningar', "Selif Sabin's truths", 'religion:imay; regel:Regain 1 Focus per session when you help settle a likely violent conflict without violence.', DEVOUT),
      ),
    ],
  },
  {
    id: 'genver', sv: 'Genver', en: 'Genvers', family: 'manniska', marvel: true, lo: 41, hi: 45,
    attrs: [10, 6, 10, 12, 8, 8, 6, 8],
    blurb: 'An ancient, heavy-boned mountain people in tight extended families who revere all life.',
    build: 'Big; women about 165 cm, men 175 cm.',
    language: 'Genvero',
    innate: [
      t('Starka ben', 'Strong bones', 'F:Kraftig benstomme 4; K:Starka nypor 4'),
      t('Stennäve', 'Stone fist', 'regel:Your unarmed attacks gain the property Wounding 1.'),
    ],
    culture: [t('Bergens folk', 'Mountain folk', 'Klättra 2; grp:E 4', 'E.g. mining lore, caves or weather lore.')],
    picks: [
      val(
        s('Arvet från Stensångarna', 'Legacy of the Stone Singers', 'Berättarkonst 3; avtr:utsatthet 1'),
        s('Skallkrosserskans ättlingar', "Heirs of the Skull-crusher", 'grp:strid 3; avtr:vald 1'),
        t('Slitvargar', 'Workhorses', 'Orientering 2; E:Slita & släpa 4'),
        t('Vördnad för livet', 'Reverence for life', 'K:Djurvän 6; foremal:A trained animal, e.g. an ibex, hunting dog or falcon.'),
        t('Överförande kraft', 'Transferred strength', 'religion:daak; regel:Regain 2 Focus per session by eating the heart, eyes or glands of a large creature or person you slew this scene or the last.', DEVOUT),
      ),
    ],
  },
  {
    id: 'jahanner', sv: 'Jahanner', en: 'Jahanns', family: 'manniska', lo: 46, hi: 49,
    blurb: 'A western steppe people, distrusted in the empire for their kinship with its enemy.',
    build: 'Men about 170 cm, women 160 cm; grey or green eyes.',
    language: 'Jahanniska',
    innate: [],
    culture: [t('Zhaniskt arv', 'Zhanic heritage', 'Berättarkonst 2; Dansa 2; Ockultism 2')],
    picks: [
      val(
        s('Stäppens seder', 'Ways of the steppe', 'Speja 2; Vildmarksvana 2'),
        s('Örtlärd', 'Herb-wise', 'Gifter & droger 2; Naturlära 2'),
        t('Misstrodd', 'Distrusted', 'Charm 2; Teologi 1; avtr:utsatthet 1'),
        t('Prisa Milargok!', 'Praise Milargok!', 'religion:daak; regel:+1 Control in challenges with a religious side (holy images, hymns, pilgrimages).', DEVOUT),
        t('Ryttartradition', 'Riding tradition', 'Rida 2; grp:E 4', 'E.g. animal training, driving, trick riding or soldiering.'),
      ),
    ],
  },
  {
    id: 'jargier', sv: 'Jargier', en: 'Jargians', family: 'manniska', lo: 50, hi: 54,
    blurb: 'People of a rigid, class-bound empire where only one god is allowed.',
    build: 'Men about 170 cm, women 160 cm; looks vary across the empire.',
    language: 'Lägre jargiska',
    innate: [],
    culture: [t('Kejserlig byråkrati', 'Imperial bureaucracy', 'Dupera 2; Genomskåda 2; E:Muta 4')],
    picks: [
      val(
        s('Dokumentens och sigillens rike', 'Realm of seals and papers', 'grp:kunskap 2; sprak 2'),
        s('Jargisk dekadens', 'Jargian decadence', 'Ceremoni 2; E:Perversiteter 4'),
        t('Daaks utvalda folk', "Daak's chosen people", 'religion:daak; regel:+1D6 to defend against mystic attacks made with spells.', DEVOUT),
        t('Kejsardömets gränsland', 'The imperial borderlands', 'Speja 2; grp:strid 2'),
        t('Religiös imperialism', 'Religious imperialism', 'religion:daak; Teologi 2; regel:One of your weapons is blessed with the prayer Blade of the Gods.'),
      ),
    ],
  },
  {
    id: 'kamorianer', sv: 'Kamorianer', en: 'Kamorians', family: 'manniska', marvel: true, lo: 55, hi: 57,
    attrs: [8, 6, 10, 8, 8, 8, 8, 6],
    blurb: 'Hierarchical forest tribes bound body and soul to a totem spirit.',
    build: 'Tall and strong; animal traits like slit pupils, fangs or claws.',
    language: 'Kamorianska',
    innate: [
      t('Djuriska drag', 'Beastly features', 'K:Djuriska drag 4'),
      t('Matsmältning', 'Digestion', 'F:Järnmage 2'),
    ],
    culture: [t('Vildmarksliv', 'Wild life', 'Genomsöka 2; Orientering 2; Vildmarksvana 2')],
    picks: [
      one('innate-totem', 'Totemande', 'Totem spirit', [
        t('Blodulven', 'The blood wolf', 'attr:Förflyttning 2; attr:Kroppsbyggnad 3; lakningstakt 1'),
        t('Frostvargen', 'The frost wolf', 'attr:Förflyttning 2; attr:Självkontroll 4'),
        t('Giftormen', 'The viper', 'attr:Förflyttning 2; attr:Kroppsbyggnad -2; attr:Livskraft 2; attr:Reaktion 4'),
        t('Gråvargen', 'The grey wolf', 'attr:Reaktion 2; attr:Vaksamhet 2; grundskada 2'),
        t('Korpen', 'The raven', 'attr:Förflyttning 2; attr:Kroppsbyggnad -4; attr:Reaktion 2; attr:Vaksamhet 2; attr:Visdom 4'),
        t('Sotbjörnen', 'The soot bear', 'attr:Kroppsbyggnad 4; attr:Livskraft 2'),
        t('Späckhuggaren', 'The orca', 'attr:Förflyttning -2; attr:Intryck 4; attr:Kroppsbyggnad 2; attr:Visdom 2'),
        t('Stenbocken', 'The ibex', 'attr:Livskraft 4; attr:Självkontroll 2'),
        t('Vildsvinet', 'The boar', 'attr:Kroppsbyggnad 2; attr:Livskraft 4; attr:Reaktion -2; grundrustning 2'),
        t('Vithjorten', 'The white hart', 'attr:Förflyttning 4; attr:Intryck 2; attr:Kroppsbyggnad -1; attr:Självkontroll -1; attr:Vaksamhet 2'),
      ]),
      one('innate-muarche', "Mu'arche", "Mu'arche (optional)", [
        t('Hamnskiftare', 'Shapeshifter', 'stryk 1; regel:Shapeshifter: you can take your totem animal\'s shape (10 rounds each way; gear doesn\'t change). In animal shape use the animal\'s stats but keep your mind. If you die as an animal you return to human form.'),
      ], { optional: true, note: 'Give up one event-table roll to be a shapeshifter.' }),
      val(
        s('I de kamriska ruinernas skugga', 'In the shadow of the Kamran ruins', 'Ockultism 3; avtr:overnaturligt 1'),
        s('Nordens skarpa ögon', 'Sharp eyes of the north', 'Speja 2; Spåra 2'),
        t('Avbildare', 'Image-keeper', 'Ceremoni 2; grp:H 4', 'E.g. body painter, painter, sculptor, carver or tattooist.'),
        t('Järnbärare', 'Iron-bearer', 'grp:strid 3; rustning:ovanlig 1'),
        t('Vägledd av andarna', 'Guided by the spirits', 'religion:animism; regel:Animals of your totem never attack you, and will help you in return for a level-2 sacrament in their honour.', DEVOUT),
      ),
    ],
  },
  {
    id: 'kragg-eyrener', sv: 'Kragg-Eyrener', en: 'Kragg-Eyrens', family: 'manniska', marvel: true, lo: 58, hi: 61,
    attrs: [10, 6, 10, 10, 7, 8, 7, 6],
    blurb: 'Half-giant mountain folk, men and women living apart, judged by honour and strength.',
    build: 'Huge; men about 205 cm and 115 kg, women 195 cm and 95 kg.',
    language: 'Rechin',
    innate: [t('Smärta är svaghet', 'Pain is weakness', 'regel:Once per session, lower Wellbeing by 1 to ignore all Pain penalties for a scene.')],
    culture: [],
    picks: [
      one('innate-gnista', 'Kera och Eyras folk', 'Spark of Kera or Eyra', [
        t('Eyra', 'Eyra (the feminine spark)', 'attr:Reaktion 4'),
        t('Kera', 'Kera (the masculine spark)', 'attr:Kroppsbyggnad 4'),
      ], { note: 'Those born with the other sex\'s spark are seyur, free to live in any tribe.' }),
      one('vuxenprov', 'Vuxenprov', 'Coming-of-age trial', [
        t('Eyras prov', "Eyra's trial", 'Jakt & fiske 2; Spåra 2; Vildmarksvana 2', 'Hunt alone in the wild.'),
        t('Keras prov', "Kera's trial", 'Marsch 2; Orientering 2; Vildmarksvana 2', 'The long journey to the brothers\' tribe.'),
      ]),
      val(
        s('Blodsdöpt', 'Blood-baptised', 'grp:strid 3; avtr:vald 1'),
        s('Stålets gåva', 'Gift of steel', 'grp:H 6; foremal:A Kragg sword or an Eyren cleaver.', 'E.g. blacksmith, miner, locksmith, armourer or weaponsmith.'),
        t('Misslefränder', 'Missla-friends', 'lana:missla', 'Take one trait from the misslor list.'),
        t('Parningsriter', 'Mating rites', 'Handel 2; grp:E 4', 'E.g. duelling, gorging, games, drinking or slapping.'),
        t('Sirons utvalda', "Siron's chosen", 'religion:siron; regel:Regain 2 Focus per session by drinking the blood of a large creature or person you slew this scene or the last.', DEVOUT),
      ),
    ],
  },
  {
    id: 'muhadiner', sv: 'Mûhadiner', en: 'Mûhadins', family: 'manniska', lo: 62, hi: 66,
    blurb: 'A sophisticated desert people of art, mathematics and occult learning.',
    build: 'Men about 170 cm, women 155 cm; striking pale eyes.',
    language: 'Mûhadinska',
    innate: [],
    culture: [t('Zhanisk elegans', 'Zhanic elegance', 'Berättarkonst 2; Kalkylera 2; grp:H 4', 'E.g. florist, calligrapher, cosmetician, painter or gardener.')],
    picks: [
      val(
        s('Edrons arvtagare', 'Heirs of Edron', 'Ockultism 3; avtr:overnaturligt 1'),
        s('Nomadiska rötter', 'Nomad roots', 'Rida 2; Vildmarksvana 2'),
        t('Skönhet i en fallen värld', 'Beauty in a fallen world', 'Dansa 2; grp:E 4', 'E.g. astrology, meditation, composing or poetry.'),
        t('Under den himmelska eldens ljus', 'Under the light of the heavenly fire', 'religion:mhim; regel:+1D6 on fear rolls.', DEVOUT),
        t('Ökenräder', 'Desert raids', `grp:strid 1; avtr:vald 1; foremal:Fine plunder from a raid. ${RELIC}`),
      ),
    ],
  },
  {
    id: 'raunlanningar', sv: 'Raunlänningar', en: 'Raunlanders', family: 'manniska', lo: 67, hi: 70,
    blurb: 'The famous riders of the steppe, keepers of ancestral tales and balance with the spirits.',
    build: 'Strongly built; women about 160 cm, men 175 cm.',
    language: 'Rauniska',
    innate: [],
    culture: [t('Hordens stolthet', 'Pride of the horde', 'Berättarkonst 2; Rida 2; E:Ryttarkonster 4')],
    picks: [
      val(
        s('Ett liv i strid', 'A life of struggle', 'grp:strid 2; avtr:utsatthet 1; avtr:vald 1'),
        s('Född på hästryggen', 'Born in the saddle', 'talang:Rida'),
        t('Hästarnas herre', 'Lord of horses', 'Naturlära 2; foremal:A Raunland horse of fine stock (+1D6 on all its attributes).'),
        t('Naturens balans', "Nature's balance", 'religion:raun; regel:Regain 1 Focus per session with a blood offering to a pair of gods (a few minutes).', DEVOUT),
        t('Slättens rikedomar', 'Riches of the plain', 'Jakt & fiske 2; grp:H 4', 'E.g. breeder, cattle herder, shepherd, farrier or leatherworker.'),
      ),
    ],
  },
  {
    id: 'sabrier', sv: 'Sabrier', en: 'Sabrians', family: 'manniska', lo: 71, hi: 74,
    blurb: 'A proud feudal sea-power where everyone has a place, high or low.',
    build: 'Slim and pale; women about 160 cm, men 170 cm.',
    language: 'Sabriska',
    innate: [],
    culture: [],
    picks: [
      one('feodal', 'Feodalstat', 'Place in the feudal order', [
        t('Adel', 'Nobility', 'Dansa 2; Hovliv 2; Rida 2'),
        t('Prästerskap', 'Clergy', 'Lagkunskap 2; Teologi 2; sprak 2'),
        t('Fria män', 'Free folk', 'Handel 2; E:Politik 4; grp:H 4', 'E.g. farmer, charcoal burner, shipwright, tailor or butcher.'),
        t('Livegna & trälar', 'Serfs & thralls', 'avtr:valfri 2; grp:E 8', 'E.g. mending, toil, cleaning, drinking or service.'),
      ]),
      val(
        s('Ridderliga ideal', 'Knightly ideals', 'grp:strid 2; E:Heraldik 4'),
        s('Sjöfararfolk', 'Seafaring people', 'Geografi 2; Sjömannaskap 2'),
        t('Colonans bevarare', 'Keepers of Colonan', 'grp:kunskap 3; sprak 1', 'E.g. Colonian, Old Colonian or the Colonian script.'),
        t('Helgondyrkan', 'Saint worship', 'religion:daak; regel:Choose a saint. Once per session a short prayer gives +1D6 on the next roll with the saint\'s skill.', DEVOUT),
        t('Veteran', 'Veteran', 'Marsch 2; E:Soldatliv 4'),
      ),
    ],
  },
  {
    id: 'soldier', sv: 'Soldier', en: 'Soldians', family: 'manniska', lo: 75, hi: 79,
    blurb: 'Patriotic people of four estates, living beside elves and trolls in deep forests.',
    build: 'Stocky; men about 170 cm, women 160 cm.',
    language: 'Ashariska',
    innate: [],
    culture: [],
    picks: [
      one('stand', 'Ståndssamhälle', 'Estate', [
        t('Adel', 'Nobility', 'Hovliv 2; Krigföring 2; grp:strid 2'),
        t('Samorimän', 'Samori clergy', 'H:Mattknytare 4; Teologi 3; sprak 1'),
        t('Borgare', 'Burghers', 'Argumentera 2; Handel 2; grp:H 4', 'E.g. baker, chandler or butcher.'),
        t('Bönder', 'Peasants', 'Jakt & fiske 2; Naturlära 2; grp:H 4', 'E.g. cattle herder, swineherd or farmer.'),
      ]),
      val(
        s('Bland tomtar och troll', 'Among goblins and trolls', 'Speja 3; avtr:overnaturligt 1'),
        s('Ridderliga ideal', 'Knightly ideals', 'grp:strid 2; E:Heraldik 4'),
        t('Alvvänner', 'Elf-friends', 'Kulturkännedom 2; tal:Felya sanari; foremal:An elven weapon of your choice, a gift from a dead elf friend. Losing it causes Breakdown 40 (hardship).'),
        t('Templets makt', 'Power of the temple', 'religion:samorism; regel:Regain 1 Focus per session when you show loyalty to a structure, organisation or person.', DEVOUT),
        t('Zoriánordens inflytande', 'Influence of the Zorián order', 'E:Politik 4; Teologi 2'),
      ),
    ],
  },
  {
    id: 'tauper', sv: 'Tauper', en: 'Taups', family: 'manniska', marvel: true, lo: 80, hi: 82,
    attrs: [6, 8, 7, 8, 7, 10, 9, 12],
    blurb: 'Tall, colourless exiles who prize integrity and endless self-cultivation.',
    build: 'Tall and gaunt; men about 190 cm; white skin, white irises.',
    language: 'Eirov',
    innate: [
      t('Högre insikt', 'Higher insight', 'regel:Lower Wellbeing by 1 to add +1D6 to a roll (not damage) after you see the result.'),
      t('Vitt blod', 'White blood', 'lakningstakt 1'),
    ],
    culture: [t('Skrivkunniga', 'Lettered', 'skrift:Anitna')],
    picks: [
      one('xuliav', 'Xuliav', 'How you cultivated yourself', [
        t('Debatt', 'Debate', 'grp:social 5'),
        t('Duell', 'Duel', 'grp:strid 5'),
        t('Isolering', 'Isolation', 'grp:vildmark 5'),
        t('Praktik', 'Practice', 'grp:H 10', 'E.g. embalmer, brewer, glassblower, optician or printer.'),
        t('Studier', 'Study', 'grp:kunskap 5'),
      ]),
      val(
        s('Goda råd', 'Good counsel', 'regel:Once per session, let someone else re-roll a social or knowledge skill roll (you need not know the skill).'),
        s('Saxvos', 'Saxvos', 'Argumentera 3; avtr:utsatthet 1'),
        t('Lärd', 'Learned', 'talang:Filosofi/Geografi/Gifter & droger/Historia/Kalkylera/Krigföring/Kulturkännedom/Lagkunskap/Läkekonst/Ockultism/Teologi/Teoretisk magi/Undervisa'),
        t('Teologer', 'Theologians', 'Teologi 2; doktrin 1', 'Three doctrines instead of two.'),
        t('Volafra', 'Volafra', 'Förnimma 1; avtr:overnaturligt 2; mystikutr 1'),
      ),
    ],
  },
  {
    id: 'thalasker', sv: 'Thalasker', en: 'Thalasks', family: 'manniska', lo: 83, hi: 87,
    blurb: 'Formal, careful subjects of the magocrats, proud heirs of fallen empires.',
    build: 'Slim; men about 170 cm, women 165 cm; sometimes violet eyes.',
    language: 'Thalaska',
    innate: [],
    culture: [],
    picks: [
      one('samhalle', 'Ordnat samhälle', 'Ordered society', [
        t('Folket', 'The people', 'Berättarkonst 2; K:Patriotisk 4; grp:H 4', 'E.g. glassblower, shepherd or farmer.'),
        t('Medborgare', 'Citizen', 'sprak 1; välj(War academy:: Krigföring 3, grp:strid 2 | Culture academy:: Dansa 3, grp:E 4 | Knowledge academy:: grp:kunskap 4, sprak 1 | Magic academy:: grp:mystik 2, Förnimma 1, Teoretisk magi 2)', 'Citizens are schooled at an academy.'),
      ]),
      val(
        s('Angivarsamhälle', 'Informer society', 'Smyga 2; grp:E 4', 'E.g. ciphers, escape routes, lip-reading, scapegoating or gossip.'),
        s('Resetillstånd', 'Travel permit', 'Handel 2; E:Köra vagn 4; foremal:A travel pass.'),
        t('Colonans bevarare', 'Keepers of Colonan', 'grp:kunskap 3; sprak 1', 'E.g. Colonian, Old Colonian or the Colonian script.'),
        t('Gudarnas lögner', 'Lies of the gods', 'religion:antiteism; regel:+1D6 to defend against mystic attacks made with prayers.', DEVOUT),
        t('Militärtjänst', 'Military service', 'Marsch 2; E:Soldatliv 4'),
      ),
    ],
  },
  {
    id: 'tosher', sv: 'Tosher', en: 'Toshers', family: 'manniska', marvel: true, lo: 88, hi: 91,
    attrs: [8, 7, 6, 10, 11, 8, 12, 6],
    blurb: 'Small, sharp-eyed hunter-gatherers in tribes without rank, close to their ancestors.',
    build: 'Small; women about 135 cm, men 145 cm; sharp canines.',
    language: 'Niwim/?',
    innate: [
      t('Bitsk', 'Bitey', 'K:Vassa tänder 4'),
      t('Sannsyn', 'True sight', 'talang:Förnimma/Genomsöka/Speja/Spåra'),
      t('Sjätte sinne', 'Sixth sense', 'F:Sjätte sinne 2'),
    ],
    culture: [],
    picks: [
      one('innate-tvilling', 'Tvilling', 'Twin (optional)', [
        t('Tvilling', 'A living twin', 'stryk 1; foljeslagare:Twin (loyal, highly valued); K:? 8; regel:Your twin has the same mark at the same value.'),
      ], { optional: true, note: 'Give up one event-table roll to have a twin as a companion.' }),
      one('stam', 'Stamliv', 'Tribe', [
        t('Bofast', 'Settled', 'H:Byggare 4; Klättra 2', 'Under the jungle canopy.'),
        t('Nomadisk', 'Nomadic', 'E:Logistik 4; Marsch 2', 'Out on the steppe.'),
      ]),
      val(
        s('Jägare & samlare', 'Hunters & gatherers', 'Genomsöka 2; Jakt & fiske 2'),
        s('Äran är din, bytet är stammens', 'Yours the glory, the tribe\'s the prey', 'grp:strid 2; E:Skryta 4'),
        t('Född med gåvan', 'Born with the gift', 'Förnimma 3; avtr:overnaturligt 1'),
        t('Gudarnas vilja är gudarnas mening', "The gods' will is the gods' meaning", 'religion:animism; regel:Regain 1 Focus per session by spending a scene honouring your ancestors.', DEVOUT),
        t('Naturens barn', 'Children of nature', 'Naturlära 2; foremal:5 doses of a numbing poison.'),
      ),
    ],
  },
  {
    id: 'veddo', sv: 'Veddo', en: 'Veddo', family: 'manniska', lo: 92, hi: 95,
    blurb: 'Cheerful, hospitable hunters of the frozen north, coldly practical when they must be.',
    build: 'Short and compact; dark eyes without whites.',
    language: 'Nanaqee',
    innate: [],
    culture: [
      t('Frostsjäl', 'Frost soul', 'regel:Cold steps on the temperature table count as one step closer to comfortable.'),
      t('Öde landskap', 'Barren land', 'grp:vildmark 4'),
    ],
    picks: [
      val(
        s('Det som göms i snö', 'What hides in snow', 'Genomsöka 2; Gömma 2'),
        s('Kommer upp i tö', '…comes up in the thaw', 'Naturlära 2; Ockultism 2'),
        t('Eldandens välsignelse', "Fire spirit's blessing", 'religion:animism; regel:Lower Wellbeing by 3 to deal +1D6 damage to demons, undead, ghosts and Shadowland beings for the rest of the scene, and to harm those ordinary weapons can\'t.', DEVOUT),
        t('Isviddernas betvingare', 'Tamers of the ice', 'E:Skidor & skridskor 4; grp:strid 2'),
        t('I tranlyktans ljus', 'By the light of the oil lamp', 'Sång & musik 2; grp:H 4', 'E.g. bowyer, furrier, mask maker, carver or tattooist.'),
      ),
    ],
  },
  {
    id: 'vastmarkare', sv: 'Västmarkare', en: 'Västmarkers', family: 'manniska', lo: 96, hi: 100,
    blurb: 'Tough, stubborn swamp-dwellers who won\'t let anyone sit on them.',
    build: 'Shortish; women about 160 cm, men 165 cm.',
    language: 'Ashariska',
    innate: [],
    culture: [t('Vildmarkens rikedomar', 'Riches of the wild', 'Gifter & droger 2; Naturlära 2; Vildmarksvana 2')],
    picks: [
      val(
        s('Det där är inte en dolk', '"That\'s not a dagger…"', 'Injaga fruktan 2; avtr:utsatthet 1; avtr:vald 1'),
        s('Det här är en dolk', '"…this is a dagger"', 'grp:strid 2; flagga:vapenhojning', 'Your weapon picks may be one rarity higher.'),
        t('Ett gott dagsverke', 'An honest day\'s work', 'Jakt & fiske 2; grp:H 4', 'E.g. tanner, furrier, leatherworker, butcher or carver.'),
        t('Bland mörkrets döttrar', 'Among the daughters of darkness', 'Slagsmål 3; tal:Sakhra'),
        t('Solgudarnas välsignelse', "The sun gods' blessing", 'religion:samorism; regel:On a Journey challenge you may add +1 Control, but lose 1 Wellbeing if it ends at 3 Control or less.', DEVOUT),
      ),
    ],
  },
];

// ——— Elves ———

const ELVES: People[] = [
  {
    id: 'sanari', sv: 'Sanari', en: 'Sanari elves', family: 'alv',
    attrs: [7, 10, 7, 8, 8, 11, 9, 12],
    blurb: 'The few, scholarly and occult rulers of the Sunari forest, masters of secrets.',
    build: 'Pale, black-haired and lanky; strangely coloured eyes. Women about 175 cm, men 165 cm.',
    language: 'Felya sanari',
    innate: [],
    culture: [t('Vältaliga', 'Eloquent', 'grp:kunskap 2; grp:social 3; skrift:Felya-nai')],
    picks: [
      val(
        s('Hemlighetsfulla', 'Secretive', 'Dupera 2; Gömma 2'),
        s('Sanarisk magitradition', 'Sanari magic tradition', 'talang:Ceremoni/Förnimma/Förvränga/Harmonisera'),
        t('Läromästare', 'Mentor', 'Undervisa 3; mystikutr 1'),
        t('Visdom från fordom', 'Wisdom of old', 'Kalkylera 2; Historia 2'),
        t('Viskningar från Liljans råd', 'Whispers from the Lily Council', 'Hovliv 2; Ledarskap 2'),
      ),
    ],
  },
];

ELVES.push(
  {
    id: 'thism', sv: 'Thism', en: 'Thism elves', family: 'alv',
    attrs: [9, 8, 10, 8, 10, 10, 10, 7],
    blurb: 'The warrior caste of the Sanari alliance: loyal upward, proud downward.',
    build: 'The tallest elves; pale with grey or blue eyes. Women about 185 cm, men 190 cm.',
    language: 'Felya sanari',
    innate: [],
    culture: [t('Krigets stam', 'Tribe of war', 'K:Stolt hållning 4; grp:strid 4')],
    picks: [
      val(
        s('Krigstjänst', 'Service at arms', 'regel:Once per session regain 1 Focus by spending a scene on weapon care or drill (not real fighting).'),
        s('Skogarnas väktare', 'Wardens of the forest', 'Speja 2; Vildmarksvana 2'),
        t('Husets arv', 'Legacy of the house', 'Historia 3; foremal:An elven weapon of your choice, e.g. a carwelan sword or a serine bow.'),
        t('Ordningens beskyddare', 'Keepers of order', 'Lagkunskap 3; skrift:Felya-nai'),
        t('Översittare', 'Overbearing', 'Injaga fruktan 3; avtr:vald 1'),
      ),
    ],
  },
  {
    id: 'kiriya', sv: 'Kiriya', en: 'Kiriya elves', family: 'alv',
    attrs: [9, 12, 7, 8, 10, 10, 8, 8],
    blurb: 'The "simple folk" of Sunari: workers, crafters and artists who keep sorrow away with beauty.',
    build: 'Very fair, slim and graceful. Women about 170 cm, men 175 cm.',
    language: 'Felya sanari',
    innate: [],
    culture: [t('Livets goda', 'The good things in life', 'Charm 2; grp:H 8', 'E.g. embroiderer, calligrapher, painter, sculptor or carver.')],
    picks: [
      val(
        s('Delad glädje', 'Shared joy', 'regel:Regain 1 Focus per session by helping someone else fulfil a drive at level II or III.'),
        s('Flinka fingrar', 'Nimble fingers', 'Sång & musik 3; skrift:Felya-nai'),
        t('Medlare', 'Mediators', 'Argumentera 2; Filosofi 2'),
        t('Repfäktare', 'Whip dancers', 'Dansa 3; vapen:ovanlig 1', 'E.g. a petya, the long elven whip.'),
        t('Älvalik', 'Fey-like', 'grp:K 8', 'E.g. animal friend, graceful, ringing laugh, velvet voice or beautiful.'),
      ),
    ],
  },
  {
    id: 'pyar', sv: 'Pyar', en: 'Pyar elves', family: 'alv',
    attrs: [8, 11, 7, 8, 10, 10, 8, 10],
    blurb: 'Elves who chose to live among other peoples, famous traders with vast networks.',
    build: 'Very varied looks. Women about 160 cm, men 170 cm.',
    language: 'Felya sanari',
    innate: [],
    culture: [t('Husets affärer', 'Business of the house', 'Charm 2; Handel 2; krets:?')],
    picks: [
      val(
        s('Alviska traditioner', 'Elven traditions', 'Historia 3; skrift:Felya-nai'),
        s('Handelsvägar', 'Trade routes', 'Kulturkännedom 3; paket:? 1'),
        t('Integrerade', 'Integrated', 'lana:manniska', 'One trait from a human people common in your homeland (faith traits only if you also take Converts).'),
        t('Konvertiter', 'Converts', 'flagga:religios', 'You are not godless: choose a religion.'),
        t('Tvivelaktiga förehavanden', 'Dubious dealings', 'Genomskåda 2; Skumraskaffärer 2'),
      ),
    ],
  },
  {
    id: 'learam', sv: 'Léaram', en: 'Léaram elves', family: 'alv',
    attrs: [11, 7, 8, 10, 10, 10, 10, 6],
    blurb: 'Honour-bound clan warriors and smiths of Alarinn, given to feuds.',
    build: 'Rougher and hairier than other elves. Men about 175 cm, women 155 cm.',
    language: 'Felya alarina',
    innate: [],
    culture: [t('Klankrig', 'Clan war', 'grp:strid 3; Injaga fruktan 2; avtr:vald 1')],
    picks: [
      val(
        s('Hedersord', 'Word of honour', 'regel:While you have an oath sworn, once per session take +1D6 on one roll in a fight, challenge or conflict where your word is at stake (one oath at a time).'),
        s('Partisaner', 'Partisans', 'E:Bakhåll 6; foremal:A carwelan sword.'),
        t('Hederligt arbete', 'Honest work', 'Fingerfärdighet 2; grp:H 4', 'E.g. shepherd, farrier, spinner, weaponsmith or weaver.'),
        t('Druidernas lärdomar', 'Teachings of the druids', 'flagga:religios', 'You are not godless: choose a religion, perhaps the Dragon faith.'),
        t('Hämndlystna', 'Vengeful', 'grp:strid 2; regel:Name someone who wronged you. If you win redress you go through a life-changing event.'),
      ),
    ],
  },
  {
    id: 'henea', sv: 'Henéa', en: 'Henéa elves', family: 'alv',
    attrs: [10, 6, 6, 10, 12, 10, 12, 6],
    blurb: 'Small wild elves, once enslaved by dwarves, living in harmony with nature and wary of all strangers.',
    build: 'Very small (130–135 cm), body-painted, often scantily dressed.',
    language: 'Felya nari',
    innate: [],
    culture: [t('Sek\'chake', "Sek'chake", 'regel:Animals of your spirit animal never attack you and can be urged to help you.', 'A soul-bond with an animal spirit.')],
    picks: [
      one('sekchake', "Sek'chake", 'Spirit animal', [
        t('Bävern', 'The beaver', 'attr:Intryck 1; Fingerfärdighet 2; grp:H 4', 'Spirit of creative joy.'),
        t('Ekorren', 'The squirrel', 'attr:Förflyttning 1; Hoppa 2; Klättra 2', 'Spirit of agility.'),
        t('Fladdermusen', 'The bat', 'attr:Självkontroll 1; F:Nattsyn 4', 'Spirit of the night.'),
        t('Höken', 'The hawk', 'Genomsöka 2; K:Genomträngande blick 4; Speja 2', 'Spirit of keen sight.'),
        t('Igelkotten', 'The hedgehog', 'grundrustning 2; E:Kända krigare 4', 'Spirit of protection.'),
        t('Kaninen', 'The rabbit', 'attr:Livskraft 1; Charm 2; E:Flyktvägar 4', 'Spirit of fertility.'),
        t('Näktergalen', 'The nightingale', 'attr:Intryck 1; Sång & musik 2; E:Vissla 4', 'Spirit of song.'),
        t('Räven', 'The fox', 'Genomskåda 2; F:Luktsinne 4', 'Spirit of illusions.'),
        t('Ugglan', 'The owl', 'attr:Visdom 1; Berättarkonst 2; Historia 2', 'Spirit of wisdom.'),
        t('Uttern', 'The otter', 'attr:Intryck 1; Simma 4', 'Spirit of water life.'),
      ], { roll: { sides: 10, times: 1 }, note: 'Choose, or roll a d10.' }),
      val(
        s('Vildmarkens barn', 'Children of the wild', 'Speja 2; Vildmarksvana 2'),
        s('Andliga', 'Spiritual', 'flagga:religios', 'You are not godless: choose a religion, perhaps Animism.'),
        t('Frihetskämpar', 'Freedom fighters', 'grp:strid 3; vapen:ovanlig 1', 'E.g. a noloin bow.'),
        t('Jaktlagets regler', 'Rules of the hunting party', 'Jakt & fiske 3; avtr:vald 1'),
        t('Skuggvandrare', 'Shadow walkers', 'E:Skugglandsvana 4; Smyga 2'),
      ),
    ],
  },
);

// ——— Dwarves ———

const DWARVES: People[] = [
  {
    id: 'drezin', sv: 'Drezin', en: 'Drezin dwarves', family: 'dvarg',
    attrs: [4, 8, 9, 10, 6, 12, 9, 12],
    blurb: 'Isolated northern scholars, scorned as traitors by other dwarves and hated by elves.',
    build: 'Shorter and slimmer, trimmed beards. About 105 cm, 30 kg.',
    language: 'Rukh',
    innate: [],
    culture: [],
    picks: [
      val(
        s('Hemlighetsfulla', 'Secretive', 'Dupera 2; Gömma 2'),
        s('Mystisk insikt', 'Mystic insight', 'Ockultism 3; mystikutr 1'),
        t('Mörk allians', 'Dark alliance', 'E:Diplomati 6; tal:Sakhra'),
        t('Nordliga boningar', 'Northern halls', 'Vildmarksvana 2; E:Skidor & skridskor 4'),
        t('Det berget gömmer', '"What the mountain hides"', 'religion:vontar; regel:+1 Control in social conflicts where someone tries to make you reveal secrets or show weakness.', DEVOUT),
      ),
    ],
  },
  {
    id: 'ghor', sv: 'Ghor', en: 'Ghor dwarves', family: 'dvarg',
    attrs: [4, 8, 12, 12, 6, 10, 8, 10],
    blurb: 'The oldest and largest clan: proud, old-fashioned, warm-hearted stonecutters and warriors.',
    build: 'Taller and heavier, never cut their beards. About 125 cm, 45 kg.',
    language: 'Rukh',
    innate: [],
    culture: [],
    picks: [
      val(
        s('Disciplinerade', 'Disciplined', 'E:Soldatliv 6; foremal:A dwarven weapon of your choice, e.g. a krell-kharz or krell-spaz.'),
        s('Gammalmodiga', 'Old-fashioned', 'Historia 2; Teologi 2'),
        t('Rätt ska vara rätt', 'Right is right', 'Argumentera 2; Lagkunskap 2'),
        t('Stenens barn', 'Children of stone', 'regel:+1 Control in challenges about stone and mountains (mining, caving, climbing).'),
        t('Jag står här', '"I stand here"', 'religion:vontar; regel:+1 Control in social conflicts where someone tries to change your opinions or feelings.', DEVOUT),
      ),
    ],
  },
  {
    id: 'roghan', sv: 'Roghan', en: 'Roghan dwarves', family: 'dvarg',
    attrs: [6, 8, 12, 10, 8, 10, 8, 8],
    blurb: 'Hot-headed pioneers and gifted metalworkers who love gold and braided beards.',
    build: 'Fair hair and eyes. About 120 cm, 45 kg.',
    language: 'Rukh',
    innate: [],
    culture: [],
    picks: [
      val(
        s('Konstnärliga', 'Artistic', 'grp:H 4; paket:Hantverksutrustning 1; regel:Your craft tools are superb: +1D6 with a relevant craft skill when you use them.', 'E.g. engraver, goldsmith, jeweller, mechanic or weaponsmith.'),
        s('Nytänkande', 'Inventive', 'Argumentera 2; grp:kunskap 2'),
        t('När tungan sviker', 'When words fail, fists speak', 'Berättarkonst 2; Slagsmål 2'),
        t('Utforskare', 'Explorers', 'Orientering 2; Vildmarksvana 2'),
        t('Tillkomme din rikedom', '"Thy riches come"', 'religion:vontar; regel:+1 Control in social conflicts where someone tries to cheat you of a treasure, contract or other valuable.', DEVOUT),
      ),
    ],
  },
  {
    id: 'zolod', sv: 'Zolod', en: 'Zolod dwarves', family: 'dvarg',
    attrs: [4, 10, 10, 10, 8, 10, 10, 8],
    blurb: 'Dwarves who live among humans: honest traders, master crafters and bankers.',
    build: 'Short, well-kept beards; dress in local fashion. About 115 cm, 35 kg.',
    language: 'Rukh',
    innate: [],
    culture: [],
    picks: [
      val(
        s('Kuskar', 'Wagoners', 'E:Köra vagn 6; foremal:A draught animal and a wagon.; regel:You suffer no penalty for riding in a wagon.'),
        s('Näsa för affärer', 'A nose for business', 'Charm 2; Handel 2'),
        t('Händiga', 'Handy', 'grp:H 8', 'E.g. brewer, builder, glassblower, metallurgist or armourer.'),
        t('Ingen fläck på min sköld', '"No stain on my shield"', 'religion:vontar; regel:+1 Control in social conflicts where someone casts suspicion on you or doubts your reliability.', DEVOUT),
        t('Integrerade', 'Integrated', 'lana:manniska', 'One trait from a human people common in your homeland (no faith traits if you took "No stain on my shield").'),
      ),
    ],
  },
  {
    id: 'zarakh-thad', sv: 'Zarakh-thad', en: 'Clanless dwarf', family: 'dvarg',
    attrs: [4, 8, 10, 10, 6, 10, 8, 8],
    blurb: 'Outcasts, their descendants, or dwarves raised outside dwarf culture. Choose the culture that raised you.',
    language: 'Rukh',
    innate: [t('Klanlös', 'Clanless', 'apoang 6')],
    culture: [],
    picks: [],
  },
];

// ——— Tirak ———

type Size = 'gurder' | 'tiraker' | 'trukher';
const SIZE_EN: Record<Size, string> = { gurder: 'gûrd', tiraker: 'tirak', trukher: 'trukh' };
const HUNGER: Record<Size, string> = {
  gurder: 'regel:Hungry: you eat and drink as much as a grown human.',
  tiraker: 'regel:Hungry: you eat twice as much as a human; food costs double.',
  trukher: 'regel:Hungry: you eat four times as much and drink twice as much as a human; food costs rise to match.',
};
const BUILD: Record<Size, string> = { gurder: 'About 110 cm, 30 kg.', tiraker: 'About 180 cm, 85 kg.', trukher: 'About 220 cm, 190 kg.' };
const TIRAK_ATTRS: Record<string, Record<Size, number[]>> = {
  bazirk: { gurder: [9, 5, 9, 8, 12, 8, 10, 7], tiraker: [9, 6, 13, 10, 8, 9, 8, 7], trukher: [9, 5, 16, 12, 7, 9, 7, 7] },
  frakk: { gurder: [9, 5, 9, 10, 12, 7, 10, 6], tiraker: [9, 6, 13, 12, 8, 8, 8, 6], trukher: [9, 5, 16, 14, 7, 8, 7, 6] },
  marnakh: { gurder: [9, 7, 8, 8, 12, 6, 10, 8], tiraker: [9, 8, 12, 10, 8, 7, 8, 8], trukher: [9, 7, 15, 12, 7, 7, 7, 8] },
  nidalarr: { gurder: [9, 5, 8, 8, 12, 6, 10, 6], tiraker: [9, 6, 12, 10, 8, 7, 8, 6], trukher: [9, 5, 15, 12, 7, 7, 7, 6] },
};
const DAUGHTERS = t('Mörkrets döttrar', 'Daughters of darkness', 'religion:mahktah; regel:When the mental effect Flight strikes you, you may make a Frenzied attack for as many rounds instead.', DEVOUT);

const HOUSES: { id: string; sv: string; en: string; blurb: string; culture: Opt[]; picks: PickGroup[] }[] = [
  {
    id: 'bazirk', sv: 'Bazirk', en: 'Bazirk', blurb: 'The seafaring house: sailors and pirates in every harbour, flashy and worldly.',
    culture: [t('Sjöfarare', 'Seafarers', 'Sjömannaskap 2; Klättra 2; Speja 2')],
    picks: [val(
      s('Havets vargar', 'Wolves of the sea', 'E:Navigation 6; avtr:vald 1'),
      s('Sett varje hamn', 'Seen every harbour', 'Kulturkännedom 3; sprak 1'),
      t('Den starkes rätt', 'Right of the strong', 'grp:strid 3; vapen:ovanlig 1', 'E.g. a Binderakk hammer or tirak hook.'),
      t('Hantverkare', 'Crafters', 'Fingerfärdighet 2; grp:H 4', 'E.g. boatwright, fish farmer, ropemaker, sailmaker or timberwright.'),
      DAUGHTERS,
    )],
  },
  {
    id: 'frakk', sv: 'Frakk', en: 'Frakk', blurb: 'The wild house: hardy raiders of mountains and northern wilds, where weakness is taboo.',
    culture: [t('Den starkes rätt', 'Right of the strong', 'grp:strid 3; Injaga fruktan 2; vapen:ovanlig 1', 'E.g. a Binderakk hammer or tirak hook.')],
    picks: [val(
      s('Stridsextas', 'Battle frenzy', 'Gifter & droger 2; avtr:vald 2'),
      s('Överlevare', 'Survivors', 'Jakt & fiske 2; Vildmarksvana 2'),
      t('Fruktade', 'Feared', 'talang:Injaga fruktan'),
      t('Köttätare', 'Meat-eaters', 'Speja 2; grp:H 4', 'E.g. cattle herder, swineherd, shepherd or butcher.'),
      DAUGHTERS,
    )],
  },
  {
    id: 'marnakh', sv: 'Marnakh', en: 'Marnakh', blurb: 'The integrated house: labourers, crafters, traders and soldiers in human lands.',
    culture: [t('Den starkes rättigheter', 'Rights of the strong', 'Argumentera 2; Lagkunskap 2; Slagsmål 2')],
    picks: [val(
      s('Avskum', 'Riff-raff', 'Skumraskaffärer 2; grp:E 4', 'E.g. ambush, cheating, sewers, bribery or drinking.'),
      s('Näringsidkare', 'Tradesfolk', 'Handel 2; grp:H 4', 'E.g. distiller, founder, cook, butcher or weaponsmith.'),
      t('Hyrsvärd', 'Hired swords', 'E:Soldatliv 6; vapen:ovanlig 1', 'E.g. a light crossbow or tirak hook.'),
      t('Integrerade', 'Integrated', 'lana:manniska', 'One trait from a human people common in your homeland (no faith traits if you took Daughters of darkness).'),
      DAUGHTERS,
    )],
  },
];

const TIRAK: People[] = [];
for (const h of HOUSES) {
  for (const size of ['gurder', 'tiraker', 'trukher'] as Size[]) {
    TIRAK.push({
      id: `${h.id}-${size}`, sv: `${h.sv} (${size})`, en: `${h.en} ${SIZE_EN[size]}`, family: 'tirak',
      attrs: TIRAK_ATTRS[h.id][size],
      blurb: h.blurb,
      build: BUILD[size],
      language: 'Sakhra',
      innate: [t('Hunger', 'Hunger', HUNGER[size])],
      culture: h.culture,
      picks: h.picks,
    });
  }
}
for (const size of ['gurder', 'tiraker', 'trukher'] as Size[]) {
  TIRAK.push({
    id: `nidalarr-${size}`, sv: `Nid alarr (${size})`, en: `Houseless ${SIZE_EN[size]}`, family: 'tirak',
    attrs: TIRAK_ATTRS.nidalarr[size],
    blurb: 'Tirak of no house ("lonely tribe"). Choose the culture that raised you.',
    build: BUILD[size],
    language: 'Sakhra',
    innate: [t('Hunger', 'Hunger', HUNGER[size]), t('Ättlös', 'Houseless', 'apoang 4')],
    culture: [],
    picks: [],
  });
}

// ——— Misslor ———

const MISSLOR: People[] = [
  {
    id: 'missla', sv: 'Misslor', en: 'Missla', family: 'missla',
    blurb: 'Small, big-eyed folk who sense and sway feelings by touch. They live in collective villages on the edges of human lands.',
    build: 'About 120 cm and 30 kg, whatever the sex; often freckled.',
    language: 'La\'itha',
    innate: [],
    culture: [],
    picks: [
      val(
        s('Gemenskap', 'Fellowship', 'Charm 2; Handel 2'),
        s('Man tager vad man haver', 'Make do with what you have', 'Naturlära 2; grp:H 4', 'E.g. baker, beekeeper, brewer, florist or cook.'),
        t('Allmoderns gåvor', "The All-Mother's gifts", 'religion:jordmodern; F:Djurtunga 4', DEVOUT),
        t('Civil olydnad', 'Civil disobedience', 'Gömma 2; Undvika 2'),
        t('Integrerade', 'Integrated', 'lana:manniska', 'One trait from a human people common in your homeland (no faith traits if you took the All-Mother\'s gifts).'),
      ),
    ],
  },
];

export const PEOPLES: People[] = [...HUMANS, ...ELVES, ...DWARVES, ...TIRAK, ...MISSLOR];

/** Families in display order. */
export const FAMILY_ORDER: Family[] = ['manniska', 'alv', 'dvarg', 'tirak', 'missla'];
