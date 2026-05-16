const db = require('../config/database');

async function notify(opts) {
  const {
    userId, eventType, title, message,
    link = null, entityType = null, entityId = null,
    priority = 'normal', trx = null,
  } = opts;

  const conn = trx || db;
  let notification;
  try {
    [notification] = await conn('notifications').insert({
      user_id: userId,
      type: eventType,
      event_type: eventType,
      title,
      message,
      link,
      entity_type: entityType,
      entity_id: entityId,
      priority,
      read: false,
    }, ['*']);
  } catch {
    return; // notifications are non-critical; never throw
  }

  // Real-time push via socket (lazy-require avoids circular dep at load time)
  try {
    const { emitToUser } = require('../socket');
    emitToUser(userId, 'notification:new', notification);
  } catch {}
}

module.exports = { notify };
