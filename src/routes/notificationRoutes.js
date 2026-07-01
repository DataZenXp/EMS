const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { idParamValidator } = require('../validators/taskValidator');

const router = express.Router();

router.use(protect); // All notification endpoints require authentication

router.get('/', NotificationController.getNotifications);
router.put('/read-all', NotificationController.markAllAsRead);
router.put('/:id/read', idParamValidator, NotificationController.markAsRead);

module.exports = router;
