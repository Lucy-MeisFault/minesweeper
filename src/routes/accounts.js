const router = require('express').Router();
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, COSMETICS } = require('../../config');
const store = require('../store');
const auth = require('../middleware/auth');

// POST /accounts/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'username must be 3–20 chars' });

  const exists = [...store.accounts.values()].find(a => a.username === username);
  if (exists) return res.status(409).json({ error: 'Username taken' });

  const id = uuid();
  const hash = await bcrypt.hash(password, 10);
  const account = {
    id,
    username,
    passwordHash: hash,
    totalMoves: 0,
    wins: 0,
    unlockedCosmetics: ['flag_red'], // default flag unlocked for everyone
    createdAt: new Date().toISOString(),
  };
  store.accounts.set(id, account);

  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, account: publicAccount(account) });
});

// POST /accounts/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const account = [...store.accounts.values()].find(a => a.username === username);
  if (!account) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: account.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, account: publicAccount(account) });
});

// GET /accounts/me  — current user profile
router.get('/me', auth, (req, res) => {
  res.json(publicAccount(req.account));
});

// GET /accounts/:id  — public profile
router.get('/:id', (req, res) => {
  const account = store.accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(publicAccount(account));
});

// GET /accounts/me/cosmetics  — available + unlocked cosmetics
router.get('/me/cosmetics', auth, (req, res) => {
  const cosmetics = COSMETICS.map(c => ({
    ...c,
    unlocked: req.account.unlockedCosmetics.includes(c.id),
    canUnlock: req.account.totalMoves >= c.requiredMoves,
  }));
  res.json(cosmetics);
});

// POST /accounts/me/cosmetics/:cosmeticId/unlock
router.post('/me/cosmetics/:cosmeticId/unlock', auth, (req, res) => {
  const cosmetic = COSMETICS.find(c => c.id === req.params.cosmeticId);
  if (!cosmetic) return res.status(404).json({ error: 'Cosmetic not found' });
  if (req.account.totalMoves < cosmetic.requiredMoves) {
    return res.status(403).json({ error: `Need ${cosmetic.requiredMoves} total moves to unlock` });
  }
  if (!req.account.unlockedCosmetics.includes(cosmetic.id)) {
    req.account.unlockedCosmetics.push(cosmetic.id);
  }
  res.json({ unlocked: req.account.unlockedCosmetics });
});

function publicAccount(a) {
  return {
    id: a.id,
    username: a.username,
    totalMoves: a.totalMoves,
    wins: a.wins,
    unlockedCosmetics: a.unlockedCosmetics,
    createdAt: a.createdAt,
  };
}

module.exports = router;
