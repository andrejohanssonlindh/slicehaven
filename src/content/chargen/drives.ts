/**
 * Drives (character traits): d100 range, name, and three levels of deeds.
 * Level texts are our own short summaries.
 */
export interface Drive {
  lo: number;
  hi: number;
  sv: string;
  en: string;
  blurb: string;
  levels: [string, string, string];
}

type Row = [lo: number, hi: number, sv: string, en: string, blurb: string, l1: string, l2: string, l3: string];

const ROWS: Row[] = [
  [1, 2, 'Aggression', 'Aggression', 'Anger boiling under the surface.', 'Angry behaviour: act aggressive or threatening', 'Outburst: let it out where it is risky or wildly inappropriate', 'Fury at the wrong moment: lose control where it means exile or mortal danger'],
  [3, 4, 'Arrogans', 'Arrogance', 'A burning need to exalt yourself and put others down.', 'Put down: scorn someone or praise yourself', 'Insult the dangerous: mock a dangerous person or crowd', 'Scorn in the face of death: mock even when it will likely get you killed'],
  [5, 6, 'Avundsjuka', 'Envy', 'Bitter envy of a person, a thing or a class.', 'Voice your envy', 'Cause trouble: your envy lands you in danger or ruins relationships', 'Risk everything: envy puts your life or livelihood at stake'],
  [7, 8, 'Bedrägeri', 'Deceit', 'Lies are a tool to get your way.', 'White lies: lie where it is harmless, or brag about who you fooled', 'Lie out of danger: talk your way out of a dangerous spot', 'Great sacrifice: fool someone against all odds into a great sacrifice'],
  [9, 10, 'Blodtörst', 'Bloodlust', 'A terrible thirst for blood, the essence of life.', 'Whet the thirst: a few drops, a licked knife, talk of blood\'s power', 'Quench the thirst: drain a small animal or drink from a willing victim', 'Bloodbath: bathe in blood or drain an enemy'],
  [11, 12, 'Botgöring', 'Penance', 'Guilt drives you to atone for past wrongs.', 'Confession: speak of your sins and guilt', 'Atonement: make amends to someone you harmed, or a great sacrifice', 'Total sacrifice: put your life in the hands of those you wronged'],
  [13, 15, 'Drama', 'Drama', 'Life is a stage and you play it big.', 'Stir feelings: move the people around you', 'Dramatic turn: give an emotional scene a dramatic twist', 'All for art: a risky, emotional grand gesture'],
  [16, 17, 'Förälskelse', 'Infatuation', 'In love with someone, and it shows.', 'Honour your love: praise the one you love', 'Serve your love: give time and effort to them at a cost', 'Sacrifice all for love'],
  [18, 19, 'Grymhet', 'Cruelty', 'You enjoy making others suffer.', 'Coldness: belittle or mistreat someone vulnerable', 'Punisher: brutalise someone who can\'t defend themselves', 'Annihilation: wipe out your enemies and all they hold dear'],
  [20, 21, 'Gästfrihet', 'Hospitality', 'Host and guest are sacred.', 'The law of hospitality: receive a guest, or be a good one', 'The duties of hospitality: honour it despite risk or cost', 'The trials of hospitality: risk life and limb for a guest or host'],
  [22, 23, 'Hat', 'Hatred', 'You hate someone or something with all your heart.', 'Words of hate: speak against the object of your hate', 'Deeds of hate: confront it in word or deed', 'Consumed by hate: let hatred drive you to extremes'],
  [24, 26, 'Heder', 'Honour', 'Your honour matters more than anything.', 'The weight of honour: speak of honour\'s importance', 'Defend your honour: protect it in a dangerous situation', 'Honour above all: risk your life for your honour'],
  [27, 28, 'Hjälpsamhet', 'Helpfulness', 'You can\'t walk past someone in need.', 'Speak of helping others', 'Help someone out of danger, though it is risky', 'Altruism: sacrifice everything, perhaps your life, for others'],
  [29, 31, 'Hämnd', 'Revenge', 'Someone wronged you and will pay.', 'Speak of revenge, or plot it', 'A step toward revenge: take risks for it', 'Revenge fulfilled: kill or utterly ruin the one who wronged you'],
  [32, 34, 'Kamp', 'Strife', 'You live for the fight.', 'Tell of past battles', 'A fight to the death: stake your life in a fight', 'Victory against all odds: win a hopeless fight'],
  [35, 36, 'Kunskapstörst', 'Thirst for knowledge', 'You must know more.', 'Share knowledge: study, learn and teach', 'Dangerous knowledge: put yourself at risk to learn', 'World-changing knowledge: find knowledge that changes everything'],
  [37, 38, 'Laglöshet', 'Lawlessness', 'Rules are made to be broken.', 'Offence: snub authority or mock those in power', 'Riot: rouse a violent mob or start a riot', 'Revolution: overthrow the local regime'],
  [39, 40, 'Ledarskap', 'Leadership', 'You take charge.', 'Give orders', 'Take charge of a dangerous situation', 'Against all odds: lead others through mortal danger'],
  [41, 42, 'Livsglädje', 'Joy of life', 'Life is to be enjoyed.', 'Everyday delight: find joy in small things', 'Pleasure-seeker: drop duties for pleasure', 'Unbridled pleasure: turn your life upside down for pleasure'],
  [43, 44, 'Makt', 'Power', 'You want power over others.', 'Explain how things should be run', 'A step toward power', 'Position of power: reach a position of real power'],
  [45, 46, 'Melankoli', 'Melancholy', 'A grey weight on the soul.', 'Downcast: wave away a compliment, a joke, a joy', 'Give up: let apathy win even when it endangers you', 'Utter hopelessness: do nothing even though there is a way out'],
  [47, 48, 'Mission', 'Mission', 'The true faith must be spread.', 'Preach the true faith openly', 'Sway the people: preach to a hostile crowd', 'Convert the faithless: convert a large group'],
  [49, 51, 'Mod', 'Courage', 'Fear is something to defy.', 'Stand up for yourself and speak of courage', 'Challenge fate: walk into obvious danger', 'Challenge death: face mortal danger without hesitation'],
  [52, 54, 'Nyfikenhet', 'Curiosity', 'You have to find out.', 'Find things out: ask, snoop, spy', 'Meddle: get into real trouble out of curiosity', 'Vital curiosity: risk your life to find out'],
  [55, 56, 'Pacifism', 'Pacifism', 'Violence is never the answer.', 'Argue for a peaceful solution', 'Prevent violence: try to stop a violent situation', 'Stand by your conviction: face mortal danger rather than fight'],
  [57, 58, 'Planering', 'Planning', 'Everything goes better with a plan.', 'A simple plan: plan, or speak of planning', 'A risky plan: plan for a risky venture', 'An impossible plan: pull off a very dangerous plan'],
  [59, 60, 'Plikt', 'Duty', 'Orders are orders.', 'Duty first: take an order or speak of duty', 'Carry out a dangerous order', 'Unto death: carry out an order that puts your life at risk'],
  [61, 62, 'Pyromani', 'Pyromania', 'Fire calls to you.', 'Play with fire: lose yourself watching flames', 'Burn! Burn!: set your surroundings alight', 'Arson: cause wide devastation with fire'],
  [63, 65, 'Rikedom', 'Wealth', 'Money, money, money.', 'The wonder of wealth: talk about money', 'A small fortune: get your hands on a sizeable sum', 'A vast fortune: become enormously rich'],
  [66, 67, 'Risktagande', 'Risk-taking', 'Danger is the spice of life.', 'Daredevil: do something risky', 'Recklessness: do something extremely foolhardy', 'Suicidal: in grave danger, take the most dangerous path'],
  [68, 69, 'Rus', 'Intoxication', 'The craving for a high.', 'Just a little one: a drink or a pipe, or talk of it', 'Lose control: get intoxicated at a dangerous moment', 'Sacrifice all: risk friends and life for the high'],
  [70, 72, 'Ryktbarhet', 'Fame', 'You want your name on everyone\'s lips.', 'Spread your name: talk about yourself', 'Known for deeds: do something risky that people will talk about', 'Become famous: a deed of such scale that it is widely known'],
  [73, 74, 'Sanning', 'Truth', 'Honesty above all.', 'The virtue of truth: speak of honesty and be honest', 'Truth and consequence: tell the truth and take the consequences', 'Truth above all: tell the truth even when it may cost your life'],
  [75, 76, 'Sex', 'Lust', 'Desire drives you.', 'Talk about sex, flirt and proposition', 'A new conquest: bed someone new', 'Lust at a high price: bed someone famous or dangerous at great risk'],
  [77, 78, 'Självspäkelse', 'Mortification', 'Truth is reached through suffering.', 'Preach of suffering', 'Self-torment: whip or torture yourself', 'Extreme sacrifice: endure extreme suffering for your belief'],
  [79, 80, 'Skaparglädje', 'Joy of creation', 'You must create.', 'Perform or discuss your art', 'Leave a mark: create or perform something that moves people', 'Become renowned: a work that is talked about far and wide'],
  [81, 82, 'Slösaktighet', 'Extravagance', 'Money is for spending.', 'Small change: give alms or buy rounds', 'Spend a fortune', 'The brink of ruin: spend an enormous fortune'],
  [83, 85, 'Spel & vadslagning', 'Gambling', 'You can\'t say no to a wager.', 'Play a game or make a bet', 'High stakes: gamble big', 'Everything at stake: gamble all you have'],
  [86, 87, 'Stöld', 'Theft', 'If it isn\'t nailed down…', 'Steal a small sum or a trinket', 'Steal a large sum or something valuable', 'Steal an enormous sum or a priceless treasure'],
  [88, 89, 'Svek', 'Betrayal', 'Loyalty is for fools.', 'Bite the hand that feeds you: badmouth a friend or patron', 'Break a trust', 'Total betrayal: break a vital trust at a critical moment'],
  [90, 91, 'Underdånighet', 'Submission', 'Others know better than you.', 'Belittle yourself, or let others walk over you', 'Get into trouble because of your submissiveness', 'Life ruined: your submissiveness wrecks your life'],
  [92, 93, 'Vankelmod', 'Indecision', 'You can never make up your mind.', 'Voice your doubts', 'Get into danger through hesitation', 'Mortal danger: hesitation puts your life at stake'],
  [94, 95, 'Vänskap', 'Friendship', 'Friends are everything.', 'Spend time with or speak of your friends', 'Stand by your friends in danger', 'Sacrifice: save a friend\'s life at great risk to yourself'],
  [96, 98, 'Värdighet', 'Dignity', 'You keep your bearing whatever happens.', 'Show your dignity and fine manners', 'Keep your dignity even in danger', 'At the edge of the abyss: keep it even when your life is at stake'],
  [99, 100, 'Övertygelse', 'Conviction', 'You believe, and act on it.', 'Spread your conviction', 'Stand up for it in a risky situation', 'Make it real: risk everything for your conviction'],
];

export const DRIVES: Drive[] = ROWS.map(([lo, hi, sv, en, blurb, a, b, c]) => ({ lo, hi, sv, en, blurb, levels: [a, b, c] }));

/** What fulfilling each level gives (own wording of the sheet's summary). */
export const DRIVE_REWARDS: [string, string, string] = [
  'Level I: 1 Focus (0 if the drive is weakened or in doubt).',
  'Level II: 3 Focus, 1 Wellbeing or a turning event (less if weakened; nothing if in doubt).',
  'Level III: 2 Wellbeing, all Focus back and a life-changing event.',
];
