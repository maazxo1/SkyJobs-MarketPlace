const db = require('../config/database');
const { success, error } = require('../utils/response');
const { notify } = require('../utils/notify');
const { releaseFunds, refundFunds, splitFunds } = require('../utils/escrow');
const { adjustTrustScore } = require('../utils/trust');
const { _transition: transition } = require('./orders.controller');

const DISPUTE_ELIGIBLE = {
  client: ['in_progress', 'delivered'],
  freelancer: ['in_progress', 'revision_requested'],
};

// ── POST /orders/:id/dispute ─────────────────────────────────────────────────
exports.openDispute = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const isClient = order.client_id === req.user.id;
    const isFreelancer = order.freelancer_id === req.user.id;
    if (!isClient && !isFreelancer) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const role = isClient ? 'client' : 'freelancer';
    if (!DISPUTE_ELIGIBLE[role].includes(order.status)) {
      return error(res, `You cannot open a dispute in order status: ${order.status}`, 400, 'INVALID_STATUS');
    }

    const existingDispute = await db('disputes')
      .where({ order_id: order.id })
      .whereIn('status', ['open', 'under_review'])
      .first();
    if (existingDispute) return error(res, 'A dispute is already open for this order', 409, 'DISPUTE_EXISTS');

    const { reason, description } = req.body;
    const validReasons = ['non_delivery', 'quality_issues', 'scope_creep', 'payment_withheld', 'communication_breakdown', 'other'];
    if (!validReasons.includes(reason)) return error(res, 'Invalid dispute reason', 400, 'VALIDATION_ERROR');
    if (!description) return error(res, 'Description is required', 400, 'VALIDATION_ERROR');

    const respondentId = isClient ? order.freelancer_id : order.client_id;
    const respondentDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

    let dispute;
    await db.transaction(async (trx) => {
      const [d] = await trx('disputes').insert({
        order_id: order.id,
        contract_id: order.contract_id,
        opened_by: req.user.id,
        respondent_id: respondentId,
        reason,
        description,
        status: 'open',
        respondent_deadline: respondentDeadline,
      }, ['*']);
      dispute = d;

      await trx('orders').where({ id: order.id }).update({ dispute_id: d.id });
      await transition(trx, order, 'in_dispute', req.user.id, 'user_action', `Dispute opened: ${reason}`);

      // -5 trust for the respondent (dispute opened against them)
      await adjustTrustScore(trx, respondentId, -5);
      await trx('users').where({ id: respondentId }).increment({ dispute_count: 1 });

      await notify({
        userId: respondentId,
        eventType: 'dispute.opened',
        title: 'Dispute opened',
        message: `A dispute has been opened. Reason: ${reason}. You have 72 hours to respond.`,
        link: `/disputes/${d.id}`,
        entityType: 'dispute',
        entityId: d.id,
        priority: 'urgent',
        trx,
      });

      // Notify all admins
      const admins = await trx('users').where({ role: 'admin' }).select('id');
      for (const admin of admins) {
        await notify({
          userId: admin.id,
          eventType: 'dispute.opened',
          title: 'New dispute opened',
          message: `A new dispute (order #${order.id}) requires admin attention.`,
          link: `/admin/disputes/${d.id}`,
          entityType: 'dispute',
          entityId: d.id,
          priority: 'urgent',
          trx,
        });
      }
    });

    return success(res, { dispute, order: await db('orders').where({ id: order.id }).first() }, 'Dispute opened', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /disputes/:id/respond ───────────────────────────────────────────────
exports.respondToDispute = async (req, res, next) => {
  try {
    const dispute = await db('disputes').where({ id: req.params.id }).first();
    if (!dispute) return error(res, 'Dispute not found', 404, 'NOT_FOUND');
    if (dispute.respondent_id !== req.user.id) return error(res, 'Only the respondent can respond', 403, 'FORBIDDEN');
    if (dispute.status !== 'open') return error(res, 'Dispute is no longer open', 400, 'INVALID_STATUS');
    if (dispute.respondent_deadline && new Date() > new Date(dispute.respondent_deadline)) {
      return error(res, 'Response deadline has passed', 400, 'DEADLINE_PASSED');
    }

    const { description } = req.body;
    if (!description) return error(res, 'Response description is required', 400, 'VALIDATION_ERROR');
    if (description.length > 5000) return error(res, 'Response must be under 5000 characters', 400, 'VALIDATION_ERROR');

    await db.transaction(async (trx) => {
      await trx('disputes').where({ id: dispute.id }).update({ status: 'under_review', updated_at: new Date() });

      await trx('dispute_messages').insert({
        dispute_id: dispute.id,
        sender_id: req.user.id,
        message: description,
        is_admin: false,
      });

      // Notify admins
      const admins = await trx('users').where({ role: 'admin' }).select('id');
      for (const admin of admins) {
        await notify({
          userId: admin.id,
          eventType: 'dispute.response_received',
          title: 'Dispute response submitted',
          message: `Respondent submitted a response on dispute #${dispute.id}.`,
          link: `/admin/disputes/${dispute.id}`,
          entityType: 'dispute',
          entityId: dispute.id,
          priority: 'high',
          trx,
        });
      }
    });

    return success(res, await db('disputes').where({ id: dispute.id }).first(), 'Response submitted');
  } catch (err) {
    next(err);
  }
};

// ── POST /disputes/:id/evidence ──────────────────────────────────────────────
exports.submitEvidence = async (req, res, next) => {
  try {
    const dispute = await db('disputes').where({ id: req.params.id }).first();
    if (!dispute) return error(res, 'Dispute not found', 404, 'NOT_FOUND');

    const order = await db('orders').where({ id: dispute.order_id }).first();
    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    if (!isParty && req.user.role !== 'admin') return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (!['open', 'under_review'].includes(dispute.status)) {
      return error(res, 'Cannot submit evidence for a resolved dispute', 400, 'INVALID_STATUS');
    }

    const { type, content, filename } = req.body;
    const validTypes = ['message_history', 'file', 'screenshot', 'text'];
    if (!validTypes.includes(type)) return error(res, 'Invalid evidence type', 400, 'VALIDATION_ERROR');
    if (!content) return error(res, 'Evidence content is required', 400, 'VALIDATION_ERROR');
    if (content.length > 10000) return error(res, 'Evidence content must be under 10000 characters', 400, 'VALIDATION_ERROR');

    const [evidence] = await db('dispute_evidence').insert({
      dispute_id: dispute.id,
      submitted_by: req.user.id,
      type,
      content,
      filename: filename || null,
    }, ['*']);

    return success(res, evidence, 'Evidence submitted', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /disputes/:id/withdraw ──────────────────────────────────────────────
exports.withdrawDispute = async (req, res, next) => {
  try {
    const dispute = await db('disputes').where({ id: req.params.id }).first();
    if (!dispute) return error(res, 'Dispute not found', 404, 'NOT_FOUND');
    if (dispute.opened_by !== req.user.id) return error(res, 'Only the opener can withdraw', 403, 'FORBIDDEN');
    if (dispute.status !== 'open') return error(res, 'Can only withdraw an open dispute', 400, 'INVALID_STATUS');

    const order = await db('orders').where({ id: dispute.order_id }).first();

    await db.transaction(async (trx) => {
      await trx('disputes').where({ id: dispute.id }).update({ status: 'withdrawn', updated_at: new Date() });
      await trx('orders').where({ id: order.id }).update({ dispute_id: null });

      // Restore the status the order had before the dispute was opened
      const prevHistory = await trx('order_status_history')
        .where({ order_id: order.id })
        .whereNot('new_status', 'in_dispute')
        .orderBy('created_at', 'desc')
        .first();
      const restoreStatus = prevHistory?.new_status || 'in_progress';
      await transition(trx, order, restoreStatus, req.user.id, 'user_action', 'Dispute withdrawn — order resumed');

      await notify({
        userId: dispute.respondent_id,
        eventType: 'dispute.withdrawn',
        title: 'Dispute withdrawn',
        message: 'The other party has withdrawn the dispute. Order is resuming.',
        link: `/orders/${order.id}`,
        entityType: 'dispute',
        entityId: dispute.id,
        trx,
      });
    });

    return success(res, null, 'Dispute withdrawn');
  } catch (err) {
    next(err);
  }
};

// ── GET /disputes/:id ────────────────────────────────────────────────────────
exports.getDispute = async (req, res, next) => {
  try {
    const dispute = await db('disputes').where({ id: req.params.id }).first();
    if (!dispute) return error(res, 'Dispute not found', 404, 'NOT_FOUND');

    const order = await db('orders')
      .join('users as client',     'orders.client_id',     'client.id')
      .join('users as freelancer', 'orders.freelancer_id', 'freelancer.id')
      .leftJoin('jobs',            'orders.job_id',        'jobs.id')
      .select(
        'orders.*',
        'client.name as client_name',
        'freelancer.name as freelancer_name',
        'jobs.title as job_title',
      )
      .where('orders.id', dispute.order_id)
      .first();
    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    if (!isParty && req.user.role !== 'admin') return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const [evidence, messages] = await Promise.all([
      db('dispute_evidence').where({ dispute_id: dispute.id }).orderBy('created_at', 'asc'),
      db('dispute_messages')
        .join('users', 'dispute_messages.sender_id', 'users.id')
        .select('dispute_messages.*', 'users.name as sender_name', 'users.avatar as sender_avatar')
        .where('dispute_messages.dispute_id', dispute.id)
        .orderBy('dispute_messages.created_at', 'asc'),
    ]);

    return success(res, { ...dispute, evidence, messages, order });
  } catch (err) {
    next(err);
  }
};

// ── POST /admin/disputes/:id/resolve ─────────────────────────────────────────
exports.adminResolve = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const dispute = await db('disputes').where({ id: req.params.id }).first();
    if (!dispute) return error(res, 'Dispute not found', 404, 'NOT_FOUND');
    if (dispute.status !== 'under_review' && dispute.status !== 'open') {
      return error(res, 'Dispute is not pending resolution', 400, 'INVALID_STATUS');
    }

    const { resolution, split_client_pct, resolution_note } = req.body;
    const validResolutions = ['release_to_freelancer', 'refund_to_client', 'partial_split'];
    if (!validResolutions.includes(resolution)) return error(res, 'Invalid resolution', 400, 'VALIDATION_ERROR');
    if (!resolution_note) return error(res, 'Resolution note is required', 400, 'VALIDATION_ERROR');
    if (resolution === 'partial_split' && (split_client_pct == null || split_client_pct < 0 || split_client_pct > 100)) {
      return error(res, 'split_client_pct must be 0-100 for partial split', 400, 'VALIDATION_ERROR');
    }

    const order = await db('orders').where({ id: dispute.order_id }).first();
    if (order.escrow_status !== 'held') {
      return error(res, 'Escrow funds are not held — cannot resolve dispute', 400, 'ESCROW_NOT_HELD');
    }
    const now = new Date();

    await db.transaction(async (trx) => {
      await trx('disputes').where({ id: dispute.id }).update({
        status: 'resolved',
        resolution,
        split_client_pct: split_client_pct || null,
        resolved_by: req.user.id,
        resolved_at: now,
        resolution_note,
        updated_at: now,
      });

      if (resolution === 'release_to_freelancer') {
        await releaseFunds(trx, { order, triggeredBy: req.user.id, note: `Admin: ${resolution_note}` });
        await transition(trx, order, 'completed', req.user.id, 'admin', 'Admin resolved dispute in favour of freelancer');
        await trx('orders').where({ id: order.id }).update({ completed_at: now, dispute_id: null });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'completed', completed_at: now });
        await trx('users').where({ id: order.freelancer_id }).increment({ jobs_completed: 1, total_earned: order.freelancer_payout });

      } else if (resolution === 'refund_to_client') {
        await refundFunds(trx, { order, triggeredBy: req.user.id, note: `Admin: ${resolution_note}` });
        await transition(trx, order, 'cancelled', req.user.id, 'admin', 'Admin resolved dispute in favour of client');
        await trx('orders').where({ id: order.id }).update({ cancelled_at: now, dispute_id: null });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'cancelled', cancelled_at: now });
        // -15 for dispute loss, track loss count
        await adjustTrustScore(trx, order.freelancer_id, -15);
        await trx('users').where({ id: order.freelancer_id }).increment({ dispute_loss_count: 1 });

      } else {
        await splitFunds(trx, { order, clientPct: split_client_pct, triggeredBy: req.user.id, note: `Admin: ${resolution_note}` });
        await transition(trx, order, 'completed', req.user.id, 'admin', `Admin split: ${split_client_pct}% to client`);
        await trx('orders').where({ id: order.id }).update({ completed_at: now, dispute_id: null });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'completed', completed_at: now });
      }

      // Trust score: +10 for winner, already -15 applied at dispute open for respondent
      if (resolution === 'release_to_freelancer') {
        await adjustTrustScore(trx, order.freelancer_id, 10);
      } else if (resolution === 'refund_to_client') {
        await adjustTrustScore(trx, order.client_id, 10);
      }

      // Audit log
      await trx('audit_logs').insert({
        actor_id: req.user.id,
        actor_role: 'admin',
        action: 'dispute.resolve',
        entity_type: 'dispute',
        entity_id: dispute.id,
        after: JSON.stringify({ resolution, split_client_pct, resolution_note }),
        note: resolution_note,
      });

      for (const uid of [order.client_id, order.freelancer_id]) {
        await notify({
          userId: uid,
          eventType: 'dispute.resolved',
          title: 'Dispute resolved',
          message: `Admin has resolved the dispute. Decision: ${resolution.replace(/_/g, ' ')}. Note: ${resolution_note.slice(0, 100)}`,
          link: `/orders/${order.id}`,
          entityType: 'dispute',
          entityId: dispute.id,
          priority: 'high',
          trx,
        });
      }
    });

    return success(res, await db('disputes').where({ id: dispute.id }).first(), 'Dispute resolved');
  } catch (err) {
    next(err);
  }
};

