const express = require('express');
const AuthController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', registerValidator, AuthController.register);
router.post('/login', loginValidator, AuthController.login);
router.post('/logout', protect, AuthController.logout);
router.get('/me', protect, AuthController.getCurrentUser);
router.put('/profile', protect, updateProfileValidator, AuthController.updateProfile);
router.put('/change-password', protect, changePasswordValidator, AuthController.changePassword);

module.exports = router;
