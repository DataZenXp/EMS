const JwtHelper = require('../utils/jwtHelper');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return ApiResponse.error(res, statusCodes.UNAUTHORIZED, 'Authentication token missing or invalid');
    }

    const decoded = JwtHelper.verifyToken(token);
    if (!decoded) {
      return ApiResponse.error(res, statusCodes.UNAUTHORIZED, 'Token expired or invalid');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, statusCodes.UNAUTHORIZED, 'Associated user account no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.error(res, statusCodes.INTERNAL_SERVER_ERROR, 'Authentication error occurred');
  }
};

module.exports = { protect };
