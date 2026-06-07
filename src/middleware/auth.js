const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config');
const store = require('../store');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const account = store.accounts.get(payload.id);
    if (!account) return res.status(401).json({ error: 'Account not found' });
    req.account = account;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = auth;
