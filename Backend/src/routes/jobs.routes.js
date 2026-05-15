const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');
const { createJobSchema, updateJobSchema } = require('../validators/job.validator');
const { listJobs, createJob, getJob, updateJob, deleteJob, closeJob, reopenJob, getJobBids } = require('../controllers/jobs.controller');
const { verify } = require('../utils/jwt');

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = verify(header.split(' ')[1]); } catch {}
  }
  next();
};

router.get('/', optionalAuth, listJobs);
router.post('/', auth, role('client'), validate(createJobSchema), createJob);
router.get('/:id', optionalAuth, getJob);
router.put('/:id', auth, role('client'), validate(updateJobSchema), updateJob);
router.delete('/:id', auth, role('client'), deleteJob);
router.patch('/:id/close', auth, role('client'), closeJob);
router.patch('/:id/reopen', auth, role('client'), reopenJob);
router.get('/:id/bids', auth, role('client'), getJobBids);

module.exports = router;
