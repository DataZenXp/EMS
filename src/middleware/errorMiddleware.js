const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');
const config = require('../config/config');

const notFound = (req, res, next) => {
  return ApiResponse.error(res, statusCodes.NOT_FOUND, `Route not found: ${req.originalUrl}`);
};

const errorHandler = (err, req, res, next) => {
  console.error(`[Error Handler]: ${err.stack || err.message}`);

  let statusCode = res.statusCode !== 200 ? res.statusCode : statusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = statusCodes.BAD_REQUEST;
    message = 'Validation failed';
    errors = Object.values(err.errors).map(val => val.message);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = statusCodes.CONFLICT;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered for '${field}'. Please use another value.`;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = statusCodes.BAD_REQUEST;
    message = `Invalid format for resource ID: ${err.value}`;
  }

  const responsePayload = {
    success: false,
    message
  };

  if (errors) responsePayload.errors = errors;
  if (config.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = { notFound, errorHandler };
