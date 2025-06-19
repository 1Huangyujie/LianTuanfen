const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 数据库连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'liantuanfen'
});

db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('已连接到MySQL数据库');

  // 确保数据库存在
  db.query(`CREATE DATABASE IF NOT EXISTS liantuanfen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
    if (err) {
      console.error('创建数据库失败:', err);
      return;
    }

    console.log('数据库liantuanfen已确认存在');
    db.query(`USE liantuanfen`);

    // 创建用户表
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        student_id VARCHAR(20) UNIQUE,
        bio TEXT,
        email VARCHAR(100) UNIQUE,
        role ENUM('admin', 'student', 'club_admin') NOT NULL DEFAULT 'student',
        points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建社团表
    const createClubsTable = `
      CREATE TABLE IF NOT EXISTS clubs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        logo VARCHAR(255),
        admin_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `;

    // 创建活动表
    const createActivitiesTable = `
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        club_id INT,
        location VARCHAR(100),
        start_time DATETIME,
        end_time DATETIME,
        points INT DEFAULT 0,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES clubs(id)
      )
    `;

    // 创建用户活动关系表（记录参与情况）
    const createUserActivitiesTable = `
      CREATE TABLE IF NOT EXISTS user_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        activity_id INT,
        status ENUM('registered', 'participated', 'completed') DEFAULT 'registered',
        earned_points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (activity_id) REFERENCES activities(id)
      )
    `;

    // 创建社团成员表
    const createClubMembersTable = `
      CREATE TABLE IF NOT EXISTS club_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        club_id INT,
        role ENUM('member', 'officer', 'president') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (club_id) REFERENCES clubs(id)
      )
    `;

    // 执行表创建
    db.query(createUsersTable, (err) => {
      if (err) console.error('创建用户表失败:', err);
      else console.log('用户表创建成功');
    });

    db.query(createClubsTable, (err) => {
      if (err) console.error('创建社团表失败:', err);
      else console.log('社团表创建成功');
    });

    db.query(createActivitiesTable, (err) => {
      if (err) console.error('创建活动表失败:', err);
      else console.log('活动表创建成功');
    });

    db.query(createUserActivitiesTable, (err) => {
      if (err) console.error('创建用户活动关系表失败:', err);
      else console.log('用户活动关系表创建成功');
    });

    db.query(createClubMembersTable, (err) => {
      if (err) console.error('创建社团成员表失败:', err);
      else console.log('社团成员表创建成功');
    });
  });
});

// 创建上传文件的存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 基本路由
app.get('/', (req, res) => {
  res.send('校园社团活动积分系统API');
});

// 导入路由
const userRoutes = require('./routes/userRoutes');
const clubRoutes = require('./routes/clubRoutes');
const activityRoutes = require('./routes/activityRoutes');

// 注册路由
app.use('/api/users', userRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/activities', activityRoutes);

// 创建uploads文件夹（如果不存在）
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 