// ── POST /disputes/:id/messages ──────────────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const dispute = await db('disputes').where({ id: req.params.id }).first();
    if (!dispute) return error(res, 'Dispute not found', 404, 'NOT_FOUND');

    const order = await db('orders').where({ id: dispute.order_id }).first();
    const isParty = order.client_id === req.user.id || order.freelancer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isParty && !isAdmin) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (!['open', 'under_review'].includes(dispute.status)) {
      return error(res, 'Cannot message on a closed dispute', 400, 'INVALID_STATUS');
    }

    const { message } = req.body;
    if (!message) return error(res, 'Message is required', 400, 'VALIDATION_ERROR');
    if (message.length > 5000) return error(res, 'Message must be under 5000 characters', 400, 'VALIDATION_ERROR');

    const [msg] = await db('dispute_messages').insert({
      dispute_id: dispute.id,
      sender_id: req.user.id,
      message,
      is_admin: isAdmin,
    }, ['*']);

    return success(res, msg, 'Message sent', 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/disputes ──────────────────────────────────────────────────────
exports.adminListDisputes = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('disputes')
      .join('orders', 'disputes.order_id', 'orders.id')
      .join('users as opener', 'disputes.opened_by', 'opener.id')
      .join('users as respondent', 'disputes.respondent_id', 'respondent.id')
      .select(
        'disputes.*',
        'opener.name as opener_name',
        'respondent.name as respondent_name',
        'orders.amount as order_amount',
      );

    if (status) query = query.where('disputes.status', status);

    let countQuery = db('disputes');
    if (status) countQuery = countQuery.where('disputes.status', status);
    const [{ count }] = await countQuery.count('id as count');
    const disputes = await query.orderBy('disputes.created_at', 'asc').limit(parseInt(limit, 10)).offset(offset);

    return success(res, disputes, 'Success', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: parseInt(count, 10),
    });
  } catch (err) {
    next(err);
  }
};
