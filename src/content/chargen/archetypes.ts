import type { Archetype, Environment, LivingStandard, Opt, PickGroup } from '../../core/chargen/types';

/** Archetypes (24 units + 3 event rolls each), environments (16 units + 3 rolls) and living standards. */

const o = (id: string, en: string, g: string, star?: boolean, note?: string): Opt => ({ id, sv: '', en, g, star, note });
const two = (...options: Opt[]): PickGroup => ({ id: 'x', sv: 'Välj två', en: 'Choose two extras', pick: 2, repeat: true, options });
const one = (...options: Opt[]): PickGroup => ({ id: 'x', sv: 'Välj ett', en: 'Choose one extra', pick: 1, options });
const SKILLED = (what: string) => `regel:Exceptional ${what}: +1D6 with one fitting skill when it can be used (name the skill).`;

export const ARCHETYPES: Archetype[] = [
  {
    id: 'donare', sv: 'Donare', en: 'Toiler',
    blurb: 'The workers who carry society on their backs: crafters, servants, apprentices, jacks of all trades.',
    g: 'slag:fa 2; slag:valfri 1; grp:H 4; grp:rorelse 4; grp:social 4; valfri 12; krets:?; paket:? 1; vapen:vanlig 1',
    notes: ['A circle named after a trade, e.g. farmers, deckhands, court painters, cobblers or slaves.'],
    extras: two(
      o('avtr', 'Hardened', 'avtr:utsatthet 1; avtr:vald 1', true),
      o('verkstad', 'Workshop', 'regel:You have a workshop: +1D6 on relevant craft rolls when working there.', true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:vanlig 1'),
      o('foljeslagare', 'Companion', 'foljeslagare:Superior (easily persuaded)', false, 'Formally above you, but trusts you or is naive.'),
      o('krets', 'Guild member', 'krets:?', false, 'A respected member of a guild; the circle is named after it.'),
    ),
    occupations: {
      hav: 'Fisher, docker, seafarer', hov: 'Artist, cupbearer, servant', harlager: 'Jailer, latrine digger, weaponsmith', landsbygd: 'Day labourer, farmhand, farmer',
      larosate: 'Scribe, student, servant', sekt: 'Acolyte, gravedigger, sacrificial lamb', stad: 'Barber, journeyman, tailor', underjord: 'Torch maker, stonecutter, mushroom grower',
      undrevarlden: 'Grave robber, knacker, beggar', vildmark: 'Hunter, nomad, woodcutter',
    },
  },
  {
    id: 'krigare', sv: 'Krigare', en: 'Warrior',
    blurb: 'Those who have given their lives to battle, for honour, god, or good silver.',
    g: 'slag:sd 2; slag:valfri 1; grp:K 4; grp:strid 10; grp:vildmark 4; valfri 6; rustning:ovanlig 1; vapen:vanlig 2; vapen:ovanlig 2; paket:? 1',
    extras: two(
      o('avtr', 'Hardened', 'avtr:vald 2', true),
      o('bevapning', 'Heavy arms', 'välj(Two rare weapons:: vapen:sallsynt 2 | A rare armour:: rustning:sallsynt 1)', true),
      o('foljeslagare', 'Companion', 'foljeslagare:Armsbearer'),
      o('krets', 'Order or company', 'krets:?', false, 'A respected member of a fellowship, order or unit.'),
      o('riddjur', 'Mount', 'foremal:A battle-trained mount.'),
      o('stridskonst', 'Fighting style', 'regel:4 units in a fighting style of your choice (needs the combat supplement).'),
    ),
    occupations: {
      hav: 'Marine, privateer, pirate', hov: 'Life guard, knight, gatekeeper', harlager: 'Sellsword, recruit, soldier', landsbygd: 'Border guard, brigand, veteran',
      larosate: 'Templar, weapon master, squire', sekt: 'Protector, ritual killer, temple guard', stad: 'Gladiator, enforcer of law, guard', underjord: 'Raider, monster hunter, spider warden',
      undrevarlden: 'Troublemaker, debt collector, killer for hire', vildmark: 'Berserk, deserter, caravan guard',
    },
  },
  {
    id: 'kramare', sv: 'Krämare', en: 'Merchant',
    blurb: 'Traders, innkeepers and smugglers with a nose for profit and a quick mouth.',
    g: 'slag:fa 1; slag:ii 1; slag:valfri 1; grp:kunskap 4; grp:K 4; grp:social 8; valfri 8; foremal:A draught animal with a wagon.; foremal:A lot of trade goods (spices, cloth, timber…), worth twice your starting silver if sold in another town.; krets:?; vapen:vanlig 1',
    notes: ['A circle named after suppliers or customers, e.g. noble ladies, fur trappers, smugglers or a particular caravan.'],
    extras: two(
      o('avtr', 'Hardened', 'avtr:utsatthet 2', true),
      o('kontakt', 'A contact in every town', 'regel:+1D6 on all circle rolls.', true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:vanlig 1'),
      o('krets', 'Trading house', 'krets:?', false, 'A respected member of a trading house.'),
      o('kontrakt', 'Contract', 'regel:A contract lets you cross a closed border or trade in controlled goods: +1D6 with a fitting skill (e.g. Argue, Trade or Law) where it applies.'),
    ),
    occupations: {
      hav: 'Spice trader, ship broker, customs collector', hov: 'Bailiff, wine connoisseur, matchmaker', harlager: 'Investor, quartermaster, slaver', landsbygd: 'Pedlar, innkeeper, miller',
      larosate: 'Alchemical wholesaler, bookseller, patron', sekt: 'Drug steward, recruiter, relic seller', stad: 'Businessperson, usurer, tavern keeper', underjord: 'Mine magnate, gem dealer, broker',
      undrevarlden: 'Fence, go-between, pimp', vildmark: 'Caravan master, fur trader, herb trader',
    },
  },
  {
    id: 'ledare', sv: 'Ledare', en: 'Leader',
    blurb: 'Nobles, cult leaders and officers: those with power over others\' lives.',
    g: 'slag:ii 2; slag:valfri 1; grp:kunskap 6; grp:K 4; grp:social 8; valfri 6; krets:?; foremal:An emblem of your position (+1D6 on Presence in social conflicts where it impresses).; paket:? 1; vapen:vanlig 1; vapen:ovanlig 1',
    notes: ['A circle named after an influential calling, e.g. Daak priests, bailiffs, gang leaders, councillors or a noble family.'],
    extras: two(
      o('avtr', 'Hardened', 'avtr:utsatthet 1; avtr:vald 1', true),
      o('lejdebrev', 'Letter of safe conduct', 'regel:A signed letter from a local power: +1D6 with a fitting skill (e.g. Court Life, Intimidate or Law) where it can be used.', true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:ovanlig 1'),
      o('foljeslagare', 'Companion', 'foljeslagare:Second-in-command'),
      o('krets', 'Followers', 'krets:?', false, 'You lead a crew, guild, congregation or gang that respects you.'),
    ),
    occupations: {
      hav: 'Admiral, head of a trading house, captain', hov: 'Aristocrat, general, marshal of the court', harlager: 'Warlord, mutineer, sergeant', landsbygd: 'Robber baron, stable master, landowner',
      larosate: 'Abbot or abbess, rector, head librarian', sekt: 'Demagogue, guru, cult leader', stad: 'Councillor, guild master, captain of the guard', underjord: 'Foreman, dwarf king, elder',
      undrevarlden: 'Brothel keeper, gang leader, rebel', vildmark: 'Expedition leader, chieftain, robber king',
    },
  },
  {
    id: 'lard', sv: 'Lärd', en: 'Scholar',
    blurb: 'Physicians, academics and advisers who have given themselves to study.',
    g: 'slag:sl 2; slag:valfri 1; grp:E 4; grp:kunskap 10; grp:social 4; valfri 6; sprak 1; paket:? 1; vapen:vanlig 1',
    extras: two(
      o('avtr', 'Hardened', 'avtr:utsatthet 1; avtr:overnaturligt 1', true),
      o('skrift', 'Book collection', 'regel:A thick tome on one knowledge skill (name it): +1D6 with that skill in challenges where the book helps.', true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:vanlig 1'),
      o('foljeslagare', 'Companion', 'foljeslagare:Pupil'),
      o('krets', 'Secret society', 'krets:?', false, 'A respected member of a secret society.'),
    ),
    occupations: {
      hav: 'Navigator, interpreter, explorer', hov: 'Diplomat, court physician, adviser', harlager: 'Field surgeon, chronicler, strategist', landsbygd: 'Apothecary, bailiff, surveyor',
      larosate: 'Researcher, magic theorist, inventor', sekt: 'Embalmer, heretic, Xinu cultist', stad: 'Administrator, physician, official', underjord: 'Geologist, surgeon, explorer',
      undrevarlden: 'Forger, poisoner, insurgent', vildmark: 'Botanist, healer, cartographer',
    },
  },
  {
    id: 'magiker', sv: 'Magiker', en: 'Magician', mystic: true,
    blurb: 'Those who bend the building blocks of reality by will and mystic insight. Attuned.',
    g: 'slag:th 2; slag:valfri 1; grp:E 4; grp:kunskap 4; grp:mystik 10; valfri 6; mysterier:lärda 4; mystikutr 1; omstopt; sprak 1; vapen:vanlig 1',
    extras: two(
      o('avtr', 'Hardened', 'avtr:overnaturligt 2', true),
      o('mystikutr', 'More mystic gear', 'mystikutr 1', true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:ovanlig 1'),
      o('foljeslagare', 'Companion', 'foljeslagare:Disciple'),
      o('krets', 'Magic society', 'krets:?', false, 'A member of a magical society.'),
      o('mysterier', 'Spellbook or mentor', 'mysterier:lärda 2; mysterier 2', false, 'Four more mysteries, two already learned.'),
    ),
    occupations: {
      hav: 'Hydromancer, ship\'s mage, weather-reader', hov: 'Court mage, witch master, archmage', harlager: 'War mage, pyromancer, corpse recycler', landsbygd: 'Galder singer, witch, rune carver',
      larosate: 'Conjurer, cabal mage, lecturer', sekt: 'Necromancer, ritual mage, black magician', stad: 'Extemporiser, guild mage, illusionist', underjord: 'Dwarf mage, geomancer, shadow whisperer',
      undrevarlden: 'Abortionist, accursed, organ harvester', vildmark: 'Congelate gatherer, Shadowland walker, tree singer',
    },
  },
  {
    id: 'skugga', sv: 'Skugga', en: 'Shadow',
    blurb: 'Bounty hunters, spies, pathfinders and pickpockets who work unseen.',
    g: 'slag:ii 1; slag:sd 1; slag:valfri 1; grp:E 4; grp:rorelse 6; grp:strid 4; grp:vildmark 4; valfri 6; regel:Hidden weapon: one of your weapons gains Discreet 16 (or +2 if it already has it).; paket:? 1; vapen:vanlig 2',
    extras: two(
      o('avtr', 'Hardened', 'avtr:utsatthet 1; avtr:vald 1', true),
      o('special', 'Special gear', SKILLED('gear (e.g. for Climb, Lockpicking or Hide)'), true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:vanlig 1'),
      o('identitet', 'False identity', 'regel:A complete false identity: +1D6 on all rolls to make others believe it.'),
      o('krets', 'Gang or company', 'krets:?', false, 'A respected member of a gang or mercenary company.'),
    ),
    occupations: {
      hav: 'Smuggler, lookout, wrecker', hov: 'Emissary, assassin, torturer', harlager: 'Courier, saboteur, spy', landsbygd: 'Cattle thief, messenger, vagrant',
      larosate: 'Disciplinarian, informant, plagiarist', sekt: 'Informer, blood cultist, grave defiler', stad: 'Executioner, burglar, errand runner', underjord: 'Outlaw, caver, nithing',
      undrevarlden: 'Cat burglar, robber, snitch', vildmark: 'Bounty hunter, scout, guide',
    },
  },
  {
    id: 'underhallare', sv: 'Underhållare', en: 'Entertainer',
    blurb: 'Dancers, actors, musicians and courtesans who sway the world with beauty and charm.',
    g: 'slag:fa 1; slag:valfri 2; grp:E 4; grp:rorelse 4; grp:social 6; valfri 10; regel:Always welcome: free food and lodging at a friend\'s inn as long as you entertain.; paket:? 1; välj(Two common weapons:: vapen:vanlig 2 | One uncommon weapon:: vapen:ovanlig 1)',
    extras: two(
      o('avtr', 'Hardened', 'avtr:utsatthet 2', true),
      o('special', 'Special gear', SKILLED('gear (e.g. for Storytelling, Charm or Song & Music)'), true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:vanlig 1'),
      o('foljeslagare', 'Companion', 'foljeslagare:Assistant'),
      o('krets', 'Admirers', 'krets:?', false, 'A crowd of admirers somewhere; the circle is named after their village or quarter.'),
    ),
    occupations: {
      hav: 'Harbour whore, ship\'s bard, drummer', hov: 'Court jester, herald, courtesan', harlager: 'Standard bearer, war poet, prostitute', landsbygd: 'Village fool, stud, fiddler',
      larosate: 'Dramatist, riddler, composer', sekt: 'Mourner, hedonist, choir singer', stad: 'Dancer, jester, town crier', underjord: 'Fire dancer, chanter, organist',
      undrevarlden: 'Charlatan, whore, drunkard', vildmark: 'Skald, throat singer, adventurer',
    },
  },
  {
    id: 'akallare', sv: 'Åkallare', en: 'Invoker', mystic: true,
    blurb: 'Mystics chosen by one or more gods to channel their power. Attuned.',
    g: 'slag:mu 2; slag:valfri 1; grp:K 4; grp:mystik 10; grp:social 4; valfri 6; mysterier:lärda 4; mystikutr 1; omstopt; sprak 1; vapen:vanlig 1',
    extras: two(
      o('avtr', 'Hardened', 'avtr:overnaturligt 2', true),
      o('mystikutr', 'More mystic gear', 'mystikutr 1', true),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:ovanlig 1'),
      o('foljeslagare', 'Companion', 'foljeslagare:Disciple'),
      o('krets', 'Flock', 'krets:?', false, 'You lead a congregation or cult; the circle is your faith in a village or quarter.'),
      o('mysterier', 'Scriptures or mentor', 'mysterier:lärda 2; mysterier 2', false, 'Four more mysteries, two already learned.'),
    ),
    occupations: {
      hav: 'Missionary, Navare priest, relic hunter', hov: 'Esoteric, confessor, high priest', harlager: 'Crusader, war priest, weapon blesser', landsbygd: 'Village priest, faith healer, moon sister',
      larosate: 'Master of ceremonies, monk or nun, benefactor', sekt: 'Exorcist, spider priestess, chosen one', stad: 'Preacher, mystic, priest', underjord: 'Ghost hunter, temple servant, Vontar priest',
      undrevarlden: 'Heretic, oracle, Rotrax priest', vildmark: 'Ascetic, druid, shaman',
    },
  },
];

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'hav', sv: 'Hav', en: 'Sea',
    blurb: 'Harbour towns, coastal villages and life aboard. Salt in the blood and many ports seen.',
    g: 'slag:fa 1; slag:sd 1; slag:valfri 1; grp:kunskap 4; grp:rorelse 4; grp:strid 4; grp:vildmark 4; attr:Intryck 1; attr:Livskraft 2; attr:Reaktion 2; attr:Självkontroll -1; paket:? 1',
    extras: one(
      o('sjoben', 'Sea legs', 'Sjömannaskap 2', true),
      o('avtr', 'Hardened', 'avtr:vald 2'),
      o('sprak', 'Languages', 'sprak 2'),
      o('kikare', 'Spyglass', 'foremal:A spyglass (+1D6 on Scouting when it can be used).'),
    ),
  },
  {
    id: 'hov', sv: 'Hov', en: 'Court',
    blurb: 'Palaces and the circles of power: feasts, gossip, intrigue and politics.',
    g: 'slag:ii 2; slag:valfri 1; grp:kunskap 4; grp:social 8; valfri 4; attr:Intryck 3; attr:Livskraft 1; attr:Reaktion -1; attr:Visdom 1; paket:? 1',
    extras: one(
      o('silversked', 'Born with a silver spoon', 'Hovliv 2', true),
      o('avtr', 'Hardened', 'avtr:utsatthet 2'),
      o('sprak', 'Languages', 'sprak 2'),
      o('titel', 'Title', 'regel:A title (+1D6 on Presence in social conflicts where it impresses).'),
    ),
  },
  {
    id: 'harlager', sv: 'Härläger', en: 'War camp',
    blurb: 'Sieges, crusades and life in the field among soldiers and camp followers.',
    g: 'slag:sd 2; slag:valfri 1; grp:rorelse 6; grp:strid 6; grp:vildmark 4; attr:Förflyttning 1; attr:Intryck -2; attr:Kroppsbyggnad 3; attr:Livskraft 2; paket:? 1',
    extras: one(
      o('ifalt', 'In the field', 'Marsch 2', true),
      o('avtr', 'Hardened', 'avtr:vald 2'),
      o('bevapning', 'Armed', 'vapen:ovanlig 1; rustning:ovanlig 1'),
      o('lagerliv', 'Camp life', 'grp:E 4', false, 'E.g. mending, logistics or soldiering.'),
    ),
  },
  {
    id: 'landsbygd', sv: 'Landsbygd', en: 'Countryside',
    blurb: 'Quiet villages, farms and manors between civilisation and the wild.',
    g: 'slag:fa 1; slag:sd 1; slag:valfri 1; grp:rorelse 4; grp:social 4; grp:strid 4; grp:vildmark 4; attr:Förflyttning 1; attr:Kroppsbyggnad 1; attr:Livskraft 1; attr:Reaktion 1; paket:? 1',
    extras: one(
      o('fotterna', 'Feet on the ground', 'Naturlära 2', true),
      o('avtr', 'Hardened', 'avtr:vald 2'),
      o('livet', 'Country life', 'grp:E 4', false, 'E.g. animal training, home remedies or weather lore.'),
      o('slakten', 'Big family', 'krets:?', false, 'Relatives everywhere in one part of the land; the circle is named after it.'),
    ),
  },
  {
    id: 'larosate', sv: 'Lärosäte', en: 'Seat of learning',
    blurb: 'Cloisters, academies, universities and weapon schools.',
    g: 'slag:sl 2; slag:valfri 1; grp:kunskap 8; valfri 8; attr:Förflyttning -1; attr:Kroppsbyggnad -1; attr:Självkontroll 3; attr:Visdom 3; paket:? 1',
    extras: one(
      o('palast', 'Well-read', 'Filosofi 2', true),
      o('avtr', 'Hardened', 'avtr:overnaturligt 2'),
      o('skolad', 'Schooled', 'grp:E 4', false, 'E.g. library lore, monastic life or weapon forms.'),
      o('sprak', 'Languages', 'sprak 2'),
    ),
  },
  {
    id: 'sekt', sv: 'Sekt', en: 'Sect',
    blurb: 'Forbidden cults and secret societies, cut off from the world, with strange rites and oaths.',
    g: 'slag:ii 1; slag:sl 1; slag:valfri 1; grp:kunskap 6; grp:social 4; valfri 6; attr:Intryck -1; attr:Självkontroll 2; attr:Vaksamhet 2; attr:Visdom 1; paket:? 1',
    extras: one(
      o('hemligt', 'Secret life', 'Dupera 2', true),
      o('avtr', 'Hardened', 'avtr:overnaturligt 2'),
      o('signum', 'Sign', 'krets:?', false, 'A circle named after the sect, to recognise other members.'),
      o('tackmantel', 'Cover', 'grp:H 4', false, 'E.g. embalmer, glassblower or printer.'),
    ),
  },
  {
    id: 'stad', sv: 'Stad', en: 'City',
    blurb: 'Crowded markets, taverns, guilds, prophets and bribable guards.',
    g: 'slag:ii 1; slag:sl 1; slag:valfri 1; grp:kunskap 4; grp:rorelse 4; grp:social 8; attr:Intryck 1; attr:Självkontroll 1; attr:Vaksamhet 1; attr:Visdom 1; paket:? 1',
    extras: one(
      o('smeten', 'In the thick of it', 'Kulturkännedom 2', true),
      o('avtr', 'Hardened', 'avtr:utsatthet 2'),
      o('krets', 'City circle', 'krets:?', false, 'A circle named after a city calling of your choice.'),
      o('sprak', 'Languages', 'sprak 2'),
    ),
  },
  {
    id: 'underjord', sv: 'Underjord', en: 'Underground',
    blurb: 'Dwarf holds, mines and winding tunnels, with floods, foul air and monsters.',
    g: 'slag:fa 1; slag:sd 1; slag:valfri 1; grp:rorelse 6; grp:strid 4; grp:vildmark 6; attr:Förflyttning 1; attr:Kroppsbyggnad 1; attr:Reaktion 1; attr:Självkontroll 1; paket:? 1',
    extras: one(
      o('vilse', 'Never lost', 'Orientering 2', true),
      o('avtr', 'Hardened', 'avtr:utsatthet 2'),
      o('bevapning', 'Armed', 'välj(An uncommon weapon:: vapen:ovanlig 1 | An uncommon armour:: rustning:ovanlig 1)'),
      o('stenkoll', 'Knows stone', 'grp:E 4', false, 'E.g. mining lore, escape routes or caves.'),
    ),
  },
  {
    id: 'undrevarlden', sv: 'Undre världen', en: 'Underworld',
    blurb: 'Dark alleys, slums and criminal gangs at the bottom of society.',
    g: 'slag:ii 1; slag:sd 1; slag:valfri 1; grp:rorelse 8; grp:social 4; grp:strid 4; attr:Förflyttning 1; attr:Livskraft -2; attr:Reaktion 3; attr:Vaksamhet 2; paket:? 1',
    extras: one(
      o('gatan', 'Born in the street', 'Skumraskaffärer 2', true),
      o('avtr', 'Hardened', 'avtr:vald 2'),
      o('dolt', 'Hidden weapon', 'regel:Hidden weapon: one of your weapons gains Discreet 16 (or +2 if it already has it).'),
      o('rus', 'Intoxicants', 'foremal:4 doses of a stimulant drug of your choice.'),
    ),
  },
  {
    id: 'vildmark', sv: 'Vildmark', en: 'Wilderness',
    blurb: 'Deep forests, deserts, swamps and mountains far from towns.',
    g: 'slag:fa 2; slag:valfri 1; grp:rorelse 4; grp:strid 4; grp:vildmark 8; attr:Förflyttning 3; attr:Intryck -1; attr:Vaksamhet 3; attr:Visdom -1; paket:? 1',
    extras: one(
      o('fodd', 'Born in the wild', 'Vildmarksvana 2', true),
      o('avtr', 'Hardened', 'avtr:vald 2'),
      o('orter', 'Herbs', 'foremal:4 doses of a wound-healing remedy or a hallucinogenic drug.'),
      o('slagruta', 'Dowsing rod', 'foremal:A dowsing rod (+1D6 on all rolls to find water and precious minerals).'),
    ),
  },
];

export const LIVING: LivingStandard[] = [
  { id: 'utblottad', sv: 'Utblottad', en: 'Destitute', silver: 1, g: '', blurb: 'Among the poorest in the world: beggars, tramps, refugees, slaves.', lodging: 'A cave, a shack, a poorhouse, a sewer, an alley…', clothes: 'One badly worn set of clothes.', monthly: 'About 10 silver a month, no surplus.' },
  { id: 'fattig', sv: 'Fattig', en: 'Poor', silver: 10, g: '', blurb: 'Hard up, but it could be worse: servants, farmhands, cottagers, labourers.', lodging: 'A tiny croft, a shared room, a hovel…', clothes: 'Two sets of patched clothes, a few bright ribbons.', monthly: 'About 30 silver a month, 3 surplus.' },
  { id: 'enkel', sv: 'Enkel', en: 'Modest', silver: 30, g: 'regel:You can borrow up to 50 silver from your family.', blurb: 'The broad middle: journeymen, freeholders, small traders, most monks and nuns.', lodging: 'Your own room, a small farm; perhaps a servant.', clothes: 'Two everyday sets, one fine set, a cloak; jewellery worth about 50 silver.', monthly: 'About 80 silver a month, 8 surplus.' },
  { id: 'valmaende', sv: 'Välmående', en: 'Comfortable', silver: 100, g: 'regel:You can borrow up to 1,000 silver from your family.', blurb: 'Well off and respected: guild members, rich farmers, merchants, bureaucrats, priests.', lodging: 'A town house, a floor in a fine quarter, a large farm; a few servants.', clothes: 'Five everyday sets, some richly decorated fine sets; jewellery worth about 300 silver.', monthly: 'About 260 silver a month, 15 surplus.' },
  { id: 'rik', sv: 'Rik', en: 'Rich', silver: 1000, g: 'regel:You can borrow up to 10,000 silver from your family.', blurb: 'The upper classes: councillors, officials, nobles, magnates.', lodging: 'A fine house in the best quarter or a large estate; a dozen servants.', clothes: 'Half a dozen fine everyday sets and rich festive clothes; jewellery worth 1,000 silver or more.', monthly: 'About 800 silver a month, 100 surplus.' },
  { id: 'formogen', sv: 'Förmögen', en: 'Wealthy', silver: 10000, g: 'regel:You can borrow almost without limit while the family name is clean.', blurb: 'The very elite: merchant princes, great nobles, royalty.', lodging: 'At least one palace; servants beyond counting.', clothes: 'More than you know of; jewellery worth over 5,000 silver.', monthly: 'About 2,700 silver a month, 300+ surplus.' },
];
