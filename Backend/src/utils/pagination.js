const paginate = async (queryBuilder, page = 1, limit = 10) => {
  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
  const offset = (safePage - 1) * safeLimit;
  const [countResult, data] = await Promise.all([
    queryBuilder.clone().clearSelect().clearOrder().count('* as count').first(),
    queryBuilder.clone().limit(safeLimit).offset(offset),
  ]);
  const total = Number(countResult.count);
  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

module.exports = { paginate };
