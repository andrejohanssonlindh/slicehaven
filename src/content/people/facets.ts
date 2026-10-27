import type { Dimension, Facet } from '../../core/people';
import { BACKGROUNDS } from '../chargen/backgrounds';
import { HOMELANDS } from '../chargen/homelands';
import { PEOPLES as CREATOR_PEOPLES } from '../chargen/peoples';
import { RELIGIONS } from '../chargen/religions';

/**
 * The facets of people and places. Peoples, realms, faiths and callings come from the character
 * creator's own data (so the two never disagree); the groups above them, the settings and the
 * passing states are written here. A facet id goes in an object's `tags` (or a scene's `tags`).
 *
 * Ids: peoples keep the creator's ids (asharier, learam, bazirk); realms and faiths too (asharien,
 * samorism); the 100 callings are `job-…` (job-baker); the groups are plain words.
 */

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const out: Facet[] = [];
const add = (dim: Dimension, id: string, label: string, blurb: string, parent?: string) => out.push({ id, dim, label, parent, blurb });

// ——— Peoples: the five kinds (already in the kind tree), then each people under its kind ———

/** The creator's family → the kind used in scenes. */
export const FAMILY_KIND: Record<string, string> = { manniska: 'human', alv: 'elf', dvarg: 'dwarf', tirak: 'tirak', missla: 'missla' };

const FAMILIES: [string, string, string][] = [
  ['human', 'Humans', 'The great majority, in countless peoples with their own tongues and customs.'],
  ['elf', 'Elves', 'Ageless and fine-boned, in six tribes, mostly in their own realms.'],
  ['dwarf', 'Dwarves', 'Short, bearded, stubborn as the mountain; long-lived and prone to grand obsessions.'],
  ['tirak', 'Tirak', 'Matriarchal houses of heavy jaws, claws and red-glowing eyes.'],
  ['missla', 'Misslor', 'Small, big-eyed folk who sense and sway feelings by touch; open-hearted and trusting.'],
];
for (const [id, label, blurb] of FAMILIES) add('people', id, label, blurb);

/** The tirak houses (the creator splits each by size: small, strong, giant; the house is what people see). */
const HOUSES: [string, string, string][] = [
  ['bazirk', 'Bazirk', 'The seafaring house: sailors and pirates in every harbour, flashy and worldly.'],
  ['frakk', 'Frakk', 'The wild house: hardy raiders of mountains and northern wilds, where weakness is taboo.'],
  ['marnakh', 'Marnakh', 'The integrated house: labourers, crafters, traders and soldiers in human lands.'],
  ['nidalarr', 'Houseless tirak', 'Tirak of no house, raised in whatever culture took them in.'],
];
for (const [id, label, blurb] of HOUSES) add('people', id, label, blurb, 'tirak');

/** Peoples whose id is already a kind (the misslor) are not added twice; tirak go by house, above. */
for (const p of CREATOR_PEOPLES) {
  const kind = FAMILY_KIND[p.family];
  if (p.id === kind || p.family === 'tirak') continue;
  add('people', p.id, p.en, p.blurb, kind);
}

/** The peoples as kinds, for the kind tree: asharier is a kind of human. */
export const PEOPLE_KINDS: Record<string, string> = Object.fromEntries(
  out.filter((f) => f.dim === 'people' && f.parent).map((f) => [f.id, f.parent as string]),
);

// ——— Realms: a few kinds of realm, and each homeland under the one it is closest to ———

const REALM_KINDS: [string, string, string][] = [
  ['lawless', 'Lawless lands', 'Unions and republics where the law is thin and everyone looks after themselves.'],
  ['mercantile', 'Trading realms', 'Rich on sea trade, with contracts, canals and merchant houses.'],
  ['feudal', 'Feudal realms', 'Rank and oaths: everyone has a place, high or low.'],
  ['imperial', 'The empire', 'A vast, creaking state with one faith, many officials and rigid classes.'],
  ['tyranny', 'Iron-fisted lands', 'Closed lands held down by a strong hand; people learn to keep quiet.'],
  ['theocracy', 'Holy realms', 'Ruled in the name of a god, or a god-child; faith and law are one.'],
  ['magocracy', 'Magocracies', 'Ruled by mages, with religion banned or scorned.'],
  ['tribal', 'Tribal lands', 'Clans, herds and hordes; honour and skill count for more than titles.'],
  ['elven-realm', 'Elven realms', 'Forests and clans under their own old rules, closed to outsiders.'],
];
add('realm', 'realm', 'Realms', 'Where a person comes from, and what that land is like.');
for (const [id, label, blurb] of REALM_KINDS) add('realm', id, label, blurb, 'realm');

