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
  survey: { label: 'Survey', what: 'Taking in a whole place.' },
  deceive: { label: 'Deceive', what: 'Lying, bluffing and wearing a false face.' },
  rally: { label: 'Rally', what: 'Giving heart or orders to a group.' },
  gamble: { label: 'Gamble', what: 'Playing for stakes, and playing the other players.' },
};

export const TAGGED: Record<string, string[]> = {
  persuade: ['Argumentera', 'Berättarkonst', 'Ledarskap', 'attr:Intryck'],
  impress: [
    'Charm', 'Sång & musik', 'Dansa', 'E:Flörta', 'E:Akrobatik', 'K:Charmerande leende', 'K:Hederligt intryck',
    'attr:Intryck', 'attr:Kroppsbyggnad',
    // Weapon skills: a display of skill with the weapon.
    'Svärd', 'Yxa', 'Spjut', 'Stav', 'Dolk', 'Kedjevapen', 'Båge', 'Armborst', 'Kastvapen', 'Slagsmål',
  ],
  'sweet-talk': [
    'attr:Intryck', 'Charm', 'Berättarkonst', 'Argumentera', 'Sång & musik',
    'E:Flörta', 'E:Lova', 'K:Charmerande leende', 'K:Smort munläder', 'K:Hederligt intryck',
  ],
  distract: ['Charm', 'Berättarkonst', 'Sång & musik', 'Dupera', 'Spel & dobbel', 'Fingerfärdighet', 'attr:Intryck', 'attr:Kroppsbyggnad'],
  ask: ['Argumentera', 'Charm', 'Berättarkonst', 'Genomskåda', 'Injaga fruktan', 'Skumraskaffärer', 'attr:Intryck'],
  bribe: ['Handel', 'E:Muta', 'Skumraskaffärer', 'Argumentera', 'Dupera', 'E:Lova'],
  threaten: [
    'attr:Kroppsbyggnad', 'Injaga fruktan', 'Slagsmål', 'Ledarskap', 'Dupera',
    'K:Hotfull stämma', 'K:Stark stämma',
    // Weapon skills: the weapon in the hand is the threat.
    'Svärd', 'Yxa', 'Spjut', 'Stav', 'Dolk', 'Klubba', 'Kedjevapen', 'Båge', 'Armborst', 'Kastvapen', 'Blåsrör',
  ],
  etiquette: ['Hovliv'],
  streetwise: ['Skumraskaffärer', 'Charm', 'Handel', 'attr:Intryck'],
  'read-people': ['Genomskåda', 'attr:Vaksamhet'],
  search: ['Genomsöka', 'attr:Vaksamhet'],
  climb: ['Klättra', 'E:Akrobatik', 'K:Apfotad', 'K:Starka nypor'],
  deceive: ['Dupera', 'Charm', 'Berättarkonst', 'Argumentera', 'E:Skådespel', 'E:Förklädnad', 'K:Smort munläder', 'K:Ärligt ansikte', 'attr:Intryck'],
  rally: ['Ledarskap', 'Sång & musik', 'Berättarkonst', 'K:Stark stämma', 'attr:Intryck'],
  gamble: ['Spel & dobbel', 'Dupera', 'Genomskåda', 'E:Fuska', 'Handel'],
  sneak: ['Smyga', 'Gömma', 'E:Takvägar', 'E:Bakhåll'],
  hide: ['Gömma', 'Smyga', 'E:Förklädnad', 'E:Bakhåll', 'Fingerfärdighet'],
  steal: ['Fingerfärdighet', 'Smyga', 'E:Låsdyrkning', 'Skumraskaffärer'],
  escape: ['Undvika', 'Fingerfärdighet', 'E:Rep & knopar', 'E:Flyktvägar', 'E:Akrobatik', 'attr:Reaktion'],
  jump: ['Hoppa', 'E:Akrobatik', 'Undvika', 'attr:Förflyttning'],
  swim: ['Simma', 'Sjömannaskap', 'E:Ro & paddla', 'attr:Kroppsbyggnad'],
  ride: ['Rida', 'E:Djurträning', 'E:Köra vagn', 'Naturlära'],
  travel: ['Marsch', 'Vildmarksvana', 'Orientering', 'Rida', 'E:Genvägar', 'E:Navigation', 'attr:Livskraft'],
  track: ['Spåra', 'Naturlära', 'Jakt & fiske', 'Orientering'],
  forage: ['Jakt & fiske', 'Naturlära', 'Vildmarksvana', 'E:Fällor'],
  survey: ['Genomsöka', 'Speja', 'Orientering', 'Naturlära', 'Spåra', 'F:Mörkersyn', 'F:Nattsyn', 'attr:Vaksamhet'],
};

/** The tags a skill has, in the order of TAGGED. */
export const tagsOf = (id: string): string[] => Object.keys(TAGGED).filter((t) => TAGGED[t].includes(id));

/** The skills with a tag. */
export const skillsWith = (tag: string): string[] => TAGGED[tag] ?? [];
