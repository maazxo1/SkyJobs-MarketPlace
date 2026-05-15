const db = require('../config/database');
const { success, error } = require('../utils/response');
const { notify } = require('../utils/notify');
const { releaseFunds, refundFunds } = require('../utils/escrow');
const { adjustTrustScore, recalcRating } = require('../utils/trust');

// ── Helper: record a status transition ─────────────────────────────────────
async function transition(trx, order, newStatus, userId, triggerType = 'user_action', note = null) {
  await trx('orders').where({ id: order.id }).update({
    status: newStatus,
    updated_at: new Date(),
  });
  await trx('order_status_history').insert({
    order_id: order.id,
    from_status: order.status,
    to_status: newStatus,
    triggered_by: userId || null,
    trigger_type: triggerType,
    note,
  });
}

// ── Helper: complete an order (shared by approve + auto-complete) ───────────
async function completeOrder(trx, order, userId, triggerType = 'user_action') {
  const now = new Date();
  await transition(trx, order, 'completed', userId, triggerType, null);

  await trx('orders').where({ id: order.id }).update({
    completed_at: now,
    auto_complete_at: null,
  });

  // Release escrow
  await releaseFunds(trx, { order, triggeredBy: userId });

  // Update contract
  await trx('contracts').where({ id: order.contract_id }).update({
    status: 'completed',
    completed_at: now,
  });

  // Update freelancer stats
  await trx('users').where({ id: order.freelancer_id })
    .increment({ jobs_completed: 1, total_earned: order.freelancer_payout });
  await trx('users').where({ id: order.client_id })
    .increment({ total_spent: order.amount });

  // +5 trust if delivered on time
  if (!order.is_late) {
    await adjustTrustScore(trx, order.freelancer_id, 5);
  }

  // Set review window (14 days)
  const windowCloses = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Notify freelancer
  await notify({
    userId: order.freelancer_id,
    eventType: 'order.approved',
    title: 'Order completed',
    message: `Your order has been marked complete. Payment of $${order.freelancer_payout} is on its way.`,
    link: `/orders/${order.id}`,
    entityType: 'order',
    entityId: order.id,
    priority: 'high',
    trx,
  });

  // Open review window for both parties
  for (const uid of [order.client_id, order.freelancer_id]) {
    await notify({
      userId: uid,
      eventType: 'review.window_opened',
      title: 'Leave a review',
      message: 'The order is complete. You have 14 days to leave a review.',
      link: `/orders/${order.id}/review`,
      entityType: 'order',
      entityId: order.id,
      priority: 'normal',
      trx,
    });
  }

  return windowCloses;
}

