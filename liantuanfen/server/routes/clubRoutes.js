const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const clubController = require('../controllers/clubController');
const { verifyToken, isAdmin, isClubAdminOrAdmin } = require('../middleware/auth');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
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

// 创建社团 - 需要认证
router.post('/', verifyToken, upload.single('logo'), clubController.createClub);

// 获取所有社团 - 公开访问
router.get('/', clubController.getAllClubs);

// 获取单个社团详情 - 公开访问
router.get('/:id', clubController.getClubById);

// 更新社团信息 - 需要认证且是社团管理员或系统管理员
router.put('/:id', verifyToken, upload.single('logo'), clubController.updateClub);

// 加入社团 - 需要认证
router.post('/:id/join', verifyToken, clubController.joinClub);

// 离开社团 - 需要认证
router.delete('/:id/leave', verifyToken, clubController.leaveClub);

// 修改社团成员角色 - 需要认证且是社团会长或系统管理员
router.put('/:id/members/role', verifyToken, clubController.updateMemberRole);

// 删除社团 - 需要认证且是社团管理员或系统管理员
router.delete('/:id', verifyToken, isClubAdminOrAdmin, clubController.deleteClub);

module.exports = router; 