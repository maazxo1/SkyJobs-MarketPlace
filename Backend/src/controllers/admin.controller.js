const db = require('../config/database');
const { success, error } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const { notify } = require('../utils/notify');
const { releaseFunds, refundFunds } = require('../utils/escrow');
const { adjustTrustScore } = require('../utils/trust');
const { _transition: transition } = require('./orders.controller');

// ── Helper: write audit log (throws if it fails — abort the action) ──────────
async function audit(trx, { actorId, action, entityType, entityId, before = null, after = null, note = null, ip = null }) {
  await trx('audit_logs').insert({
    actor_id: actorId,
    actor_role: 'admin',
    action,
    entity_type: entityType,
    entity_id: entityId,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    note,
    ip_address: ip,
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    let query = db('users')
      .select('id', 'name', 'email', 'role', 'is_banned', 'trust_score', 'trust_level',
        'rating_avg', 'jobs_completed', 'created_at', 'suspended_at', 'last_active_at')
      .orderBy('created_at', 'desc');

    if (role) query = query.where({ role });
    if (search) query = query.whereRaw('(name ILIKE ? OR email ILIKE ?)', [`%${search}%`, `%${search}%`]);

    const result = await paginate(query, page, limit);
    return success(res, result.data, 'Users retrieved', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

exports.banUser = async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');
    if (user.role === 'admin') return error(res, 'Cannot ban an admin', 400, 'INVALID_ACTION');

    const newBanned = !user.is_banned;
    await db.transaction(async (trx) => {
      await trx('users').where({ id: user.id }).update({ is_banned: newBanned });
      await audit(trx, {
        actorId: req.user.id, action: newBanned ? 'user.ban' : 'user.unban',
        entityType: 'user', entityId: user.id,
        before: { is_banned: user.is_banned }, after: { is_banned: newBanned },
        note: req.body.reason || null, ip: req.ip,
      });
      await notify({
        userId: user.id,
        eventType: newBanned ? 'account.warning' : 'account.warning',
        title: newBanned ? 'Account suspended' : 'Account reinstated',
        message: newBanned
          ? `Your account has been suspended. ${req.body.reason || ''}`
          : 'Your account has been reinstated.',
        priority: 'urgent', trx,
      });
    });

    const updated = await db('users').where({ id: user.id }).select('id', 'name', 'email', 'is_banned').first();
    return success(res, updated, `User ${newBanned ? 'banned' : 'unbanned'}`);
  } catch (err) {
    next(err);
  }
};

exports.suspendUser = async (req, res, next) => {
  try {
    const { reason, days } = req.body;
    if (!reason) return error(res, 'reason is required', 400, 'VALIDATION_ERROR');

    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');
    if (user.role === 'admin') return error(res, 'Cannot suspend an admin', 400, 'INVALID_ACTION');

    const now = new Date();
    const suspendedUntil = days ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;

    await db.transaction(async (trx) => {
      await trx('users').where({ id: user.id }).update({
        trust_level: 'suspended',
        suspension_reason: reason,
        suspended_at: now,
        suspended_until: suspendedUntil,
      });
      await audit(trx, {
        actorId: req.user.id, action: 'user.suspend',
        entityType: 'user', entityId: user.id,
        before: { trust_level: user.trust_level },
        after: { trust_level: 'suspended', suspended_until: suspendedUntil },
        note: reason, ip: req.ip,
      });
      await notify({
        userId: user.id, eventType: 'account.warning',
        title: 'Account suspended',
        message: `Your account has been suspended. Reason: ${reason}${days ? `. Duration: ${days} days.` : ' (permanent).'}`,
        priority: 'urgent', trx,
      });
    });

    return success(res, null, 'User suspended');
  } catch (err) {
    next(err);
  }
};

exports.adjustTrust = async (req, res, next) => {
  try {
    const { delta, note } = req.body;
    if (delta === undefined || !note) return error(res, 'delta and note are required', 400, 'VALIDATION_ERROR');

    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');

    await db.transaction(async (trx) => {
      const before = { trust_score: user.trust_score, trust_level: user.trust_level };
      await adjustTrustScore(trx, user.id, Number(delta));
      const after = await trx('users').where({ id: user.id }).select('trust_score', 'trust_level').first();
      await audit(trx, {
        actorId: req.user.id, action: 'user.adjust_trust',
        entityType: 'user', entityId: user.id,
        before, after, note, ip: req.ip,
      });
    });

    const updated = await db('users').where({ id: user.id }).select('id', 'trust_score', 'trust_level').first();
    return success(res, updated, 'Trust score adjusted');
  } catch (err) {
    next(err);
  }
};

exports.getTrustHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const query = db('audit_logs')
      .where({ entity_type: 'user', entity_id: req.params.id })
      .whereIn('action', ['user.adjust_trust', 'user.suspend', 'user.ban', 'user.unban'])
      .select('id', 'action', 'before', 'after', 'note', 'created_at')
      .orderBy('created_at', 'desc');

    const result = await paginate(query, page, limit);
    return success(res, result.data, 'Trust history', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

// ── Orders ───────────────────────────────────────────────────────────────────

exports.forceOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['awaiting_start', 'in_progress', 'delivered', 'revision_requested', 'in_dispute', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return error(res, 'Invalid status', 400, 'VALIDATION_ERROR');
    if (!note) return error(res, 'note is required for admin override', 400, 'VALIDATION_ERROR');

    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    await db.transaction(async (trx) => {
      await audit(trx, {
        actorId: req.user.id, action: 'order.force_status',
        entityType: 'order', entityId: order.id,
        before: { status: order.status }, after: { status }, note, ip: req.ip,
      });
      await transition(trx, order, status, req.user.id, 'admin', `Admin override: ${note}`);

      if (status === 'completed') {
        await trx('orders').where({ id: order.id }).update({ completed_at: new Date() });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'completed', completed_at: new Date() });
      } else if (status === 'cancelled') {
        await trx('orders').where({ id: order.id }).update({ cancelled_at: new Date(), cancellation_reason: note });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'cancelled', cancelled_at: new Date() });
      }

      for (const uid of [order.client_id, order.freelancer_id]) {
        await notify({
          userId: uid, eventType: 'order.started',
          title: 'Order status updated by admin',
          message: `An admin has updated your order status to "${status}". Note: ${note}`,
          link: `/orders/${order.id}`,
          entityType: 'order', entityId: order.id, priority: 'high', trx,
        });
      }
    });

    return success(res, await db('orders').where({ id: order.id }).first(), 'Order status updated');
  } catch (err) {
    next(err);
  }
};

