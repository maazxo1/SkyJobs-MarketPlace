const db = require('../config/database');

/**
 * Create a notification record.
 * @param {object} opts
 * @param {number}  opts.userId
 * @param {string}  opts.eventType  - machine-readable key, e.g. 'bid.accepted'
 * @param {string}  opts.title
 * @param {string}  opts.message
 * @param {string}  [opts.link]
 * @param {string}  [opts.entityType] - order / bid / dispute / contract
 * @param {number}  [opts.entityId]
 * @param {string}  [opts.priority]  - low / normal / high / urgent (default: normal)
 * @param {object}  [opts.trx]       - knex transaction (omit to use default db)
 */
async function notify(opts) {
  const {
    userId, eventType, title, message,
    link = null, entityType = null, entityId = null,
    priority = 'normal', trx = null,
  } = opts;

  const conn = trx || db;
  await conn('notifications').insert({
    user_id: userId,
    type: eventType,        // keep legacy 'type' field populated
    event_type: eventType,
    title,
    message,
    link,
    entity_type: entityType,
    entity_id: entityId,
    priority,
    read: false,
  }).catch(() => {}); // notifications are non-critical; never throw
}

module.exports = { notify };
