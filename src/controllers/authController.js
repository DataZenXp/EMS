const AuthService = require('../services/authService');
const JwtHelper = require('../utils/jwtHelper');
const ApiResponse = require('../utils/apiResponse');
const statusCodes = require('../constants/statusCodes');

class AuthController {
  static async register(req, res, next) {
    try {
      const user = await AuthService.registerUser(req.body);
      return JwtHelper.sendTokenResponse(res, user, statusCodes.CREATED, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await AuthService.loginUser(email, password);
      return JwtHelper.sendTokenResponse(res, user, statusCodes.OK, 'Logged in successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      await AuthService.logoutUser(req.user._id);
      res.clearCookie('accessToken');
      return ApiResponse.success(res, statusCodes.OK, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req, res, next) {
    try {
      return ApiResponse.success(res, statusCodes.OK, 'Current user retrieved', { user: req.user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updatedUser = await AuthService.updateProfile(req.user._id, req.body);
      return ApiResponse.success(res, statusCodes.OK, 'Profile updated successfully', { user: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user._id, currentPassword, newPassword);
      return ApiResponse.success(res, statusCodes.OK, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
