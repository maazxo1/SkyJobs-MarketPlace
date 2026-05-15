const db = require('../config/database');
const { success, error } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const { adjustTrustScore } = require('../utils/trust');

// ── Compute profile completeness score 0-100 ────────────────────────────────
async function computeProfileScore(userId) {
  const user = await db('users').where({ id: userId }).first();
  const fp = user.role === 'freelancer'
    ? await db('freelancer_profiles').where({ user_id: userId }).first()
    : null;

  let score = 0;
  if (user.name && user.email) score += 20;
  if (user.bio && user.bio.length >= 100) score += 15;
  if (user.avatar) score += 15;
  if (fp) {
    const skills = Array.isArray(fp.skills) ? fp.skills : JSON.parse(fp.skills || '[]');
    if (skills.length >= 3) score += 15;
    if (fp.hourly_rate) score += 10;
    if (fp.portfolio_url) score += 10;
  }
  if (user.jobs_completed >= 1) score += 15;

  const previousScore = user.profile_complete_score || 0;
  await db('users').where({ id: userId }).update({ profile_complete_score: score });

  // Award one-time trust bonus when reaching 100
  if (previousScore < 100 && score === 100) {
    await adjustTrustScore(null, userId, 10);
  }

  return score;
}

exports.listFreelancers = async (req, res, next) => {
  try {
    const { search, skill, min_rate, max_rate, available, page = 1, limit = 12 } = req.query;

    let query = db('users as u')
      .join('freelancer_profiles as fp', 'u.id', 'fp.user_id')
      .where('u.role', 'freelancer')
      .where('u.is_banned', false)
      .select(
        'u.id', 'u.name', 'u.bio', 'u.avatar', 'u.created_at',
        'u.rating_avg', 'u.rating_count', 'u.jobs_completed', 'u.trust_level',
        'fp.skills', 'fp.hourly_rate', 'fp.portfolio_url', 'fp.availability',
      );

    if (search) query = query.whereRaw('u.name ILIKE ?', [`%${search}%`]);
    if (skill) query = query.whereRaw("fp.skills::text ILIKE ?", [`%${skill}%`]);
    if (min_rate) query = query.where('fp.hourly_rate', '>=', Number(min_rate));
    if (max_rate) query = query.where('fp.hourly_rate', '<=', Number(max_rate));
    if (available === 'true') query = query.where('fp.availability', true);

    query = query.orderBy('fp.hourly_rate', 'desc');

    const { data, pagination } = await paginate(query, page, limit);
    const result = data.map((f) => ({
      ...f,
      skills: Array.isArray(f.skills) ? f.skills : JSON.parse(f.skills || '[]'),
    }));

    return success(res, result, 'Freelancers retrieved', 200, pagination);
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id })
      .select('id', 'name', 'email', 'role', 'avatar', 'bio', 'created_at',
        'rating_avg', 'rating_count', 'jobs_completed', 'trust_level', 'trust_score',
        'total_earned', 'total_spent', 'profile_complete_score', 'is_verified')
      .first();

    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');

    let profile = user;
    if (user.role === 'freelancer') {
      const fp = await db('freelancer_profiles').where({ user_id: user.id }).first();
      profile = {
        ...user,
        freelancer_profile: fp
          ? { ...fp, skills: Array.isArray(fp.skills) ? fp.skills : JSON.parse(fp.skills || '[]') }
          : null,
      };
    }

    return success(res, profile);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    if (Number(req.params.id) !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    }

    const { name, bio, avatar, skills, hourly_rate, portfolio_url, availability } = req.body;

    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name;
    if (bio !== undefined) userUpdates.bio = bio;
    if (avatar !== undefined) userUpdates.avatar = avatar;

    let user;
    if (Object.keys(userUpdates).length > 0) {
      const [updated] = await db('users')
        .where({ id: req.params.id })
        .update(userUpdates, ['id', 'name', 'email', 'role', 'avatar', 'bio']);
      user = updated;
    } else {
      user = await db('users').where({ id: req.params.id })
        .select('id', 'name', 'email', 'role', 'avatar', 'bio').first();
    }

    if (user.role === 'freelancer') {
      const fpUpdates = {};
      if (skills !== undefined) fpUpdates.skills = JSON.stringify(skills);
      if (hourly_rate !== undefined) fpUpdates.hourly_rate = hourly_rate;
      if (portfolio_url !== undefined) fpUpdates.portfolio_url = portfolio_url;
      if (availability !== undefined) fpUpdates.availability = availability;

      if (Object.keys(fpUpdates).length > 0) {
        await db('freelancer_profiles').where({ user_id: req.params.id }).update(fpUpdates);
      }
    }

    // Recompute profile completeness score after any update
    await computeProfileScore(Number(req.params.id));

    return success(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

exports.getMyEarnings = async (req, res, next) => {
  try {
    if (req.user.role !== 'freelancer') return error(res, 'Only freelancers have earnings', 403, 'FORBIDDEN');

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('payouts as p')
      .join('escrow_transactions as e', 'p.escrow_transaction_id', 'e.id')
      .join('orders as o', 'e.order_id', 'o.id')
      .join('jobs as j', 'o.job_id', 'j.id')
      .where('p.freelancer_id', req.user.id)
      .select('p.*', 'j.title as job_title', 'o.id as order_id');

    if (status) query = query.where('p.status', status);

    const [rows, { count }, totals] = await Promise.all([
      query.clone().orderBy('p.created_at', 'desc').limit(parseInt(limit, 10)).offset(offset),
      db('payouts').where({ freelancer_id: req.user.id }).count('id as count').first(),
      db('payouts').where({ freelancer_id: req.user.id }).select(
        db.raw("SUM(CASE WHEN status = 'pending_clearance' THEN amount ELSE 0 END) as pending"),
        db.raw("SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available"),
        db.raw("SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid"),
      ).first(),
    ]);

    return success(res, {
      earnings: rows,
      total_pending: Number(totals.pending || 0),
      total_available: Number(totals.available || 0),
      total_paid: Number(totals.paid || 0),
    }, 'Success', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: Number(count),
    });
  } catch (err) {
    next(err);
  }
};
