const NotificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');

class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const notifications = await NotificationService.getNotifications(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Notifications retrieved successfully', { count: notifications.length, notifications });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Notification marked as read', { notification });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead(req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
