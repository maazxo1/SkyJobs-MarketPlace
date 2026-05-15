module.exports = (err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    error: status >= 500 && isProduction
      ? 'An internal server error occurred. Please try again later.'
      : (err.message || 'Internal Server Error'),
    code: err.code || 'INTERNAL_ERROR',
  });
};
