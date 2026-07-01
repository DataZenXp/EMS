class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = null) {
    const responsePayload = {
      success: true,
      message
    };
    if (data !== null) {
      responsePayload.data = data;
    }
    return res.status(statusCode).json(responsePayload);
  }

  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const responsePayload = {
      success: false,
      message
    };
    if (errors !== null) {
      responsePayload.errors = errors;
    }
    return res.status(statusCode).json(responsePayload);
  }
}

module.exports = ApiResponse;
