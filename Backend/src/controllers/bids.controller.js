const db = require('../config/database');
const { success, error } = require('../utils/response');
const { notify } = require('../utils/notify');
const { holdFunds, PLATFORM_FEE_RATE } = require('../utils/escrow');

exports.getMyBids = async (req, res, next) => {
  try {
    const bids = await db('bids')
      .join('jobs', 'bids.job_id', 'jobs.id')
      .join('users', 'jobs.client_id', 'users.id')
      .select(
        'bids.*',
        'jobs.title as job_title', 'jobs.budget_min', 'jobs.budget_max', 'jobs.status as job_status',
        'users.name as client_name'
      )
      .where('bids.freelancer_id', req.user.id)
      .orderBy('bids.created_at', 'desc');

    return success(res, bids);
  } catch (err) {
    next(err);
  }
};

exports.createBid = async (req, res, next) => {
  try {
    const { job_id, amount, delivery_days, cover_letter } = req.body;

    const job = await db('jobs').where({ id: job_id, status: 'open' }).first();
    if (!job) return error(res, 'Job not found or not accepting bids', 404, 'NOT_FOUND');
    if (job.client_id === req.user.id) return error(res, 'Cannot bid on your own job', 400, 'INVALID_ACTION');

    const existing = await db('bids').where({ job_id, freelancer_id: req.user.id }).first();
    if (existing) return error(res, 'You have already submitted a bid on this job', 409, 'ALREADY_BID');

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [bid] = await db('bids').insert(
      { job_id, freelancer_id: req.user.id, amount, delivery_days, cover_letter, status: 'pending', expires_at: expiresAt },
      ['*']
    );

    const freelancer = await db('users').where({ id: req.user.id }).select('name').first();
    await notify({
      userId: job.client_id,
      eventType: 'bid.submitted',
      title: 'New proposal received',
      message: `${freelancer.name} submitted a $${amount} proposal on "${job.title}"`,
      link: `/jobs/${job_id}`,
      entityType: 'bid',
      entityId: bid.id,
      priority: 'normal',
    });

    return success(res, bid, 'Bid submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateBid = async (req, res, next) => {
  try {
    const bid = await db('bids').where({ id: req.params.id, freelancer_id: req.user.id }).first();
    if (!bid) return error(res, 'Bid not found or unauthorized', 404, 'NOT_FOUND');
    if (bid.status !== 'pending') return error(res, 'Only pending bids can be updated', 400, 'INVALID_STATUS');

    const { amount, delivery_days, cover_letter } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (delivery_days !== undefined) updates.delivery_days = delivery_days;
    if (cover_letter !== undefined) updates.cover_letter = cover_letter;

    const [updated] = await db('bids').where({ id: req.params.id }).update(updates, ['*']);
    return success(res, updated, 'Bid updated successfully');
  } catch (err) {
    next(err);
  }
};

exports.withdrawBid = async (req, res, next) => {
  try {
    const bid = await db('bids').where({ id: req.params.id, freelancer_id: req.user.id }).first();
    if (!bid) return error(res, 'Bid not found or unauthorized', 404, 'NOT_FOUND');
    if (bid.status !== 'pending') return error(res, 'Only pending bids can be withdrawn', 400, 'INVALID_STATUS');

    const { reason } = req.body;
    await db('bids').where({ id: req.params.id }).update({ status: 'withdrawn', withdrawn_reason: reason || null });
    return success(res, null, 'Bid withdrawn successfully');
  } catch (err) {
    next(err);
  }
};

exports.acceptBid = async (req, res, next) => {
  try {
    const bid = await db('bids')
      .join('jobs', 'bids.job_id', 'jobs.id')
      .select(
        'bids.*',
        'jobs.client_id', 'jobs.title as job_title',
        'jobs.description as job_description',
        'jobs.deadline as job_deadline',
        'jobs.status as job_status',
      )
      .where('bids.id', req.params.id)
      .first();

    if (!bid) return error(res, 'Bid not found', 404, 'NOT_FOUND');
    if (bid.client_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (bid.status !== 'pending') return error(res, 'Only pending bids can be accepted', 400, 'INVALID_STATUS');
    if (bid.job_status !== 'open') return error(res, 'Job is no longer accepting bids', 400, 'JOB_CLOSED');
    if (bid.expires_at && new Date() > new Date(bid.expires_at)) {
      await db('bids').where({ id: bid.id }).update({ status: 'expired' });
      return error(res, 'This proposal has expired', 400, 'BID_EXPIRED');
    }

    const platformFee = parseFloat((bid.amount * PLATFORM_FEE_RATE).toFixed(2));
    const freelancerPayout = parseFloat((bid.amount - platformFee).toFixed(2));

    // Deadline = today + delivery_days
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + bid.delivery_days);
    const deadlineStr = deadline.toISOString().slice(0, 10);

    let contract, order;

    await db.transaction(async (trx) => {
      // 1. Accept this bid
      await trx('bids').where({ id: bid.id }).update({ status: 'accepted' });

      // 2. Close the job
      await trx('jobs').where({ id: bid.job_id }).update({ status: 'closed' });

      // 3. Reject all other pending bids (get their IDs for notifications)
      const rejectedBids = await trx('bids')
        .where({ job_id: bid.job_id, status: 'pending' })
        .whereNot({ id: bid.id })
        .select('id', 'freelancer_id');

      if (rejectedBids.length > 0) {
        await trx('bids')
          .whereIn('id', rejectedBids.map((b) => b.id))
          .update({ status: 'rejected' });
      }

      // 4. Create contract (snapshot of job + bid terms)
      const [c] = await trx('contracts').insert({
        job_id: bid.job_id,
        bid_id: bid.id,
        client_id: req.user.id,
        freelancer_id: bid.freelancer_id,
        title: bid.job_title,
        scope: bid.job_description,
        amount: bid.amount,
        delivery_days: bid.delivery_days,
        deadline: deadlineStr,
        revision_limit: 2,
        terms_version: '1.0',
        signed_at: new Date(),
        status: 'active',
      }, ['*']);
      contract = c;

      // 5. Create order
      const [o] = await trx('orders').insert({
        contract_id: contract.id,
        job_id: bid.job_id,
        bid_id: bid.id,
        client_id: req.user.id,
        freelancer_id: bid.freelancer_id,
        status: 'awaiting_start',
        amount: bid.amount,
        platform_fee: platformFee,
        freelancer_payout: freelancerPayout,
        escrow_status: 'held',
        deadline: deadlineStr,
        max_revisions: 2,
      }, ['*']);
      order = o;

      // 6. Link order back to contract
      await trx('contracts').where({ id: contract.id }).update({ order_id: order.id });

      // 7. Escrow hold
      await holdFunds(trx, { orderId: order.id, amount: bid.amount, triggeredBy: req.user.id });

      // 8. Initial status history entry
      await trx('order_status_history').insert({
        order_id: order.id,
        from_status: null,
        to_status: 'awaiting_start',
        triggered_by: req.user.id,
        trigger_type: 'user_action',
        note: 'Bid accepted — order created',
      });

      // 9. Notify winning freelancer
      await notify({
        userId: bid.freelancer_id,
        eventType: 'bid.accepted',
        title: 'Your proposal was accepted!',
        message: `Your $${bid.amount} proposal on "${bid.job_title}" was accepted. Start work when ready.`,
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        priority: 'high',
        trx,
      });

      // 10. Notify client
      await notify({
        userId: req.user.id,
        eventType: 'contract.created',
        title: 'Contract created',
        message: `Your contract with the freelancer for "${bid.job_title}" is now active. Waiting for them to start work.`,
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        priority: 'high',
        trx,
      });

      // 11. Notify auto-rejected freelancers
      for (const rejected of rejectedBids) {
        await notify({
          userId: rejected.freelancer_id,
          eventType: 'bid.auto_rejected',
          title: 'Position filled',
          message: `The position for "${bid.job_title}" has been filled. Thank you for your proposal.`,
          link: `/jobs/${bid.job_id}`,
          entityType: 'bid',
          entityId: rejected.id,
          priority: 'normal',
          trx,
        });
      }
    });

    return success(res, { contract, order }, 'Bid accepted — order and contract created', 201);
  } catch (err) {
    next(err);
  }
};

exports.rejectBid = async (req, res, next) => {
  try {
    const bid = await db('bids')
      .join('jobs', 'bids.job_id', 'jobs.id')
      .select('bids.*', 'jobs.client_id', 'jobs.title as job_title')
      .where('bids.id', req.params.id)
      .first();

    if (!bid) return error(res, 'Bid not found', 404, 'NOT_FOUND');
    if (bid.client_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (bid.status !== 'pending') return error(res, 'Only pending bids can be rejected', 400, 'INVALID_STATUS');

    await db('bids').where({ id: req.params.id }).update({
      status: 'rejected',
      rejection_reason: req.body.reason || null,
    });

    await notify({
      userId: bid.freelancer_id,
      eventType: 'bid.rejected',
      title: 'Proposal not selected',
      message: `Your proposal on "${bid.job_title}" was not selected. Keep applying!`,
      link: `/jobs/${bid.job_id}`,
      entityType: 'bid',
      entityId: bid.id,
    });

    return success(res, null, 'Bid rejected');
  } catch (err) {
    next(err);
  }
};

exports.sendCounter = async (req, res, next) => {
  try {
    const bid = await db('bids')
      .join('jobs', 'bids.job_id', 'jobs.id')
      .select('bids.*', 'jobs.client_id', 'jobs.title as job_title', 'jobs.budget_min', 'jobs.budget_max')
      .where('bids.id', req.params.id)
      .first();

    if (!bid) return error(res, 'Bid not found', 404, 'NOT_FOUND');
    if (bid.client_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (bid.status !== 'pending') return error(res, 'Can only counter a pending bid', 400, 'INVALID_STATUS');
    if (bid.counter_status === 'pending') return error(res, 'A pending counter-offer already exists', 409, 'COUNTER_EXISTS');

    const { amount, delivery_days, message } = req.body;
    if (!amount || amount <= 0) return error(res, 'Counter amount must be a positive number', 400, 'VALIDATION_ERROR');
    if (amount < bid.budget_min || amount > bid.budget_max) {
      return error(res, `Counter amount must be within the job budget ($${bid.budget_min}–$${bid.budget_max})`, 400, 'VALIDATION_ERROR');
    }
    if (!delivery_days || delivery_days < 1) return error(res, 'Delivery days must be at least 1', 400, 'VALIDATION_ERROR');
    if (message && message.length > 1000) return error(res, 'Message must be under 1000 characters', 400, 'VALIDATION_ERROR');
    const [updated] = await db('bids').where({ id: bid.id }).update({
      counter_amount: amount,
      counter_days: delivery_days,
      counter_message: message || null,
      counter_status: 'pending',
    }, ['*']);

    await notify({
      userId: bid.freelancer_id,
      eventType: 'bid.counter_sent',
      title: 'Counter-offer received',
      message: `The client sent a counter-offer of $${amount} for "${bid.job_title}"`,
      link: `/bids/${bid.id}`,
      entityType: 'bid',
      entityId: bid.id,
    });

    return success(res, updated, 'Counter-offer sent');
  } catch (err) {
    next(err);
  }
};

exports.respondToCounter = async (req, res, next) => {
  try {
    const bid = await db('bids')
      .join('jobs', 'bids.job_id', 'jobs.id')
      .select('bids.*', 'jobs.client_id', 'jobs.title as job_title', 'jobs.description as job_description', 'jobs.status as job_status')
      .where('bids.id', req.params.id)
      .first();

    if (!bid) return error(res, 'Bid not found', 404, 'NOT_FOUND');
    if (bid.freelancer_id !== req.user.id) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (bid.counter_status !== 'pending') return error(res, 'No pending counter-offer', 400, 'NO_COUNTER');

    const { accept } = req.body;

    if (!accept) {
      const [updated] = await db('bids').where({ id: bid.id }).update({ counter_status: 'rejected' }, ['*']);
      await notify({
        userId: bid.client_id,
        eventType: 'bid.counter_rejected',
        title: 'Counter-offer declined',
        message: `The freelancer declined your counter-offer on "${bid.job_title}"`,
        link: `/jobs/${bid.job_id}`,
        entityType: 'bid',
        entityId: bid.id,
      });
      return success(res, updated, 'Counter-offer rejected');
    }

    // Accept: use counter terms to accept the bid
    if (bid.job_status !== 'open') return error(res, 'Job is no longer open', 400, 'JOB_CLOSED');

    // Mutate bid with counter terms then call acceptBid logic inline
    req.params.id = bid.id;
    req.body = {}; // acceptBid reads from DB, not body

    // Override bid amount and days for the accept flow
    const platformFee = parseFloat((bid.counter_amount * PLATFORM_FEE_RATE).toFixed(2));
    const freelancerPayout = parseFloat((bid.counter_amount - platformFee).toFixed(2));
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + bid.counter_days);
    const deadlineStr = deadline.toISOString().slice(0, 10);

    let contract, order;

    await db.transaction(async (trx) => {
      await trx('bids').where({ id: bid.id }).update({ status: 'accepted', counter_status: 'accepted' });
      await trx('jobs').where({ id: bid.job_id }).update({ status: 'closed' });

      const rejectedBids = await trx('bids')
        .where({ job_id: bid.job_id, status: 'pending' })
        .whereNot({ id: bid.id })
        .select('id', 'freelancer_id');

      if (rejectedBids.length > 0) {
        await trx('bids')
          .whereIn('id', rejectedBids.map((b) => b.id))
          .update({ status: 'rejected' });
      }

      const [c] = await trx('contracts').insert({
        job_id: bid.job_id,
        bid_id: bid.id,
        client_id: bid.client_id,
        freelancer_id: bid.freelancer_id,
        title: bid.job_title,
        scope: bid.job_description,
        amount: bid.counter_amount,
        delivery_days: bid.counter_days,
        deadline: deadlineStr,
        revision_limit: 2,
        terms_version: '1.0',
        signed_at: new Date(),
        status: 'active',
      }, ['*']);
      contract = c;

      const [o] = await trx('orders').insert({
        contract_id: contract.id,
        job_id: bid.job_id,
        bid_id: bid.id,
        client_id: bid.client_id,
        freelancer_id: bid.freelancer_id,
        status: 'awaiting_start',
        amount: bid.counter_amount,
        platform_fee: platformFee,
        freelancer_payout: freelancerPayout,
        escrow_status: 'held',
        deadline: deadlineStr,
        max_revisions: 2,
      }, ['*']);
      order = o;

      await trx('contracts').where({ id: contract.id }).update({ order_id: order.id });
      await holdFunds(trx, { orderId: order.id, amount: bid.counter_amount, triggeredBy: bid.freelancer_id });

      await trx('order_status_history').insert({
        order_id: order.id,
        from_status: null,
        to_status: 'awaiting_start',
        triggered_by: bid.freelancer_id,
        trigger_type: 'user_action',
        note: 'Counter-offer accepted — order created',
      });

      await notify({
        userId: bid.client_id,
        eventType: 'bid.counter_accepted',
        title: 'Counter-offer accepted',
        message: `The freelancer accepted your counter-offer for "${bid.job_title}". Contract is now active.`,
        link: `/orders/${order.id}`,
        entityType: 'order',
        entityId: order.id,
        priority: 'high',
        trx,
      });
    });

    return success(res, { contract, order }, 'Counter-offer accepted — order created', 201);
  } catch (err) {
    next(err);
  }
};
