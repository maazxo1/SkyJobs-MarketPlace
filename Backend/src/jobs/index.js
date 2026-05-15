const cron = require('node-cron');
const db = require('../config/database');
const { notify } = require('../utils/notify');
const { releaseFunds } = require('../utils/escrow');
const { recalcRating, adjustTrustScore } = require('../utils/trust');

// ── Auto-complete: every 15 minutes ──────────────────────────────────────────
cron.schedule('*/15 * * * *', async () => {
  try {
    const orders = await db('orders')
      .where('status', 'delivered')
      .where('auto_complete_at', '<=', new Date())
      .select('*');

    for (const order of orders) {
      await db.transaction(async (trx) => {
        const now = new Date();
        await trx('orders').where({ id: order.id }).update({
          status: 'completed', completed_at: now, auto_complete_at: null, updated_at: now,
        });
        await trx('order_status_history').insert({
          order_id: order.id, from_status: 'delivered', to_status: 'completed',
          triggered_by: null, trigger_type: 'system', note: 'Auto-completed after 3-day window',
        });
        await trx('deliveries')
          .where({ order_id: order.id, status: 'pending' })
          .orderBy('created_at', 'desc').limit(1)
          .update({ status: 'approved', reviewed_at: now });

        await releaseFunds(trx, { order, triggeredBy: null, note: 'Auto-complete' });
        await trx('contracts').where({ id: order.contract_id }).update({ status: 'completed', completed_at: now });
        await trx('users').where({ id: order.freelancer_id })
          .increment({ jobs_completed: 1, total_earned: order.freelancer_payout });
        await trx('users').where({ id: order.client_id }).increment({ total_spent: order.amount });

        if (!order.is_late) await adjustTrustScore(trx, order.freelancer_id, 5);

        for (const uid of [order.client_id, order.freelancer_id]) {
          await notify({
            userId: uid, eventType: 'order.auto_completed',
            title: 'Order auto-completed',
            message: 'The order was automatically completed. You have 14 days to leave a review.',
            link: `/orders/${order.id}`, entityType: 'order', entityId: order.id, trx,
          });
        }
      }).catch((e) => console.error(`[jobs] auto-complete order ${order.id}:`, e.message));
    }
  } catch (e) { console.error('[jobs] auto-complete scan:', e.message); }
});

// ── Deadline monitor: every 30 minutes ───────────────────────────────────────
cron.schedule('*/30 * * * *', async () => {
  try {
    const now = new Date();
    const orders = await db('orders')
      .whereIn('status', ['awaiting_start', 'in_progress', 'revision_requested'])
      .select('*');

    for (const order of orders) {
      const deadline = new Date(order.deadline);
      const hoursLeft = (deadline - now) / (1000 * 60 * 60);

      // Overdue
      if (hoursLeft < 0 && !order.is_late) {
        await db('orders').where({ id: order.id }).update({ is_late: true, late_flagged_at: now });
        await db('users').where({ id: order.freelancer_id }).increment({ late_delivery_count: 1 });
        await adjustTrustScore(null, order.freelancer_id, -10);

        for (const uid of [order.client_id, order.freelancer_id]) {
          await notify({
            userId: uid, eventType: 'deadline.overdue',
            title: 'Order is overdue',
            message: 'The delivery deadline has passed.',
            link: `/orders/${order.id}`, entityType: 'order', entityId: order.id, priority: 'urgent',
          });
        }
        const admins = await db('users').where({ role: 'admin' }).select('id');
        for (const a of admins) {
          await notify({
            userId: a.id, eventType: 'deadline.overdue',
            title: `Order #${order.id} overdue`,
            message: `Order #${order.id} is past its deadline.`,
            link: `/admin/orders/${order.id}`, entityType: 'order', entityId: order.id, priority: 'urgent',
          });
        }
        continue;
      }

      // 24h warning (between 23 and 25 hours remaining)
      if (hoursLeft >= 23 && hoursLeft <= 25) {
        await notify({
          userId: order.freelancer_id, eventType: 'deadline.24h_warning',
          title: 'Deadline in 24 hours',
          message: 'Your delivery deadline is in less than 24 hours.',
          link: `/orders/${order.id}`, entityType: 'order', entityId: order.id, priority: 'high',
        });
        continue;
      }

      // 72h warning (between 71 and 73 hours remaining)
      if (hoursLeft >= 71 && hoursLeft <= 73) {
        await notify({
          userId: order.freelancer_id, eventType: 'deadline.72h_warning',
          title: 'Deadline in 3 days',
          message: 'Your delivery deadline is in 3 days.',
          link: `/orders/${order.id}`, entityType: 'order', entityId: order.id,
        });
      }
    }
  } catch (e) { console.error('[jobs] deadline monitor:', e.message); }
});

