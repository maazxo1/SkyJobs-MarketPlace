const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  listUsers, banUser, suspendUser, adjustTrust, getTrustHistory,
  listOrders, getStats, listContracts, listJobs, deleteJob,
  forceOrderStatus, adminReleasePayment, adminRefund,
  deleteReview,
  revenueReport, ordersReport, disputesReport, usersReport,
} = require('../controllers/admin.controller');
const { adminListDisputes, adminResolve } = require('../controllers/disputes.controller');

router.use(auth, role('admin'));

// Users
router.get('/users', listUsers);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/trust-score', adjustTrust);
router.get('/users/:id/trust-history', getTrustHistory);

// Orders
router.get('/orders', listOrders);
router.post('/orders/:id/force-status', forceOrderStatus);
router.post('/orders/:id/release-payment', adminReleasePayment);
router.post('/orders/:id/refund', adminRefund);

// Reviews
router.delete('/reviews/:id', deleteReview);

// Disputes
router.get('/disputes', adminListDisputes);
router.post('/disputes/:id/resolve', adminResolve);

// Jobs
router.get('/jobs', listJobs);
router.delete('/jobs/:id', deleteJob);

// Contracts
router.get('/contracts', listContracts);

// Stats + Reports
router.get('/stats', getStats);
router.get('/reports/revenue', revenueReport);
router.get('/reports/orders', ordersReport);
router.get('/reports/disputes', disputesReport);
router.get('/reports/users', usersReport);

module.exports = router;
