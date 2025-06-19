const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 公开路由
// 用户注册
router.post('/register', upload.single('avatar'), userController.register);

// 用户登录
router.post('/login', userController.login);

// 需要认证的路由
// 获取当前用户信息
router.get('/current', verifyToken, userController.getCurrentUser);
router.get('/me', verifyToken, userController.getCurrentUser); // 兼容旧路径

// 更新用户信息
router.put('/:id', verifyToken, upload.single('avatar'), userController.updateUser);
router.put('/update/:id', verifyToken, upload.single('avatar'), userController.updateUser); // 兼容旧路径

// 获取所有用户 - 仅管理员可访问
router.get('/all', verifyToken, isAdmin, userController.getAllUsers);

// 修改用户角色 - 仅管理员可访问
router.put('/role/:id', verifyToken, isAdmin, userController.changeUserRole);

// 创建新用户 - 仅管理员可访问
router.post('/', verifyToken, isAdmin, upload.single('avatar'), userController.createUser);

// 删除用户 - 仅管理员可访问
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);

// 积分排行榜
router.get('/rankings', userController.getPointsRanking);

module.exports = router; 