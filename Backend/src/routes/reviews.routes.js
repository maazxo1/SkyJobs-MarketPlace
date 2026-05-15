const router = require('express').Router();
const auth = require('../middleware/auth');
const { getReviews } = require('../controllers/reviews.controller');

// GET /reviews?user_id=  — public listing of visible reviews for a user
router.get('/', getReviews);
// POST /orders/:id/review  — review submission is on the orders router

module.exports = router;
