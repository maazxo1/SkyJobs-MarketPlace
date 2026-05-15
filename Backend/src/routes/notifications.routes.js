const router = require('express').Router();
const auth = require('../middleware/auth');
const { getNotifications, markRead, markAllRead, getPreferences, updatePreferences } = require('../controllers/notifications.controller');

router.get('/', auth, getNotifications);
router.patch('/read-all', auth, markAllRead);
router.get('/preferences', auth, getPreferences);
router.put('/preferences', auth, updatePreferences);
router.patch('/:id/read', auth, markRead);

module.exports = router;
