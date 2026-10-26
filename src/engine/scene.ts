import { type Battle, type Unit, cellAt, unitAt, unitHexes, walkReach, pathFromReach } from '../core/battle';
import { type Dice, difficultyName, rollText } from '../core/checks';
import { around, gap } from '../core/footprint';
import { type Hex, hexEquals, hexKey, offsetToHex, parseHexKey } from '../core/hex';
import { type Hero, canRoll, diceOf } from '../core/hero';
import { Rng } from '../core/rng';
import {
  type CheckDef, type Effect, type ObjectDef, type SceneApproach, type SceneDef, type SceneEvent, type SceneState,
  apply, approachOpen, artOf, attempt, blocks, checkFor, checksHere, hintsNear, lookText, met, newSceneState, openChecks,
  talkFor, usefulSkills,
} from '../core/scene';
import {
  type Conflict, ROUNDS, allowed, conflictOver, mustUseLocked, newConflict, outcome, playRound, pooled,
} from '../core/social';
import { diceText } from '../core/chargen/tables';
import { SCENE_ART } from '../art/sceneArt';
import type { Ground } from '../art/terrain';
import type { PropKind } from '../art/mapScene';
import { SKILL_SETS, byGroup, rollableName } from '../content/rollables';
import type { SandboxCell } from '../content/sandbox';
import { GameConsole, type LogTone } from '../ui/console';
import { Sheet, type SheetOption, type SheetSection, esc } from '../ui/sheet';
import { Camera } from './camera';
import { Effects } from './effects';
import { type Highlight, type MobDef, Renderer } from './renderer';
import { Weather } from './weather';

/**
 * Exploration scene controller: walk around, tap things to look, talk and use
 * skills. Rules live in core/scene and core/social; this file animates and
 * shows them. A console at the bottom keeps the log.
 */

/** Ground map legend for scene layouts. */
const LEGEND: Record<string, { ground: Ground; prop?: PropKind; obstacle?: boolean }> = {
  g: { ground: 'grass' },
  t: { ground: 'tallgrass' },
  w: { ground: 'flowers' },
  p: { ground: 'path' },
  f: { ground: 'forest' },
  T: { ground: 'forest', prop: 'tree', obstacle: true },
  P: { ground: 'forest', prop: 'pine', obstacle: true },
};

const TIME_LABEL = { night: 'Night', dawn: 'Dawn', day: 'Day' } as const;
const HERO_ID = 'hero';
const HINTS_KEY = 'slicehaven.hints';

const toHex = ([c, r]: [number, number]): Hex => offsetToHex(c, r);
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface SceneHooks {
  /** Offer a different hero (the page owns the roster). */
  heroChoices: () => { label: string; sub: string; pick: () => Hero }[];
}

