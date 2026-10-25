import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ScenarioScene } from './scenes/ScenarioScene';
import { GAME_HEIGHT, GAME_WIDTH } from './scenes/layout';
import { readSave, newSave, writeSave } from './core/save';
import { toast } from './ui/toast';

const save = readSave() ?? newSave();

document.getElementById('btn-save')?.addEventListener('click', () => {
  writeSave(save);
  toast('Game saved');
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1420',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: [BootScene, ScenarioScene],
});
