import Phaser from 'phaser';
import { io } from 'socket.io-client';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.socket = null;
    this.players = new Map(); // socketId -> { rect, label }
    this.localId = null;
    this.cursors = null;
    this.wasd = null;
    this.lastInput = { dx: 0, dy: 0 };
    this.connectingText = null;
  }

  create() {
    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    const { width, height } = this.scale;
    this.connectingText = this.add
      .text(width / 2, height / 2, 'Connecting...', {
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.connectSocket();
  }

  connectSocket() {
    const token = localStorage.getItem('token');
    this.socket = io({ auth: { token } });

    this.socket.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        if (this.connectingText) {
          this.connectingText.setText('Connection failed. Retrying...');
        }
      }
    });

    this.socket.on('init', ({ playerId, players, mapWidth, mapHeight }) => {
      this.localId = playerId;

      if (this.connectingText) {
        this.connectingText.destroy();
        this.connectingText = null;
      }

      this.drawWorld(mapWidth, mapHeight);
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

      for (const player of players) {
        this.spawnPlayer(player);
      }
    });

    this.socket.on('player:join', (player) => {
      this.spawnPlayer(player);
    });

    this.socket.on('player:leave', (id) => {
      this.despawnPlayer(id);
    });

    this.socket.on('state', (updates) => {
      for (const { id, x, y } of updates) {
        const obj = this.players.get(id);
        if (!obj) continue;
        obj.rect.setPosition(x, y);
        obj.label.setPosition(x, y - 24);
      }
    });
  }

  drawWorld(mapWidth, mapHeight) {
    // Dark background fill
    this.add.rectangle(mapWidth / 2, mapHeight / 2, mapWidth, mapHeight, 0x0f0f1a);

    // Grid lines
    const g = this.add.graphics();
    g.lineStyle(1, 0x1e2a3a, 1);
    const tileSize = 64;
    for (let x = 0; x <= mapWidth; x += tileSize) {
      g.moveTo(x, 0);
      g.lineTo(x, mapHeight);
    }
    for (let y = 0; y <= mapHeight; y += tileSize) {
      g.moveTo(0, y);
      g.lineTo(mapWidth, y);
    }
    g.strokePath();

    // Border
    const border = this.add.graphics();
    border.lineStyle(3, 0x4f8ef7, 0.6);
    border.strokeRect(0, 0, mapWidth, mapHeight);
  }

  spawnPlayer(data) {
    const isLocal = data.id === this.localId;
    const hexColor = parseInt(data.color.replace('#', ''), 16);

    const rect = this.add.rectangle(data.x, data.y, 32, 32, hexColor);
    rect.setStrokeStyle(isLocal ? 2 : 1, isLocal ? 0xffffff : 0x000000, isLocal ? 1 : 0.6);
    rect.setDepth(1);

    const label = this.add
      .text(data.x, data.y - 24, data.username, {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#00000099',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.players.set(data.id, { rect, label });

    if (isLocal) {
      this.cameras.main.startFollow(rect, true, 0.1, 0.1);
    }
  }

  despawnPlayer(id) {
    const obj = this.players.get(id);
    if (!obj) return;
    obj.rect.destroy();
    obj.label.destroy();
    this.players.delete(id);
  }

  update() {
    if (!this.localId || !this.socket?.connected) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) dx = 1;

    if (this.cursors.up.isDown || this.wasd.up.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) dy = 1;

    if (dx !== this.lastInput.dx || dy !== this.lastInput.dy) {
      this.lastInput = { dx, dy };
      this.socket.emit('input', { dx, dy });
    }
  }

  shutdown() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.players.clear();
  }
}
