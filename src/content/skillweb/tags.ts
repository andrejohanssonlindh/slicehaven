/**
 * What each skill is good for. A tag names a kind of effort (threaten, barter, search…); the skills
 * listed under it are the ones that are reasonable for it. This is the single source: the skill sets
 * scenes use (content/rollables SKILL_SETS) are built from it, and the Skills page shows it per skill.
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
  survey: { label: 'Survey', what: 'Taking in a whole place.' },
};

export const TAGGED: Record<string, string[]> = {
  persuade: ['Argumentera', 'Berättarkonst', 'Ledarskap', 'attr:Intryck'],
  impress: [
    'Charm', 'Sång & musik', 'Dansa', 'E:Flörta', 'E:Akrobatik', 'K:Charmerande leende', 'K:Hederligt intryck',
    'attr:Intryck', 'attr:Kroppsbyggnad',
  ],
  'sweet-talk': [
    'attr:Intryck', 'Charm', 'Berättarkonst', 'Argumentera', 'Sång & musik',
    'E:Flörta', 'E:Lova', 'K:Charmerande leende', 'K:Smort munläder', 'K:Hederligt intryck',
  ],
  distract: ['Charm', 'Berättarkonst', 'Sång & musik', 'Dupera', 'attr:Intryck', 'attr:Kroppsbyggnad'],
  ask: ['Argumentera', 'Charm', 'Berättarkonst', 'attr:Intryck'],
  bribe: ['Handel', 'E:Muta', 'Skumraskaffärer', 'Argumentera', 'Dupera', 'E:Lova'],
  threaten: [
    'attr:Kroppsbyggnad', 'Injaga fruktan', 'Slagsmål', 'Ledarskap', 'Dupera',
    'K:Hotfull stämma', 'K:Stark stämma',
  ],
  etiquette: ['Hovliv'],
  streetwise: ['Skumraskaffärer', 'Charm', 'Handel', 'attr:Intryck'],
  'read-people': ['Genomskåda', 'attr:Vaksamhet'],
  search: ['Genomsöka', 'attr:Vaksamhet'],
  climb: ['Klättra', 'E:Akrobatik', 'K:Apfotad', 'K:Starka nypor'],
  survey: ['Genomsöka', 'Speja', 'Orientering', 'Naturlära', 'Spåra', 'F:Mörkersyn', 'F:Nattsyn', 'attr:Vaksamhet'],
};

/** The tags a skill has, in the order of TAGGED. */
export const tagsOf = (id: string): string[] => Object.keys(TAGGED).filter((t) => TAGGED[t].includes(id));

/** The skills with a tag. */
export const skillsWith = (tag: string): string[] => TAGGED[tag] ?? [];
