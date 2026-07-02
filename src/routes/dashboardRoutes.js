const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All dashboard endpoints require authentication

router.get('/my-tasks', DashboardController.getMyTasks);
router.get('/assigned-to-me', DashboardController.getTasksAssignedToMe);
router.get('/created-by-me', DashboardController.getTasksCreatedByMe);
router.get('/pending', DashboardController.getPendingTasks);
router.get('/completed', DashboardController.getCompletedTasks);
router.get('/due-today', DashboardController.getDueTodayTasks);
router.get('/team-overview', DashboardController.getTeamOverview);
router.get('/recent-activity', DashboardController.getRecentActivity);
router.put('/member-availability', DashboardController.updateMemberAvailability);
router.put('/clock-status', DashboardController.updateClockStatus);

module.exports = router;
