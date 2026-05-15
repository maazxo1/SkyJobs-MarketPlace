const db = require('../config/database');
const { success } = require('../utils/response');

exports.getPublicStats = async (req, res, next) => {
  try {
    const [freelancerRow, jobRow, contractRow, ratingRow] = await Promise.all([
      db('users').where({ role: 'freelancer', is_banned: false }).count('* as count').first(),
      db('jobs').where({ status: 'open' }).count('* as count').first(),
      db('contracts').where({ status: 'completed' }).count('* as count').first(),
      db('reviews').avg('rating as avg').first(),
    ]);

    return success(res, {
      freelancer_count:     Number(freelancerRow.count),
      open_job_count:       Number(jobRow.count),
      completed_contracts:  Number(contractRow.count),
      avg_rating:           ratingRow.avg ? Number(Number(ratingRow.avg).toFixed(2)) : null,
    });
  } catch (err) {
    next(err);
  }
};
