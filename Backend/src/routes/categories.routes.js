const router = require('express').Router();
const db = require('../config/database');
const { success, error } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const categories = await db('categories').select('*').orderBy('name');
    return success(res, categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
