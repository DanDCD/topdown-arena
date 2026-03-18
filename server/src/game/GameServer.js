const jwt = require('jsonwebtoken');

const TICK_RATE = 20;
const SPEED = 200;
const MAP_WIDTH = 1600;
const MAP_HEIGHT = 1200;
const PLAYER_SIZE = 32;

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63'];

class GameServer {
  constructor(io) {
    this.io = io;
    this.players = new Map();
    this.lastTick = Date.now();
    this.setupSocketIO();
    this.startLoop();
  }

  setupSocketIO() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Unauthorized'));
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`+ ${socket.user.username}`);

      const player = {
        id: socket.id,
        username: socket.user.username,
        x: Math.random() * (MAP_WIDTH - 200) + 100,
        y: Math.random() * (MAP_HEIGHT - 200) + 100,
        dx: 0,
        dy: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };

      this.players.set(socket.id, player);

      socket.emit('init', {
        playerId: socket.id,
        players: Array.from(this.players.values()),
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
      });

      socket.broadcast.emit('player:join', {
        id: player.id,
        username: player.username,
        x: player.x,
        y: player.y,
        color: player.color,
      });

      socket.on('input', ({ dx, dy }) => {
        const p = this.players.get(socket.id);
        if (!p) return;
        p.dx = Math.max(-1, Math.min(1, dx));
        p.dy = Math.max(-1, Math.min(1, dy));
      });

      socket.on('disconnect', () => {
        this.players.delete(socket.id);
        this.io.emit('player:leave', socket.id);
        console.log(`- ${socket.user.username}`);
      });
    });
  }

  startLoop() {
    setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTick) / 1000, 0.1);
      this.lastTick = now;
      this.update(dt);
    }, 1000 / TICK_RATE);
  }

  update(dt) {
    if (this.players.size === 0) return;

    const updates = [];

    for (const [id, p] of this.players) {
      if (p.dx === 0 && p.dy === 0) continue;

      const len = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
      const nx = p.dx / len;
      const ny = p.dy / len;
      const half = PLAYER_SIZE / 2;

      p.x = Math.max(half, Math.min(MAP_WIDTH - half, p.x + nx * SPEED * dt));
      p.y = Math.max(half, Math.min(MAP_HEIGHT - half, p.y + ny * SPEED * dt));

      updates.push({ id, x: p.x, y: p.y });
    }

    if (updates.length > 0) {
      this.io.emit('state', updates);
    }
  }
}

module.exports = GameServer;
