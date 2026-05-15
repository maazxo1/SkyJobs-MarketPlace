const Joi = require('joi');

const createBidSchema = Joi.object({
  job_id: Joi.number().integer().required(),
  amount: Joi.number().positive().required(),
  delivery_days: Joi.number().integer().positive().required(),
  cover_letter: Joi.string().min(50).max(2000).required(),
});

const updateBidSchema = Joi.object({
  amount: Joi.number().positive(),
  delivery_days: Joi.number().integer().positive(),
  cover_letter: Joi.string().min(50).max(2000),
}).min(1);

module.exports = { createBidSchema, updateBidSchema };
