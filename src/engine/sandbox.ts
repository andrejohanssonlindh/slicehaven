import {
  type Battle, type Unit, aiMove, canStand, cellAt, damage, heal, isValidWalk, jumpTargets, pathFromReach,
  targetsInRange, unitAt, walkReach,
} from '../core/battle';
import { type Hex, hexDistance, hexEquals, hexKey, offsetToHex, parseHexKey } from '../core/hex';
import { WIND_NAMES } from '../core/environment';
import { ASPECTS, type AspectId, type HexFilaments, LEVEL_NAMES, readHex, readMap } from '../core/filaments';
import { Rng } from '../core/rng';
import {
  type WorldEvents, driftClouds, ignite as igniteCell, isClouded, newWorld, stepNature, stepWorld,
} from '../core/world';
import { icon } from '../art/icons';
import { STATS, type SandboxCell, buildSandbox, newUnit } from '../content/sandbox';
import { Camera } from './camera';
import { Effects } from './effects';
import { type Highlight, type MagicView, Renderer } from './renderer';
import { type Sky, type TimeOfDay, WIND_DIRS, Weather } from './weather';

/**
 * Engine sandbox: a forest clearing where the director can try movement,
 * attacks, heals, weather, wind, fire, lightning and see the magic (filaments).
 * No turn limits; dice come later.
 */
type Mode =
  | 'walk' | 'jump' | 'strike' | 'sling' | 'heal'
  | 'fire' | 'lightning' | 'spawnFoe' | 'spawnFriend'
  | 'inspect' | 'roof';

const JUMP_RANGE = 3;
const SLING_RANGE = 4;
const HEAL_RANGE = 2;
const HEAL_AMOUNT = 2;
const FOE_KINDS = ['wolf', 'rat', 'skeleton'];
const FRIEND_KINDS = ['herbalist', 'shepherd'];