// ── GET /orders ─────────────────────────────────────────────────────────────
exports.listOrders = async (req, res, next) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('orders')
      .join('users as client', 'orders.client_id', 'client.id')
      .join('users as freelancer', 'orders.freelancer_id', 'freelancer.id')
      .join('jobs', 'orders.job_id', 'jobs.id')
      .select(
        'orders.*',
        'client.name as client_name', 'client.avatar as client_avatar',
        'freelancer.name as freelancer_name', 'freelancer.avatar as freelancer_avatar',
        'jobs.title as job_title',
      );

    if (role === 'client') {
      query = query.where('orders.client_id', req.user.id);
    } else if (role === 'freelancer') {
      query = query.where('orders.freelancer_id', req.user.id);
    } else {
      query = query.where(function () {
        this.where('orders.client_id', req.user.id).orWhere('orders.freelancer_id', req.user.id);
      });
    }

    if (status) query = query.where('orders.status', status);

    const [{ count }] = await db('orders')
      .where(function () {
        this.where('client_id', req.user.id).orWhere('freelancer_id', req.user.id);
      })
      .count('id as count');

    const orders = await query.orderBy('orders.updated_at', 'desc').limit(parseInt(limit, 10)).offset(offset);

    return success(res, orders, 'Success', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: parseInt(count, 10),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /orders/:id ──────────────────────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  try {
    const order = await db('orders')
      .join('users as client', 'orders.client_id', 'client.id')
      .join('users as freelancer', 'orders.freelancer_id', 'freelancer.id')
      .join('jobs', 'orders.job_id', 'jobs.id')
      .select(
        'orders.*',
        'client.name as client_name', 'client.avatar as client_avatar',
        'freelancer.name as freelancer_name', 'freelancer.avatar as freelancer_avatar',
        'jobs.title as job_title',
      )
      .where('orders.id', req.params.id)
      .first();

    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isParty && !isAdmin) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const [history, deliveries] = await Promise.all([
      db('order_status_history').where({ order_id: order.id }).orderBy('created_at', 'asc'),
      db('deliveries')
        .where({ order_id: order.id })
        .orderBy('created_at', 'desc')
        .then((rows) => Promise.all(rows.map(async (d) => {
          const attachments = await db('delivery_attachments').where({ delivery_id: d.id });
          return { ...d, attachments };
        }))),
    ]);

    return success(res, { ...order, history, deliveries });
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/start ───────────────────────────────────────────────────
exports.startOrder = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.freelancer_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (order.status !== 'awaiting_start') return error(res, `Cannot start order in status: ${order.status}`, 400, 'INVALID_STATUS');

    await db.transaction(async (trx) => {
      await transition(trx, order, 'in_progress', req.user.id, 'user_action', 'Freelancer started work');
      await trx('orders').where({ id: order.id }).update({ started_at: new Date() });

      await notify({
        userId: order.client_id,
        eventType: 'order.started',
        title: 'Freelancer started work',
        message: 'Your freelancer has started working on the order.',
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        trx,
      });
    });

    const updated = await db('orders').where({ id: order.id }).first();
    return success(res, updated, 'Order started');
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/deliver ─────────────────────────────────────────────────
exports.deliverOrder = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.freelancer_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (!['in_progress', 'revision_requested'].includes(order.status)) {
      return error(res, `Cannot deliver order in status: ${order.status}`, 400, 'INVALID_STATUS');
    }

    const { message, attachments = [] } = req.body;
    if (message && message.length > 5000) return error(res, 'Message must be under 5000 characters', 400, 'VALIDATION_ERROR');

    const isRevision = order.status === 'revision_requested';
    const revisionNumber = isRevision ? order.revision_count : 0;

    const now = new Date();
    const autoCompleteAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const isLate = order.deadline ? now > new Date(order.deadline) : false;

    let delivery;

    await db.transaction(async (trx) => {
      const [d] = await trx('deliveries').insert({
        order_id: order.id,
        submitted_by: req.user.id,
        message: message || null,
        is_revision: isRevision,
        revision_number: revisionNumber,
        status: 'pending',
      }, ['*']);
      delivery = d;

      // Insert attachments
      if (attachments.length > 0) {
        await trx('delivery_attachments').insert(
          attachments.map((a) => ({
            delivery_id: d.id,
            filename: a.filename,
            url: a.url,
            size_bytes: a.size_bytes || null,
            mime_type: a.mime_type || null,
          }))
        );
      }

      await transition(trx, order, 'delivered', req.user.id, 'user_action', 'Delivery submitted');
      await trx('orders').where({ id: order.id }).update({
        delivered_at: now,
        auto_complete_at: autoCompleteAt,
        is_late: isLate,
      });

      await notify({
        userId: order.client_id,
        eventType: 'order.delivered',
        title: isRevision ? 'Revised delivery received' : 'Delivery received',
        message: 'Your freelancer has submitted the delivery. Please review and approve or request changes.',
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        priority: 'high',
        trx,
      });
    });

    const [updated, deliveryAttachments] = await Promise.all([
      db('orders')
        .join('users as client',     'orders.client_id',     'client.id')
        .join('users as freelancer', 'orders.freelancer_id', 'freelancer.id')
        .join('jobs',                'orders.job_id',        'jobs.id')
        .select('orders.*', 'client.name as client_name', 'freelancer.name as freelancer_name', 'jobs.title as job_title')
        .where('orders.id', order.id)
        .first(),
      db('delivery_attachments').where({ delivery_id: delivery.id }),
    ]);
    return success(res, { order: updated, delivery: { ...delivery, attachments: deliveryAttachments } }, 'Delivery submitted');
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/approve ─────────────────────────────────────────────────
exports.approveOrder = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.client_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (order.status !== 'delivered') return error(res, 'Order must be in delivered status', 400, 'INVALID_STATUS');

    await db.transaction(async (trx) => {
      // Mark latest delivery as approved
      await trx('deliveries')
        .where({ order_id: order.id, status: 'pending' })
        .orderBy('created_at', 'desc')
        .limit(1)
        .update({ status: 'approved', reviewed_at: new Date(), reviewed_by: req.user.id });

      await completeOrder(trx, order, req.user.id, 'user_action');
    });

    const updated = await db('orders').where({ id: order.id }).first();
    return success(res, updated, 'Order approved and completed');
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/request-revision ────────────────────────────────────────
exports.requestRevision = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.client_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (order.status !== 'delivered') return error(res, 'Order must be in delivered status', 400, 'INVALID_STATUS');

    if (order.revision_count >= order.max_revisions) {
      return error(res, `Maximum revisions (${order.max_revisions}) reached. Please accept or open a dispute.`, 400, 'MAX_REVISIONS');
    }

    const { feedback } = req.body;
    if (!feedback) return error(res, 'Feedback is required for revision request', 400, 'VALIDATION_ERROR');
    if (feedback.length > 2000) return error(res, 'Feedback must be under 2000 characters', 400, 'VALIDATION_ERROR');

    await db.transaction(async (trx) => {
      // Mark latest delivery as rejected
      await trx('deliveries')
        .where({ order_id: order.id, status: 'pending' })
        .orderBy('created_at', 'desc')
        .limit(1)
        .update({
          status: 'rejected',
          reviewed_at: new Date(),
          reviewed_by: req.user.id,
          rejection_feedback: feedback,
        });

      await transition(trx, order, 'revision_requested', req.user.id, 'user_action', feedback);
      await trx('orders').where({ id: order.id }).update({
        revision_count: order.revision_count + 1,
        auto_complete_at: null,
      });

      await notify({
        userId: order.freelancer_id,
        eventType: 'order.revision_requested',
        title: 'Revision requested',
        message: `The client has requested a revision: ${feedback.slice(0, 100)}`,
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        priority: 'high',
        trx,
      });
    });

    const updated = await db('orders').where({ id: order.id }).first();
    return success(res, updated, 'Revision requested');
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/cancel ──────────────────────────────────────────────────
exports.requestCancellation = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    if (!isParty) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const nonCancellable = ['completed', 'cancelled', 'in_dispute'];
    if (nonCancellable.includes(order.status)) {
      return error(res, `Cannot cancel order in status: ${order.status}`, 400, 'INVALID_STATUS');
    }

    const { reason } = req.body;
    if (!reason) return error(res, 'Reason is required', 400, 'VALIDATION_ERROR');
    if (reason.length > 1000) return error(res, 'Reason must be under 1000 characters', 400, 'VALIDATION_ERROR');

    // Check for existing pending cancellation
    const existing = await db('cancellation_requests')
      .where({ order_id: order.id, status: 'pending' })
      .first();
    if (existing) return error(res, 'A cancellation request is already pending', 409, 'ALREADY_PENDING');

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const [cancelReq] = await db('cancellation_requests').insert({
      order_id: order.id,
      requested_by: req.user.id,
      reason,
      status: 'pending',
      expires_at: expiresAt,
    }, ['*']);

    const otherPartyId = req.user.id === order.client_id ? order.freelancer_id : order.client_id;
    await notify({
      userId: otherPartyId,
      eventType: 'order.cancellation_requested',
      title: 'Cancellation requested',
      message: `The other party has requested to cancel the order. Reason: ${reason.slice(0, 100)}`,
      link: `/orders/${order.id}`,
      entityType: 'order',
      entityId: order.id,
      priority: 'high',
    });

    return success(res, cancelReq, 'Cancellation request submitted', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/cancel-respond ─────────────────────────────────────────
exports.respondCancellation = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    if (!isParty) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const cancelReq = await db('cancellation_requests')
      .where({ order_id: order.id, status: 'pending' })
      .first();
    if (!cancelReq) return error(res, 'No pending cancellation request', 404, 'NOT_FOUND');
    if (cancelReq.requested_by === req.user.id) {
      return error(res, 'Cannot respond to your own cancellation request', 400, 'INVALID_ACTION');
    }
    if (new Date() > new Date(cancelReq.expires_at)) {
      await db('cancellation_requests').where({ id: cancelReq.id }).update({ status: 'expired' });
      return error(res, 'Cancellation request has expired', 400, 'EXPIRED');
    }

    const { accept } = req.body;
    const now = new Date();

    await db.transaction(async (trx) => {
      await trx('cancellation_requests').where({ id: cancelReq.id }).update({
        status: accept ? 'accepted' : 'rejected',
        responded_by: req.user.id,
        responded_at: now,
      });

      if (accept) {
        await transition(trx, order, 'cancelled', req.user.id, 'user_action', 'Cancellation agreed by both parties');
        await trx('orders').where({ id: order.id }).update({ cancelled_at: now, cancellation_reason: cancelReq.reason });
        await refundFunds(trx, { order, triggeredBy: req.user.id, note: 'Mutual cancellation' });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'cancelled', cancelled_at: now });
        await trx('users').where({ id: order.freelancer_id }).increment({ jobs_cancelled: 1 });
        await adjustTrustScore(trx, order.freelancer_id, -5);

        for (const uid of [order.client_id, order.freelancer_id]) {
          await notify({
            userId: uid,
            eventType: 'order.cancelled',
            title: 'Order cancelled',
            message: 'The order has been cancelled. Funds will be refunded.',
            link: `/orders/${order.id}`,
            entityType: 'order',
            entityId: order.id,
            trx,
          });
        }
      } else {
        await notify({
          userId: cancelReq.requested_by,
          eventType: 'order.cancellation_rejected',
          title: 'Cancellation declined',
          message: 'The other party declined the cancellation request.',
          link: `/orders/${order.id}`,
          entityType: 'order',
          entityId: order.id,
          trx,
        });
      }
    });

    const updated = await db('orders').where({ id: order.id }).first();
    return success(res, updated, accept ? 'Order cancelled' : 'Cancellation declined');
  } catch (err) {
    next(err);
  }
};

