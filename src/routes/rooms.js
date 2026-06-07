const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { DIFFICULTIES } = require('../../config');
const store = require('../store');
const auth = require('../middleware/auth');
const { generateBoard, floodReveal, checkWin, boardView } = require('../game');

// POST /rooms  — create a room
router.post('/', auth, (req, res) => {
  const {
    difficulty = 'medium',
    movesPerTurn,         // override default moves per turn
    maxPlayers = 4,
  } = req.body;

  const preset = DIFFICULTIES[difficulty];
  if (!preset) return res.status(400).json({ error: `difficulty must be: ${Object.keys(DIFFICULTIES).join(', ')}` });

  const id = uuid().slice(0, 8).toUpperCase(); // short code e.g. "A3F9B2C1"
  const room = {
    id,
    hostId: req.account.id,
    difficulty,
    settings: {
      rows: preset.rows,
      cols: preset.cols,
      mines: preset.mines,
      movesPerTurn: movesPerTurn ?? preset.movesPerTurn,
      maxPlayers,
    },
    status: 'waiting',   // waiting | playing | won | lost
    players: [playerEntry(req.account)],
    currentTurnIndex: 0,
    movesLeftThisTurn: movesPerTurn ?? preset.movesPerTurn,
    board: null,         // generated on start
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
  };

  store.rooms.set(id, room);
  res.status(201).json(roomView(room));
});

// GET /rooms/:id  — get room state
router.get('/:id', auth, (req, res) => {
  const room = getRoom(req, res); if (!room) return;
  res.json(roomView(room));
});

// POST /rooms/:id/join
router.post('/:id/join', auth, (req, res) => {
  const room = getRoom(req, res); if (!room) return;
  if (room.status !== 'waiting') return res.status(409).json({ error: 'Game already started' });
  if (room.players.length >= room.settings.maxPlayers) return res.status(409).json({ error: 'Room is full' });
  if (room.players.find(p => p.id === req.account.id)) return res.status(409).json({ error: 'Already in room' });

  room.players.push(playerEntry(req.account));
  res.json(roomView(room));
});

// POST /rooms/:id/start  — host starts the game
router.post('/:id/start', auth, (req, res) => {
  const room = getRoom(req, res); if (!room) return;
  if (room.hostId !== req.account.id) return res.status(403).json({ error: 'Only the host can start' });
  if (room.status !== 'waiting') return res.status(409).json({ error: 'Already started' });
  if (room.players.length < 1) return res.status(409).json({ error: 'Need at least 1 player' });

  const { rows, cols, mines } = room.settings;
  room.board = generateBoard(rows, cols, mines);
  room.status = 'playing';
  room.startedAt = new Date().toISOString();
  room.movesLeftThisTurn = room.settings.movesPerTurn;

  res.json(roomView(room));
});

// POST /rooms/:id/move  — play a move
router.post('/:id/move', auth, (req, res) => {
  const room = getRoom(req, res); if (!room) return;
  if (room.status !== 'playing') return res.status(409).json({ error: `Game is ${room.status}` });

  const currentPlayer = room.players[room.currentTurnIndex];
  if (currentPlayer.id !== req.account.id) {
    return res.status(403).json({ error: 'Not your turn' });
  }

  const { action, row, col } = req.body;
  if (!['reveal', 'flag'].includes(action)) return res.status(400).json({ error: 'action must be reveal or flag' });

  const { rows, cols } = room.settings;
  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    return res.status(400).json({ error: 'Cell out of bounds' });
  }

  const cell = room.board[row][col];
  if (cell.revealed) return res.status(409).json({ error: 'Cell already revealed' });

  let event = null;

  if (action === 'flag') {
    cell.flagged = !cell.flagged;  // toggle
    event = { type: 'flag', row, col, flagged: cell.flagged };
  } else {
    // reveal
    if (cell.flagged) return res.status(409).json({ error: 'Unflag before revealing' });

    if (cell.mine) {
      cell.revealed = true;
      room.status = 'lost';
      room.endedAt = new Date().toISOString();
      event = { type: 'hit_mine', row, col };
    } else {
      const revealed = floodReveal(room.board, row, col);
      event = { type: 'reveal', cells: revealed };

      if (checkWin(room.board)) {
        room.status = 'won';
        room.endedAt = new Date().toISOString();
        // Credit wins + moves
        room.players.forEach(p => {
          const acc = store.accounts.get(p.id);
          if (acc) acc.wins++;
        });
      }
    }
  }

  // Credit move to player
  currentPlayer.moves++;
  const acc = store.accounts.get(req.account.id);
  if (acc) acc.totalMoves++;

  // Advance turn if no moves left or game ended
  room.movesLeftThisTurn--;
  if (room.movesLeftThisTurn <= 0 || room.status !== 'playing') {
    advanceTurn(room);
  }

  res.json({ event, room: roomView(room) });
});

// POST /rooms/:id/skip  — current player skips remaining moves
router.post('/:id/skip', auth, (req, res) => {
  const room = getRoom(req, res); if (!room) return;
  if (room.status !== 'playing') return res.status(409).json({ error: `Game is ${room.status}` });

  const currentPlayer = room.players[room.currentTurnIndex];
  if (currentPlayer.id !== req.account.id) return res.status(403).json({ error: 'Not your turn' });

  advanceTurn(room);
  res.json(roomView(room));
});

// DELETE /rooms/:id/leave
router.delete('/:id/leave', auth, (req, res) => {
  const room = getRoom(req, res); if (!room) return;

  room.players = room.players.filter(p => p.id !== req.account.id);

  if (room.players.length === 0) {
    store.rooms.delete(room.id);
    return res.json({ message: 'Room deleted (empty)' });
  }

  // Pass host to next player if host left
  if (room.hostId === req.account.id) {
    room.hostId = room.players[0].id;
  }

  // Adjust turn index if needed
  if (room.currentTurnIndex >= room.players.length) {
    room.currentTurnIndex = 0;
    room.movesLeftThisTurn = room.settings.movesPerTurn;
  }

  res.json(roomView(room));
});

// ---- helpers ----

function getRoom(req, res) {
  const room = store.rooms.get(req.params.id);
  if (!room) { res.status(404).json({ error: 'Room not found' }); return null; }
  return room;
}

function advanceTurn(room) {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  room.movesLeftThisTurn = room.settings.movesPerTurn;
}

function playerEntry(account) {
  return { id: account.id, username: account.username, moves: 0 };
}

function roomView(room) {
  const gameOver = room.status === 'won' || room.status === 'lost';
  return {
    id: room.id,
    hostId: room.hostId,
    difficulty: room.difficulty,
    settings: room.settings,
    status: room.status,
    players: room.players,
    currentTurnPlayerId: room.players[room.currentTurnIndex]?.id ?? null,
    movesLeftThisTurn: room.movesLeftThisTurn,
    board: room.board ? boardView(room.board, gameOver) : null,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    createdAt: room.createdAt,
  };
}

module.exports = router;
