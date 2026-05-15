const { error } = require('../utils/response');

const cleanMessage = (msg) =>
  msg
    .replace(/['"]/g, '')          // strip Joi's surrounding quotes on field names
    .replace(/^\w/, (c) => c.toUpperCase()); // capitalise first letter

module.exports = (schema) =>
  (req, res, next) => {
    const { error: err } = schema.validate(req.body, { abortEarly: false });
    if (err) {
      // Return first error only — cleaner UX than dumping all errors at once
      const message = cleanMessage(err.details[0].message);
      const field = err.details[0].context?.label || null;
      return error(res, message, 422, 'VALIDATION_ERROR', { field });
    }
    next();
  };
