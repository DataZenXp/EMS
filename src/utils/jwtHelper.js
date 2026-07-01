const jwt = require('jsonwebtoken');
const config = require('../config/config');

class JwtHelper {
  static generateToken(payload) {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static sendTokenResponse(res, user, statusCode = 200, message = 'Success') {
    const token = this.generateToken({ id: user._id });

    // Set cookie option if needed
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('accessToken', token, cookieOptions);

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.passwordHash;

    return res.status(statusCode).json({
      success: true,
      message,
      token,
      data: { user: userObj }
    });
  }
}

module.exports = JwtHelper;