/** Which kind of realm each homeland is closest to. */
const REALM_OF: Record<string, string> = {
  alarinn: 'elven-realm', sunari: 'elven-realm',
  asharien: 'lawless', vastmark: 'lawless',
  cirefalien: 'mercantile', consaber: 'mercantile', fraktionen: 'mercantile',
  soldarn: 'feudal',
  jargien: 'imperial',
  damarien: 'tyranny',
  forion: 'theocracy', muhad: 'theocracy',
  thalamur: 'magocracy', ebhron: 'magocracy',
  kamor: 'tribal', nuissani: 'tribal', raunslatterna: 'tribal', takalorr: 'tribal',
};
for (const h of HOMELANDS) {
  if (h.id === 'ovriga') continue;
  add('realm', h.id, h.en, h.blurb, REALM_OF[h.id] ?? 'realm');
}

// ——— Faiths ———

add('faith', 'faith', 'Faiths', 'What a person believes, and how devoutly they keep it.');
add('faith', 'forbjudna', 'Forbidden cults', 'Cults that are banned almost everywhere and meet in secret.', 'faith');
for (const r of RELIGIONS) add('faith', r.id, r.en, r.blurb, r.parent ?? 'faith');

// ——— Standing and calling: 15 groups, and each of the 100 callings under one ———

const GROUPS: [string, string, string][] = [
  ['nobility', 'Nobility and rulers', 'Those who hold land, titles and honour, and those who live by their circle.'],
  ['officialdom', 'Officials', 'Clerks, tax men, lawyers, heralds and the diplomats who deal with them.'],
  ['clergy', 'Clergy', 'Those who serve a faith, from village healers to holy warriors.'],
  ['learned', 'The learned', 'Scholars, scribes, physicians, engineers and others who live by what they know.'],
  ['arcane', 'Practitioners of the arcane', 'Magicians, witches and the cursed, schooled or not.'],
  ['martial', 'The martial', 'Soldiers, guards, hunters of men and monsters, and those who keep them armed.'],
  ['merchant', 'Merchants and innkeepers', 'People who buy, sell and keep a house open to all comers.'],
  ['craft', 'Craftspeople', 'Those who make things for a living, from smiths to printers.'],
  ['landworker', 'Land and forest workers', 'Farmers, herders, hunters and woodcutters.'],
  ['seafaring', 'Seafarers', 'Sailors, fishers, dockers and pirates.'],
  ['performer', 'Performers', 'Musicians, dancers, actors and others who sell company or a show.'],
  ['underworld', 'The underworld', 'Thieves, smugglers, swindlers and others who live outside the law.'],
  ['servile', 'Servants and the poor', 'Those who serve, or do the work no one else wants.'],
  ['wanderer', 'Wanderers', 'Couriers, guides, drifters and adventurers: people who live on the road.'],
  ['outsider', 'Outsiders', 'Hermits, heretics, deserters and the shunned.'],
];
add('station', 'station', 'Standing and calling', 'What a person does for a living, and where that puts them.');
for (const [id, label, blurb] of GROUPS) add('station', id, label, blurb, 'station');

/** The creator's background numbers (1–100) in each group. */
const GROUP_OF: Record<string, number[]> = {
  nobility: [3, 27, 41, 70, 71],
  officialdom: [15, 18, 23, 40, 53, 76],
  clergy: [20, 38, 39, 59, 62, 68, 95],
  learned: [2, 4, 10, 13, 21, 36, 44, 46, 49, 55, 58, 85, 87, 92],
  arcane: [9, 42, 88],
  martial: [24, 25, 30, 43, 54, 61, 66, 73, 82, 86, 96, 97],
  merchant: [1, 28, 35, 48],
  craft: [5, 6, 14, 47, 60, 77, 78, 80, 93, 98],
  landworker: [11, 12, 45, 75, 94],
  seafaring: [22, 37, 64, 74],
  performer: [16, 34, 52, 63, 65, 67, 79],
  underworld: [8, 31, 50, 56, 72, 81, 84, 90],
  servile: [7, 29, 69, 91],
  wanderer: [32, 51, 57, 83, 99, 100],
  outsider: [17, 19, 26, 33, 89],
};
const groupOfBackground = new Map<number, string>();
for (const [g, ns] of Object.entries(GROUP_OF)) for (const n of ns) groupOfBackground.set(n, g);
for (const b of BACKGROUNDS) {
  add('station', `job-${slug(b.en)}`, b.en, b.blurb, groupOfBackground.get(b.n) ?? 'station');
}

