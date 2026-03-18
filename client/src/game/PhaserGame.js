import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene.js';
import GameScene from './scenes/GameScene.js';

export function createGame(containerId) {
  const config = {
    type: Phaser.AUTO,
    parent: containerId,
    backgroundColor: '#0f0f1a',
    scene: [PreloadScene, GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };

  return new Phaser.Game(config);
}
