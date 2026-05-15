const db = require('../config/database');
const { success, error } = require('../utils/response');

exports.getNotifications = async (req, res, next) => {
  try {
    const { unread_only, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('notifications')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc');

    if (unread_only === 'true') query = query.where({ read: false });

    const [notifications, { count }] = await Promise.all([
      query.clone().limit(parseInt(limit, 10)).offset(offset),
      db('notifications').where({ user_id: req.user.id }).count('id as count').first(),
    ]);

    const unreadCount = await db('notifications')
      .where({ user_id: req.user.id, read: false })
      .count('id as count')
      .first()
      .then((r) => Number(r.count));

    return success(res, { notifications, unreadCount }, 'Success', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: Number(count),
    });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await db('notifications')
      .where({ id: req.params.id, user_id: req.user.id })
      .update({ read: true });
    return success(res, null, 'Marked as read');
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await db('notifications')
      .where({ user_id: req.user.id, read: false })
      .update({ read: true });
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    let prefs = await db('notification_preferences').where({ user_id: req.user.id }).first();

    if (!prefs) {
      // Create defaults on first access
      [prefs] = await db('notification_preferences').insert({ user_id: req.user.id }, ['*']);
    }

    return success(res, prefs);
  } catch (err) {
    next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const allowed = [
      'email_new_bid', 'email_bid_accepted', 'email_bid_rejected', 'email_order_updates',
      'email_deadline_reminders', 'email_payment', 'email_dispute', 'email_messages',
      'push_enabled', 'digest_frequency',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return error(res, 'No valid preference fields provided', 400, 'VALIDATION_ERROR');
    }

    const existing = await db('notification_preferences').where({ user_id: req.user.id }).first();
    let prefs;

    if (existing) {
      [prefs] = await db('notification_preferences')
        .where({ user_id: req.user.id })
        .update(updates, ['*']);
    } else {
      [prefs] = await db('notification_preferences')
        .insert({ user_id: req.user.id, ...updates }, ['*']);
    }

    return success(res, prefs, 'Preferences updated');
  } catch (err) {
    next(err);
  }
};
