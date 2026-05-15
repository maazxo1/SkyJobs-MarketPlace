const router = require('express').Router();
const auth = require('../middleware/auth');
const { listFreelancers, getProfile, updateProfile, getMyEarnings } = require('../controllers/users.controller');

router.get('/', listFreelancers);
router.get('/me/earnings', auth, getMyEarnings);
router.get('/:id', getProfile);
router.put('/:id', auth, updateProfile);

// GET /users/:id/reviews — public visible reviews for a user
const { getReviews } = require('../controllers/reviews.controller');
router.get('/:id/reviews', getReviews);

module.exports = router;
