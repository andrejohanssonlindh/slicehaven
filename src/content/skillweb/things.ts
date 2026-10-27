import { DIFFICULTY } from '../../core/checks';
import type { Effect } from '../../core/scene';
import type { HookDef } from '../../core/skillweb';
import { SKILL_SETS } from '../rollables';
import { skillsWith } from './tags';

/**
 * Library hooks on things, not people (layer 2, object related): what a skill does to a wall, a lock,
 * a tree, a stretch of water. They run on the narrow kinds (wall, door, lock, tree, food, tool,
 * container, water, gap, trail, plant, animal), never on the broad `structure` or `item`, because a
 * scene's own palisade or cart has rules of its own. Whatever a hook does it records as a flag
 * (`climbed:{id}`, `opened:{id}`, `crossed:{id}`…) for the scene to use.
 *
 * What a general hook says has to be true of any such thing: a search that finds nothing is "nothing
 * out of place", because a thing that hides something has a search check of its own, which wins. A hidden
 * read (anything marked `needs: 'lore'`) only exists on things that carry lore texts, and gives the
 * lore on success and its plausible wrong twin on failure.
 */
const thing = { layer: 2 as const };
const say = (text: string, tone?: 'good' | 'bad'): Effect => ({ say: text, tone });
const flag = (name: string): Effect => ({ set: `${name}:{id}` });

const hook = (id: string, kind: string, intention: string, label: string, skills: string[], difficulty: number, success: Effect[], failure: Effect[], over: Partial<HookDef> = {}): HookDef => ({
  ...thing, id, kind, intention, label, skills, difficulty, success, failure, ...over,
});

/** A hidden read: you get an answer either way, and cannot tell if it is right. */
const read = (id: string, kind: string, label: string, skills: string[], over: Partial<HookDef> = {}): HookDef => hook(
  id, kind, 'study', label, skills, DIFFICULTY.tricky,
  [say('{lore}')], [say('{lore}')], { hidden: true, needs: 'lore', ...over },
);

/** Search: "nothing out of place" is the default, since a thing that hides something has its own check. */
const search = (kind: string, label: string): HookDef => hook(
  `search-${kind}`, kind, 'search', label, [...SKILL_SETS.search], DIFFICULTY.tricky,
  [say('You go over the {name} carefully and find nothing out of place.'), flag('searched')],
  [say('You look the {name} over, and find nothing. You cannot be sure you have missed nothing.')],
);

const STRUCTURE_LORE = ['Kalkylera', 'Historia', 'E:Bergskunskap', 'H:Arkitekt', 'H:Byggare', 'H:Murare', 'H:Stenhuggare', 'H:Timmerman', 'H:Snickare'];
const PLANT_LORE = ['Naturlära', 'Vildmarksvana', 'E:Huskurer', 'Gifter & droger', 'H:Trädgårdsmästare', 'H:Florist', 'H:Jordbrukare'];
const ANIMAL_LORE = ['Naturlära', 'Jakt & fiske', 'Spåra', 'E:Djurträning', 'E:Monsterkunskap', 'H:Herde', 'H:Avlare'];
const WATER_LORE = ['Naturlära', 'Vildmarksvana', 'Sjömannaskap', 'Simma', 'Jakt & fiske', 'E:Navigation'];
const FIX = [...skillsWith('craft').filter((s) => ['H:Snickare', 'H:Klensmed', 'H:Grovsmed', 'H:Murare', 'H:Lädermakare', 'H:Skräddare', 'H:Repslagare', 'H:Timmerman', 'H:Byggare'].includes(s)), 'E:Lappa & laga'];
const FORCE = ['attr:Kroppsbyggnad', 'Slagsmål', 'Yxa', 'Klubba', 'K:Storväxt', 'K:Smednävar', 'E:Slita & släpa'];
const PICK = ['E:Låsdyrkning', 'H:Låssmed', 'H:Klensmed', 'Fingerfärdighet'];
const TAME = ['E:Djurträning', 'K:Djurvän', 'Naturlära', 'H:Herde', 'H:Boskapsskötare'];