exports.adminReleasePayment = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return error(res, 'note is required', 400, 'VALIDATION_ERROR');

    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.escrow_status === 'released') return error(res, 'Escrow already released', 400, 'INVALID_STATE');

    await db.transaction(async (trx) => {
      await audit(trx, {
        actorId: req.user.id, action: 'order.release_payment',
        entityType: 'order', entityId: order.id,
        before: { escrow_status: order.escrow_status }, after: { escrow_status: 'released' },
        note, ip: req.ip,
      });
      await releaseFunds(trx, { order, triggeredBy: req.user.id, note: `Admin: ${note}` });
      await notify({
        userId: order.freelancer_id, eventType: 'payment.released',
        title: 'Payment released',
        message: `An admin has manually released your payment of $${order.freelancer_payout}.`,
        link: `/orders/${order.id}`,
        entityType: 'order', entityId: order.id, priority: 'high', trx,
      });
    });

    return success(res, null, 'Payment released');
  } catch (err) {
    next(err);
  }
};

exports.adminRefund = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return error(res, 'note is required', 400, 'VALIDATION_ERROR');

    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.escrow_status === 'refunded') return error(res, 'Already refunded', 400, 'INVALID_STATE');

    await db.transaction(async (trx) => {
      await audit(trx, {
        actorId: req.user.id, action: 'order.refund',
        entityType: 'order', entityId: order.id,
        before: { escrow_status: order.escrow_status }, after: { escrow_status: 'refunded' },
        note, ip: req.ip,
      });
      await refundFunds(trx, { order, triggeredBy: req.user.id, note: `Admin: ${note}` });
      await notify({
        userId: order.client_id, eventType: 'payment.refunded',
        title: 'Refund issued',
        message: `An admin has issued a refund of $${order.amount} to your account.`,
        link: `/orders/${order.id}`,
        entityType: 'order', entityId: order.id, priority: 'high', trx,
      });
    });

    return success(res, null, 'Refund issued');
  } catch (err) {
    next(err);
  }
};

