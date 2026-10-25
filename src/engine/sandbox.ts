import {
  type Battle, type Unit, aiMove, canStand, cellAt, damage, heal, isValidWalk, jumpTargets, pathFromReach,
  targetsInRange, unitAt, walkReach,
} from '../core/battle';
import { type Hex, hexDistance, hexEquals, hexKey, offsetToHex, parseHexKey } from '../core/hex';
import { icon } from '../art/icons';
import { STATS, type SandboxCell, buildSandbox, newUnit } from '../content/sandbox';
import { Camera } from './camera';
import { Effects } from './effects';
import { type Highlight, Renderer } from './renderer';
import { type Sky, type TimeOfDay, Weather } from './weather';

/**
 * Engine sandbox: a forest clearing where the director can try movement,
 * attacks, heals, weather, fire and lightning. No turn limits; dice come later.
 */
type Mode = 'walk' | 'jump' | 'strike' | 'sling' | 'heal' | 'fire' | 'lightning' | 'spawnFoe' | 'spawnFriend';

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

  const camera = new Camera(canvas, renderer.width, renderer.height, (wx, wy) => {
    const h = renderer.hexAt(wx, wy);
    if (h) void onTap(h);
  });

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

  function ignite(h: Hex): void {
    const c = cellAt(battle, h);
    if (!c) return;
    if (!c.flammable || c.fire !== 'none') {
      say(c.fire === 'burnt' ? 'Already burnt.' : "That won't burn.");
      return;
    }
    c.fire = 'burning';
    const key = hexKey(h);
    const victim = unitAt(battle, h);
    if (victim) void hurt(victim, 2);
    const burnTime = weather.rain > 0.4 ? 3500 : 7000;
    setTimeout(() => {
      c.fire = 'burnt';
      // A burnt thicket is gone: the hex opens up. Trees stay as charred trunks.
      const art = artByKey.get(key);
      if (art?.prop === 'thicket') {
        c.obstacle = false;
        art.obstacle = false; // drop the red border too
      }
      renderer.markBurnt(key);
      refreshHighlights();
    }, burnTime);
    say(weather.rain > 0.4 ? 'It catches, but the rain will drown it soon.' : 'Fire!');
  }

  function strike(h: Hex): void {
    const p = renderer.feet(h);
    effects.lightning(p.x, p.y - 2);
    weather.flash = 1;
    const victim = unitAt(battle, h);
    if (victim) void hurt(victim, 3);
    const c = cellAt(battle, h);
    if (c?.flammable && c.fire === 'none') ignite(h);
  }

  function randomStrike(): void {
    const keys = Object.keys(battle.cells);
    // Lightning likes tall things.
    const tall = keys.filter((k) => battle.cells[k].obstacle && battle.cells[k].fire === 'none');
    const pool = Math.random() < 0.6 && tall.length ? tall : keys;
    strike(parseHexKey(pool[Math.floor(Math.random() * pool.length)]));
  }

  // --- input ---------------------------------------------------------------------

  async function onTap(h: Hex): Promise<void> {
    if (busy) return;
    message = '';
    const unit = sel();
    const occupant = unitAt(battle, h);

    switch (mode) {
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

  async function enemyTurn(): Promise<void> {
    if (busy) return;
    busy = true;
    plotted = [];
    jumpTarget = null;
    refresh();
    for (const foe of battle.units.filter((u) => u.team === 'foe' && u.hp > 0)) {
      if (foe.hp <= 0) continue;
      const s = STATS[foe.kind];
      const { path, target } = aiMove(battle, foe, s.move);
      if (path.length) {
        const hexes = path.map(parseHexKey);
        foe.at = hexes[hexes.length - 1];
        await renderer.animateMove(foe, hexes, false);
      }
      if (target && target.hp > 0 && hexDistance(target.at, foe.at) === 1) {
        renderer.lunge(foe, target.at);
        await wait(110);
        await hurt(target, s.damage, foe.at);
      }
      await wait(150);
    }
    busy = false;
    say('Your turn.');
    refresh();
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
    const head = unit ? `<b>${unit.name}</b> ♥ ${unit.hp}/${unit.maxHp}` : '<b>No hero selected</b>';
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
    };
    info.innerHTML = `${head} · <span>${message || hint[mode]}</span>`;
  }

  function refresh(): void {
    refreshHighlights();
    refreshInfo();
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.classList.toggle('on', b.dataset.mode === mode);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sky]')) b.classList.toggle('on', b.dataset.sky === weather.sky);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-time]')) b.classList.toggle('on', b.dataset.time === weather.time);
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
  button(act, 'turn', 'Foes act', {}, () => void enemyTurn());

  const world = document.getElementById('bar-world')!;
  const skies: [Sky, string, string][] = [['clear', 'sun', 'Clear'], ['cloudy', 'cloud', 'Cloudy'], ['rain', 'rain', 'Rain'], ['storm', 'storm', 'Storm']];
  for (const [sky, ic, label] of skies) button(world, ic, label, { sky }, () => { weather.set(sky); refresh(); });
  const times: [TimeOfDay, string, string][] = [['day', 'sun', 'Day'], ['dusk', 'dusk', 'Dusk'], ['night', 'moon', 'Night']];
  for (const [time, ic, label] of times) button(world, ic, label, { time }, () => { weather.setTime(time); refresh(); });
  button(world, 'fire', 'Fire', { mode: 'fire' }, () => setMode('fire'));
  button(world, 'bolt', 'Lightning', { mode: 'lightning' }, () => setMode('lightning'));
  button(world, 'foe', '+Foe', { mode: 'spawnFoe' }, () => setMode('spawnFoe'));
  button(world, 'friend', '+Friend', { mode: 'spawnFriend' }, () => setMode('spawnFriend'));

  for (const tab of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) t.classList.toggle('on', t === tab);
      act.hidden = tab.dataset.tab !== 'act';
      world.hidden = tab.dataset.tab !== 'world';
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
  function frame(now: number): void {
    const dt = Math.min(100, now - last);
    last = now;
    if (weather.update(dt, now)) randomStrike();
    effects.update(dt, weather.wind);
    renderer.update(now, effects, weather);
    if (now - lastDraw >= 33) {
      lastDraw = now;
      if (!busy && highlights.length === 0 && mode !== 'fire' && mode !== 'lightning') refreshHighlights();
      const img = renderer.render(now, weather, effects, busy ? [] : highlights, selected);
      img.drawTo(octx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0e0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.offX, camera.offY);
      ctx.drawImage(offscreen, 0, 0);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Exposed for debugging in the console.
  (window as unknown as { sandbox: unknown }).sandbox = { battle: battle as Battle, weather, effects, renderer, camera };
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