export const THING_HOOKS: HookDef[] = [
  // ——— Walls, doors, locks ———
  hook('climb-wall', 'wall', 'climb', 'Climb the {name}', [...SKILL_SETS.climb], DIFFICULTY.hard,
    [say('You work your way up the {name}, hand and foot, and look about from the top.', 'good'), flag('climbed')],
    [say('You slip on the {name} and slide back down.', 'bad')]),
  search('wall', 'Look the {name} over for loose stones and gaps'),
  read('study-wall', 'wall', 'Study the {name}', STRUCTURE_LORE),
  hook('mend-wall', 'wall', 'craft', 'Mend the {name}', FIX, DIFFICULTY.tricky,
    [say('You patch the {name} until it will do, and a little better.', 'good'), flag('mended')],
    [say('The patch will not hold, and you must start again.')]),
  hook('force-door', 'door', 'force', 'Force the {name}', FORCE, DIFFICULTY.hard,
    [say('The {name} gives with a crack.', 'good'), flag('forced')],
    [say('The {name} holds, and the noise carries.', 'bad')], { tries: 3 }),
  search('door', 'Look the {name} over for a hidden catch'),
  hook('mend-door', 'door', 'craft', 'Mend the {name}', FIX, DIFFICULTY.tricky,
    [say('The {name} hangs true again.', 'good'), flag('mended')], [say('You cannot get the {name} to sit right.')]),
  hook('pick-lock', 'lock', 'pick', 'Pick the {name}', PICK, DIFFICULTY.hard,
    [say('The {name} gives with a small, clean click.', 'good'), flag('opened')],
    [say('The pick slips, and the {name} stays shut.', 'bad')], { tries: 3 }),
  hook('force-lock', 'lock', 'force', 'Break the {name}', FORCE, DIFFICULTY.veryHard,
    [say('The {name} breaks, loudly.', 'good'), flag('opened'), flag('noisy')],
    [say('The {name} holds, and you have made a great deal of noise.', 'bad')], { tries: 2 }),
  read('study-lock', 'lock', 'Look closely at the {name}', ['E:Låsdyrkning', 'H:Låssmed', 'H:Klensmed', 'H:Grovsmed', 'Fingerfärdighet']),

  // ——— Trees, plants, creatures ———
  hook('climb-tree', 'tree', 'climb', 'Climb the {name}', [...SKILL_SETS.climb], DIFFICULTY.tricky,
    [say('You haul yourself up through the branches of the {name} and look about.', 'good'), flag('climbed')],
    [say('A branch gives way and you drop back to the ground.', 'bad')]),
  hook('forage-plant', 'plant', 'forage', 'Gather what you can from the {name}', skillsWith('forage'), DIFFICULTY.tricky,
    [say('You gather what is good, and leave the rest to grow.', 'good'), flag('foraged')],
    [say('You find little worth taking, and cannot be sure you passed nothing.')]),
  read('study-plant', 'plant', 'Study the {name}', PLANT_LORE),
  read('study-animal', 'animal', 'Watch the {name}', ANIMAL_LORE),
  hook('calm-animal', 'animal', 'calm', 'Calm the {name}', TAME, DIFFICULTY.tricky,
    [say('The {name} settles, and lets you come near.', 'good'), flag('calmed')],
    [say('The {name} shies from you.', 'bad')]),
  hook('forage-animal', 'animal', 'forage', 'Set a snare for the {name}', skillsWith('forage'), DIFFICULTY.hard,
    [say('A good snare, set where it runs. You will know by morning.', 'good'), flag('snared')],
    [say('You set it, but not well; the {name} is unlikely to oblige.')]),

  // ——— Things to eat, mend and carry ———
  read('check-food', 'food', 'Check the {name} for poison', skillsWith('poison')),
  hook('mend-tool', 'tool', 'craft', 'Mend the {name}', FIX, DIFFICULTY.tricky,
    [say('The {name} is as good as it was, or very nearly.', 'good'), flag('mended')], [say('You cannot make the {name} sit right.')]),
  hook('mend-container', 'container', 'craft', 'Mend the {name}', FIX, DIFFICULTY.tricky,
    [say('The {name} is sound again.', 'good'), flag('mended')], [say('The {name} still leaks.')]),
  search('container', 'Search the {name}'),
  hook('force-container', 'container', 'force', 'Break open the {name}', FORCE, DIFFICULTY.hard,
    [say('The {name} splits open, and it will not close again.', 'good'), flag('opened'), flag('noisy')],
    [say('The {name} holds.', 'bad')]),

  // ——— Water, gaps, trails ———
  hook('swim-water', 'water', 'swim', 'Swim the {name}', skillsWith('swim'), DIFFICULTY.tricky,
    [say('You cross the {name}, cold and wet but whole.', 'good'), flag('crossed')],
    [say('The current takes you downstream, and you come ashore wet, cold and some way off.', 'bad')]),
  hook('fish-water', 'water', 'forage', 'Fish in the {name}', skillsWith('forage').concat(['H:Nätknytare', 'H:Fiskodlare']), DIFFICULTY.tricky,
    [say('A fair catch from the {name}.', 'good'), flag('foraged')], [say('The {name} gives you nothing.')]),
  read('study-water', 'water', 'Look at the {name}', WATER_LORE),
  hook('jump-gap', 'gap', 'jump', 'Jump the {name}', skillsWith('jump'), DIFFICULTY.hard,
    [say('You clear the {name} and land running.', 'good'), flag('crossed')],
    [say('You come up short and land hard.', 'bad')]),
  hook('follow-trail', 'trail', 'track', 'Follow the {name}', skillsWith('track'), DIFFICULTY.tricky,
    [say('You keep to the {name} and it does not lose you.', 'good'), flag('followed')],
    [say('You lose the {name} in the undergrowth.', 'bad')]),
  read('read-trail', 'trail', 'Read the {name}', skillsWith('track')),

  // ——— A sick or wounded person ———
  hook('tend', 'humanoid', 'heal', 'Tend {name}', skillsWith('heal'), DIFFICULTY.tricky,
    [say('{Name} breathes easier under your hands.', 'good'), { mood: 2 }, flag('tended'), { token: { kind: 'social', n: 1, against: '{id}', label: 'you tended {name}' } }],
    [say('{Name} winces, and you stop.'), { mood: -1 }],
    { facet: 'ill', social: false }),
];

/** The new kinds these hooks run on, with their parents (merged into the kind tree). */
export const THING_KINDS: Record<string, string> = {
  wall: 'structure',
  door: 'structure',
  lock: 'structure',
  tree: 'plant',
  food: 'item',
  tool: 'item',
  container: 'item',
  water: 'feature',
  gap: 'feature',
  trail: 'feature',
};
