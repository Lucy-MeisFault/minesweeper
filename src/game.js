/**
 * Generates a fresh minesweeper board.
 * Each cell: { mine, revealed, flagged, adjacentMines }
 */
function generateBoard(rows, cols, mineCount) {
  // Build empty grid
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    }))
  );

  // Plant mines
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!cells[r][c].mine) {
      cells[r][c].mine = true;
      placed++;
    }
  }

  // Compute adjacency numbers
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc].mine) count++;
        }
      }
      cells[r][c].adjacentMines = count;
    }
  }

  return cells;
}

/**
 * Flood-fill reveal (safe cells with 0 adjacent mines).
 * Mutates the board in place and returns list of revealed coords.
 */
function floodReveal(board, row, col) {
  const rows = board.length;
  const cols = board[0].length;
  const revealed = [];
  const queue = [[row, col]];
  const visited = new Set();

  while (queue.length) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = board[r][c];
    if (cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;
    revealed.push({ row: r, col: c });

    if (cell.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  return revealed;
}

/**
 * Check win: all non-mine cells revealed.
 */
function checkWin(board) {
  return board.every(row =>
    row.every(cell => cell.mine || cell.revealed)
  );
}

/**
 * Build a client-safe view of the board.
 * Hides mine positions unless the game is over.
 */
function boardView(board, gameOver) {
  return board.map(row =>
    row.map(cell => ({
      revealed: cell.revealed,
      flagged: cell.flagged,
      adjacentMines: cell.revealed ? cell.adjacentMines : null,
      mine: (cell.revealed || gameOver) ? cell.mine : null,
    }))
  );
}

module.exports = { generateBoard, floodReveal, checkWin, boardView };
