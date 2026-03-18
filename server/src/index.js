require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { init: initDb } = require('./db');
const authRoutes = require('./routes/auth');
const GameServer = require('./game/GameServer');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

async function start() {
  await initDb();
  new GameServer(io);

  const port = process.env.PORT || 3001;
  httpServer.listen(port, () => {
    console.log(`Server listening on :${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