// ── 3-day and 7-day overdue admin alerts: daily at 08:00 UTC ─────────────────
cron.schedule('0 8 * * *', async () => {
  try {
    const now = new Date();
    const day3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const terminalStatuses = ['completed', 'cancelled'];

    const overdue = await db('orders')
      .where('is_late', true)
      .whereNotIn('status', terminalStatuses)
      .select('*');

    const admins = await db('users').where({ role: 'admin' }).select('id');

    for (const order of overdue) {
      const deadline = new Date(order.deadline);

      if (deadline < day7) {
        for (const a of admins) {
          await notify({
            userId: a.id, eventType: 'deadline.7d_overdue',
            title: `Order #${order.id} — 7 days overdue`,
            message: `Order #${order.id} is 7+ days past its deadline. Requires immediate action.`,
            link: `/admin/orders/${order.id}`, entityType: 'order', entityId: order.id, priority: 'urgent',
          });
        }
      } else if (deadline < day3) {
        for (const a of admins) {
          await notify({
            userId: a.id, eventType: 'deadline.3d_overdue',
            title: `Order #${order.id} — 3 days overdue`,
            message: `Order #${order.id} is 3+ days past its deadline.`,
            link: `/admin/orders/${order.id}`, entityType: 'order', entityId: order.id, priority: 'high',
          });
        }
      }
    }
  } catch (e) { console.error('[jobs] overdue alerts:', e.message); }
});

// ── Job expiry: every hour ───────────────────────────────────────────────────
cron.schedule('5 * * * *', async () => {
  try {
    const expired = await db('jobs')
      .where('status', 'open')
      .where('expires_at', '<=', new Date())
      .select('*');

    for (const job of expired) {
      await db('jobs').where({ id: job.id }).update({ status: 'expired', auto_closed_at: new Date() });
      await notify({
        userId: job.client_id, eventType: 'job.expired',
        title: 'Job listing expired',
        message: `Your job listing "${job.title}" has expired. Reopen it to receive more proposals.`,
        link: `/jobs/${job.id}`, entityType: 'order', entityId: job.id,
      });
    }
  } catch (e) { console.error('[jobs] job expiry:', e.message); }
});

// ── Bid expiry: daily at midnight UTC ────────────────────────────────────────
cron.schedule('0 0 * * *', async () => {
  try {
    const expired = await db('bids')
      .where('status', 'pending')
      .where('expires_at', '<=', new Date())
      .select('*');

    for (const bid of expired) {
      await db('bids').where({ id: bid.id }).update({ status: 'expired' });

      const job = await db('jobs').where({ id: bid.job_id }).select('title').first();
      await notify({
        userId: bid.freelancer_id,
        eventType: 'bid.expired',
        title: 'Proposal expired',
        message: `Your proposal on "${job?.title}" has expired with no client response.`,
        link: `/jobs/${bid.job_id}`,
        entityType: 'bid',
        entityId: bid.id,
        priority: 'low',
      });
    }
  } catch (e) { console.error('[jobs] bid expiry:', e.message); }
});

