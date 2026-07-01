const Task = require('../models/Task');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { NOTIFICATION_TYPE, TASK_STATUS } = require('../constants/roles');

class TaskService {
  static async createTask(taskData, creatorId) {
    const task = await Task.create({
      ...taskData,
      createdBy: creatorId
    });

    // Create Activity Log
    await ActivityLog.create({
      taskId: task._id,
      userId: creatorId,
      action: 'TASK_CREATED',
      details: `Created task "${task.title}"`
    });

    // Notify assignee if assigned to someone else
    if (task.assignedTo.toString() !== creatorId.toString()) {
      await Notification.create({
        receiverId: task.assignedTo,
        senderId: creatorId,
        type: NOTIFICATION_TYPE.ASSIGNED,
        message: `You were assigned a new task: "${task.title}"`
      });
    }

    return Task.findById(task._id).populate('assignedTo createdBy', 'name email avatar');
  }

  static async getAllTasks(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    return Task.find(query)
      .populate('assignedTo createdBy', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  static async getTaskById(taskId) {
    const task = await Task.findById(taskId)
      .populate('assignedTo createdBy', 'name email avatar');
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }

  static async updateTask(taskId, updateData, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    Object.assign(task, updateData);
    await task.save();

    await ActivityLog.create({
      taskId: task._id,
      userId,
      action: 'TASK_UPDATED',
      details: `Updated details for task "${task.title}"`
    });

    return Task.findById(task._id).populate('assignedTo createdBy', 'name email avatar');
  }

  static async deleteTask(taskId, userId) {
    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    await Comment.deleteMany({ taskId });
    await ActivityLog.deleteMany({ taskId });
    return true;
  }

  static async assignOrReassignTask(taskId, newAssigneeId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    const previousAssignee = task.assignedTo;
    task.assignedTo = newAssigneeId;
    await task.save();

    await ActivityLog.create({
      taskId: task._id,
      userId,
      action: 'TASK_REASSIGNED',
      details: `Reassigned task to user ID ${newAssigneeId}`
    });

    if (newAssigneeId.toString() !== userId.toString()) {
      await Notification.create({
        receiverId: newAssigneeId,
        senderId: userId,
        type: NOTIFICATION_TYPE.REASSIGNED,
        message: `Task "${task.title}" was reassigned to you`
      });
    }

    return Task.findById(task._id).populate('assignedTo createdBy', 'name email avatar');
  }

  static async changeTaskStatus(taskId, newStatus, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    task.status = newStatus;
    await task.save();

    await ActivityLog.create({
      taskId: task._id,
      userId,
      action: 'STATUS_CHANGED',
      details: `Status changed to ${newStatus}`
    });

    if (newStatus === TASK_STATUS.COMPLETED && task.createdBy && task.createdBy.toString() !== userId.toString()) {
      await Notification.create({
        receiverId: task.createdBy,
        senderId: userId,
        type: NOTIFICATION_TYPE.COMPLETED,
        message: `Task "${task.title}" was marked as Completed`
      });
    }

    return Task.findById(task._id).populate('assignedTo createdBy', 'name email avatar');
  }

  static async addComment(taskId, userId, message) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    const comment = await Comment.create({
      taskId,
      userId,
      message
    });

    await ActivityLog.create({
      taskId,
      userId,
      action: 'COMMENT_ADDED',
      details: 'Left a comment on task'
    });

    // Notify assignee or creator
    const targetId = task.assignedTo.toString() === userId.toString() ? task.createdBy : task.assignedTo;
    if (targetId.toString() !== userId.toString()) {
      await Notification.create({
        receiverId: targetId,
        senderId: userId,
        type: NOTIFICATION_TYPE.COMMENT,
        message: `New comment on task "${task.title}"`
      });
    }

    return Comment.findById(comment._id).populate('userId', 'name avatar');
  }

  static async getActivityHistory(taskId) {
    return ActivityLog.find({ taskId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
  }
}

module.exports = TaskService;
