const Notification = require('../models/Notification');

class NotificationService {
  static async getNotifications(userId) {
    return Notification.find({ receiverId: userId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 });
  }

  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, receiverId: userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return notification;
  }

  static async markAllAsRead(userId) {
    await Notification.updateMany(
      { receiverId: userId, isRead: false },
      { isRead: true }
    );
    return true;
  }
}

module.exports = NotificationService;
