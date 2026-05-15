const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');
const { createBidSchema, updateBidSchema } = require('../validators/bid.validator');
const {
  getMyBids,
  createBid,
  updateBid,
  withdrawBid,
  acceptBid,
  rejectBid,
  sendCounter,
  respondToCounter,
} = require('../controllers/bids.controller');

router.get('/', auth, role('freelancer'), getMyBids);
router.post('/', auth, role('freelancer'), validate(createBidSchema), createBid);
router.put('/:id', auth, role('freelancer'), validate(updateBidSchema), updateBid);
router.delete('/:id', auth, role('freelancer'), withdrawBid);
router.patch('/:id/accept', auth, role('client'), acceptBid);
router.patch('/:id/reject', auth, role('client'), rejectBid);
router.post('/:id/counter', auth, role('client'), sendCounter);
router.patch('/:id/counter/respond', auth, role('freelancer'), respondToCounter);

module.exports = router;
