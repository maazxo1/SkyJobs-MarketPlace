const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadFile } = require('../controllers/upload.controller');

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many uploads, please slow down', code: 'RATE_LIMITED' },
});

// POST /api/v1/upload — single file, auth required
router.post('/', auth, uploadLimiter, upload.single('file'), uploadFile);

module.exports = router;
