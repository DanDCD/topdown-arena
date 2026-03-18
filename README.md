# TopDown Arena

A real-time multiplayer 2D top-down game with a React marketing site, Phaser.js game client, Node.js + Socket.io game server, and PostgreSQL auth — all containerised with Docker Compose.

## Stack

| Layer | Technology |
|-------|-----------|
| Website & UI | React 18 + Vite |
| Game engine | Phaser.js 3 |
| Backend / game server | Node.js + Express + Socket.io |
| Auth | bcrypt + JWT |
| Database | PostgreSQL 16 |
| Reverse proxy | nginx |
| Container orchestration | Docker Compose |

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
# 1. Clone the repo
git clone https://github.com/DanDCD/topdown-arena.git
cd topdown-arena

# 2. Configure environment
cp .env.example .env
# Edit .env and set strong values for DB_PASSWORD and JWT_SECRET

# 3. Build and start
docker compose up --build

# Open http://localhost
```

### Local Development (without Docker)

**Terminal 1 — Server:**
```bash
cd server
npm install
npm run dev   # starts on :3001 with nodemon
```

**Terminal 2 — Client:**
```bash
cd client
npm install
npm run dev   # starts on :5173, proxies /api and /socket.io to :3001
```

You also need a local PostgreSQL instance. Set `DATABASE_URL` in `server/.env`.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password (use a strong value) |
| `DB_NAME` | PostgreSQL database name |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |

> `.env` is gitignored — never commit it.

## Project Structure

```
.
├── docker-compose.yml
├── .env.example
├── client/                  # React + Phaser frontend
│   ├── Dockerfile           # Multi-stage: Vite build → nginx
│   ├── nginx.conf           # SPA routing + proxy to server
│   ├── vite.config.js       # Dev proxy config
│   └── src/
│       ├── App.jsx          # Routes: / /login /register /game
│       ├── api.js           # Fetch wrapper (attaches JWT)
│       ├── styles.css       # Global dark theme
│       ├── pages/
│       │   ├── Home.jsx     # Marketing / landing page
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Game.jsx     # Mounts Phaser canvas
│       └── game/
│           ├── PhaserGame.js
│           └── scenes/
│               ├── PreloadScene.js
│               └── GameScene.js   # Socket.io + WASD movement
└── server/                  # Node.js API + game loop
    ├── Dockerfile
    └── src/
        ├── index.js         # Express + Socket.io entry point
        ├── db.js            # PostgreSQL pool + schema init
        ├── routes/auth.js   # POST /api/auth/register|login
        ├── middleware/authMiddleware.js
        └── game/GameServer.js  # Authoritative 20 tick/s loop
```

## Game

- **Map:** 1600 × 1200 px scrolling world with grid background
- **Controls:** WASD or arrow keys
- **Movement:** Server-authoritative at 20 ticks/s; diagonal movement normalised
- **Players:** Each gets a random colour with username label; camera follows local player

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWTs signed with HS256, 7-day expiry
- Socket.io rejects connections without a valid JWT
- PostgreSQL is on an internal Docker network — not exposed to the host
