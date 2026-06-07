/**
 * Simple JSON file database.
 * Saves to data.json next to the project root.
 * Pure JavaScript — no native modules, no compilation needed.
 */
const fs   = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.json');

let _data = null;

function load() {
  if (_data) return _data;
  if (fs.existsSync(DB_PATH)) {
    try {
      _data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
      _data = { accounts: {}, rooms: {} };
    }
  } else {
    _data = { accounts: {}, rooms: {} };
  }
  return _data;
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(load(), null, 2));
}

module.exports = { load, save };
