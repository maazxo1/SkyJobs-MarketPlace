const db = require('../config/database');
const { success, error } = require('../utils/response');
const { notify } = require('../utils/notify');
const { recalcRating, adjustTrustScore } = require('../utils/trust');

// ── POST /orders/:id/review ──────────────────────────────────────────────────
exports.createReview = async (req, res, next) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    if (order.status !== 'completed') return error(res, 'Order must be completed before reviewing', 400, 'NOT_COMPLETED');

    const isClient = order.client_id === req.user.id;
    const isFreelancer = order.freelancer_id === req.user.id;
    if (!isClient && !isFreelancer) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const role = isClient ? 'client_to_freelancer' : 'freelancer_to_client';
    const revieweeId = isClient ? order.freelancer_id : order.client_id;

    const existing = await db('reviews').where({ order_id: order.id, reviewer_id: req.user.id }).first();
    if (existing) return error(res, 'You have already reviewed this order', 409, 'ALREADY_REVIEWED');

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return error(res, 'Rating must be 1-5', 400, 'VALIDATION_ERROR');

    // Check review window
    const contract = await db('contracts').where({ id: order.contract_id }).first();
    const windowCloses = new Date(new Date(order.completed_at).getTime() + 14 * 24 * 60 * 60 * 1000);
    if (new Date() > windowCloses) {
      return error(res, 'Review window has closed (14 days after completion)', 400, 'WINDOW_CLOSED');
    }

    let review;
    await db.transaction(async (trx) => {
      const [r] = await trx('reviews').insert({
        order_id: order.id,
        contract_id: order.contract_id,
        reviewer_id: req.user.id,
        reviewee_id: revieweeId,
        role,
        rating: Number(rating),
        comment: comment || null,
        is_visible: false,
        window_closes_at: windowCloses,
      }, ['*']);
      review = r;

      // Check if counterpart has also submitted
      const counterRole = isClient ? 'freelancer_to_client' : 'client_to_freelancer';
      const counterReview = await trx('reviews')
        .where({ order_id: order.id, role: counterRole })
        .first();

      if (counterReview) {
        // Both submitted — reveal both
        const now = new Date();
        await trx('reviews')
          .whereIn('id', [r.id, counterReview.id])
          .update({ is_visible: true, revealed_at: now });

        // Update rating stats and trust scores for both reviewees
        await recalcRating(trx, revieweeId);
        await recalcRating(trx, req.user.id);

        // Apply trust score delta based on star rating received
        const ratingTrustDelta = { 5: 8, 4: 3, 3: 0, 2: -5, 1: -10 };
        await adjustTrustScore(trx, revieweeId, ratingTrustDelta[Number(rating)] ?? 0);
        // Also adjust for the counter-reviewer's reviewee
        await adjustTrustScore(trx, req.user.id, ratingTrustDelta[Number(counterReview.rating)] ?? 0);

        for (const uid of [order.client_id, order.freelancer_id]) {
          await notify({
            userId: uid,
            eventType: 'review.revealed',
            title: 'Reviews are now visible',
            message: 'Both parties have submitted reviews. They are now public.',
            link: `/orders/${order.id}`,
            entityType: 'order',
            entityId: order.id,
            priority: 'normal',
            trx,
          });
        }
      }
    });

    return success(res, review, 'Review submitted', 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /reviews?user_id= ────────────────────────────────────────────────────
exports.getReviews = async (req, res, next) => {
  try {
    const user_id = req.query.user_id || req.params.user_id || req.params.id;
    if (!user_id) return error(res, 'user_id is required', 400);

    const reviews = await db('reviews as r')
      .join('users as reviewer', 'r.reviewer_id', 'reviewer.id')
      .join('orders as o', 'r.order_id', 'o.id')
      .join('jobs as j', 'o.job_id', 'j.id')
      .where('r.reviewee_id', user_id)
      .where('r.is_visible', true)
      .select(
        'r.id', 'r.rating', 'r.comment', 'r.role', 'r.created_at',
        'reviewer.id as reviewer_id',
        'reviewer.name as reviewer_name',
        'reviewer.role as reviewer_role',
        'j.title as job_title',
      )
      .orderBy('r.created_at', 'desc');

    const avgRow = await db('reviews')
      .where({ reviewee_id: user_id, is_visible: true })
      .avg('rating as avg')
      .first();
    const avg_rating = avgRow?.avg ? Number(Number(avgRow.avg).toFixed(1)) : null;

    return success(res, { reviews, avg_rating, total: reviews.length });
  } catch (err) {
    next(err);
  }
};
