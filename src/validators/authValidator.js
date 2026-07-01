const { body, validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return ApiResponse.error(res, statusCodes.BAD_REQUEST, 'Input validation failed', errorMessages);
  }
  next();
};

const registerValidator = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long'),
  validate
];

const loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const updateProfileValidator = [
  body('name').optional().notEmpty().withMessage('Name cannot be blank').trim(),
  body('email').optional().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  validate
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 4 }).withMessage('New password must be at least 4 characters long'),
  validate
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator
};
