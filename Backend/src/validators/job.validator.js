const Joi = require('joi');

const createJobSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(20).required(),
  category_id: Joi.number().integer().required(),
  skills_required: Joi.array().items(Joi.string()).default([]),
  budget_min: Joi.number().positive().required(),
  budget_max: Joi.number().positive().greater(Joi.ref('budget_min')).required(),
  deadline: Joi.date().allow(null, '').optional(),
  location: Joi.string().max(100).default('Remote'),
});

const updateJobSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  description: Joi.string().min(20),
  category_id: Joi.number().integer(),
  skills_required: Joi.array().items(Joi.string()),
  budget_min: Joi.number().positive(),
  budget_max: Joi.number().positive(),
  deadline: Joi.date().allow(null, '').optional(),
  location: Joi.string().max(100),
}).min(1);

module.exports = { createJobSchema, updateJobSchema };
