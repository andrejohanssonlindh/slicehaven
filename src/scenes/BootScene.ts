import Phaser from 'phaser';

/** Loads assets. For now everything is drawn procedurally, so it just moves on. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.scene.start('scenario', { scenarioId: 's00' });
  }
}
