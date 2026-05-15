const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { register, login, getMe, logout } = require('../controllers/auth.controller');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', auth, getMe);
router.post('/logout', logout); // JWT is stateless — no server session to invalidate

module.exports = router;
