const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  listOrders,
  getOrder,
  startOrder,
  deliverOrder,
  approveOrder,
  requestRevision,
  requestCancellation,
  respondCancellation,
  getDeliveries,
  requestExtension,
  respondExtension,
} = require('../controllers/orders.controller');

router.get('/', auth, listOrders);
router.get('/:id', auth, getOrder);
router.post('/:id/start', auth, startOrder);
router.post('/:id/deliver', auth, deliverOrder);
router.post('/:id/approve', auth, approveOrder);
router.post('/:id/request-revision', auth, requestRevision);
router.post('/:id/cancel', auth, requestCancellation);
router.post('/:id/cancel-respond', auth, respondCancellation);
router.get('/:id/deliveries', auth, getDeliveries);
router.post('/:id/request-extension', auth, requestExtension);
router.post('/:id/extensions/:ext_id/respond', auth, respondExtension);

// Review for a completed order
const { createReview } = require('../controllers/reviews.controller');
router.post('/:id/review', auth, createReview);

// Dispute for an order
const { openDispute, respondToDispute, submitEvidence, withdrawDispute, sendMessage: sendDisputeMessage, getDispute } = require('../controllers/disputes.controller');
router.post('/:id/dispute', auth, openDispute);

module.exports = router;
