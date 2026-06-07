# Global Minesweeper — Backend API

## Setup

```bash
npm install
npm start          # production
npm run dev        # auto-reload on change
```

Set `JWT_SECRET` and `PORT` as env vars. Defaults to port **3000** with a dev secret.

> **Note:** data is in-memory. Restarting the server wipes everything. Swap `src/store.js` for a real DB (e.g. SQLite / Postgres) when deploying.

---

## Auth

All protected routes require:
```
Authorization: Bearer <token>
```
Tokens are JWTs, valid 30 days.

---

## Endpoints

### Accounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/accounts/register` | — | Create account |
| POST | `/accounts/login` | — | Login, get token |
| GET | `/accounts/me` | ✓ | Your profile |
| GET | `/accounts/:id` | — | Public profile |
| GET | `/accounts/me/cosmetics` | ✓ | Your cosmetics + unlock status |
| POST | `/accounts/me/cosmetics/:cosmeticId/unlock` | ✓ | Unlock a cosmetic |

**Register / Login body:**
```json
{ "username": "alice", "password": "pass123" }
```

**Response:**
```json
{
  "token": "eyJ...",
  "account": {
    "id": "uuid",
    "username": "alice",
    "totalMoves": 0,
    "wins": 0,
    "unlockedCosmetics": ["flag_red"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Rooms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rooms` | ✓ | Create room |
| GET | `/rooms/:id` | ✓ | Get room state |
| POST | `/rooms/:id/join` | ✓ | Join a room |
| POST | `/rooms/:id/start` | ✓ | Start game (host only) |
| POST | `/rooms/:id/move` | ✓ | Play a move |
| POST | `/rooms/:id/skip` | ✓ | Skip remaining moves |
| DELETE | `/rooms/:id/leave` | ✓ | Leave room |

**Create room body:**
```json
{
  "difficulty": "medium",   // easy | medium | hard
  "movesPerTurn": 2,        // optional override
  "maxPlayers": 4           // optional, default 4
}
```

**Difficulty presets:**

| Difficulty | Grid | Mines | Moves/turn |
|------------|------|-------|------------|
| easy | 9×9 | 10 | 3 |
| medium | 16×16 | 40 | 2 |
| hard | 16×30 | 99 | 1 |

**Room object:**
```json
{
  "id": "A3F9B2C1",
  "hostId": "uuid",
  "difficulty": "medium",
  "settings": { "rows": 16, "cols": 16, "mines": 40, "movesPerTurn": 2, "maxPlayers": 4 },
  "status": "waiting",         // waiting | playing | won | lost
  "players": [
    { "id": "uuid", "username": "alice", "moves": 0 }
  ],
  "currentTurnPlayerId": "uuid",
  "movesLeftThisTurn": 2,
  "board": null,               // null before start; array of rows after
  "startedAt": null,
  "endedAt": null,
  "createdAt": "..."
}
```

**Board cell (after start):**
```json
{
  "revealed": false,
  "flagged": false,
  "adjacentMines": null,   // number when revealed, null when hidden
  "mine": null             // true/false when revealed or game over, null when hidden
}
```

**Move body:**
```json
{ "action": "reveal", "row": 4, "col": 7 }
{ "action": "flag",   "row": 4, "col": 7 }
```

**Move response:**
```json
{
  "event": {
    "type": "reveal",
    "cells": [{ "row": 4, "col": 7 }, ...]
  },
  "room": { /* updated room object */ }
}
```

Event types: `reveal`, `flag`, `hit_mine`

---

### Leaderboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leaderboard` | — | Top players |

**Query params:**
- `sort=moves` (default) or `sort=wins`
- `limit=20` (max 100)

**Response:**
```json
{
  "sort": "totalMoves",
  "entries": [
    { "id": "uuid", "username": "alice", "totalMoves": 142, "wins": 3 }
  ]
}
```

---

## Cosmetics

Unlocked automatically when `totalMoves` reaches the threshold:

| id | Name | Required moves |
|----|------|---------------|
| `flag_red` | Red Flag | 0 (default) |
| `flag_skull` | Skull Flag | 50 |
| `flag_star` | Star Flag | 200 |

---

## Project structure

```
index.js              — Express entry point
config.js             — difficulty presets, cosmetics, JWT secret
src/
  store.js            — in-memory data store
  game.js             — board generation, flood-fill, win check
  middleware/
    auth.js           — JWT verification middleware
  routes/
    accounts.js       — register, login, profile, cosmetics
    rooms.js          — room lifecycle + moves
    leaderboard.js    — top players
```