// ——— Settings: where it happens ———

add('setting', 'setting', 'Settings', 'Where and when an encounter happens.');
const SETTINGS: [string, string, string][] = [
  ['court', 'A court', 'Halls of power: titles, whispers and people who watch every word.'],
  ['tavern', 'A tavern or inn', 'Loose tongues, strong drink and a good chance of a quarrel.'],
  ['market', 'A market', 'Crowds, haggling and plenty of hands in plenty of pockets.'],
  ['temple', 'A temple or cloister', 'A holy place, where voices drop and offence is serious.'],
  ['barracks', 'Barracks or a camp', 'Soldiers who know each other and answer to orders.'],
  ['road', 'The open road', 'Strangers pass and no one can check your story.'],
  ['wild', 'The wilds', 'Forest, marsh, hill or steppe, away from any town.'],
  ['alley', 'Back streets', 'Narrow ways with few witnesses.'],
  ['checkpoint', 'A gate or checkpoint', 'Someone is paid to look closely at everyone who passes.'],
  ['ruin', 'A ruin or tomb', 'Old stones that keep their secrets.'],
  ['harbour', 'A harbour', 'Ships, cargo and people from everywhere.'],
  ['hearth', 'Someone\'s home', 'A family hearth, where a guest has rights and a host has duties.'],
  ['sickroom', 'A sickroom', 'Where the ill lie and the healers work.'],
  ['festival', 'A festival', 'Music, drink and a crowd that has come to enjoy itself.'],
  ['courtroom', 'A court of law', 'Where the rule is the rule and the judge is listening.'],
  ['library', 'A library or school', 'Quiet rooms of books and those who read them.'],
  ['workshop', 'A workshop', 'Where things are made and a trade is respected.'],
  ['night', 'At night', 'Dark, few people about and everyone a little wary.'],
  ['rain', 'In the rain', 'Wet, grey and loud on the roofs; tracks wash away.'],
  ['fog', 'In fog', 'No one sees far, and sounds carry strangely.'],
  ['crowd', 'In a crowd', 'Many people, much noise, and little attention for any one of them.'],
];
for (const [id, label, blurb] of SETTINGS) add('setting', id, label, blurb, 'setting');

// ——— States: what they are going through right now ———

add('state', 'state', 'States', 'What a person is going through right now, whoever they are.');
const STATES: [string, string, string][] = [
  ['drunk', 'Drunk', 'Loose-tongued and slow to follow a point.'],
  ['grieving', 'Grieving', 'Somebody close has just died.'],
  ['afraid', 'Afraid', 'Already frightened, and looking for a way out.'],
  ['angry', 'Angry', 'In no mood to be reasoned with.'],
  ['hurried', 'In a hurry', 'Has somewhere to be and no time for you.'],
  ['on-duty', 'On duty', 'Has orders, and a superior who may be watching.'],
  ['off-duty', 'Off duty', 'Relaxed, and out from under orders.'],
  ['ill', 'Ill or wounded', 'Weak and hurting.'],
  ['hungry', 'Hungry', 'Has not eaten, and a meal means more than most things.'],
  ['proud', 'Proud', 'Quick to take offence and quick to enjoy praise.'],
  ['devout', 'Devout', 'Keeps the faith strictly, and takes insult to it hard.'],
  ['child', 'A child', 'Young, curious and easily led, though not easy to argue with.'],
  ['elder', 'An elder', 'Old, set in their ways and glad to be asked.'],
  ['rich', 'Rich', 'Used to getting their way, and not easy to impress.'],
  ['poor', 'Poor', 'Short of everything, and quick to see what a coin could do.'],
];
for (const [id, label, blurb] of STATES) add('state', id, label, blurb, 'state');

export const FACET_LIST: Facet[] = out;
export const FACETS: Record<string, Facet> = Object.fromEntries(out.map((f) => [f.id, f]));
