const router = require('express').Router();
const store = require('../store');

// GET /leaderboard?sort=moves&limit=20
router.get('/', (req, res) => {
  const sort = req.query.sort === 'wins' ? 'wins' : 'totalMoves';
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const entries = [...store.accounts.values()]
    .map(a => ({ id: a.id, username: a.username, totalMoves: a.totalMoves, wins: a.wins }))
    .sort((a, b) => b[sort] - a[sort])
    .slice(0, limit);

  res.json({ sort, entries });
});

module.exports = router;
