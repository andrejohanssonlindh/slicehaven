import { PER_SKILL } from './byskill';

/**
 * What each skill is good for. A tag names a kind of effort (threaten, barter, search…); the skills
 * listed under it are the ones that are reasonable for it. This is the single source: the skill sets
 * scenes use (content/rollables SKILL_SETS) are built from it, and the Skills page shows it per skill.
 *
 * Weapon skills (Sword, Axe, Spear, Bow…) are here for threatening and impressing: a drawn blade
 * or a clean shot says something to onlookers before any fight does.
 *
 * Attributes appear here too, but sparingly: Physique helps to threaten or to distract (a show of
 * strength) and hardly ever to barter; Presence helps in most talking. Ids are the creator's
 * ("attr:…" for attributes, "E:" expertise, "K:" marks).
 */
export const TAG_INFO: Record<string, { label: string; what: string }> = {
  persuade: { label: 'Persuade', what: 'Making a case with reasons and standing.' },
  impress: { label: 'Impress', what: 'Winning someone over, by charm or by showing what you can do.' },
  'sweet-talk': { label: 'Sweet-talk', what: 'Smooth words in a conflict (charm, stories, a good face).' },
  distract: { label: 'Distract', what: 'Holding attention while something else happens.' },
  ask: { label: 'Ask', what: 'Getting someone to tell you things.' },
  bribe: { label: 'Barter', what: 'Coin, haggling and knowing how it is done.' },
  threaten: { label: 'Threaten', what: 'Fear, size and a hard voice.' },
  etiquette: { label: 'Etiquette', what: 'Manners, rank and who bows to whom.' },
  streetwise: { label: 'Streetwise', what: 'Knowing how the street works.' },
  'read-people': { label: 'Read people', what: 'Seeing what someone is really like.' },
  search: { label: 'Search', what: 'Finding what is hidden or out of place.' },
  climb: { label: 'Climb', what: 'Getting up and over things.' },
  sneak: { label: 'Sneak', what: 'Moving without being heard or seen.' },
  hide: { label: 'Hide', what: 'Staying out of sight, or keeping a thing out of sight.' },
  steal: { label: 'Steal', what: 'Taking what is not yours without being noticed.' },
  escape: { label: 'Escape', what: 'Getting free of a grip, a knot or a bad spot.' },
  jump: { label: 'Jump', what: 'Clearing gaps and obstacles.' },
  swim: { label: 'Swim', what: 'Staying afloat and getting across water.' },
  ride: { label: 'Ride', what: 'Keeping a mount, or a cart, going where you want.' },
  travel: { label: 'Travel', what: 'Covering ground and finding the way.' },
  track: { label: 'Track', what: 'Following, or reading, what has passed.' },
  forage: { label: 'Forage', what: 'Finding food, water and shelter in the wild.' },
  lore: { label: 'Recall lore', what: 'Knowing what is known: history, peoples, faiths and monsters.' },
  analyse: { label: 'Analyse', what: 'Working a problem out with figures, plans and logic.' },
  heal: { label: 'Heal', what: 'Tending wounds and illness.' },
  poison: { label: 'Poisons & drugs', what: 'Brewing, spotting and countering what harms or dulls.' },
  law: { label: 'Law', what: 'Knowing the rules of the realm and how to use them.' },
  teach: { label: 'Teach', what: 'Passing on what you know so that it sticks.' },
  survey: { label: 'Survey', what: 'Taking in a whole place.' },
  deceive: { label: 'Deceive', what: 'Lying, bluffing and wearing a false face.' },
  rally: { label: 'Rally', what: 'Giving heart or orders to a group.' },
  gamble: { label: 'Gamble', what: 'Playing for stakes, and playing the other players.' },
  perform: { label: 'Perform', what: 'Entertaining an audience with voice, hands or wit.' },
  comfort: { label: 'Comfort', what: 'Calming, cheering and steadying someone.' },
  provoke: { label: 'Provoke', what: 'Getting a rise out of someone, or turning a crowd.' },
};

