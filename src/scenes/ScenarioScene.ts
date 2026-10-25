import Phaser from 'phaser';
import {
  type Hex, hexCorners, hexDistance, hexEquals, hexKey, hexToPixel, neighbors, pixelToHex, reachable,
} from '../core/hex';
import {
  type DicePool, type Face, effectiveFaces, isExhausted, mustRest, newPool, rest, rollFace, spend,
} from '../core/dice';
import { Rng } from '../core/rng';
import { MERCENARY } from '../content/heroes';
import { SCENARIOS, type ScenarioDef } from '../content/scenarios';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './layout';

const HEX_SIZE = 26;
const DEPTH_PX = 6; // extruded tile side, gives the "2D with depth" look
const MAP_ORIGIN = { x: GAME_WIDTH / 2, y: 370 };
const TRAY_Y = GAME_HEIGHT - 110;
const DIE_BOX = 70;

const FACE_ICON: Record<Face['kind'], string> = {
  attack: '⚔', move: '➜', heal: '✚', shield: '⛨', range: '➶', blank: '·',
  jump: '⤴', bleed: '♦', poison: '☠', rend: '⚒', disease: '✺',
};

interface Enemy {
  id: string;
  name: string;
  at: Hex;
  hp: number;
  room: string;
}

type Mode =
  | { kind: 'idle' }
  | { kind: 'move'; range: number; options: Map<string, number> }
  | { kind: 'attack'; damage: number }
  | { kind: 'rest' };

/**
 * Tech prototype of a scenario: hex map with hidden rooms, a hero, dummy enemies
 * and the dice tray. Combat rules here are placeholders until the design settles.
 */
export class ScenarioScene extends Phaser.Scene {
  private def!: ScenarioDef;
  private rng = Rng.fromSeed(Date.now());
  private revealed = new Set<string>();
  private tiles = new Map<string, Hex>(); // all hexes of revealed rooms + visible doors
  private heroAt!: Hex;
  private hp = MERCENARY.maxHp;
  private shield = 0;
  private enemies: Enemy[] = [];
  private pool!: DicePool;
  private mode: Mode = { kind: 'idle' };

  private mapLayer!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private tokens!: Phaser.GameObjects.Container;
  private tray!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;

  constructor() {
    super('scenario');
  }

  init(data: { scenarioId: string }): void {
    this.def = SCENARIOS[data.scenarioId];
    this.heroAt = this.def.start;
    this.pool = newPool(MERCENARY.dice.map((d) => d.id));
    this.enemies = this.def.enemies.map((e) => ({ ...e }));
    this.revealed = new Set();
    this.mode = { kind: 'idle' };
    this.hp = MERCENARY.maxHp;
    this.shield = 0;
  }

