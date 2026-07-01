const express = require('express');
const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EMS API v1 is healthy and operational',
    timestamp: new Date()
  });
});

module.exports = router;
