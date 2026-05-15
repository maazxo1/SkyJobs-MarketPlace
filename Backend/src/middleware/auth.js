const { verify } = require('../utils/jwt');
const { error } = require('../utils/response');
const db = require('../config/database');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401, 'UNAUTHORIZED');
  }
  try {
    req.user = verify(authHeader.split(' ')[1]);
    // Update last_active_at (fire-and-forget, never blocks the request)
    db('users').where({ id: req.user.id }).update({ last_active_at: new Date() }).catch(() => {});
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401, 'TOKEN_INVALID');
  }
};
