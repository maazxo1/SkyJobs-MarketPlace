const success = (res, data, message = 'Success', statusCode = 200, pagination = null) => {
  const payload = { success: true, message, data };
  if (pagination) payload.pagination = pagination;
  return res.status(statusCode).json(payload);
};

const error = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', meta = null) => {
  const payload = { success: false, error: message, code };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

module.exports = { success, error };
