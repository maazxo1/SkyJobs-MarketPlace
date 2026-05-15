const paginate = async (queryBuilder, page = 1, limit = 10) => {
  const offset = (Number(page) - 1) * Number(limit);
  const [countResult, data] = await Promise.all([
    queryBuilder.clone().clearSelect().clearOrder().count('* as count').first(),
    queryBuilder.clone().limit(Number(limit)).offset(offset),
  ]);
  const total = Number(countResult.count);
  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

module.exports = { paginate };
