import Phaser from 'phaser';
import { GameScene } from './phaser/scenes/GameScene';
import './styles.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#020008',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER
  },
  render: {
    antialias: true,
    roundPixels: false
  }
};

new Phaser.Game(config);
