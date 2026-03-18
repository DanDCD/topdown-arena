import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Loading...', {
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.scene.start('GameScene');
  }
}