export function startSandbox(): void {
  const { cells, battle } = buildSandbox();
  const renderer = new Renderer(cells, battle);
  // Battle key -> map art (burn rules need to know what's on the hex).
  const artByKey = new Map<string, SandboxCell>(cells.map((c) => [hexKey(offsetToHex(c.col, c.row)), c]));

  const weather = new Weather(renderer.width, renderer.height);
  const effects = new Effects();

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const offscreen = document.createElement('canvas');
  offscreen.width = renderer.width;
  offscreen.height = renderer.height;
  const octx = offscreen.getContext('2d')!;

  const info = document.getElementById('info')!;

  let selected: string | undefined = battle.units.find((u) => u.team === 'party')?.id;
  let mode: Mode = 'walk';
  let plotted: Hex[] = [];
  let jumpTarget: Hex | null = null;
  let busy = false;
  let foeKind = 0;
  let friendKind = 0;
  let message = '';
  /** Filament overlay: which aspect is shown (null = off), and which hex is inspected. */
  let aspect: AspectId | null = null;
  let inspected: Hex | null = null;
  const isUndead = (u: Unit): boolean => STATS[u.kind]?.sprite === 'skeleton';
  /** The world between turns (clouds, turn count). */
  const world = newWorld();
  const worldRng = Rng.fromSeed(Date.now());
  const filamentOpts = () => ({ isUndead, isClouded: (h: Hex) => isClouded(h, world, weather.sky) });
  /** Turns (combat) or free-flowing time (exploration): clouds drift continuously, nature ticks on its own. */
  let flow = false;
  const FLOW_TICK_MS = 4000;
  let lastTick = 0;
  let ticking = false;

  const camera = new Camera(canvas, renderer.width, renderer.height, (wx, wy) => {
    const h = renderer.hexAt(wx, wy);
    if (h) void safeTap(h);
  });

  async function safeTap(h: Hex): Promise<void> {
    try {
      await onTap(h);
    } catch (err) {
      console.error('[sandbox] action failed', err);
      busy = false;
      say('That action failed (logged).');
      refresh();
    }
  }

  const sel = (): Unit | undefined => battle.units.find((u) => u.id === selected && u.hp > 0);

  // --- rules glue -------------------------------------------------------------

  function say(msg: string): void {
    message = msg;
    refreshInfo();
  }

  async function hurt(u: Unit, amount: number, from?: Hex): Promise<void> {
    if (from) renderer.faceToward(u, from);
    const dealt = damage(u, amount);
    renderer.flash(u);
    const p = renderer.unitPos(u.id);
    if (p) effects.floatText(`${dealt}`, p.x, renderer.unitTop(u) - 6, '#ff8a6a');
    if (u.hp <= 0) {
      const c = cellAt(battle, u.at);
      if (c) c.corpses = (c.corpses ?? 0) + 1; // death lingers: necrotropy
      renderer.addDecal(u.at);
      await renderer.kill(u);
      battle.units = battle.units.filter((x) => x !== u);
      renderer.removeUnit(u.id);
      if (selected === u.id) selected = battle.units.find((x) => x.team === 'party')?.id;
    }
    refreshInfo();
  }

  function mend(u: Unit, amount: number): void {
    const healed = heal(u, amount);
    const p = renderer.unitPos(u.id);
    if (p) {
      effects.floatText(`+${healed}`, p.x, renderer.unitTop(u) - 6, '#a8ff8a');
      for (let i = 0; i < 10; i++) effects.emit('heal', p.x + (Math.random() - 0.5) * 14, p.y - Math.random() * 20, 0, -0.5, 16);
    }
  }

  /** Fire tool: set a hex alight. It burns (and may spread) as turns pass. */
  function ignite(h: Hex): void {
    const c = cellAt(battle, h);
    if (!c) return;
    if (!igniteCell(c, weather.env())) {
      say(c.fire === 'burnt' ? 'Already burnt.' : c.fire === 'burning' ? 'Already burning.' : "That won't burn.");
      return;
    }
    const victim = unitAt(battle, h);
    if (victim) void hurt(victim, 2);
    say(`Fire! It burns for ${c.burnTurns} turn${c.burnTurns === 1 ? '' : 's'} and may spread when the turn ends.`);
  }

  /** Lightning tool: strike now (storms also strike on their own, once per turn). */
  function strike(h: Hex): void {
    boltVisual(h);
    const victim = unitAt(battle, h);
    if (victim) void hurt(victim, 3);
    const c = cellAt(battle, h);
    if (c) igniteCell(c, weather.env());
  }

  function boltVisual(h: Hex): void {
    const p = renderer.feet(h);
    effects.lightning(p.x, p.y - 2);
    weather.flash = 1;
  }

  /** When a hex burns out: show ash, and a burnt thicket loses its obstacle border. */
  function burntOut(h: Hex): void {
    const key = hexKey(h);
    const art = artByKey.get(key);
    if (art && !battle.cells[key].obstacle) art.obstacle = false;
    renderer.markBurnt(key);
  }

  /** The world moves one turn: clouds drift, fire spreads or dies, storms strike. */
  async function worldStep(): Promise<void> {
    const ev = stepWorld(battle, weather.env(), world, worldRng);
    weather.moveCloudsTo(world.cloudX, world.cloudY);
    const news = await showWorldEvents(ev);
    say(`Turn ${world.turn}${news ? ': ' + news : ''}.`);
  }

  /** Free-flowing time: nature ticks on its own every few seconds. */
  async function flowTick(): Promise<void> {
    const news = await showWorldEvents(stepNature(battle, weather.env(), world, worldRng));
    if (news) say(news[0].toUpperCase() + news.slice(1) + '.');
  }

  /** Animate what nature did; returns a short summary (or ''). */
  async function showWorldEvents(ev: WorldEvents): Promise<string> {
    for (const h of ev.burntOut) burntOut(h);
    for (const h of ev.strikes) {
      boltVisual(h);
      await wait(350);
    }
    for (const d of ev.damage) {
      const u = battle.units.find((x) => x.id === d.unitId);
      if (u && u.hp > 0) await hurt(u, d.amount);
    }
    const news: string[] = [];
    if (ev.ignited.length) news.push(`fire spreads to ${ev.ignited.length} hex${ev.ignited.length > 1 ? 'es' : ''}`);
    if (ev.burntOut.length) news.push(`${ev.burntOut.length} burnt out`);
    if (ev.strikes.length) news.push('lightning strikes');
    return news.join(', ');
  }

  // --- input ---------------------------------------------------------------------

  async function onTap(h: Hex): Promise<void> {
    if (busy) return;
    message = '';
    const unit = sel();
    const occupant = unitAt(battle, h);

    switch (mode) {
      case 'inspect':
        inspected = h;
        return refresh();
      case 'roof': {
        const c = cellAt(battle, h);
        if (c) {
          c.indoors = !c.indoors;
          inspected = h;
          say(c.indoors ? 'Roofed over: this hex now counts as indoors.' : 'Roof removed: outdoors again.');
        }
        return refresh();
      }
      case 'fire':
        ignite(h);
        return refresh();
      case 'lightning':
        strike(h);
        return refresh();
      case 'spawnFoe':
      case 'spawnFriend': {
        if (!canStand(battle, h)) {
          say("Can't place anything there.");
          return;
        }
        const kind = mode === 'spawnFoe' ? FOE_KINDS[foeKind] : FRIEND_KINDS[friendKind];
        const u = newUnit(kind, h);
        battle.units.push(u);
        renderer.addUnit(u);
        effects.burst('puff', renderer.feet(h).x, renderer.feet(h).y - 6, 10);
        if (u.team === 'party') selected = u.id;
        return refresh();
      }
      case 'heal':
        if (unit && occupant?.team === 'party' && hexDistance(occupant.at, unit.at) <= HEAL_RANGE) {
          renderer.faceToward(unit, occupant.at);
          mend(occupant, HEAL_AMOUNT);
          return refresh();
        }
        break;
      case 'strike':
      case 'sling':
        if (unit && occupant?.team === 'foe') {
          const range = mode === 'strike' ? 1 : SLING_RANGE;
          const d = hexDistance(occupant.at, unit.at);
          if (d > range || (mode === 'sling' && d < 2)) {
            say(mode === 'strike' ? 'Too far: walk next to it first.' : 'Sling needs 2-4 hexes of distance.');
            return;
          }
          busy = true;
          if (mode === 'strike') {
            renderer.lunge(unit, occupant.at);
            await wait(110);
            await hurt(occupant, STATS[unit.kind].damage, unit.at);
          } else {
            renderer.faceToward(unit, occupant.at);
            const a = renderer.unitPos(unit.id)!;
            const b = renderer.unitPos(occupant.id)!;
            await new Promise<void>((done) => effects.shoot(a.x, a.y - 14, b.x, b.y - 10, done));
            await hurt(occupant, 1, unit.at);
          }
          busy = false;
          return refresh();
        }
        break;
      case 'walk':
        if (unit && !occupant) {
          await walkTap(unit, h);
          return refresh();
        }
        break;
      case 'jump':
        if (unit && !occupant) {
          const ok = jumpTargets(battle, unit, JUMP_RANGE).some((t) => hexEquals(t, h));
          if (!ok) {
            say('Jumps go in straight lines, up to 3 hexes, and must land on open ground.');
            return;
          }
          if (jumpTarget && hexEquals(jumpTarget, h)) {
            busy = true;
            unit.at = h;
            jumpTarget = null;
            await renderer.animateMove(unit, [h], true);
            busy = false;
          } else {
            jumpTarget = h;
            say('Tap again to jump.');
          }
          return refresh();
        }
        break;
    }

    // Fallback: tapping a party unit selects it.
    if (occupant?.team === 'party') {
      selected = occupant.id;
      plotted = [];
      jumpTarget = null;
      if (mode !== 'heal') setMode('walk');
      return refresh();
    }
    if (occupant?.team === 'foe') {
      say(`${occupant.name}: ${occupant.hp}/${occupant.maxHp} HP. Choose Strike or Sling to attack.`);
    }
  }

  /** Walk: tap to plot (shortest path or extend your own), tap the end again to go. */
  async function walkTap(unit: Unit, h: Hex): Promise<void> {
    const range = STATS[unit.kind].move;
    const last = plotted[plotted.length - 1];
    if (last && hexEquals(last, h)) {
      busy = true;
      const path = plotted;
      plotted = [];
      unit.at = h;
      await renderer.animateMove(unit, path, false);
      busy = false;
      return;
    }
    const idx = plotted.findIndex((p) => hexEquals(p, h));
    if (idx >= 0) {
      plotted = plotted.slice(0, idx + 1); // tap a hex on the path: cut it there
      say('Tap the end of the path to walk.');
      return;
    }
    const end = last ?? unit.at;
    const extended = [...plotted, h];
    if (hexDistance(end, h) === 1 && isValidWalk(battle, unit, extended, range)) {
      plotted = extended; // plotting your own route, hex by hex
      say(`${range - plotted.length} steps left. Tap the end to walk.`);
      return;
    }
    const reach = walkReach(battle, unit, range);
    const r = reach.get(hexKey(h));
    if (r?.canStop) {
      plotted = pathFromReach(reach, h).map(parseHexKey);
      say('Tap again to walk, or tap next to the path end to plot your own route.');
    } else {
      say('Out of reach.');
    }
  }

  /** End of turn: foes act (unless just passing time), then the world moves. */
  async function endTurn(withFoes: boolean): Promise<void> {
    if (busy) return;
    busy = true;
    plotted = [];
    jumpTarget = null;
    refresh();
    try {
      if (withFoes) await foesAct();
      await worldStep();
    } catch (err) {
      console.error('[sandbox] end of turn failed', err);
      say('Something went wrong ending the turn (logged).');
    } finally {
      busy = false;
      refresh();
    }
  }

  async function foesAct(): Promise<void> {
    for (const foe of battle.units.filter((u) => u.team === 'foe' && u.hp > 0)) {
      if (foe.hp <= 0) continue;
      const s = STATS[foe.kind];
      const { path, target } = aiMove(battle, foe, s.move);
      if (path.length) {
        const hexes = path.map(parseHexKey);
        foe.at = hexes[hexes.length - 1];
        await renderer.animateMove(foe, hexes, false);
      }
      // A storm bolt may have killed it on the way.
      if (foe.hp > 0 && target && target.hp > 0 && hexDistance(target.at, foe.at) === 1) {
        renderer.lunge(foe, target.at);
        await wait(110);
        await hurt(target, s.damage, foe.at);
      }
      await wait(150);
    }
  }

  // --- highlights & info ---------------------------------------------------------------

  let highlights: Highlight[] = [];

  function refreshHighlights(): void {
    highlights = [];
    const unit = sel();
    if (busy) return;
    if (unit && mode === 'walk') {
      const reach = walkReach(battle, unit, STATS[unit.kind].move);
      for (const [k, r] of reach) if (r.canStop && r.cost > 0) highlights.push({ at: parseHexKey(k), style: 'reach' });
      for (const p of plotted) highlights.push({ at: p, style: 'path' });
    } else if (unit && mode === 'jump') {
      for (const t of jumpTargets(battle, unit, JUMP_RANGE)) highlights.push({ at: t, style: 'jump' });
      if (jumpTarget) highlights.push({ at: jumpTarget, style: 'path' });
    } else if (unit && (mode === 'strike' || mode === 'sling')) {
      const range = mode === 'strike' ? 1 : SLING_RANGE;
      for (const f of targetsInRange(battle, unit, range, 'foe')) {
        if (mode === 'sling' && hexDistance(f.at, unit.at) < 2) continue;
        highlights.push({ at: f.at, style: 'foe' });
      }
    } else if (unit && mode === 'heal') {
      for (const a of targetsInRange(battle, unit, HEAL_RANGE, 'party')) highlights.push({ at: a.at, style: 'ally' });
    }
  }

  function refreshInfo(): void {
    const unit = sel();
    const head = (flow ? '<b>Flowing time</b> · ' : `<b>Turn ${world.turn}</b> · `) + (unit ? `<b>${unit.name}</b> ♥ ${unit.hp}/${unit.maxHp}` : '<b>No hero selected</b>');
    const hint: Record<Mode, string> = {
      walk: 'Walk: tap a lit hex, tap again to go.',
      jump: 'Jump: straight lines, over obstacles and water.',
      strike: 'Strike: tap an adjacent enemy.',
      sling: 'Sling: tap an enemy 2-4 hexes away.',
      heal: 'Heal: tap yourself or an ally within 2.',
      fire: 'Fire: tap something that can burn.',
      lightning: 'Lightning: tap anywhere.',
      spawnFoe: `Place a ${STATS[FOE_KINDS[foeKind]].name.toLowerCase()} (tap the button again to change type).`,
      spawnFriend: `Place a ${STATS[FRIEND_KINDS[friendKind]].name.toLowerCase()} (tap again to change).`,
      inspect: 'Magic: pick an aspect to map it, tap a hex to read its filaments.',
      roof: 'Roof: tap a hex to put it indoors (or back outdoors).',
    };
    const windTxt = `Wind ${weather.windForce} (${WIND_NAMES[weather.windForce].toLowerCase()}) ${WIND_DIRS[weather.windDir].arrow}`;
    info.innerHTML = `${head} · <span>${message || hint[mode]}</span><br><span class="wind">${windTxt}</span>`;
    refreshMagic();
  }

  // --- filaments ---------------------------------------------------------------------

  const magicEl = document.getElementById('magic-readout')!;
  let magicView: MagicView | undefined;

  function refreshMagicView(): void {
    if (!aspect) {
      magicView = undefined;
      return;
    }
    const map = readMap(battle, weather.env(), filamentOpts());
    const levels = new Map<string, number>();
    for (const [k, r] of map) levels.set(k, r[aspect].level);
    magicView = { color: ASPECTS.find((a) => a.id === aspect)!.color, levels };
  }

  function refreshMagic(): void {
    refreshMagicView();
    const at = inspected ?? sel()?.at;
    if (!at) {
      magicEl.innerHTML = '<p class="hint">Tap a hex to read its filaments.</p>';
      return;
    }
    const r: HexFilaments | null = readHex(battle, at, weather.env(), filamentOpts());
    if (!r) return;
    const where = inspected ? 'Tapped hex' : `${sel()?.name}'s hex`;
    const chips = ASPECTS.map((a) => {
      const lv = r[a.id].level;
      const txt = lv > 0 ? `+${lv}` : `${lv}`;
      return `<button type="button" class="chip${a.id === aspect ? ' on' : ''}" data-aspect="${a.id}" style="--c:${a.color}">`
        + `<i>${a.name.replace('tropy', '')}</i><b class="lv${lv}">${txt}</b></button>`;
    }).join('');
    let detail = '';
    if (aspect) {
      const a = ASPECTS.find((x) => x.id === aspect)!;
      const rd = r[aspect];
      const parts = rd.parts.map((p) => `${p.label} <b>${p.value > 0 ? '+' : ''}${+p.value.toFixed(2)}</b>`).join(' · ');
      detail = `<p><b style="color:${a.color}">${a.name}</b> (${a.gloss}): <b>${rd.level > 0 ? '+' : ''}${rd.level} ${LEVEL_NAMES[rd.level]}</b><br><small>${parts} = ${+rd.raw.toFixed(2)}</small></p>`;
    }
    magicEl.innerHTML = `<div class="where">${where}</div><div class="chips">${chips}</div>${detail}`;
    for (const b of magicEl.querySelectorAll<HTMLButtonElement>('[data-aspect]')) {
      b.addEventListener('click', () => setAspect(b.dataset.aspect as AspectId));
    }
  }

  function setAspect(a: AspectId | null): void {
    aspect = a;
    if (a && mode !== 'roof') setMode('inspect');
    refresh();
  }

  function refresh(): void {
    refreshHighlights();
    refreshInfo();
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.classList.toggle('on', b.dataset.mode === mode);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sky]')) b.classList.toggle('on', b.dataset.sky === weather.sky);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-time]')) b.classList.toggle('on', b.dataset.time === weather.time);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-show]')) b.classList.toggle('on', (b.dataset.show || null) === aspect);
    const wf = document.querySelector('[data-wind="force"] span');
    if (wf) wf.textContent = `Wind ${weather.windForce}`;
    const wd = document.querySelector('[data-wind="dir"] span');
    if (wd) wd.textContent = `To ${WIND_DIRS[weather.windDir].arrow}`;
    const fl = document.querySelector<HTMLButtonElement>('[data-flow]');
    if (fl) {
      fl.querySelector('span')!.textContent = flow ? 'Flow' : 'Turns';
      fl.classList.toggle('on', flow);
    }
  }

  function setMode(m: Mode): void {
    if (m === mode && m === 'spawnFoe') foeKind = (foeKind + 1) % FOE_KINDS.length;
    if (m === mode && m === 'spawnFriend') friendKind = (friendKind + 1) % FRIEND_KINDS.length;
    mode = m;
    plotted = [];
    jumpTarget = null;
    message = '';
    refresh();
  }

  // --- toolbar ---------------------------------------------------------------------

  function button(parent: HTMLElement, iconName: string, label: string, attrs: Record<string, string>, onClick: () => void): void {
    const b = document.createElement('button');
    b.type = 'button';
    for (const [k, v] of Object.entries(attrs)) b.dataset[k] = v;
    const c = icon(iconName).scaled(2).toCanvas();
    b.appendChild(c);
    b.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
    b.addEventListener('click', onClick);
    parent.appendChild(b);
  }

  const act = document.getElementById('bar-act')!;
  button(act, 'move', 'Walk', { mode: 'walk' }, () => setMode('walk'));
  button(act, 'jump', 'Jump', { mode: 'jump' }, () => setMode('jump'));
  button(act, 'attack', 'Strike', { mode: 'strike' }, () => setMode('strike'));
  button(act, 'range', 'Sling', { mode: 'sling' }, () => setMode('sling'));
  button(act, 'heal', 'Heal', { mode: 'heal' }, () => setMode('heal'));
  button(act, 'turn', 'End turn', {}, () => void endTurn(true));

  const worldBar = document.getElementById('bar-world')!;
  const skies: [Sky, string, string][] = [['clear', 'sun', 'Clear'], ['cloudy', 'cloud', 'Cloudy'], ['rain', 'rain', 'Rain'], ['storm', 'storm', 'Storm']];
  for (const [sky, ic, label] of skies) button(worldBar, ic, label, { sky }, () => { weather.set(sky); refresh(); });
  const times: [TimeOfDay, string, string][] = [['day', 'sun', 'Day'], ['dusk', 'dusk', 'Dusk'], ['night', 'moon', 'Night']];
  for (const [time, ic, label] of times) button(worldBar, ic, label, { time }, () => { weather.setTime(time); refresh(); });
  button(worldBar, 'wind', 'Wind', { wind: 'force' }, () => { weather.setWind((weather.windForce + 1) % 7); refresh(); });
  button(worldBar, 'wind', 'Dir', { wind: 'dir' }, () => { weather.setWind(weather.windForce, weather.windDir + 1); refresh(); });
  button(worldBar, 'turn', 'Pass turn', {}, () => void endTurn(false));
  button(worldBar, 'wind', 'Turns', { flow: '' }, () => {
    flow = !flow;
    lastTick = performance.now();
    say(flow ? 'Free-flowing time: clouds drift, fire and storms tick on their own.' : 'Turn-based: the world moves when a turn ends.');
    refresh();
  });
  button(worldBar, 'fire', 'Fire', { mode: 'fire' }, () => setMode('fire'));
  button(worldBar, 'bolt', 'Lightning', { mode: 'lightning' }, () => setMode('lightning'));
  button(worldBar, 'foe', '+Foe', { mode: 'spawnFoe' }, () => setMode('spawnFoe'));
  button(worldBar, 'friend', '+Friend', { mode: 'spawnFriend' }, () => setMode('spawnFriend'));
  button(worldBar, 'off', 'Reset', {}, () => location.reload());

  const magicBar = document.getElementById('bar-magic')!;
  button(magicBar, 'off', 'Off', { show: '' }, () => setAspect(null));
  for (const a of ASPECTS) button(magicBar, `a-${a.id}`, a.name.replace('tropy', ''), { show: a.id }, () => setAspect(a.id));
  button(magicBar, 'roof', 'Roof', { mode: 'roof' }, () => setMode('roof'));

  for (const tab of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) t.classList.toggle('on', t === tab);
      act.hidden = tab.dataset.tab !== 'act';
      worldBar.hidden = tab.dataset.tab !== 'world';
      magicBar.hidden = tab.dataset.tab !== 'magic';
      magicEl.hidden = tab.dataset.tab !== 'magic';
      if (tab.dataset.tab === 'magic') {
        if (!aspect) aspect = 'hydro';
        setMode('inspect');
      } else if (mode === 'inspect' || mode === 'roof') {
        setMode('walk');
      }
    });
  }
  for (const z of document.querySelectorAll<HTMLButtonElement>('[data-zoom]')) {
    z.addEventListener('click', () => {
      const step = Number(z.dataset.zoom);
      if (step === 0) camera.fit();
      else camera.zoomCenter(step);
    });
  }

  // --- loop ------------------------------------------------------------------------

  window.addEventListener('resize', () => camera.resize());
  camera.fit();
  refresh();

  let last = performance.now();
  let lastDraw = 0;
  let lastMagic = 0;
  function frame(now: number): void {
    // Schedule first: one bad frame must never stop the loop.
    requestAnimationFrame(frame);
    try {
      step(now);
    } catch (err) {
      console.error('[sandbox] frame error', err);
    }
  }

  function step(now: number): void {
    const dt = Math.max(0, Math.min(100, now - last));
    last = now;
    weather.update(dt);
    if (flow) {
      driftClouds(world, weather.env(), dt / FLOW_TICK_MS);
      weather.moveCloudsTo(world.cloudX, world.cloudY);
      if (!busy && !ticking && now - lastTick > FLOW_TICK_MS) {
        lastTick = now;
        ticking = true;
        void flowTick()
          .catch((err) => console.error('[sandbox] flow tick failed', err))
          .finally(() => (ticking = false));
      }
    }
    effects.update(dt, weather.windX, weather.windY);
    // Fires start and burn out on their own, so keep the magic map fresh.
    if (aspect && now - lastMagic > 400) {
      lastMagic = now;
      refreshMagicView();
    }
    renderer.update(now, effects, weather);
    if (now - lastDraw >= 33) {
      lastDraw = now;
      if (!busy && highlights.length === 0 && mode !== 'fire' && mode !== 'lightning') refreshHighlights();
      const img = renderer.render(now, weather, effects, busy ? [] : highlights, selected, magicView);
      img.drawTo(octx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0e0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.offX, camera.offY);
      ctx.drawImage(offscreen, 0, 0);
    }
  }
  requestAnimationFrame(frame);

  // Exposed for debugging in the console.
  (window as unknown as { sandbox: unknown }).sandbox = {
    battle: battle as Battle, weather, effects, renderer, camera,
    tap: (q: number, r: number) => safeTap({ q, r }),
    setMode: (m: Mode) => setMode(m),
    endTurn,
    world,
    isBusy: () => busy,
  };
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