export function startScene(def: SceneDef, kinds: Record<string, MobDef>, startHero: Hero, hooks: SceneHooks): void {
  let hero = startHero;
  const state: SceneState = newSceneState(def);
  const rng = Rng.fromSeed(Date.now());

  // --- map --------------------------------------------------------------------

  const objectHexes = new Map<string, Hex[]>(def.objects.map((o) => [o.id, o.hexes.map(toHex)]));
  const objectAt = new Map<string, ObjectDef>();
  for (const o of def.objects) if (!o.units) for (const h of objectHexes.get(o.id)!) objectAt.set(hexKey(h), o);

  const cells: SandboxCell[] = [];
  const battle: Battle = { cells: {}, units: [] };
  def.layout.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const lg = LEGEND[ch] ?? LEGEND.g;
      const at = offsetToHex(col, row);
      const obj = objectAt.get(hexKey(at));
      const blocked = !!lg.obstacle || (!!obj && blocks(obj, state));
      cells.push({ col, row, ground: lg.ground, prop: lg.prop, obstacle: blocked });
      battle.cells[hexKey(at)] = {
        at, obstacle: blocked, flammable: false, water: false, fire: 'none', ground: lg.ground,
        feature: lg.prop ?? (obj?.art ? SCENE_ART[obj.art]?.feature : undefined), object: obj?.id,
      };
    });
  });
  const cellArt = new Map(cells.map((c) => [hexKey(offsetToHex(c.col, c.row)), c]));

  const heroUnit: Unit = { id: HERO_ID, kind: 'hero', name: hero.name, team: 'party', at: toHex(def.start.hero), hp: 10, maxHp: 10 };
  battle.units.push(heroUnit);
  /** Unit id -> the object (person or group) it belongs to. */
  const unitObject = new Map<string, ObjectDef>();
  for (const o of def.objects) {
    o.units?.forEach((kind, i) => {
      const u: Unit = { id: `${o.id}#${i}`, kind, name: o.name, team: 'npc', at: toHex(o.hexes[i]), hp: 1, maxHp: 1 };
      battle.units.push(u);
      unitObject.set(u.id, o);
    });
  }

  const renderer = new Renderer(cells, battle, kinds);
  const weather = new Weather(renderer.width, renderer.height);
  const effects = new Effects();

  /** Art key currently shown per object, so we only rebuild on change. */
  const shownArt = new Map<string, string>();
  def.objects.forEach((o, i) => {
    const art = artOf(o, state);
    if (!art) return;
    const seed = 1000 + i * 37;
    const p = renderer.addProp(o.id, objectHexes.get(o.id)!, (w) => SCENE_ART[art].make(w, seed), !!o.perHex);
    shownArt.set(o.id, art);
    lightsFor(o, art, p);
  });

  function lightsFor(o: ObjectDef, art: string, p: { x: number; y: number }): void {
    const a = SCENE_ART[art];
    if (a.flame) renderer.setFlame(o.id, p.x + a.flame.dx, p.y + a.flame.dy, a.flame.size);
    else renderer.removeFlame(o.id);
    if (a.glow) renderer.setGlow(o.id, p.x + a.glow.dx, p.y + a.glow.dy, a.glow.r, a.glow.color);
    else renderer.removeGlow(o.id);
  }

  // People around the fire face it.
  const fire = def.objects.find((o) => o.id === 'campfire');
  for (const u of battle.units) if (u.team === 'npc' && fire) renderer.faceToward(u, toHex(fire.hexes[0]));

  // --- page ---------------------------------------------------------------------

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const offscreen = document.createElement('canvas');
  offscreen.width = renderer.width;
  offscreen.height = renderer.height;
  const octx = offscreen.getContext('2d')!;
  const info = document.getElementById('info')!;
  const log = new GameConsole(document.getElementById('console')!);
  const sheet = new Sheet(document.getElementById('sheet')!);

  let busy = false;
  let focus: Hex[] = [];
  /** Flag skills that would do something ("✓ Useful here"). A test aid; the real game will hide them. */
  let hints = localStorage.getItem(HINTS_KEY) !== '0';

  const bar = document.getElementById('scene-bar')!;
  barButton('Use a skill', 'Here, where you stand', () => {
    if (!busy) skillHere();
  });
  const hintBtn = barButton('', 'Mark useful skills', () => {
    hints = !hints;
    localStorage.setItem(HINTS_KEY, hints ? '1' : '0');
    say(hints ? 'Hints on: useful skills are marked.' : 'Hints off: nothing is marked.', 'info');
    refreshInfo();
  });

  function barButton(label: string, sub: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<b>${esc(label)}</b><small>${esc(sub)}</small>`;
    b.addEventListener('click', onClick);
    bar.appendChild(b);
    return b;
  }

  const camera = new Camera(canvas, renderer.width, renderer.height, (wx, wy) => void safe(() => onTap(wx, wy)));

  async function safe(fn: () => Promise<void> | void): Promise<void> {
    try {
      await fn();
    } catch (err) {
      console.error('[scene] action failed', err);
      busy = false;
      say('Something went wrong (logged).', 'bad');
    }
  }

  function say(text: string, tone: LogTone = 'say'): void {
    log.add(text, tone);
  }

  function refreshInfo(): void {
    info.innerHTML = `<b>${esc(hero.name)}</b> · <span class="silver">${state.silver} silver</span> · ${TIME_LABEL[state.time]}`
      + `<br><span>${state.ended ? 'You made it in. Look around, or play again.' : 'Tap something to look, talk or use a skill. Tap the ground to walk.'}</span>`;
    hintBtn.querySelector('b')!.textContent = hints ? 'Hints: on' : 'Hints: off';
    hintBtn.classList.toggle('on', hints);
  }

  // --- input ----------------------------------------------------------------------

  async function onTap(wx: number, wy: number): Promise<void> {
    if (busy) return;
    if (sheet.isOpen) {
      sheet.close();
      return;
    }
    const id = renderer.pick(wx, wy);
    if (id === HERO_ID) return showHero();
    const h = renderer.hexAt(wx, wy);
    let obj = id ? def.objects.find((o) => o.id === id) ?? unitObject.get(id) : undefined;
    if (!obj && h) {
      const u = unitAt(battle, h);
      if (u?.id === HERO_ID) return showHero();
      obj = u ? unitObject.get(u.id) : objectAt.get(hexKey(h));
    }
    if (obj && state.removed.includes(obj.id)) obj = undefined;
    // Things you can walk onto (an open gate): just walk there.
    if (obj && !obj.units && !blocks(obj, state) && h && objectHexes.get(obj.id)!.some((x) => hexEquals(x, h))) obj = undefined;
    if (obj) return interact(obj);
    if (h) return walkTo(h);
  }

  async function walkTo(h: Hex): Promise<void> {
    if (hexEquals(h, heroUnit.at)) return;
    const reach = walkReach(battle, heroUnit, 60);
    const r = reach.get(hexKey(h));
    if (!r?.canStop) {
      say(cellAt(battle, h)?.obstacle ? 'You can\'t walk there.' : 'You can\'t get there from here.', 'info');
      return;
    }
    await moveAlong(pathFromReach(reach, h).map(parseHexKey));
    await checkExits();
  }

  async function moveAlong(path: Hex[]): Promise<void> {
    if (!path.length) return;
    busy = true;
    heroUnit.at = path[path.length - 1];
    await renderer.animateMove(heroUnit, path, false);
    busy = false;
  }

  async function checkExits(): Promise<void> {
    if (state.ended) return;
    for (const ex of def.exits) {
      if (!met(state, ex.when) || !ex.hexes.some((x) => hexEquals(toHex(x), heroUnit.at))) continue;
      await run(ex.effects);
      return;
    }
  }

  /** Walk next to a thing (if not already), then open what you can do with it. */
  async function interact(o: ObjectDef): Promise<void> {
    const hexes = hexesOf(o);
    if (gap(unitHexes(heroUnit), hexes) > 1) {
      const reach = walkReach(battle, heroUnit, 60);
      let best: { h: Hex; cost: number } | undefined;
      for (const n of around(hexes)) {
        const r = reach.get(hexKey(n));
        if (r?.canStop && (!best || r.cost < best.cost)) best = { h: n, cost: r.cost };
      }
      if (!best) {
        say(`You can't get to the ${o.name.toLowerCase()} from here.`, 'info');
        return;
      }
      await moveAlong(pathFromReach(reach, best.h).map(parseHexKey));
    }
    const centre = hexes[Math.floor(hexes.length / 2)];
    renderer.faceToward(heroUnit, centre);
    for (const u of battle.units) if (unitObject.get(u.id) === o) renderer.faceToward(u, heroUnit.at);
    menu(o);
  }

  function hexesOf(o: ObjectDef): Hex[] {
    if (!o.units) return objectHexes.get(o.id)!;
    return battle.units.filter((u) => unitObject.get(u.id) === o).flatMap(unitHexes);
  }

  function open(o: ObjectDef | undefined, content: Parameters<Sheet['show']>[0]): void {
    focus = o ? hexesOf(o) : [];
    sheet.show(content, () => {
      focus = [];
    });
  }

  // --- menus ------------------------------------------------------------------------

  function menu(o: ObjectDef): void {
    const look = lookText(o, state);
    say(`${o.name}: ${look}`, 'info');
    const opts: SheetOption[] = [];
    const talk = talkFor(o, state);
    if (talk) opts.push({ label: 'Talk', style: 'primary', onPick: () => talkTo(o) });
    for (const a of o.actions ?? []) {
      if (!met(state, a.when)) continue;
      opts.push({ label: a.label, sub: a.sub, onPick: () => void safe(() => doAction(o, a.label, a.effects)) });
    }
    opts.push({ label: 'Use a skill…', sub: 'Climb, search, read people… anything you know', onPick: () => skillMenu(o) });
    open(o, { title: o.name, body: `<p>${esc(look)}</p>`, sections: [{ options: opts }] });
  }

  async function doAction(o: ObjectDef, label: string, eff: Effect[]): Promise<void> {
    sheet.close();
    say(`You: ${label}.`, 'you');
    await run(eff, o);
  }

  function talkTo(o: ObjectDef): void {
    const t = talkFor(o, state);
    if (!t) return;
    say(`${o.name}: ${t.line}`, 'speech');
    const opts: SheetOption[] = t.options.filter((x) => met(state, x.when)).map((x) => ({
      label: x.label,
      style: x.argue ? 'primary' : x.effects ? 'good' : 'muted',
      onPick: () => void safe(async () => {
        if (x.argue) return approaches(o);
        sheet.close();
        if (x.effects) {
          say(`You: ${x.label}.`, 'you');
          await run(x.effects, o);
        }
      }),
    }));
    open(o, { title: o.name, body: `<p class="speech">${esc(t.line)}</p>`, sections: [{ options: opts }] });
  }

  // --- skills ---------------------------------------------------------------------------

  function diceTag(d: Dice): string {
    return d.n > 0 ? diceText(d) : '—';
  }

  /**
   * The skill list: every skill you have, in fold-out groups (attributes, movement,
   * social… then expertise, marks, crafts, abilities). With hints on, skills that
   * would do something are flagged and also listed on top. `useful` maps a skill
   * to what it would try.
   */
  function skillPicker(o: ObjectDef | undefined, title: string, useful: Map<string, string>, pick: (id: string) => void): void {
    const opt = (id: string, top: boolean): SheetOption => {
      const can = canRoll(hero, id);
      const flag = hints && useful.has(id);
      return {
        label: (flag && !top ? '✓ ' : '') + rollableName(id),
        sub: flag ? (can ? useful.get(id) : 'Would work here, but you don\'t have it') : undefined,
        tag: diceTag(diceOf(hero, id)),
        disabled: !can,
        style: flag ? (can ? 'good' : 'muted') : undefined,
        onPick: () => pick(id),
      };
    };
    const sections: SheetSection[] = [];
    if (hints && useful.size) sections.push({ title: '✓ Useful here', options: [...useful.keys()].map((id) => opt(id, true)) });
    const owned = Object.keys(hero.dice).filter((id) => canRoll(hero, id));
    for (const g of byGroup(owned)) sections.push({ title: `${g.label} (${g.ids.length})`, folded: true, options: g.ids.map((id) => opt(id, false)) });
    open(o, { title, body: hints ? undefined : '<p class="hint">Pick a skill. Hints are off, so nothing is marked.</p>', sections });
  }

  const checkLine = (c: CheckDef): string => `${c.label} · ${difficultyName(c.difficulty)} (${c.difficulty})`;

  function skillMenu(o: ObjectDef): void {
    const useful = new Map(usefulSkills(o, state).map((id) => [id, checkLine(checkFor(o, state, id)!)]));
    skillPicker(o, `Use a skill: ${o.name}`, useful, (id) => {
      const c = checkFor(o, state, id);
      if (c) return void safe(() => rollCheck(o, c, id));
      const line = (o.noUse ?? 'You can\'t see how {skill} would help here.').replace('{skill}', rollableName(id));
      say(line, 'info');
      open(o, { title: rollableName(id), body: `<p>${esc(line)}</p>`, sections: [{ options: [{ label: 'Back', onPick: () => skillMenu(o) }] }] });
    });
  }

  const nextToHero = (o: ObjectDef): boolean => gap(unitHexes(heroUnit), hexesOf(o)) <= 1;

  /** Use a skill where you stand: on whatever's next to you, or look around. */
  function skillHere(): void {
    const useful = new Map<string, string>();
    for (const o of def.objects) {
      if (state.removed.includes(o.id) || !nextToHero(o)) continue;
      for (const id of usefulSkills(o, state)) if (!useful.has(id)) useful.set(id, checkLine(checkFor(o, state, id)!));
    }
    for (const id of SKILL_SETS.search) if (!useful.has(id)) useful.set(id, 'Look around for anything interesting');
    skillPicker(undefined, 'Use a skill here', useful, (id) => {
      const here = checksHere(def.objects, state, id, nextToHero);
      if (here.length === 1) return void safe(() => rollCheck(here[0].o, here[0].c, id));
      if (here.length > 1) {
        open(undefined, {
          title: `${rollableName(id)}: on what?`,
          sections: [{ options: here.map(({ o, c }) => ({ label: o.name, sub: checkLine(c), onPick: () => void safe(() => rollCheck(o, c, id)) })) }],
        });
        return;
      }
      if ((SKILL_SETS.search as readonly string[]).includes(id)) return lookAround(id);
      const line = `There's nothing right here to use ${rollableName(id)} on. Stand next to something and try again.`;
      say(line, 'info');
      open(undefined, { title: rollableName(id), body: `<p>${esc(line)}</p>`, sections: [{ options: [{ label: 'Back', onPick: skillHere }] }] });
    });
  }

  /** Searching with nothing to search right here: what's worth a closer look nearby. */
  function lookAround(id: string): void {
    const found = hintsNear(def.objects, state, (o) => gap(unitHexes(heroUnit), hexesOf(o)), 5);
    say(`You: ${rollableName(id)}, looking around.`, 'you');
    const lines = found.map((f) => `${directionTo(hexesOf(f.o))}: ${f.hint}`);
    if (!lines.length) lines.push('You look around carefully. Nothing nearby catches your eye.');
    for (const l of lines) say(l, 'info');
    open(undefined, {
      title: 'You look around',
      body: lines.map((l) => `<p>${esc(l)}</p>`).join(''),
      sections: [{ options: [{ label: 'Continue', style: 'primary', onPick: () => sheet.close() }] }],
    });
  }

  /** "To the north-east" from the hero to a footprint, as seen on screen. */
  function directionTo(hexes: Hex[]): string {
    const a = renderer.feet(heroUnit.at);
    const b = renderer.footprintFeet(hexes);
    const ang = Math.atan2(-(b.y - a.y), b.x - a.x);
    const names = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'];
    const name = names[(Math.round(ang / (Math.PI / 4)) + 8) % 8];
    return `To the ${name}`;
  }

  async function rollCheck(o: ObjectDef, c: CheckDef, skill: string): Promise<void> {
    sheet.close();
    const dice = diceOf(hero, skill);
    const { result, effects: eff } = attempt(state, c, dice, rng);
    const name = rollableName(skill);
    const verdict = result.success ? 'success' : 'failure';
    say(`${c.label}: ${name} ${diceText(dice)} vs ${c.difficulty} → ${rollText(result.roll)}, ${verdict}`
      + `${result.advantages ? ` (${result.advantages} advantage${result.advantages > 1 ? 's' : ''})` : ''}.`, 'roll');
    floatOverHero(`${result.roll.total}`, result.success ? '#a8ff8a' : '#ff8a6a');
    const events = await run(eff, o, true);
    const text = events.filter((e) => e.kind === 'say').map((e) => `<p>${esc((e as { text: string }).text)}</p>`).join('');
    if (state.ended) return showEnd();
    const again = !result.success && openChecks(o, state).includes(c);
    const left = c.tries !== undefined ? c.tries - (state.fails[c.id] ?? 0) : undefined;
    const opts: SheetOption[] = [];
    if (again) {
      opts.push({
        label: 'Try again', style: 'good',
        sub: left !== undefined ? `${left} more ${left === 1 ? 'try' : 'tries'} before someone notices` : undefined,
        onPick: () => void safe(() => rollCheck(o, c, skill)),
      });
    }
    opts.push({ label: again ? 'Leave it' : 'Continue', style: again ? 'muted' : 'primary', onPick: () => sheet.close() });
    open(o, {
      title: c.label,
      body: `<p class="roll ${verdict}">${esc(name)} ${diceText(dice)} vs ${c.difficulty}: <b>${result.roll.total}</b> · ${verdict}<br>`
        + `<small>${esc(rollText(result.roll))}</small></p>${text}`,
      sections: [{ options: opts }],
    });
  }

  // --- social conflict ---------------------------------------------------------------------

  function approaches(o: ObjectDef): void {
    const soc = o.social;
    if (!soc) return;
    const opts: SheetOption[] = soc.approaches.map((a) => {
      const openNow = approachOpen(a, state);
      const names = a.skills.map(rollableName);
      return {
        label: a.label,
        sub: openNow ? `${a.why} Reasonable: ${names.join(', ')}.` : 'You\'ve tried that. He won\'t fall for it twice.',
        disabled: !openNow,
        style: openNow ? 'good' : 'muted',
        onPick: () => {
          say(`You: ${a.pitch}`, 'you');
          conflictSheet(o, a, newConflict(a.id));
        },
      };
    });
    open(o, {
      title: 'Argue your way in',
      body: `<p>A <b>social conflict</b>: three rounds, your skill against his. Win a round for 1 Control, +1 per 5 you win by. `
        + `At the end he spends his Control cancelling yours. You need <b>${soc.cost}</b> left to make him ${esc(soc.goal)}.</p>`
        + '<p>Pick how you go about it. Each way has its own reasonable skills, and one you must use once.</p>',
      sections: [{ options: opts }],
    });
  }

  function score(c: Conflict, a: SceneApproach): string {
    const mine = c.rounds.reduce((s, r) => s + r.mine, 0);
    const theirs = c.rounds.reduce((s, r) => s + r.theirs, 0);
    const sit = a.situation ? ` · situation ${a.situation > 0 ? '+' : ''}${a.situation}` : '';
    return `<p class="score">You <b>${mine}</b> · Guard <b>${theirs}</b>${sit}</p>`;
  }

  function roundText(c: Conflict): string {
    const r = c.rounds[c.rounds.length - 1];
    if (!r) return '';
    const who = r.mine && r.theirs ? 'A tie: 1 Control each.' : r.mine ? `You win: +${r.mine} Control.` : `He wins: +${r.theirs} Control to him.`;
    return `<p class="roll">${esc(rollableName(r.skill))} ${diceText(r.dice)}: <b>${r.roll.total}</b> vs his ${esc(rollableName(r.answer))} `
      + `${diceText(r.answerDice)}: <b>${r.answerRoll.total}</b>. ${who}<br><small>You: ${esc(rollText(r.roll))} · Him: ${esc(rollText(r.answerRoll))}</small></p>`;
  }

  function conflictSheet(o: ObjectDef, a: SceneApproach, c: Conflict): void {
    if (conflictOver(c)) return void safe(() => endConflict(o, a, c));
    const n = c.rounds.length;
    const retort = n > 0 ? a.retorts[n - 1] : '';
    const forced = mustUseLocked(c, a);
    const opts: SheetOption[] = a.skills.map((id) => {
      const base = diceOf(hero, id);
      const d = pooled(c, id, base);
      const ok = allowed(c, a, id);
      const locked = id === a.locked;
      const has = base.n > 0;
      const used = c.rounds.filter((r) => r.skill === id).length;
      const notes = [
        locked ? (forced ? 'Must be rolled now' : 'Locked: must be rolled once') : '',
        used ? `Used ${used}×: −${2 * used}D6` : '',
        !has ? (locked ? 'You lack it: rolls 0' : 'You don\'t have this') : '',
      ].filter(Boolean).join(' · ');
      return {
        label: rollableName(id),
        sub: notes || undefined,
        tag: diceTag(d),
        disabled: !ok || (!has && !locked),
        style: ok && (has || locked) ? (locked ? 'primary' : 'good') : 'muted',
        onPick: () => void safe(() => {
          const r = playRound(c, a, id, (k) => diceOf(hero, k), (k) => o.social!.dice[k] ?? { n: 2, mod: 0 }, rng);
          say(`Round ${c.rounds.length}: ${rollableName(r.skill)} ${diceText(r.dice)} → ${rollText(r.roll)} vs guard's `
            + `${rollableName(r.answer)} ${diceText(r.answerDice)} → ${rollText(r.answerRoll)}. `
            + (r.mine && r.theirs ? 'Tie, 1 Control each.' : r.mine ? `+${r.mine} Control to you.` : `+${r.theirs} Control to him.`), 'roll');
          conflictSheet(o, a, c);
        }),
      };
    });
    const intro = n === 0 ? `<p class="you">${esc(a.pitch)}</p>` : `${roundText(c)}<p class="speech">${esc(retort)}</p>`;
    open(o, {
      title: `${a.label} · round ${n + 1} of ${ROUNDS}`,
      body: `${intro}${score(c, a)}<p class="hint">Locked roll: <b>${esc(rollableName(a.locked))}</b>. Using a skill again costs −2D6.</p>`,
      sections: [{ title: 'Pick a skill', options: opts }],
      closable: false,
    });
  }

  async function endConflict(o: ObjectDef, a: SceneApproach, c: Conflict): Promise<void> {
    const soc = o.social!;
    const res = outcome(c, a, soc.cost);
    const sit = res.situation ? ` ${res.situation > 0 ? '+' : '−'} ${Math.abs(res.situation)} situation` : '';
    const sum = `You won ${res.mine} Control${sit}; he spends his ${res.theirs} cancelling yours. You have <b>${res.left}</b> left, `
      + `and need ${soc.cost} to make him ${esc(soc.goal)}.`;
    say(`${a.label}: ${res.mine} Control${sit} − his ${res.theirs} = ${res.left} (need ${soc.cost}). ${res.success ? 'Success!' : 'Not enough.'}`, res.success ? 'good' : 'bad');
    sheet.close();
    if (!res.success) state.flags[`tried:${a.id}`] = true;
    const events = await run(res.success ? a.success : a.failure, o, true);
    const text = events.filter((e) => e.kind === 'say').map((e) => `<p class="speech">${esc((e as { text: string }).text)}</p>`).join('');
    open(o, {
      title: res.success ? 'He gives in' : 'He won\'t budge',
      body: `${roundText(c)}<p class="${res.success ? 'good' : 'bad'}">${sum}</p>${text}`,
      sections: [{ options: [{ label: 'Continue', style: 'primary', onPick: () => sheet.close() }] }],
    });
  }

  // --- effects ----------------------------------------------------------------------------

  /** Apply effects, show them, and return what happened. `quiet` leaves "say" lines for the caller's sheet. */
  async function run(eff: Effect[], from?: ObjectDef, quiet = false): Promise<SceneEvent[]> {
    const events = apply(state, eff);
    for (const e of events) {
      if (e.kind === 'say') say(e.text, e.tone as LogTone);
      else if (e.kind === 'silver') {
        say(`${e.amount} silver (${e.why}). ${state.silver} left.`, 'bad');
        floatOverHero(`${e.amount}s`, '#d8dce4');
      } else if (e.kind === 'time') {
        weather.setTime(e.time === 'night' ? 'night' : e.time === 'dawn' ? 'dusk' : 'day');
        say(`${TIME_LABEL[e.time]}.`, 'info');
        if (!quiet) await wait(500);
      } else if (e.kind === 'remove') {
        for (const u of battle.units.filter((x) => unitObject.get(x.id)?.id === e.id)) {
          const p = renderer.unitPos(u.id);
          if (p) effects.burst('puff', p.x, p.y - 8, 8);
          battle.units = battle.units.filter((x) => x !== u);
          renderer.removeUnit(u.id);
        }
      } else if (e.kind === 'enter' && e.via === 'climb') {
        await climbOver(from, e.to);
      }
    }
    syncWorld();
    refreshInfo();
    const entered = events.find((e) => e.kind === 'enter');
    if (entered?.kind === 'enter' && entered.via === 'gate') await walkIn();
    else if (entered && !quiet) showEnd();
    return events;
  }

  /** Make the map match the flags: gate art, what blocks, lights. */
  function syncWorld(): void {
    let ground = false;
    for (const o of def.objects) {
      const art = artOf(o, state);
      if (art && shownArt.get(o.id) !== art) {
        const seed = 1000 + def.objects.indexOf(o) * 37;
        renderer.setPropArt(o.id, (w) => SCENE_ART[art].make(w, seed));
        shownArt.set(o.id, art);
        lightsFor(o, art, renderer.footprintFeet(objectHexes.get(o.id)!));
      }
      if (o.units) continue;
      const b = blocks(o, state);
      for (const h of objectHexes.get(o.id)!) {
        const c = cellAt(battle, h);
        const art2 = cellArt.get(hexKey(h));
        if (c && c.obstacle !== b) {
          c.obstacle = b;
          if (art2) art2.obstacle = b;
          ground = true;
        }
      }
    }
    if (ground) renderer.rebuildGround();
  }

  /** Climb success: up the rock, along it, and drop over the palisade. */
  async function climbOver(o: ObjectDef | undefined, to: [number, number] | undefined): Promise<void> {
    if (!o || !to) return;
    busy = true;
    const top = renderer.footprintFeet(objectHexes.get(o.id)!);
    const land = toHex(to);
    const landAt = renderer.feet(land);
    await renderer.animatePoints(heroUnit, [{ x: top.x - 6, y: top.y - 44 }], 900, 6);
    await wait(150);
    await renderer.animatePoints(heroUnit, [{ x: landAt.x, y: landAt.y }], 600, 18);
    heroUnit.at = land;
    busy = false;
  }

  /** Through the open gate and a little way into the village. */
  async function walkIn(): Promise<void> {
    const inside = { q: heroUnit.at.q, r: heroUnit.at.r - 1 };
    if (cellAt(battle, inside) && !cellAt(battle, inside)!.obstacle) await moveAlong([inside]);
    showEnd();
  }

  function showEnd(): void {
    refreshInfo();
    open(undefined, {
      title: 'You\'re in',
      body: `<p>${esc(state.ended ?? '')}</p><p class="score">Silver left: <b>${state.silver}</b> of ${def.start.silver}</p>`,
      sections: [{
        options: [
          { label: 'Play again', style: 'primary', onPick: () => location.reload() },
          { label: 'Look around', style: 'muted', onPick: () => sheet.close() },
        ],
      }],
    });
  }

  function floatOverHero(text: string, color: string): void {
    const p = renderer.unitPos(HERO_ID);
    if (p) effects.floatText(text, p.x, renderer.unitTop(heroUnit) - 6, color);
  }

  // --- hero -------------------------------------------------------------------------------

  function showHero(): void {
    const ids = Object.keys(hero.dice).filter((id) => canRoll(hero, id));
    const attrs = ids.filter((id) => id.startsWith('attr:'));
    const skills = ids.filter((id) => !id.startsWith('attr:')).sort((a, b) => rollableName(a).localeCompare(rollableName(b)));
    const row = (id: string): SheetOption => ({ label: rollableName(id), tag: diceText(diceOf(hero, id)), disabled: true, onPick: () => {} });
    const choices = hooks.heroChoices().map((c) => ({
      label: c.label, sub: c.sub,
      onPick: () => {
        hero = c.pick();
        heroUnit.name = hero.name;
        say(`You are now playing ${hero.name}.`, 'info');
        sheet.close();
        refreshInfo();
      },
    }));
    open(undefined, {
      title: hero.name,
      body: `<p>${esc(hero.from)} · ${state.silver} silver${state.flags.hasPass ? ' · a trader\'s pass' : ''}</p>`,
      sections: [
        { title: 'Play as…', folded: true, options: choices },
        { title: 'Attributes', options: attrs.map(row) },
        { title: `Skills (${skills.length})`, folded: true, options: skills.map(row) },
      ],
    });
  }

  // --- loop ---------------------------------------------------------------------------------

  weather.setTime('night');
  weather.tod = 2; // start in the dark, no fade from day
  window.addEventListener('resize', () => camera.resize());
  new ResizeObserver(() => camera.resize()).observe(document.getElementById('stage')!);
  camera.fit();
  for (const line of def.intro) say(line);
  refreshInfo();

  for (const z of document.querySelectorAll<HTMLButtonElement>('[data-zoom]')) {
    z.addEventListener('click', () => {
      const step = Number(z.dataset.zoom);
      if (step === 0) camera.fit();
      else camera.zoomCenter(step);
    });
  }

  let last = performance.now();
  let lastDraw = 0;
  function frame(now: number): void {
    requestAnimationFrame(frame);
    try {
      const dt = Math.max(0, Math.min(100, now - last));
      last = now;
      weather.update(dt);
      effects.update(dt, weather.windX, weather.windY);
      renderer.update(now, effects, weather);
      if (now - lastDraw < 33) return;
      lastDraw = now;
      const hl: Highlight[] = focus.map((at) => ({ at, style: 'tool' }));
      const img = renderer.render(now, weather, effects, hl, HERO_ID);
      img.drawTo(octx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0e0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.offX, camera.offY);
      ctx.drawImage(offscreen, 0, 0);
    } catch (err) {
      console.error('[scene] frame error', err);
    }
  }
  requestAnimationFrame(frame);

  // Debug hooks for testing in the console (and automated fuzzing).
  (window as unknown as { scene: unknown }).scene = {
    state, battle, renderer, camera, log, sheet, weather,
    hero: () => hero,
    isBusy: () => busy,
    /** Tap a hex by offset coords. */
    tapHex: (col: number, row: number) => {
      const p = renderer.feet(offsetToHex(col, row));
      return safe(() => onTap(p.x, p.y));
    },
    interact: (id: string) => safe(() => interact(def.objects.find((o) => o.id === id)!)),
    checks: (id: string) => openChecks(def.objects.find((o) => o.id === id)!, state).map((c) => c.id),
  };
}
