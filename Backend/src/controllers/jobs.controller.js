const db = require('../config/database');
const { success, error } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const { notify } = require('../utils/notify');

const JOB_EXPIRY_DAYS = 30;

const parseSkills = (v) =>
  Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v || '[]') : []);

exports.listJobs = async (req, res, next) => {
  try {
    const {
      q, search, category_id, client_id, budget_min, budget_max, location, skill,
      sort = 'created_at', order = 'desc', page = 1, limit = 10,
    } = req.query;

    let query = db('jobs')
      .join('users', 'jobs.client_id', 'users.id')
      .join('categories', 'jobs.category_id', 'categories.id')
      .select(
        'jobs.id', 'jobs.client_id', 'jobs.category_id', 'jobs.title', 'jobs.description',
        'jobs.skills_required', 'jobs.budget_min', 'jobs.budget_max',
        'jobs.deadline', 'jobs.location', 'jobs.status', 'jobs.created_at',
        'jobs.expires_at', 'jobs.view_count', 'jobs.is_featured',
        'users.name as client_name',
        'categories.name as category_name',
        db.raw('(SELECT COUNT(*) FROM bids WHERE bids.job_id = jobs.id)::int AS bid_count'),
      );

    if (client_id) {
      query = query.where('jobs.client_id', client_id);
    } else {
      query = query.where('jobs.status', 'open');
    }

    // Full-text search via tsvector
    if (q) {
      query = query.whereRaw(`jobs.search_vector @@ plainto_tsquery('english', ?)`, [q]);
    } else if (search) {
      query = query.whereRaw('(jobs.title ILIKE ? OR jobs.description ILIKE ?)', [`%${search}%`, `%${search}%`]);
    }

    if (category_id) query = query.where('jobs.category_id', category_id);
    if (budget_min) query = query.where('jobs.budget_max', '>=', Number(budget_min));
    if (budget_max) query = query.where('jobs.budget_max', '<=', Number(budget_max));
    if (location) query = query.whereRaw('jobs.location ILIKE ?', [`%${location}%`]);
    if (skill) query = query.whereRaw("jobs.skills_required::text ILIKE ?", [`%${skill}%`]);

    const validSorts = ['created_at', 'deadline', 'budget_min', 'budget_max'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    query = query.orderBy(`jobs.${sortCol}`, order === 'asc' ? 'asc' : 'desc');

    const result = await paginate(query, page, limit);
    const data = result.data.map((j) => ({ ...j, skills_required: parseSkills(j.skills_required) }));
    return success(res, data, 'Jobs retrieved', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

exports.createJob = async (req, res, next) => {
  try {
    const { title, description, category_id, skills_required, budget_min, budget_max, deadline, location } = req.body;
    const expiresAt = new Date(Date.now() + JOB_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const [job] = await db('jobs').insert(
      {
        client_id: req.user.id, title, description, category_id,
        skills_required: JSON.stringify(skills_required || []),
        budget_min, budget_max, deadline, location: location || 'Remote',
        status: 'open', expires_at: expiresAt,
      },
      ['*']
    );

    await db('users').where({ id: req.user.id }).increment({ jobs_posted: 1 });
    return success(res, { ...job, skills_required: parseSkills(job.skills_required) }, 'Job created', 201);
  } catch (err) {
    next(err);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await db('jobs')
      .join('users', 'jobs.client_id', 'users.id')
      .join('categories', 'jobs.category_id', 'categories.id')
      .select('jobs.*', 'users.name as client_name', 'users.avatar as client_avatar', 'categories.name as category_name')
      .where('jobs.id', req.params.id)
      .first();

    if (!job) return error(res, 'Job not found', 404, 'NOT_FOUND');

    // Increment view count (fire-and-forget)
    db('jobs').where({ id: job.id }).increment({ view_count: 1 }).catch(() => {});

    const [{ count }, myBid] = await Promise.all([
      db('bids').where({ job_id: job.id }).count('id as count').first(),
      req.user?.role === 'freelancer'
        ? db('bids').where({ job_id: job.id, freelancer_id: req.user.id }).first()
        : Promise.resolve(null),
    ]);

    return success(res, {
      ...job,
      skills_required: parseSkills(job.skills_required),
      bid_count: Number(count),
      my_bid: myBid || null,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();
    if (!job) return error(res, 'Job not found or unauthorized', 404, 'NOT_FOUND');
    if (!['open', 'closed'].includes(job.status)) return error(res, 'Cannot edit a job in this status', 400, 'INVALID_STATUS');

    const updates = { ...req.body };
    if (updates.skills_required) updates.skills_required = JSON.stringify(updates.skills_required);

    const [updated] = await db('jobs').where({ id: req.params.id }).update(updates, ['*']);
    return success(res, { ...updated, skills_required: parseSkills(updated.skills_required) }, 'Job updated');
  } catch (err) {
    next(err);
  }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();
    if (!job) return error(res, 'Job not found or unauthorized', 404, 'NOT_FOUND');

    const { count } = await db('bids').where({ job_id: job.id }).count('id as count').first();
    if (Number(count) > 0) return error(res, 'Cannot delete a job with submitted bids', 400, 'HAS_BIDS');

    await db('jobs').where({ id: req.params.id }).delete();
    return success(res, null, 'Job deleted');
  } catch (err) {
    next(err);
  }
};

exports.closeJob = async (req, res, next) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();
    if (!job) return error(res, 'Job not found or unauthorized', 404, 'NOT_FOUND');
    if (job.status !== 'open') return error(res, 'Only open jobs can be closed', 400, 'INVALID_STATUS');

    const [updated] = await db('jobs').where({ id: req.params.id }).update({ status: 'closed' }, ['*']);
    return success(res, updated, 'Job closed');
  } catch (err) {
    next(err);
  }
};

exports.reopenJob = async (req, res, next) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();
    if (!job) return error(res, 'Job not found or unauthorized', 404, 'NOT_FOUND');
    if (!['closed', 'expired'].includes(job.status)) return error(res, 'Only closed or expired jobs can be reopened', 400, 'INVALID_STATUS');

    // Ensure no active contract exists
    const activeContract = await db('contracts')
      .where({ job_id: job.id, status: 'active' }).first();
    if (activeContract) return error(res, 'Cannot reopen a job with an active contract', 400, 'HAS_CONTRACT');

    const newExpiry = new Date(Date.now() + JOB_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const [updated] = await db('jobs').where({ id: req.params.id }).update({
      status: 'open',
      expires_at: newExpiry,
      reopen_count: job.reopen_count + 1,
    }, ['*']);

    return success(res, { ...updated, skills_required: parseSkills(updated.skills_required) }, 'Job reopened');
  } catch (err) {
    next(err);
  }
};

exports.getJobBids = async (req, res, next) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();
    if (!job) return error(res, 'Job not found or unauthorized', 404, 'NOT_FOUND');

    const bids = await db('bids')
      .join('users', 'bids.freelancer_id', 'users.id')
      .leftJoin('freelancer_profiles', 'users.id', 'freelancer_profiles.user_id')
      .select(
        'bids.*',
        'users.name as freelancer_name', 'users.avatar as freelancer_avatar',
        'users.rating_avg', 'users.jobs_completed',
        'freelancer_profiles.skills', 'freelancer_profiles.hourly_rate',
      )
      .where('bids.job_id', req.params.id)
      .orderBy('bids.created_at', 'desc');

    return success(res, bids);
  } catch (err) {
    next(err);
  }
};
