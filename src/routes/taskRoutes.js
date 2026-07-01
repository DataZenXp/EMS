const express = require('express');
const TaskController = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const {
  idParamValidator,
  createTaskValidator,
  updateTaskValidator,
  changeStatusValidator,
  assignTaskValidator,
  addCommentValidator
} = require('../validators/taskValidator');

const router = express.Router();

router.use(protect); // All task endpoints require authentication

router.route('/')
  .post(createTaskValidator, TaskController.createTask)
  .get(TaskController.getAllTasks);

router.route('/:id')
  .get(idParamValidator, TaskController.getTaskById)
  .put(updateTaskValidator, TaskController.updateTask)
  .delete(idParamValidator, TaskController.deleteTask);

router.put('/:id/assign', assignTaskValidator, TaskController.assignTask);
router.put('/:id/status', changeStatusValidator, TaskController.changeStatus);
router.post('/:id/comments', addCommentValidator, TaskController.addComment);
router.post('/:id/attachments', idParamValidator, TaskController.uploadAttachment);
router.get('/:id/activity', idParamValidator, TaskController.getActivityHistory);

module.exports = router;
