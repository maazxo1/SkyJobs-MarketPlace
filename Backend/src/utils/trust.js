const db = require('../config/database');

const LEVELS = [
  { level: 'suspended', min: -Infinity, max: 0 },
  { level: 'new',       min: 0,         max: 50 },
  { level: 'verified',  min: 50,        max: 100 },
  { level: 'trusted',   min: 100,       max: 150 },
  { level: 'top',       min: 150,       max: Infinity },
];

function computeLevel(score) {
  for (const { level, min, max } of LEVELS) {
    if (score > min && score <= max) return level;
  }
  return 'new';
}

/**
 * Adjust a user's trust score and recalculate their trust level.
 * @param {object|null} trx  - knex transaction (null = use default db)
 * @param {number} userId
 * @param {number} delta     - positive or negative
 */
async function adjustTrustScore(trx, userId, delta) {
  const conn = trx || db;
  const user = await conn('users').where({ id: userId }).select('trust_score').first();
  if (!user) return;

  const newScore = Math.max(0, parseFloat((Number(user.trust_score) + delta).toFixed(2)));
  const newLevel = computeLevel(newScore);

  await conn('users').where({ id: userId }).update({
    trust_score: newScore,
    trust_level: newLevel,
  });
}

/**
 * Recalculate rating_avg and rating_count for a user from visible reviews.
 */
async function recalcRating(trx, userId) {
  const conn = trx || db;
  const { avg, count } = await conn('reviews')
    .where({ reviewee_id: userId, is_visible: true })
    .select(
      conn.raw('ROUND(AVG(rating)::numeric, 2) as avg'),
      conn.raw('COUNT(*) as count'),
    )
    .first();

  await conn('users').where({ id: userId }).update({
    rating_avg: avg || null,
    rating_count: parseInt(count, 10) || 0,
  });
}

module.exports = { adjustTrustScore, recalcRating, computeLevel };
