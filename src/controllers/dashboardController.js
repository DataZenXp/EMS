const DashboardService = require('../services/dashboardService');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');

class DashboardController {
  static async getMyTasks(req, res, next) {
    try {
      const tasks = await DashboardService.getMyTasks(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'My tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getTasksAssignedToMe(req, res, next) {
    try {
      const tasks = await DashboardService.getTasksAssignedToMe(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Assigned tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getTasksCreatedByMe(req, res, next) {
    try {
      const tasks = await DashboardService.getTasksCreatedByMe(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Created tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getPendingTasks(req, res, next) {
    try {
      const tasks = await DashboardService.getPendingTasks(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Pending tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getCompletedTasks(req, res, next) {
    try {
      const tasks = await DashboardService.getCompletedTasks(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Completed tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getDueTodayTasks(req, res, next) {
    try {
      const tasks = await DashboardService.getDueTodayTasks(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Due today tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getTeamOverview(req, res, next) {
    try {
      const overview = await DashboardService.getTeamOverview();
      return ApiResponse.success(res, statusCodes.OK, 'Team overview retrieved successfully', { team: overview });
    } catch (error) {
      next(error);
    }
  }

  static async getRecentActivity(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const activity = await DashboardService.getRecentActivity(limit);
      return ApiResponse.success(res, statusCodes.OK, 'Recent activity retrieved successfully', { count: activity.length, activity });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberAvailability(req, res, next) {
    try {
      const { identifier, availability } = req.body;
      const user = await DashboardService.updateMemberAvailability(identifier, availability);
      return ApiResponse.success(res, statusCodes.OK, 'Member availability updated successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  static async updateClockStatus(req, res, next) {
    try {
      const { identifier, clockStatus, lastClockIn, lastClockOut, totalMinutesToday, totalMinutesAllTime, lastClockDate } = req.body;
      const user = await DashboardService.updateClockStatus(identifier, clockStatus, lastClockIn, lastClockOut, totalMinutesToday, totalMinutesAllTime, lastClockDate);
      return ApiResponse.success(res, statusCodes.OK, 'Clock status updated successfully', { user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
