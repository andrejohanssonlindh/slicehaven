import type { MobKind } from '../../art/mapScene';
import { DIFFICULTY } from '../../core/checks';
import type { Effect, SceneDef } from '../../core/scene';
import { SKILL_SETS } from '../rollables';

/**
 * Test scene: the village gate at night. Four ways in:
 * argue past the guard (bribe, threaten or sweet-talk), climb the ivy on the
 * boulder, find a trader's pass in the handcart, or sleep by the fire until the
 * gate opens at dawn (and wake up robbed).
 */

/** How the people in this scene are drawn. */
export const GATE_KINDS: Record<string, { sprite: MobKind; variant?: string; tool?: 'crook' | 'spear' | 'stick' }> = {
  hero: { sprite: 'shepherd' },
  guard: { sprite: 'guard' },
  tinker: { sprite: 'villager', variant: 'tinker', tool: 'stick' },
  crone: { sprite: 'villager', variant: 'crone', tool: 'stick' },
  youth: { sprite: 'villager', variant: 'youth', tool: 'stick' },
};

const REST: Effect[] = [
  { say: 'You sit down with the travellers. Someone hands you a heel of bread. The fire crackles, and your eyes close…' },
  { time: 'dawn' },
  { loseSilver: 0.7, why: 'stolen while you slept' },
  { remove: 'travellers' },
  { set: 'rested' },
  { set: 'gateOpen' },
  { say: 'You wake stiff and cold in the grey light. The fire is ash, the travellers are gone, and your purse is a lot lighter. Up the road, the gate creaks open.', tone: 'bad' },
];

const NOT_NOW = ['gateOpen', 'guardAngry'];