// ── Payout clearance: daily at 02:00 UTC ─────────────────────────────────────
cron.schedule('0 2 * * *', async () => {
  try {
    const ready = await db('payouts')
      .where('status', 'pending_clearance')
      .where('available_at', '<=', new Date())
      .select('*');

    for (const p of ready) {
      await db('payouts').where({ id: p.id }).update({ status: 'available' });
      await notify({
        userId: p.freelancer_id, eventType: 'payout.available',
        title: 'Payment available',
        message: `$${p.amount} is now available for withdrawal.`,
        link: '/earnings', entityType: 'order', entityId: p.id,
      });
    }
  } catch (e) { console.error('[jobs] payout clearance:', e.message); }
});

// ── Review window expiry: daily at 06:00 UTC ─────────────────────────────────
cron.schedule('0 6 * * *', async () => {
  try {
    const closed = await db('reviews')
      .where('is_visible', false)
      .where('window_closes_at', '<=', new Date())
      .select('*');

    for (const review of closed) {
      await db.transaction(async (trx) => {
        await trx('reviews').where({ id: review.id }).update({ is_visible: true, revealed_at: new Date() });
        await recalcRating(trx, review.reviewee_id);
        const ratingDelta = { 5: 8, 4: 3, 3: 0, 2: -5, 1: -10 };
        await adjustTrustScore(trx, review.reviewee_id, ratingDelta[Number(review.rating)] ?? 0);
        await notify({
          userId: review.reviewee_id, eventType: 'review.revealed',
          title: 'Review now visible',
          message: 'A review has been published on your profile.',
          link: `/profile/${review.reviewee_id}`, entityType: 'order', entityId: review.order_id, trx,
        });
      }).catch((e) => console.error(`[jobs] review reveal ${review.id}:`, e.message));
    }
  } catch (e) { console.error('[jobs] review window expiry:', e.message); }
});

// ── Review 2-day warning: daily at 09:00 UTC ─────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  try {
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Orders completed ~12 days ago (window closes in ~2 days) with unreviewed users
    const orders = await db('orders')
      .where('status', 'completed')
      .whereNotNull('completed_at')
      .select('*');

    for (const order of orders) {
      const windowCloses = new Date(new Date(order.completed_at).getTime() + 14 * 24 * 60 * 60 * 1000);
      if (windowCloses < oneDayFromNow || windowCloses > twoDaysFromNow) continue;

      // Check who hasn't reviewed
      const reviews = await db('reviews').where({ order_id: order.id }).select('reviewer_id');
      const reviewerIds = new Set(reviews.map((r) => r.reviewer_id));

      for (const uid of [order.client_id, order.freelancer_id]) {
        if (!reviewerIds.has(uid)) {
          await notify({
            userId: uid, eventType: 'review.window_closing',
            title: 'Review window closing soon',
            message: 'Your review window closes in 2 days. Leave a review before it closes.',
            link: `/orders/${order.id}/review`, entityType: 'order', entityId: order.id, priority: 'low',
          });
        }
      }
    }
  } catch (e) { console.error('[jobs] review 2d warning:', e.message); }
});

// ── Dispute respondent deadline: every 30 minutes ────────────────────────────
cron.schedule('15 * * * *', async () => {
  try {
    const expired = await db('disputes')
      .where('status', 'open')
      .where('respondent_deadline', '<=', new Date())
      .select('*');

    for (const d of expired) {
      await db('disputes').where({ id: d.id }).update({ status: 'under_review', updated_at: new Date() });
      const admins = await db('users').where({ role: 'admin' }).select('id');
      for (const a of admins) {
        await notify({
          userId: a.id, eventType: 'dispute.no_response',
          title: `Dispute #${d.id} — no response`,
          message: 'Respondent did not respond within 72 hours. Auto-escalated.',
          link: `/admin/disputes/${d.id}`, entityType: 'dispute', entityId: d.id, priority: 'urgent',
        });
      }
    }
  } catch (e) { console.error('[jobs] dispute escalation:', e.message); }
});

