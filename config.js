module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
  PORT: process.env.PORT || 3000,

  // Difficulty presets
  DIFFICULTIES: {
    easy:   { rows: 9,  cols: 9,  mines: 10, movesPerTurn: 3 },
    medium: { rows: 16, cols: 16, mines: 40, movesPerTurn: 2 },
    hard:   { rows: 16, cols: 30, mines: 99, movesPerTurn: 1 },
  },

  // Cosmetics unlocked at milestone total moves
  COSMETICS: [
    { id: 'flag_red',    name: 'Red Flag',      requiredMoves: 0   },
    { id: 'flag_skull',  name: 'Skull Flag',    requiredMoves: 50  },
    { id: 'flag_star',   name: 'Star Flag',     requiredMoves: 200 },
  ],
};