export const GATE_SCENE: SceneDef = {
  id: 'village-gate',
  title: 'The village gate',
  intro: [
    'Night has fallen by the time you reach the village. The gate is shut, a torch burns beside it, and a guard leans on his spear.',
    'You have 100 silver and nowhere to sleep.',
  ],
  // Offset coords, 10 × 12. Row 3 is the palisade. Legend: see engine/scene.ts.
  layout: [
    'ggTgpgggPg',
    'gggppggggT',
    'wggpggggwg',
    'ggggppgggg',
    'tgggpggggT',
    'tgtgpggtgf',
    'ggtgpgtgwP',
    'gwgpggggTf',
    'tggpgtgggP',
    'Pgtgpgtgtf',
    'fgggpgggPT',
    'TPggpgwTPT',
  ],
  start: { time: 'night', silver: 100, hero: [4, 11] },
  objects: [
    {
      id: 'palisade',
      name: 'Palisade',
      art: 'palisade',
      perHex: true,
      hexes: [[0, 3], [1, 3], [2, 3], [3, 3], [6, 3], [7, 3], [8, 3], [9, 3]],
      look: 'Sharpened logs, twice your height, lashed tight with rope. No gaps that you can see.',
      noUse: 'The logs are smooth, the points are sharp, and {skill} won\'t change that.',
    },
    {
      id: 'gate',
      name: 'Gate',
      art: 'gate',
      artWhen: [{ flag: 'gateOpen', art: 'gate-open' }],
      hexes: [[4, 3], [5, 3]],
      blocks: { unless: 'gateOpen' },
      look: [
        { when: { all: ['gateOpen'] }, text: 'The gate stands open. The village lies beyond.' },
        { text: 'A double gate of heavy planks, barred from the inside. A torch burns in a bracket on the post.' },
      ],
      noUse: 'The gate is barred from the inside. {skill} won\'t lift a bar you can\'t reach.',
    },
    {
      id: 'guard',
      name: 'Gate guard',
      units: ['guard'],
      hexes: [[4, 4]],
      look: [
        { when: { all: ['gateOpen'] }, text: 'The guard stands aside, yawning.' },
        { when: { all: ['guardAngry'] }, text: 'The guard has his spear levelled at you. Best not push your luck.' },
        { text: 'A heavy-set man in a steel coif and a red tabard, leaning on his spear under the torch. He watches you the way a dog watches a fox.' },
      ],
      talk: [
        {
          when: { all: ['gateOpen'] },
          line: '"Go on then, before I change my mind."',
          options: [{ label: 'Leave' }],
        },
        {
          when: { all: ['guardAngry'] },
          line: '"One more word and you\'ll spend the night in the stocks."',
          options: [
            { label: 'Show him the trader\'s pass', when: { all: ['hasPass'] }, effects: [{ set: 'usedPass' }, { set: 'gateOpen' },
              { say: 'He glares at you, then at the seal. "Should\'ve led with that." He lifts the bar.', tone: 'speech' }] },
            { label: 'Back off' },
          ],
        },
        {
          line: '"Gate\'s shut. Nobody gets in after dark: not you, not the baron\'s mother. Sod off and come back tomorrow."',
          options: [
            { label: 'Argue your way in', argue: true },
            { label: 'Show him the trader\'s pass', when: { all: ['hasPass'] }, effects: [{ set: 'usedPass' }, { set: 'gateOpen' },
              { say: 'He squints at the seal, mouths the words, and spits. "Should\'ve said you were with the carter." He lifts the bar.', tone: 'speech' }] },
            { label: 'Fine. (Leave)' },
          ],
        },
      ],
      social: {
        goal: 'open the gate',
        cost: 2,
        dice: {
          Handel: { n: 2, mod: 2 },
          Genomskåda: { n: 3, mod: 0 },
          'Injaga fruktan': { n: 2, mod: 2 },
          'attr:Självkontroll': { n: 3, mod: 0 },
          'attr:Vaksamhet': { n: 2, mod: 3 },
          'attr:Kroppsbyggnad': { n: 3, mod: 1 },
        },
        approaches: [
          {
            id: 'bribe',
            label: 'Bribe him',
            pitch: 'You let a few coins clink in your palm. "Cold night for it. Surely a man on watch could use something for a hot meal?"',
            why: 'Coin talks: +2 Control. If he takes it, it costs 20% of your silver.',
            when: { none: NOT_NOW },
            skills: [...SKILL_SETS.bribe],
            locked: 'Handel',
            situation: 2,
            answers: ['Handel', 'Genomskåda', 'attr:Självkontroll'],
            retorts: [
              '"A hot meal? That buys a cold one."',
              '"And when the sergeant asks who let you in?"',
              '"Hm. I\'m thinking about it."',
            ],
            success: [
              { say: 'He weighs the coins, pockets them, and lifts the bar just far enough. "Didn\'t see you."', tone: 'speech' },
              { loseSilver: 0.2, why: 'the bribe' },
              { set: 'paidBribe' },
              { set: 'gateOpen' },
            ],
            failure: [{ say: '"Keep your coppers. I\'m not losing my post for that."', tone: 'speech' }],
          },
          {
            id: 'threaten',
            label: 'Threaten him',
            pitch: 'You step into the torchlight and lower your voice. "Open up, or you and I are going to have a problem."',
            why: 'He has a spear and a wall at his back: −2 Control. Fail and he won\'t talk to you again.',
            when: { none: NOT_NOW },
            skills: [...SKILL_SETS.threaten],
            locked: 'attr:Kroppsbyggnad',
            situation: -2,
            answers: ['attr:Självkontroll', 'Injaga fruktan', 'attr:Kroppsbyggnad'],
            retorts: [
              '"Is that so."',
              'He shifts his grip on the spear.',
              '"Last chance, sheep-boy."',
            ],
            success: [
              { say: '"All right, all right!" He fumbles the bar loose and backs off. "Just go."', tone: 'speech' },
              { set: 'scaredGuard' },
              { set: 'gateOpen' },
            ],
            failure: [
              { say: 'He laughs and levels the spear at your chest. "Try that again and you\'ll spend the night in the stocks."', tone: 'speech' },
              { set: 'guardAngry' },
            ],
          },
          {
            id: 'sweet',
            label: 'Sweet-talk him',
            pitch: '"Long night, friend? I\'ve walked since dawn, and my aunt will worry herself sick if I\'m not at her table."',
            why: 'Even ground: no change to Control.',
            when: { none: NOT_NOW },
            skills: [...SKILL_SETS.sweetTalk],
            locked: 'attr:Intryck',
            situation: 0,
            answers: ['Genomskåda', 'attr:Självkontroll', 'attr:Vaksamhet'],
            retorts: [
              '"Everyone\'s got an aunt."',
              '"What\'s her name, then, this aunt?"',
              'He sighs and looks up at the stars.',
            ],
            success: [
              { say: 'He rubs his face and lifts the bar. "Go on. Give your aunt my regards."', tone: 'speech' },
              { set: 'charmedGuard' },
              { set: 'gateOpen' },
            ],
            failure: [{ say: '"Nice try. Gate\'s still shut."', tone: 'speech' }],
          },
        ],
      },
      noUse: 'You can\'t see how {skill} would help with him. Try talking.',
    },
    {
      id: 'rock',
      name: 'Ivy-covered boulder',
      art: 'ivy-rock',
      hexes: [[7, 4], [8, 4], [7, 5]],
      look: [
        { when: { all: ['guardWatching'] }, text: 'The boulder by the palisade, ivy torn where you slid down. The guard keeps his torch turned this way now.' },
        { text: 'A boulder the size of a hay wagon, shouldered up against the palisade. Ivy covers it in ropes as thick as your wrist, all the way to the top, and the top is not far below the points.' },
      ],
      checks: [
        {
          id: 'climb',
          label: 'Climb the ivy and go over the palisade',
          skills: [...SKILL_SETS.climb],
          difficulty: 15,
          hint: 'The ivy on the boulder is thick as rope, and the top of the rock is close to the palisade points. Someone could climb that.',
          tries: 2,
          success: [
            { say: 'Hand over hand through the ivy, along the top of the rock, and you drop over the points into the dark on the other side.', tone: 'good' },
            { enter: 'You climbed the ivy and went over the palisade. Nobody saw a thing.', via: 'climb', to: [7, 2] },
          ],
          failure: [{ say: 'A rope of ivy tears loose and you slide back down in a shower of leaves. That was loud.', tone: 'bad' }],
          outOfTries: [
            { say: '"Oi! Who\'s that by the rock? Get away from there!" The guard brings his torch over, and stays.', tone: 'speech' },
            { set: 'guardWatching' },
          ],
        },
      ],
      noUse: 'You can\'t see how {skill} would help with a rock.',
    },
    {
      id: 'cart',
      name: 'Handcart',
      art: 'handcart',
      hexes: [[1, 4], [2, 4]],
      look: [
        { when: { all: ['hasPass'] }, text: 'The handcart, its tarp a little rumpled now.' },
        { text: 'A big two-wheeled handcart, pulled up against the palisade for the night, its shafts resting in the grass. Sacks under a tarp. Its owner must be inside.' },
      ],
      checks: [
        {
          id: 'search',
          label: 'Search the cart',
          skills: [...SKILL_SETS.search],
          difficulty: DIFFICULTY.tricky,
          hint: 'The handcart\'s tarp is tied down over more than turnips, by the look of it. Worth a closer search.',
          when: { none: ['hasPass'] },
          success: [
            { say: 'Under the tarp, between sacks of turnips, a folded letter with a wax seal: a trader\'s pass, good for "the bearer and his goods". That could open a gate.', tone: 'good' },
            { set: 'hasPass' },
          ],
          failure: [{ say: 'Turnips, onions, a coil of rope. If there\'s anything else here, you missed it.' }],
        },
      ],
      noUse: 'You can\'t see how {skill} would help with a cart.',
    },
    {
      id: 'campfire',
      name: 'Campfire',
      art: 'campfire',
      artWhen: [{ flag: 'rested', art: 'campfire-out' }],
      hexes: [[2, 8]],
      look: [
        { when: { all: ['rested'] }, text: 'Cold ashes in a ring of stones.' },
        { text: 'A small fire of sticks in a ring of stones. Three travellers sit around it in their cloaks, waiting for the gate to open.' },
      ],
      actions: [
        // Open even after you've got the gate open: the scene doesn't force an order.
        { id: 'rest', label: 'Rest by the fire until dawn', sub: 'Sleep, and go in when the gate opens', when: { none: ['rested'] }, effects: REST },
      ],
      noUse: 'You can\'t see how {skill} would help with a campfire.',
    },
    {
      id: 'travellers',
      name: 'Travellers',
      units: ['tinker', 'crone', 'youth'],
      hexes: [[1, 8], [1, 9], [3, 8]],
      look: 'Three travellers: a tinker with his pack, an old woman, and a young man who smiles a lot.',
      talk: [
        {
          line: '"Gate won\'t open till sunrise," says the tinker. "Sit, warm yourself. Plenty of room by the fire."',
          options: [
            { label: 'Rest by the fire until dawn', when: { none: ['rested'] }, effects: REST },
            { label: 'Maybe later' },
          ],
        },
      ],
      checks: [
        {
          id: 'read-travellers',
          label: 'Size them up',
          skills: [...SKILL_SETS.readPeople],
          difficulty: DIFFICULTY.hard,
          hint: 'One of the travellers keeps glancing your way. You could try to size them up.',
          tries: 1,
          when: { none: ['readThem'] },
          success: [
            { say: 'The young man\'s smile never reaches his eyes, and twice now he has looked at your purse. You wouldn\'t sleep soundly here.', tone: 'good' },
            { set: 'readThem' },
          ],
          failure: [{ say: 'Honest folk, as far as you can tell.' }],
        },
      ],
      noUse: 'You can\'t see how {skill} would help with them.',
    },
    {
      id: 'cottage-w',
      name: 'Cottage',
      art: 'cottage',
      hexes: [[1, 1], [2, 1]],
      look: 'A cottage inside the palisade. A light still burns in the window.',
    },
    {
      id: 'cottage-e',
      name: 'Cottage',
      art: 'cottage',
      hexes: [[6, 1], [7, 1]],
      look: 'A cottage inside the palisade, thatch thick with moss.',
    },
  ],
  exits: [
    { hexes: [[4, 3], [5, 3]], when: { all: ['gateOpen', 'rested'] },
      effects: [{ enter: 'You walked in at dawn behind the first carts. The travellers, and most of your silver, were long gone.' }] },
    { hexes: [[4, 3], [5, 3]], when: { all: ['gateOpen', 'paidBribe'] },
      effects: [{ enter: 'You bought your way in. The guard is a little richer, and so is your knowledge of how things work here.' }] },
    { hexes: [[4, 3], [5, 3]], when: { all: ['gateOpen', 'scaredGuard'] },
      effects: [{ enter: 'You scared your way in. The guard will remember your face.' }] },
    { hexes: [[4, 3], [5, 3]], when: { all: ['gateOpen', 'usedPass'] },
      effects: [{ enter: 'You walked in on someone else\'s trader\'s pass. Somewhere inside, a carter will be looking for it.' }] },
    { hexes: [[4, 3], [5, 3]], when: { all: ['gateOpen'] },
      effects: [{ enter: 'You talked your way in. Your aunt, whoever she is, will be glad.' }] },
  ],
};
