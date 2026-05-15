const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMyContracts, getContract, proposeAmendment, respondAmendment, updateContractStatus } = require('../controllers/contracts.controller');

router.get('/', auth, getMyContracts);
router.get('/:id', auth, getContract);
router.patch('/:id/status', auth, updateContractStatus);
router.post('/:id/amendments', auth, proposeAmendment);
router.patch('/:id/amendments/:amendment_id/respond', auth, respondAmendment);

module.exports = router;