// ── Reviews ──────────────────────────────────────────────────────────────────

exports.deleteReview = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return error(res, 'reason is required', 400, 'VALIDATION_ERROR');

    const review = await db('reviews').where({ id: req.params.id }).first();
    if (!review) return error(res, 'Review not found', 404, 'NOT_FOUND');

    await db.transaction(async (trx) => {
      await audit(trx, {
        actorId: req.user.id, action: 'review.delete',
        entityType: 'order', entityId: review.order_id,
        before: { review_id: review.id, rating: review.rating, comment: review.comment },
        note: reason, ip: req.ip,
      });
      await trx('reviews').where({ id: review.id }).delete();

      // Recompute rating for the reviewee
      const { recalcRating } = require('../utils/trust');
      await recalcRating(trx, review.reviewee_id);
    });

    return success(res, null, 'Review deleted');
  } catch (err) {
    next(err);
  }
};

// ── Jobs ─────────────────────────────────────────────────────────────────────

exports.listOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let query = db('orders')
      .join('users as client', 'orders.client_id', 'client.id')
      .join('users as freelancer', 'orders.freelancer_id', 'freelancer.id')
      .join('jobs', 'orders.job_id', 'jobs.id')
      .select(
        'orders.id', 'orders.status', 'orders.amount', 'orders.escrow_status',
        'orders.is_late', 'orders.deadline', 'orders.created_at',
        'client.name as client_name',
        'freelancer.name as freelancer_name',
        'jobs.title as job_title',
      )
      .orderBy('orders.created_at', 'desc');

    if (status) query = query.where('orders.status', status);
    if (search) {
      query = query.whereRaw(
        '(client.name ILIKE ? OR freelancer.name ILIKE ? OR jobs.title ILIKE ?)',
        [`%${search}%`, `%${search}%`, `%${search}%`],
      );
    }

    const result = await paginate(query, page, limit);
    return success(res, result.data, 'Orders retrieved', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [users, jobs, bids, contracts, orders, jobsByStatus, ordersByStatus] = await Promise.all([
      db('users').count('id as count').first(),
      db('jobs').count('id as count').first(),
      db('bids').count('id as count').first(),
      db('contracts').count('id as count').first(),
      db('orders').count('id as count').first(),
      db('jobs').select('status').count('id as count').groupBy('status'),
      db('orders').select('status').count('id as count').groupBy('status'),
    ]);

    return success(res, {
      total_users: Number(users.count),
      total_jobs: Number(jobs.count),
      total_bids: Number(bids.count),
      total_contracts: Number(contracts.count),
      total_orders: Number(orders.count),
      jobs_by_status: jobsByStatus,
      orders_by_status: ordersByStatus,
    });
  } catch (err) {
    next(err);
  }
};

