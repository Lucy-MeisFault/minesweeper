/**
 * JSON-file-backed store.
 * Same interface as the original in-memory store — the routes don't change at all.
 *
 * Data is kept in memory while the server runs (fast reads),
 * and written to data.json on every mutation (persistent).
 */
const { load, save } = require('./db');

// Returns a proxy around an object so any property write auto-saves to disk.
// This handles the pattern in the routes where you do:
//   const room = store.rooms.get(id);
//   room.status = 'playing';   // <-- needs to persist without calling set() again
function autoSave(obj) {
  return new Proxy(obj, {
    set(target, prop, value) {
      target[prop] = value;
      save();
      return true;
    },
    get(target, prop) {
      const val = target[prop];
      // Wrap arrays so .push() also triggers a save
      if (Array.isArray(val)) {
        return new Proxy(val, {
          set(arr, idx, v) {
            arr[idx] = v;
            save();
            return true;
          },
        });
      }
      return val;
    },
  });
}

const store = {
  accounts: {
    get(id) {
      const obj = load().accounts[id];
      return obj ? autoSave(obj) : undefined;
    },
    set(id, obj) {
      load().accounts[id] = obj;
      save();
    },
    values() {
      return Object.values(load().accounts);
    },
  },

  rooms: {
    get(id) {
      const obj = load().rooms[id];
      return obj ? autoSave(obj) : undefined;
    },
    set(id, obj) {
      load().rooms[id] = obj;
      save();
    },
    delete(id) {
      delete load().rooms[id];
      save();
    },
    values() {
      return Object.values(load().rooms);
    },
  },
};

module.exports = store;
