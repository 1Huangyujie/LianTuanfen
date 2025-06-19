const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

const app = express();

// 配置CORS
app.use(cors());

// 配置body-parser中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 配置静态文件目录
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 创建uploads目录（如果不存在）
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// 配置路由
const userRoutes = require('./routes/userRoutes');
const clubRoutes = require('./routes/clubRoutes');
const activityRoutes = require('./routes/activityRoutes');

// 使用路由
app.use('/api/users', userRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/activities', activityRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 处理404错误
app.use((req, res) => {
  res.status(404).json({ message: '请求的资源不存在' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 