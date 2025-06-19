const jwt = require('jsonwebtoken');

const JWT_SECRET = 'liantuanfen_secret_key'; // 在实际环境中应该使用环境变量存储

// 验证JWT令牌
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供访问令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('令牌验证失败:', error.message);
    return res.status(401).json({ message: '无效的令牌', error: error.message });
  }
};

// 兼容旧的verifyToken
const verifyToken = authenticateToken;

// 验证是否为管理员
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: '需要管理员权限' });
  }
};


// const isnotAdmin = (req, res, next) => {
//   if (req.user && req.user.role != 'admin') {
//     next();
//   } else {
//     return res.status(403).json({ message: '需要非管理员权限' });
//   }
// };

// 验证是否为社团管理员或系统管理员
const isClubAdminOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'club_admin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: '需要社团管理员或系统管理员权限' });
  }
};

module.exports = {
  authenticateToken,
  verifyToken,
  isAdmin,
  isClubAdminOrAdmin,
  JWT_SECRET
}; 