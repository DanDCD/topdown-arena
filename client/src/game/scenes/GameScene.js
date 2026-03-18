import Phaser from 'phaser';
import { io } from 'socket.io-client';

const SHOOT_COOLDOWN_MS = 300;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.socket = null;
    this.players = new Map(); // id -> { rect, label, hpBg, hpBar }
    this.bots = new Map();    // id -> { rect, label, hpBg, hpBar }
    this.bullets = new Map(); // id -> Phaser.GameObjects.Arc
    this.localId = null;
    this.cursors = null;
    this.wasd = null;
    this.lastInput = { dx: 0, dy: 0 };
    this.lastShot = 0;
    this.connectingText = null;
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.input.on('pointerdown', (pointer) => {
      if (!this.localId || !this.socket?.connected) return;
      const now = Date.now();
      if (now - this.lastShot < SHOOT_COOLDOWN_MS) return;
      const me = this.players.get(this.localId);
      if (!me || !me.rect.visible) return;
      this.lastShot = now;
      const angle = Math.atan2(pointer.worldY - me.rect.y, pointer.worldX - me.rect.x);
      this.socket.emit('shoot', { angle });
    });

    const { width, height } = this.scale;
    this.connectingText = this.add
      .text(width / 2, height / 2, 'Connecting...', { fontSize: '20px', color: '#94a3b8' })
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
      } else if (this.connectingText) {
        this.connectingText.setText('Connection failed. Retrying...');
      }
    });

    this.socket.on('init', ({ playerId, players, bots, mapWidth, mapHeight }) => {
      this.localId = playerId;
      if (this.connectingText) {
        this.connectingText.destroy();
        this.connectingText = null;
      }
      this.drawWorld(mapWidth, mapHeight);
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
      for (const player of players) this.spawnEntity(player, false);
      for (const bot of bots) this.spawnEntity(bot, true);
    });

    this.socket.on('player:join', (player) => this.spawnEntity(player, false));

    this.socket.on('player:leave', (id) => {
      this.despawnEntity(id, false);
    });

    this.socket.on('bot:spawn', (bot) => this.spawnEntity(bot, true));

    this.socket.on('state', ({ players, bots, bullets }) => {
      for (const { id, x, y, hp } of players) {
        const obj = this.players.get(id);
        if (!obj) continue;
        obj.rect.setPosition(x, y);
        obj.label.setPosition(x, y - 28);
        this.updateHpBar(obj, hp);
      }

      for (const { id, x, y, hp } of bots) {
        const obj = this.bots.get(id);
        if (!obj) continue;
        obj.rect.setPosition(x, y);
        obj.label.setPosition(x, y - 28);
        this.updateHpBar(obj, hp);
      }

      // Sync bullets: remove stale, add/move active
      const activeIds = new Set(bullets.map(b => b.id));
      for (const [bid, circle] of this.bullets) {
        if (!activeIds.has(bid)) {
          circle.destroy();
          this.bullets.delete(bid);
        }
      }
      for (const { id, x, y } of bullets) {
        if (this.bullets.has(id)) {
          this.bullets.get(id).setPosition(x, y);
        } else {
          this.bullets.set(id, this.add.circle(x, y, 4, 0xffee00).setDepth(3));
        }
      }
    });

    this.socket.on('entity:hit', ({ id, hp }) => {
      const obj = this.players.get(id) ?? this.bots.get(id);
      if (obj) this.updateHpBar(obj, hp);
    });

    this.socket.on('entity:dead', ({ id }) => {
      // Bots are destroyed and replaced with a new id — just despawn them
      if (this.bots.has(id)) {
        this.despawnEntity(id, true);
        return;
      }
      // Players hide and respawn in place
      const obj = this.players.get(id);
      if (!obj) return;
      obj.rect.setVisible(false);
      obj.label.setVisible(false);
      obj.hpBg.setVisible(false);
      obj.hpBar.setVisible(false);

      if (id === this.localId) {
        const { width, height } = this.scale;
        const msg = this.add
          .text(width / 2, height / 2, 'You died!  Respawning in 4s...', {
            fontSize: '22px',
            color: '#ff4444',
            backgroundColor: '#00000099',
            padding: { x: 12, y: 8 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(20);
        this.time.delayedCall(3800, () => msg.destroy());
      }
    });

    this.socket.on('entity:respawn', ({ id, x, y, hp }) => {
      const obj = this.players.get(id);
      if (!obj) return;
      obj.rect.setPosition(x, y).setVisible(true);
      obj.label.setPosition(x, y - 28).setVisible(true);
      obj.hpBg.setPosition(x, y - 20).setVisible(true);
      obj.hpBar.setVisible(true);
      this.updateHpBar(obj, hp);
    });
  }

  spawnEntity(data, isBot) {
    const isLocal = data.id === this.localId;
    const hexColor = parseInt(data.color.replace('#', ''), 16);
    const map = isBot ? this.bots : this.players;

    const rect = this.add.rectangle(data.x, data.y, 32, 32, hexColor);
    rect.setStrokeStyle(isLocal ? 2 : 1, isLocal ? 0xffffff : isBot ? 0xff4400 : 0x000000, 1);
    rect.setDepth(1);

    const labelText = isBot ? `[BOT] ${data.username}` : data.username;
    const label = this.add
      .text(data.x, data.y - 28, labelText, {
        fontSize: '11px',
        color: isBot ? '#ffaa77' : '#ffffff',
        backgroundColor: '#00000099',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    // HP bar: grey background, coloured fill
    const hpBg = this.add.rectangle(data.x, data.y - 20, 32, 4, 0x333333).setDepth(2);
    const hpBar = this.add
      .rectangle(data.x - 16, data.y - 20, 32, 4, 0x00ff44)
      .setOrigin(0, 0.5)
      .setDepth(3);

    map.set(data.id, { rect, label, hpBg, hpBar });

    if (isLocal) {
      this.cameras.main.startFollow(rect, true, 0.1, 0.1);
    }
  }

  updateHpBar(obj, hp) {
    const { rect, hpBg, hpBar } = obj;
    const pct = Math.max(0, hp / 100);
    hpBar.setSize(32 * pct, 4);
    hpBar.setPosition(rect.x - 16, rect.y - 20);
    hpBg.setPosition(rect.x, rect.y - 20);
    const color = pct > 0.5 ? 0x00ff44 : pct > 0.25 ? 0xffcc00 : 0xff2222;
    hpBar.setFillStyle(color);
    hpBar.setVisible(hp > 0);
  }

  despawnEntity(id, isBot) {
    const map = isBot ? this.bots : this.players;
    const obj = map.get(id);
    if (!obj) return;
    obj.rect.destroy();
    obj.label.destroy();
    obj.hpBg.destroy();
    obj.hpBar.destroy();
    map.delete(id);
  }

  drawWorld(mapWidth, mapHeight) {
    this.add.rectangle(mapWidth / 2, mapHeight / 2, mapWidth, mapHeight, 0x0f0f1a);

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

    const border = this.add.graphics();
    border.lineStyle(3, 0x4f8ef7, 0.6);
    border.strokeRect(0, 0, mapWidth, mapHeight);
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
    this.bots.clear();
    this.bullets.clear();
  }
}
