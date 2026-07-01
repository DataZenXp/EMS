const TaskService = require('../services/taskService');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');

class TaskController {
  static async createTask(req, res, next) {
    try {
      const task = await TaskService.createTask(req.body, req.user._id);
      return ApiResponse.success(res, statusCodes.CREATED, 'Task created successfully', { task });
    } catch (error) {
      next(error);
    }
  }

  static async getAllTasks(req, res, next) {
    try {
      const tasks = await TaskService.getAllTasks(req.query);
      return ApiResponse.success(res, statusCodes.OK, 'Tasks retrieved successfully', { count: tasks.length, tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getTaskById(req, res, next) {
    try {
      const task = await TaskService.getTaskById(req.params.id);
      return ApiResponse.success(res, statusCodes.OK, 'Task retrieved successfully', { task });
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req, res, next) {
    try {
      const task = await TaskService.updateTask(req.params.id, req.body, req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Task updated successfully', { task });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req, res, next) {
    try {
      await TaskService.deleteTask(req.params.id, req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Task deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async assignTask(req, res, next) {
    try {
      const { assignedTo } = req.body;
      const task = await TaskService.assignOrReassignTask(req.params.id, assignedTo, req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Task assigned successfully', { task });
    } catch (error) {
      next(error);
    }
  }

  static async changeStatus(req, res, next) {
    try {
      const { status } = req.body;
      const task = await TaskService.changeTaskStatus(req.params.id, status, req.user._id);
      return ApiResponse.success(res, statusCodes.OK, 'Task status updated successfully', { task });
    } catch (error) {
      next(error);
    }
  }

  static async addComment(req, res, next) {
    try {
      const { message } = req.body;
      const comment = await TaskService.addComment(req.params.id, req.user._id, message);
      return ApiResponse.success(res, statusCodes.CREATED, 'Comment added successfully', { comment });
    } catch (error) {
      next(error);
    }
  }

  static async uploadAttachment(req, res, next) {
    try {
      // API Placeholder for attachment upload
      const placeholderAttachment = {
        filename: req.body.filename || 'attachment.pdf',
        url: req.body.url || 'https://via.placeholder.com/150',
        uploadedAt: new Date()
      };
      return ApiResponse.success(res, statusCodes.OK, 'Attachment uploaded placeholder response', { attachment: placeholderAttachment });
    } catch (error) {
      next(error);
    }
  }

  static async getActivityHistory(req, res, next) {
    try {
      const history = await TaskService.getActivityHistory(req.params.id);
      return ApiResponse.success(res, statusCodes.OK, 'Activity history retrieved successfully', { count: history.length, history });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TaskController;