export const TAGGED: Record<string, string[]> = {
  persuade: ['Argumentera', 'Berättarkonst', 'Ledarskap', 'E:Vädja', 'attr:Intryck'],
  impress: [
    'Charm', 'Sång & musik', 'Dansa', 'E:Flörta', 'E:Akrobatik', 'K:Charmerande leende', 'K:Hederligt intryck',
    'E:Behaga', 'E:Skryta', 'E:Ryttarkonster', 'E:Vapenkata', 'E:Hålla bjudningar',
    'attr:Intryck', 'attr:Kroppsbyggnad',
    // Weapon skills: a display of skill with the weapon.
    'Svärd', 'Yxa', 'Spjut', 'Stav', 'Dolk', 'Kedjevapen', 'Båge', 'Armborst', 'Kastvapen', 'Slagsmål',
  ],
  'sweet-talk': [
    'attr:Intryck', 'Charm', 'Berättarkonst', 'Argumentera', 'Sång & musik',
    'E:Flörta', 'E:Lova', 'E:Behaga', 'K:Charmerande leende', 'K:Smort munläder', 'K:Hederligt intryck',
  ],
  distract: [
    'Charm', 'Berättarkonst', 'Sång & musik', 'Dupera', 'Spel & dobbel', 'Fingerfärdighet',
    'E:Gyckla', 'E:Buktaleri', 'E:Skämta', 'E:Vissla', 'attr:Intryck', 'attr:Kroppsbyggnad',
  ],
  ask: [
    'Argumentera', 'Charm', 'Berättarkonst', 'Genomskåda', 'Injaga fruktan', 'Skumraskaffärer',
    'E:Skvaller', 'E:Supa', 'E:Tortyr', 'E:Läppläsning', 'E:Tigga', 'attr:Intryck',
  ],
  bribe: ['Handel', 'E:Muta', 'Skumraskaffärer', 'Argumentera', 'Dupera', 'E:Lova', 'E:Kränga', 'E:Korrumpera'],
  threaten: [
    'attr:Kroppsbyggnad', 'Injaga fruktan', 'Slagsmål', 'Ledarskap', 'Dupera',
    'K:Hotfull stämma', 'K:Stark stämma', 'E:Tortyr', 'E:Utskällningar', 'E:Örfila',
    // Weapon skills: the weapon in the hand is the threat.
    'Svärd', 'Yxa', 'Spjut', 'Stav', 'Dolk', 'Klubba', 'Kedjevapen', 'Båge', 'Armborst', 'Kastvapen', 'Blåsrör',
  ],
  etiquette: ['Hovliv', 'E:Duellera', 'E:Hålla bjudningar', 'E:Tjänsteliv', 'E:Klosterliv'],
  streetwise: ['Skumraskaffärer', 'Charm', 'Handel', 'E:Tigga', 'E:Skugglandsvana', 'E:Områdeskännedom', 'E:Supa', 'attr:Intryck'],
  'read-people': ['Genomskåda', 'E:Läppläsning', 'attr:Vaksamhet'],
  search: ['Genomsöka', 'E:Gravplundring', 'attr:Vaksamhet'],
  climb: ['Klättra', 'E:Akrobatik', 'K:Apfotad', 'K:Starka nypor'],
  deceive: [
    'Dupera', 'Charm', 'Berättarkonst', 'Argumentera', 'E:Skådespel', 'E:Förklädnad', 'E:Simulant',
    'E:Undvika ansvar', 'E:Härma', 'E:Buktaleri', 'E:Förskingra',
    'K:Smort munläder', 'K:Ärligt ansikte', 'attr:Intryck',
  ],
  rally: ['Ledarskap', 'Sång & musik', 'Berättarkonst', 'E:Ingjuta mod', 'K:Stark stämma', 'attr:Intryck'],
  gamble: ['Spel & dobbel', 'Dupera', 'Genomskåda', 'E:Fuska', 'E:Vadslagning', 'Handel'],
  sneak: ['Smyga', 'Gömma', 'E:Takvägar', 'E:Bakhåll', 'E:Skugglandsvana', 'E:Kloaksystem'],
  hide: ['Gömma', 'Smyga', 'E:Förklädnad', 'E:Bakhåll', 'E:Kloaksystem', 'E:Grottsystem', 'Fingerfärdighet'],
  steal: ['Fingerfärdighet', 'Smyga', 'E:Låsdyrkning', 'E:Förskingra', 'E:Gravplundring', 'Skumraskaffärer'],
  escape: ['Undvika', 'Fingerfärdighet', 'E:Rep & knopar', 'E:Flyktvägar', 'E:Utbrytarkonst', 'E:Akrobatik', 'attr:Reaktion'],
  jump: ['Hoppa', 'E:Akrobatik', 'Undvika', 'attr:Förflyttning'],
  swim: ['Simma', 'Sjömannaskap', 'E:Ro & paddla', 'attr:Kroppsbyggnad'],
  ride: ['Rida', 'E:Djurträning', 'E:Köra vagn', 'E:Ryttarkonster', 'Naturlära'],
  travel: [
    'Marsch', 'Vildmarksvana', 'Orientering', 'Geografi', 'Rida', 'E:Genvägar', 'E:Navigation',
    'E:Skidor & skridskor', 'E:Slita & släpa', 'E:Logistik', 'E:Grottsystem', 'E:Väderkännedom', 'attr:Livskraft',
  ],
  track: ['Spåra', 'Naturlära', 'Jakt & fiske', 'Orientering'],
  forage: ['Jakt & fiske', 'Naturlära', 'Vildmarksvana', 'E:Fällor'],
  lore: [
    'Historia', 'Kulturkännedom', 'Teologi', 'Ockultism', 'Filosofi', 'Geografi', 'Teoretisk magi',
    'E:Heraldik', 'E:Monsterkunskap', 'E:Vidskepelse', 'E:Astrologi', 'E:Bergskunskap', 'E:Bibliotekskunskap',
    'E:Hamnkunskap', 'E:Kända krigare', 'E:Legender & myter', 'E:Sjömanshistorier', 'E:Områdeskännedom',
    'E:Språklära', 'E:Tolka religiösa skrifter', 'E:Väderkännedom',
  ],
  analyse: ['Kalkylera', 'Krigföring', 'Filosofi', 'Teoretisk magi', 'E:Bokhållning', 'E:Chiffer', 'E:Gåtor', 'E:Logistik', 'E:Språklära'],
  heal: ['Läkekonst', 'E:Kirurgi', 'E:Anatomi', 'E:Huskurer', 'E:Massage', 'E:Trösta', 'Naturlära'],
  poison: ['Gifter & droger', 'E:Provsmakare', 'Läkekonst', 'Naturlära'],
  law: ['Lagkunskap', 'Historia', 'E:Politik', 'E:Diplomati'],
  teach: ['Undervisa', 'Berättarkonst', 'Ledarskap', 'Filosofi', 'E:Barnuppfostran'],
  perform: [
    'Sång & musik', 'Dansa', 'Berättarkonst', 'E:Skådespel', 'E:Gyckla', 'E:Komponera musik', 'E:Poesi',
    'E:Skämta', 'E:Vissla', 'E:Härma', 'E:Buktaleri', 'E:Författa',
  ],
  comfort: ['E:Trösta', 'E:Ingjuta mod', 'E:Massage', 'E:Meditera', 'Charm', 'Sång & musik'],
  provoke: [
    'E:Utskällningar', 'E:Häda', 'E:Skryta', 'E:Undergräva självförtroende', 'E:Äckla', 'E:Uppvigla',
    'E:Peka ut syndabockar', 'E:Örfila', 'Dupera',
  ],
  survey: ['Genomsöka', 'Speja', 'Orientering', 'Naturlära', 'Spåra', 'F:Mörkersyn', 'F:Nattsyn', 'attr:Vaksamhet'],
};

// Narrow skills (marks, crafts, abilities) are written per skill; fold them into the tags.
for (const [skill, byTag] of Object.entries(PER_SKILL)) {
  for (const tag of Object.keys(byTag)) {
    const ids = (TAGGED[tag] ??= []);
    if (!ids.includes(skill)) ids.push(skill);
  }
}

/** The tags a skill has, in the order of TAGGED. */
export const tagsOf = (id: string): string[] => Object.keys(TAGGED).filter((t) => TAGGED[t].includes(id));

/** The skills with a tag. */
export const skillsWith = (tag: string): string[] => TAGGED[tag] ?? [];
