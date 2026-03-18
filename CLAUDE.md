# CLAUDE.md — TopDown Arena

Project context for AI-assisted development.

## Architecture

Three Docker services communicate over an internal network:

```
Browser → nginx (client:80)
              ├── /            → React SPA (static files)
              ├── /api/*       → server:3001 (Express REST)
              └── /socket.io/* → server:3001 (Socket.io WS)
```

- **client** — React + Vite + Phaser.js. Built at image-build time; nginx serves the static dist.
- **server** — Node.js. Single process handling both HTTP (Express) and WebSocket (Socket.io) on port 3001.
- **postgres** — User accounts only. Game state is in-memory on the server.

## Key Files

| File | Purpose |
|------|---------|
| `server/src/index.js` | Entry point; wires Express, Socket.io, DB init |
| `server/src/db.js` | PostgreSQL pool; creates `users` table on startup with retry |
| `server/src/routes/auth.js` | `POST /api/auth/register` and `/login` |
| `server/src/game/GameServer.js` | Authoritative game loop (20 tick/s), player state |
| `client/src/game/scenes/GameScene.js` | Phaser scene; Socket.io client, input, rendering |
| `client/src/App.jsx` | React Router routes; `/game` is JWT-protected |
| `client/src/api.js` | Fetch wrapper that attaches `Authorization: Bearer <token>` |
| `docker-compose.yml` | Service definitions; postgres healthcheck gates server start |
| `client/nginx.conf` | SPA fallback + WebSocket proxy headers |

## Game Loop

**Server (`GameServer.js`):**
1. Socket.io auth middleware validates JWT on connection
2. Player joins → assigned random position and colour, broadcast to others
3. Client sends `input` event with `{ dx, dy }` (-1/0/1 each axis)
4. `setInterval` at 50ms normalises diagonal movement, clamps to map bounds, emits `state` array of `{ id, x, y }` for all moving players

**Client (`GameScene.js`):**
1. Connects with `io({ auth: { token } })`
2. `init` event → draw world, spawn all players, start camera follow
3. `player:join` / `player:leave` → add/remove sprites
4. `state` → update sprite positions for all players
5. `update()` loop → diff WASD keys, emit `input` only when changed

## Auth Flow

1. Register/login → bcrypt compare → `jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' })`
2. Token stored in `localStorage`
3. REST calls: `Authorization: Bearer <token>` header via `api.js`
4. Socket.io: token in `socket.handshake.auth.token`, verified in `io.use()` middleware
5. Expired/missing token on socket → `connect_error` → client redirects to `/login`

## Development Commands

```bash
# Full stack (production mode)
docker compose up --build

# Rebuild a single service after changes
docker compose up --build server
docker compose up --build client

# View logs
docker compose logs -f server
docker compose logs -f client

# Stop everything
docker compose down

# Wipe DB volume too
docker compose down -v
```

## Conventions

- **No TypeScript** — plain JavaScript throughout
- **No ORM** — raw `pg` with parameterised queries (`$1, $2`)
- **Server is authoritative** — clients send input only, never positions
- **No client-side prediction** — positions come entirely from server state updates
- **Inline styles** avoided — use `styles.css` class names
- Keep game constants (MAP_WIDTH, SPEED, TICK_RATE) at the top of `GameServer.js`

## Common Extension Points

- **Add a new game mechanic** → `GameServer.js` update loop + new Socket.io event + handle in `GameScene.js`
- **Add a protected REST route** → use `verifyToken` middleware from `authMiddleware.js`
- **Add a new page** → create `client/src/pages/Foo.jsx`, add `<Route>` in `App.jsx`
- **Persist game data** → add a table in `db.js` init query, query it from `GameServer.js`

## Environment

Required in `.env` (never commit):
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL credentials
- `JWT_SECRET` — min 32 chars, used for all token signing/verification