// ── GET /orders/:id/deliveries ───────────────────────────────────────────────
exports.getDeliveries = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isParty && !isAdmin) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const deliveries = await db('deliveries')
      .where({ order_id: order.id })
      .orderBy('created_at', 'asc');

    const withAttachments = await Promise.all(deliveries.map(async (d) => {
      const attachments = await db('delivery_attachments').where({ delivery_id: d.id });
      return { ...d, attachments };
    }));

    return success(res, withAttachments);
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/request-extension ──────────────────────────────────────
exports.requestExtension = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.freelancer_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (!['in_progress', 'revision_requested'].includes(order.status)) {
      return error(res, 'Can only request extension for active orders', 400, 'INVALID_STATUS');
    }
    if (order.extension_count >= 3) return error(res, 'Maximum extensions (3) reached', 400, 'MAX_EXTENSIONS');

    const { new_deadline, reason } = req.body;
    if (!new_deadline || !reason) return error(res, 'new_deadline and reason are required', 400, 'VALIDATION_ERROR');
    if (new_deadline <= order.deadline) {
      return error(res, 'New deadline must be later than current deadline', 400, 'INVALID_DEADLINE');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [ext] = await db('deadline_extensions').insert({
      order_id: order.id,
      requested_by: req.user.id,
      original_deadline: order.deadline,
      requested_deadline: new_deadline,
      reason,
      status: 'pending',
      expires_at: expiresAt,
    }, ['*']);

    await notify({
      userId: order.client_id,
      eventType: 'extension.requested',
      title: 'Deadline extension requested',
      message: `The freelancer has requested a deadline extension to ${new_deadline}. Reason: ${reason.slice(0, 100)}`,
      link: `/orders/${order.id}`,
      entityType: 'order',
      entityId: order.id,
    });

    return success(res, ext, 'Extension request submitted', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /orders/:id/extensions/:ext_id/respond ──────────────────────────────
exports.respondExtension = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.client_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const ext = await db('deadline_extensions')
      .where({ id: req.params.ext_id, order_id: order.id, status: 'pending' })
      .first();
    if (!ext) return error(res, 'Extension request not found', 404, 'NOT_FOUND');
    if (new Date() > new Date(ext.expires_at)) {
      await db('deadline_extensions').where({ id: ext.id }).update({ status: 'expired' });
      return error(res, 'Extension request has expired', 400, 'EXPIRED');
    }

    const { accept } = req.body;
    const now = new Date();

    let updatedExt;
    await db.transaction(async (trx) => {
      const [updated] = await trx('deadline_extensions').where({ id: ext.id }).update({
        status: accept ? 'accepted' : 'rejected',
        responded_by: req.user.id,
        responded_at: now,
      }, ['*']);
      updatedExt = updated;

      if (accept) {
        await trx('orders').where({ id: order.id }).update({
          deadline: ext.requested_deadline,
          extension_count: order.extension_count + 1,
        });
      }

      await notify({
        userId: order.freelancer_id,
        eventType: accept ? 'extension.accepted' : 'extension.rejected',
        title: accept ? 'Extension approved' : 'Extension declined',
        message: accept
          ? `Your deadline extension to ${ext.requested_deadline} was approved.`
          : 'Your deadline extension request was declined.',
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        trx,
      });
    });

    const updatedOrder = await db('orders').where({ id: order.id }).first();
    return success(res, { extension: updatedExt, order: updatedOrder }, accept ? 'Extension accepted' : 'Extension rejected');
  } catch (err) {
    next(err);
  }
};

// ── Export completeOrder for use by background jobs ──────────────────────────
exports._completeOrder = completeOrder;
exports._transition = transition;
