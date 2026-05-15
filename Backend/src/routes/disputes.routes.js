const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getDispute,
  respondToDispute,
  submitEvidence,
  withdrawDispute,
  sendMessage,
  adminListDisputes,
  adminResolve,
} = require('../controllers/disputes.controller');

router.get('/', auth, adminListDisputes); // admin only
router.get('/:id', auth, getDispute);
router.post('/:id/respond', auth, respondToDispute);
router.post('/:id/evidence', auth, submitEvidence);
router.post('/:id/withdraw', auth, withdrawDispute);
router.post('/:id/messages', auth, sendMessage);
router.post('/:id/resolve', auth, adminResolve); // admin only

module.exports = router;
