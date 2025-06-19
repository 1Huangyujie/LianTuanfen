const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { verifyToken, isAdmin, isClubAdminOrAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = 'uploads/activities';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成一个唯一的文件名，包含原始文件的扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: function (req, file, cb) {
    // 支持的图片类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传JPG、PNG、GIF或WEBP格式的图片文件'), false);
    }
  }
});

// 错误处理中间件
const uploadErrorHandler = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer 错误
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件过大，最大限制为5MB' });
      }
      return res.status(400).json({ message: '文件上传错误: ' + err.message });
    } else if (err) {
      // 其他错误
      return res.status(400).json({ message: err.message });
    }
    // 没有错误，继续处理
    next();
  });
};

// 创建活动 - 需要认证且是社团管理员或系统管理员
router.post('/', verifyToken, isClubAdminOrAdmin, uploadErrorHandler, activityController.createActivity);

// 获取所有活动 - 公开访问
router.get('/', activityController.getAllActivities);

// 获取单个活动详情 - 公开访问，但如果有认证会显示用户参与状态
router.get('/:id', activityController.getActivityById);

// 更新活动信息 - 需要认证且是创建该活动的社团管理员或系统管理员
router.put('/:id', verifyToken, uploadErrorHandler, activityController.updateActivity);

// 审核活动 - 仅系统管理员
router.put('/:id/review', verifyToken, isAdmin, activityController.reviewActivity);

// 参与活动 - 需要认证
router.post('/:id/join', verifyToken, activityController.joinActivity);

// 取消报名活动
router.delete('/:id/leave', verifyToken, activityController.leaveActivity);

// 完成活动并分配积分 - 需要认证且是社团管理员或系统管理员
router.post('/:id/complete', verifyToken, isClubAdminOrAdmin, activityController.completeActivity);

// 获取待审核活动 - 仅系统管理员
router.get('/pending/list', verifyToken, isAdmin, activityController.getPendingActivities);

// 获取当前用户参与的活动 - 需要认证
router.get('/user/joined', verifyToken, activityController.getUserActivities);

// 获取活动统计数据 - 仅管理员
router.get('/stats/summary', verifyToken, isAdmin, activityController.getActivityStats);

// 删除活动 - 需要认证且是社团管理员或系统管理员
router.delete('/:id', verifyToken, isClubAdminOrAdmin, activityController.deleteActivity);

module.exports = router; 