  create(): void {
    this.mapLayer = this.add.graphics();
    this.overlay = this.add.graphics();
    this.tokens = this.add.container(0, 0);
    this.tray = this.add.container(0, 0);

    const textStyle = { fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#f0e6d2' };
    this.add.text(12, 10, this.def.name, { ...textStyle, fontSize: '18px', color: '#d9a441' });
    this.statusText = this.add.text(12, 34, '', textStyle);
    this.logText = this.add.text(12, TRAY_Y - 50, this.def.intro, {
      ...textStyle, fontSize: '12px', wordWrap: { width: GAME_WIDTH - 24 },
    });

    this.reveal(this.def.rooms[0].id);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.x, p.y));
    this.redraw();
  }

  // --- state -------------------------------------------------------------

  private reveal(roomId: string): void {
    if (this.revealed.has(roomId)) return;
    this.revealed.add(roomId);
    this.tiles.clear();
    for (const room of this.def.rooms) {
      if (!this.revealed.has(room.id)) continue;
      for (const h of room.hexes) this.tiles.set(hexKey(h), h);
    }
    // Doors are visible once any neighbouring hex is revealed.
    for (const door of this.def.doors) {
      if (neighbors(door.at).some((n) => this.tiles.has(hexKey(n)))) this.tiles.set(hexKey(door.at), door.at);
    }
  }

  private enemyAt(h: Hex): Enemy | undefined {
    return this.enemies.find((e) => e.hp > 0 && hexEquals(e.at, h));
  }

  private passable = (h: Hex): boolean => this.tiles.has(hexKey(h)) && !this.enemyAt(h);

  private log(msg: string): void {
    this.logText.setText(msg);
  }

  // --- input -------------------------------------------------------------

  private onTap(x: number, y: number): void {
    if (y >= TRAY_Y - 10) return this.onTrayTap(x);
    const h = pixelToHex(x - MAP_ORIGIN.x, y - MAP_ORIGIN.y, HEX_SIZE);

    if (this.mode.kind === 'move' && this.mode.options.has(hexKey(h)) && !hexEquals(h, this.heroAt)) {
      this.heroAt = h;
      const door = this.def.doors.find((d) => hexEquals(d.at, h));
      if (door && !this.revealed.has(door.opens)) {
        this.reveal(door.opens);
        this.log('A new area is revealed!');
      } else {
        this.log('You move.');
      }
      this.mode = { kind: 'idle' };
    } else if (this.mode.kind === 'attack') {
      const target = this.enemyAt(h);
      if (target && hexDistance(target.at, this.heroAt) === 1) {
        target.hp -= this.mode.damage;
        this.log(target.hp > 0
          ? `You hit the ${target.name} for ${this.mode.damage}. (${target.hp} hp left)`
          : `The ${target.name} crumbles to dust.`);
        this.mode = { kind: 'idle' };
        if (this.enemies.every((e) => e.hp <= 0)) this.log('Victory! (prototype ends here)');
      }
    }
    this.redraw();
  }

  private onTrayTap(x: number): void {
    const ids = MERCENARY.dice.map((d) => d.id);
    const slot = Math.floor((x - this.trayStartX()) / (DIE_BOX + 8));
    const dieId = ids[slot];
    if (!dieId) return;

    if (this.mode.kind === 'rest') {
      if (!this.pool.spent.includes(dieId)) return;
      this.pool = rest(this.pool, dieId);
      this.log(`You rest. ${MERCENARY.dice[slot].name} is lost for this scenario.`);
      this.mode = { kind: 'idle' };
      return this.redraw();
    }
    if (this.mode.kind !== 'idle' || !this.pool.ready.includes(dieId)) {
      // Tapping the tray while choosing a target cancels the action.
      if (this.mode.kind === 'move' || this.mode.kind === 'attack') {
        this.mode = { kind: 'idle' };
        this.log('Action skipped.');
        this.afterSpend();
      }
      return;
    }

    const die = MERCENARY.dice[slot];
    const face = rollFace(effectiveFaces(die, []), this.rng);
    this.pool = spend(this.pool, dieId);
    this.resolveFace(die.name, face);
  }

  private resolveFace(dieName: string, face: Face): void {
    const label = `${dieName}: ${FACE_ICON[face.kind]} ${face.kind} ${face.value || ''}`;
    switch (face.kind) {
      case 'move':
      case 'jump':
        this.mode = { kind: 'move', range: face.value, options: reachable(this.heroAt, face.value, this.passable) };
        this.log(`${label} - tap a highlighted hex (or the tray to skip).`);
        break;
      case 'attack':
      case 'range':
      case 'bleed':
      case 'poison':
      case 'rend':
      case 'disease':
        if (this.enemies.some((e) => e.hp > 0 && hexDistance(e.at, this.heroAt) === 1)) {
          this.mode = { kind: 'attack', damage: face.value };
          this.log(`${label} - tap an adjacent enemy.`);
        } else {
          this.log(`${label} - no enemy in reach, wasted.`);
        }
        break;
      case 'heal':
        this.hp = Math.min(MERCENARY.maxHp, this.hp + face.value);
        this.log(`${label} - you recover.`);
        break;
      case 'shield':
        this.shield += face.value;
        this.log(`${label} - you raise your guard.`);
        break;
      case 'blank':
        this.log(`${label} - nothing happens.`);
        break;
    }
    this.afterSpend();
    this.redraw();
  }

  private afterSpend(): void {
    if (this.mode.kind !== 'idle') return;
    if (isExhausted(this.pool) && !this.pool.ready.length) {
      this.log('You are exhausted. (Tap to restart the prototype.)');
      this.time.delayedCall(400, () => this.input.once('pointerdown', () => this.scene.restart()));
    } else if (mustRest(this.pool)) {
      this.mode = { kind: 'rest' };
      this.log('All dice spent. Rest: tap a spent die to lose it, the rest return.');
    }
    this.redraw();
  }

  // --- drawing -----------------------------------------------------------

  private trayStartX(): number {
    const n = MERCENARY.dice.length;
    return (GAME_WIDTH - (n * DIE_BOX + (n - 1) * 8)) / 2;
  }

  private redraw(): void {
    this.drawMap();
    this.drawTokens();
    this.drawTray();
    this.statusText.setText(`HP ${this.hp}/${MERCENARY.maxHp}   Shield ${this.shield}   Lost dice ${this.pool.lost.length}`);
  }

  private drawMap(): void {
    const g = this.mapLayer;
    g.clear();
    const corners = hexCorners(HEX_SIZE - 1);
    const sorted = [...this.tiles.values()].sort((a, b) => a.r - b.r);
    const doorKeys = new Set(this.def.doors.map((d) => hexKey(d.at)));

    for (const h of sorted) {
      const p = hexToPixel(h, HEX_SIZE);
      const cx = MAP_ORIGIN.x + p.x;
      const cy = MAP_ORIGIN.y + p.y;
      const pts = corners.map((c) => new Phaser.Math.Vector2(cx + c.x, cy + c.y));
      // Extruded side (lower three corners pushed down) for depth.
      g.fillStyle(PALETTE.floorSide);
      g.fillPoints([pts[0], pts[1], pts[2], pts[3],
        new Phaser.Math.Vector2(pts[3].x, pts[3].y + DEPTH_PX),
        new Phaser.Math.Vector2(pts[2].x, pts[2].y + DEPTH_PX),
        new Phaser.Math.Vector2(pts[1].x, pts[1].y + DEPTH_PX),
        new Phaser.Math.Vector2(pts[0].x, pts[0].y + DEPTH_PX)], true);
      g.fillStyle(doorKeys.has(hexKey(h)) ? 0x8a5a2b : PALETTE.floorTop);
      g.fillPoints(pts, true);
      g.lineStyle(2, PALETTE.floorEdge);
      g.strokePoints(pts, true);
    }

    const o = this.overlay;
    o.clear();
    if (this.mode.kind === 'move') {
      o.lineStyle(2, PALETTE.highlight, 0.9);
      o.fillStyle(PALETTE.highlight, 0.18);
      for (const k of this.mode.options.keys()) {
        const h = this.tiles.get(k);
        if (!h || hexEquals(h, this.heroAt)) continue;
        const p = hexToPixel(h, HEX_SIZE);
        const pts = hexCorners(HEX_SIZE - 4).map((c) => new Phaser.Math.Vector2(MAP_ORIGIN.x + p.x + c.x, MAP_ORIGIN.y + p.y + c.y));
        o.fillPoints(pts, true);
        o.strokePoints(pts, true);
      }
    }
  }

  private drawTokens(): void {
    this.tokens.removeAll(true);
    const token = (h: Hex, color: number, label: string): void => {
      const p = hexToPixel(h, HEX_SIZE);
      const x = MAP_ORIGIN.x + p.x;
      const y = MAP_ORIGIN.y + p.y;
      this.tokens.add(this.add.ellipse(x, y + 8, 30, 10, 0x000000, 0.4)); // shadow
      this.tokens.add(this.add.circle(x, y - 4, 13, color).setStrokeStyle(2, 0x000000));
      this.tokens.add(this.add.text(x, y - 4, label, {
        fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5));
    };
    for (const e of this.enemies) {
      if (e.hp > 0 && this.revealed.has(e.room)) {
        token(e.at, PALETTE.enemy, String(e.hp));
        if (this.mode.kind === 'attack' && hexDistance(e.at, this.heroAt) === 1) {
          const p = hexToPixel(e.at, HEX_SIZE);
          this.tokens.add(this.add.circle(MAP_ORIGIN.x + p.x, MAP_ORIGIN.y + p.y - 4, 17).setStrokeStyle(2, PALETTE.highlight));
        }
      }
    }
    token(this.heroAt, PALETTE.hero, 'L');
  }

  private drawTray(): void {
    this.tray.removeAll(true);
    const x0 = this.trayStartX();
    this.tray.add(this.add.rectangle(0, TRAY_Y - 10, GAME_WIDTH, GAME_HEIGHT - TRAY_Y + 10, PALETTE.panel).setOrigin(0));
    MERCENARY.dice.forEach((die, i) => {
      const x = x0 + i * (DIE_BOX + 8);
      const state = this.pool.ready.includes(die.id) ? 'ready' : this.pool.spent.includes(die.id) ? 'spent' : 'lost';
      const fill = state === 'ready' ? 0xe8dcc0 : state === 'spent' ? 0x6b5f52 : 0x2a2028;
      const box = this.add.rectangle(x, TRAY_Y + 6, DIE_BOX, DIE_BOX, fill).setOrigin(0).setStrokeStyle(3, 0x000000);
      if (this.mode.kind === 'rest' && state === 'spent') box.setStrokeStyle(3, PALETTE.highlight);
      this.tray.add(box);
      const icons = die.faces.map((f) => FACE_ICON[f.kind]).join('');
      this.tray.add(this.add.text(x + DIE_BOX / 2, TRAY_Y + 30, die.name.split(' ').pop() ?? die.name, {
        fontFamily: 'Courier New, monospace', fontSize: '12px', color: state === 'ready' ? '#1a1420' : '#f0e6d2',
      }).setOrigin(0.5));
      this.tray.add(this.add.text(x + DIE_BOX / 2, TRAY_Y + 54, state === 'lost' ? 'LOST' : icons, {
        fontFamily: 'Courier New, monospace', fontSize: '11px', color: state === 'ready' ? '#3b3346' : '#c0b4a0',
      }).setOrigin(0.5));
    });
  }
}