exports.listContracts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = db('contracts')
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .join('users as clients', 'contracts.client_id', 'clients.id')
      .join('users as freelancers', 'contracts.freelancer_id', 'freelancers.id')
      .select(
        'contracts.*', 'jobs.title as job_title',
        'clients.name as client_name', 'freelancers.name as freelancer_name',
      )
      .orderBy('contracts.created_at', 'desc');

    const result = await paginate(query, page, limit);
    return success(res, result.data, 'Contracts retrieved', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

exports.listJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let query = db('jobs')
      .join('users', 'jobs.client_id', 'users.id')
      .join('categories', 'jobs.category_id', 'categories.id')
      .select('jobs.id', 'jobs.title', 'jobs.status', 'jobs.created_at', 'jobs.expires_at',
        'users.name as client_name', 'categories.name as category_name')
      .orderBy('jobs.created_at', 'desc');

    if (status) query = query.where('jobs.status', status);
    if (search) query = query.whereRaw('jobs.title ILIKE ?', [`%${search}%`]);

    const result = await paginate(query, page, limit);
    return success(res, result.data, 'Jobs retrieved', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await db('jobs').where({ id: req.params.id }).first();
    if (!job) return error(res, 'Job not found', 404, 'NOT_FOUND');

    await db.transaction(async (trx) => {
      await audit(trx, {
        actorId: req.user.id, action: 'job.delete',
        entityType: 'order', entityId: job.id,
        before: { title: job.title, status: job.status }, note: req.body.reason || null, ip: req.ip,
      });
      await trx('jobs').where({ id: job.id }).delete();
    });

    return success(res, null, 'Job deleted');
  } catch (err) {
    next(err);
  }
};

// ── Reports ──────────────────────────────────────────────────────────────────

exports.revenueReport = async (req, res, next) => {
  try {
    const { from, to, group_by = 'day' } = req.query;
    const truncUnit = group_by === 'month' ? 'month' : group_by === 'week' ? 'week' : 'day';

    let query = db('escrow_transactions')
      .where('type', 'release')
      .where('status', 'completed');

    if (from) query = query.where('created_at', '>=', from);
    if (to) query = query.where('created_at', '<=', to);

    const rows = await query
      .select(
        db.raw(`DATE_TRUNC('${truncUnit}', created_at) as period`),
        db.raw('SUM(amount) as gross_volume'),
        db.raw('SUM(platform_fee) as platform_fees'),
        db.raw('SUM(net_to_freelancer) as payouts'),
        db.raw('COUNT(*) as order_count'),
      )
      .groupByRaw(`DATE_TRUNC('${truncUnit}', created_at)`)
      .orderBy('period', 'asc');

    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

exports.ordersReport = async (req, res, next) => {
  try {
    const { from, to, status } = req.query;

    let query = db('orders');
    if (from) query = query.where('created_at', '>=', from);
    if (to) query = query.where('created_at', '<=', to);
    if (status) query = query.where('status', status);

    const [total, byStatus, avgValue, completedRows] = await Promise.all([
      query.clone().count('id as count').first(),
      query.clone().select('status').count('id as count').groupBy('status'),
      query.clone().where('status', 'completed').avg('amount as avg').first(),
      query.clone().where('status', 'completed')
        .whereNotNull('completed_at').whereNotNull('started_at')
        .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/86400) as avg_days')).first(),
    ]);

    return success(res, {
      total: Number(total.count),
      by_status: byStatus,
      avg_order_value: avgValue?.avg ? Number(Number(avgValue.avg).toFixed(2)) : null,
      avg_completion_days: completedRows?.avg_days ? Number(Number(completedRows.avg_days).toFixed(1)) : null,
    });
  } catch (err) {
    next(err);
  }
};

exports.disputesReport = async (req, res, next) => {
  try {
    const [total, byStatus, byResolution] = await Promise.all([
      db('disputes').count('id as count').first(),
      db('disputes').select('status').count('id as count').groupBy('status'),
      db('disputes').whereNotNull('resolution').select('resolution').count('id as count').groupBy('resolution'),
    ]);

    return success(res, {
      total: Number(total.count),
      by_status: byStatus,
      by_resolution: byResolution,
    });
  } catch (err) {
    next(err);
  }
};

exports.usersReport = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [newSignups, byTrustLevel, suspended] = await Promise.all([
      db('users').where('created_at', '>=', thirtyDaysAgo).count('id as count').first(),
      db('users').select('trust_level').count('id as count').groupBy('trust_level'),
      db('users').whereNotNull('suspended_at').count('id as count').first(),
    ]);

    return success(res, {
      new_signups_30d: Number(newSignups.count),
      by_trust_level: byTrustLevel,
      suspended_count: Number(suspended.count),
    });
  } catch (err) {
    next(err);
  }
};
