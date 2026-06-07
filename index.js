const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/accounts',    require('./src/routes/accounts'));
app.use('/rooms',       require('./src/routes/rooms'));
app.use('/leaderboard', require('./src/routes/leaderboard'));

app.get('/', (_, res) => res.json({ api: 'global-minesweeper', version: '1.0.0' }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Minesweeper API running on :${PORT}`));
