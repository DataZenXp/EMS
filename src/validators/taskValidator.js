const { body, param, validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants/roles');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return ApiResponse.error(res, statusCodes.BAD_REQUEST, 'Input validation failed', errorMessages);
  }
  next();
};

const idParamValidator = [
  param('id').isMongoId().withMessage('Invalid ID format provided'),
  validate
];

const createTaskValidator = [
  body('title').notEmpty().withMessage('Task title is required').trim(),
  body('assignedTo').isMongoId().withMessage('Valid AssignedTo User ID is required'),
  body('priority').optional().isIn(Object.values(TASK_PRIORITY)).withMessage('Invalid priority value'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid ISO8601 date'),
  validate
];

const updateTaskValidator = [
  param('id').isMongoId().withMessage('Invalid Task ID format'),
  body('priority').optional().isIn(Object.values(TASK_PRIORITY)).withMessage('Invalid priority value'),
  body('status').optional().isIn(Object.values(TASK_STATUS)).withMessage('Invalid status value'),
  validate
];

const changeStatusValidator = [
  param('id').isMongoId().withMessage('Invalid Task ID format'),
  body('status').notEmpty().isIn(Object.values(TASK_STATUS)).withMessage('Invalid status provided'),
  validate
];

const assignTaskValidator = [
  param('id').isMongoId().withMessage('Invalid Task ID format'),
  body('assignedTo').isMongoId().withMessage('Valid user ID to assign is required'),
  validate
];

const addCommentValidator = [
  param('id').isMongoId().withMessage('Invalid Task ID format'),
  body('message').notEmpty().withMessage('Comment message is required').trim(),
  validate
];

module.exports = {
  idParamValidator,
  createTaskValidator,
  updateTaskValidator,
  changeStatusValidator,
  assignTaskValidator,
  addCommentValidator
};