// ── Cancellation request expiry: every 30 minutes ────────────────────────────
cron.schedule('25 * * * *', async () => {
  try {
    const expired = await db('cancellation_requests')
      .where('status', 'pending')
      .where('expires_at', '<=', new Date())
      .select('*');

    for (const r of expired) {
      await db('cancellation_requests').where({ id: r.id }).update({ status: 'rejected' });
    }
  } catch (e) { console.error('[jobs] cancellation expiry:', e.message); }
});

// ── Extension request expiry: every 30 minutes ───────────────────────────────
cron.schedule('35 * * * *', async () => {
  try {
    const expired = await db('deadline_extensions')
      .where('status', 'pending')
      .where('expires_at', '<=', new Date())
      .select('*');

    for (const e of expired) {
      await db('deadline_extensions').where({ id: e.id }).update({ status: 'rejected' });
      await notify({
        userId: e.requested_by, eventType: 'extension.rejected',
        title: 'Extension request expired',
        message: 'Your deadline extension request expired without a client response.',
        link: `/orders/${e.order_id}`, entityType: 'order', entityId: e.order_id,
      });
    }
  } catch (e) { console.error('[jobs] extension expiry:', e.message); }
});

// ── Trust score inactivity: weekly Monday 00:00 UTC ──────────────────────────
cron.schedule('0 0 * * 1', async () => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const inactive = await db('users')
      .where(function () { this.where('last_active_at', '<', cutoff).orWhereNull('last_active_at'); })
      .whereNotIn('trust_level', ['suspended'])
      .select('id', 'trust_score');

    for (const u of inactive) {
      await adjustTrustScore(null, u.id, -2);
    }
  } catch (e) { console.error('[jobs] trust inactivity:', e.message); }
});

// ── Trust auto-suspend: daily at 01:00 UTC ───────────────────────────────────
cron.schedule('0 1 * * *', async () => {
  try {
    const atRisk = await db('users')
      .where('trust_score', '<', 20)
      .whereNotIn('trust_level', ['suspended'])
      .select('id', 'trust_score');

    const admins = await db('users').where({ role: 'admin' }).select('id');

    for (const u of atRisk) {
      if (u.trust_score < 10) {
        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db('users').where({ id: u.id }).update({
          trust_level: 'suspended',
          suspended_at: new Date(),
          suspended_until: until,
          suspension_reason: 'Auto-suspended: trust score below 10',
        });
        await notify({
          userId: u.id, eventType: 'account.warning',
          title: 'Account auto-suspended',
          message: 'Your account has been suspended for 7 days due to low trust score.',
          priority: 'urgent',
        });
        for (const a of admins) {
          await notify({
            userId: a.id, eventType: 'account.warning',
            title: `User #${u.id} auto-suspended`,
            message: `User #${u.id} was auto-suspended (trust score: ${u.trust_score}).`,
            link: `/admin/users/${u.id}`, priority: 'high',
          });
        }
      } else {
        // Warn at < 20
        await notify({
          userId: u.id, eventType: 'account.warning',
          title: 'Account warning',
          message: `Your trust score is low (${u.trust_score}). Improve it to avoid suspension.`,
          priority: 'urgent',
        });
      }
    }
  } catch (e) { console.error('[jobs] trust auto-suspend:', e.message); }
});

// ── Stale notification cleanup: weekly Sunday 02:00 UTC ──────────────────────
cron.schedule('0 2 * * 0', async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { rowCount } = await db('notifications')
      .where('priority', 'low')
      .where('created_at', '<', cutoff)
      .delete();
    console.log(`[jobs] cleaned ${rowCount || 0} stale notifications`);
  } catch (e) { console.error('[jobs] stale notification cleanup:', e.message); }
});

console.log('[jobs] Background job scheduler started (12 cron jobs registered)');
