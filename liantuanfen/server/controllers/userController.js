const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const { JWT_SECRET } = require('../middleware/auth');

// 数据库连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'liantuanfen'
});

// 用户注册
const register = async (req, res) => {
  // 打印调试信息
  console.log('注册请求 - 请求体:', JSON.stringify(req.body));
  console.log('Content-Type:', req.headers['content-type']);
  console.log('文件:', req.file);

  try {
    // 验证请求体是否存在
    if (!req.body) {
      return res.status(400).json({
        message: '请求体为空',
        debug: { headers: req.headers }
      });
    }
    // 解构请求体参数
    const { username, password, student_id, email } = req.body;
    const bio = req.body.bio || '';
    // 验证必要字段
    if (!username || !password || !student_id || !email) {
      return res.status(400).json({
        message: '请提供所有必要信息（用户名、密码、学号、邮箱）',
        received: { username: !!username, password: !!password, student_id: !!student_id, email: !!email }
      });
    }
    // 如果没有上传头像，使用默认头像
    const avatar = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-avatar.png';
    try {
      // 密码加密
      const hashedPassword = await bcrypt.hash(password, 10);
      // 插入新用户到数据库
      const query = `
        INSERT INTO users (username, password, avatar, student_id, bio, email, role)
        VALUES (?, ?, ?, ?, ?, ?, 'student')
      `;
      db.query(
        query,
        [username, hashedPassword, avatar, student_id, bio, email],
        (err, result) => {
          if (err) {
            console.error('注册失败:', err);
            if (err.code === 'ER_DUP_ENTRY') {
              if (err.sqlMessage.includes('username')) {
                return res.status(400).json({ message: '用户名已存在' });
              } else if (err.sqlMessage.includes('email')) {
                return res.status(400).json({ message: '邮箱已被注册' });
              } else if (err.sqlMessage.includes('student_id')) {
                return res.status(400).json({ message: '学号已被注册' });
              }
              return res.status(400).json({ message: '该信息已被注册', error: err.sqlMessage });
            }
            return res.status(500).json({ message: '注册过程中发生错误', error: err.message });
          }
          // 获取创建的用户信息
          const getUserQuery = 'SELECT id, username, avatar, student_id, bio, email, role FROM users WHERE id = ?';
          db.query(getUserQuery, [result.insertId], (err, userResults) => {
            if (err || userResults.length === 0) {
              return res.status(201).json({
                message: '注册成功',
                userId: result.insertId
              });
            }
            // 创建 JWT
            const token = jwt.sign(
              {
                id: userResults[0].id,
                username: userResults[0].username,
                role: userResults[0].role
              },
              JWT_SECRET,
              { expiresIn: '24h' }
            );
            res.status(201).json({
              message: '注册成功',
              userId: result.insertId,
              user: userResults[0],
              token
            });
          });
        }
      );
    } catch (error) {
      console.error('密码加密失败:', error);
      res.status(500).json({ message: '注册过程中发生错误', error: error.message });
    }
  } catch (error) {
    console.error('注册过程中发生错误:', error);
    res.status(500).json({ message: '注册过程中发生错误', error: error.message });
  }
};

// 用户登录
const login = async (req, res) => {
  console.log('登录请求 - 请求体:', JSON.stringify(req.body));
  console.log('Content-Type:', req.headers['content-type']);

  try {
    // 验证请求体是否存在
    if (!req.body) {
      return res.status(400).json({
        message: '请求体为空',
        debug: { headers: req.headers }
      });
    }
    // 解构请求体参数
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '请提供用户名和密码' });
    }
    // 查询用户
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
      if (err) {
        console.error('登录失败:', err);
        return res.status(500).json({ message: '登录过程中发生错误', error: err.message });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: '用户名或密码不正确' });
      }
      const user = results[0];
      try {
        // 比较密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: '用户名或密码不正确' });
        }
        // 创建 JWT
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        // 不返回密码字段
        delete user.password;
        res.json({
          message: '登录成功',
          token,
          user
        });
      } catch (error) {
        console.error('密码验证失败:', error);
        res.status(500).json({ message: '登录过程中发生错误', error: error.message });
      }
    });
  } catch (error) {
    console.error('登录过程中发生错误:', error);
    res.status(500).json({ message: '登录过程中发生错误', error: error.message });
  }
};

// 获取当前用户信息
const getCurrentUser = (req, res) => {
  const userId = req.user.id;
  // 查询当前用户信息
  const query = 'SELECT id, username, avatar, student_id, bio, email, role, points, created_at FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('获取用户信息失败:', err);
      return res.status(500).json({ message: '获取用户信息时发生错误' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ user: results[0] });
  });
};

// 更新用户信息
const updateUser = (req, res) => {
  const userId = req.params.id;
  const { username, bio, email, role, student_id, points } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;
  // 只允许用户更新自己的信息或由管理员更新
  if (req.user.id != userId && req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权更新他人信息' });
  }
  // 构建更新字段
  let updateFields = [];
  let queryParams = [];
  // 验证邮箱格式
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }
    updateFields.push('email = ?');
    queryParams.push(email);
  }
  // 验证用户名
  if (username) {
    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({ message: '用户名长度必须在2-50个字符之间' });
    }
    updateFields.push('username = ?');
    queryParams.push(username);
  }
  // 验证学号
  if (student_id) {
    if (!/^\d{8,12}$/.test(student_id)) {
      return res.status(400).json({ message: '学号格式不正确' });
    }
    updateFields.push('student_id = ?');
    queryParams.push(student_id);
  }
  if (bio !== undefined) {
    updateFields.push('bio = ?');
    queryParams.push(bio);
  }
  if (avatar) {
    updateFields.push('avatar = ?');
    queryParams.push(avatar);
  }
  // 以下字段只有管理员可以修改
  if (req.user.role === 'admin') {
    if (role && ['admin', 'club_admin', 'student'].includes(role)) {
      updateFields.push('role = ?');
      queryParams.push(role);
    }
    if (points !== undefined) {
      const pointsNum = parseInt(points);
      if (isNaN(pointsNum)) {
        return res.status(400).json({ message: '积分必须是数字' });
      }
      updateFields.push('points = ?');
      queryParams.push(pointsNum);
    }
  }
  if (updateFields.length === 0) {
    return res.status(400).json({ message: '未提供任何要更新的字段' });
  }
  queryParams.push(userId);
  const query = `
    UPDATE users 
    SET ${updateFields.join(', ')} 
    WHERE id = ?
  `;
  // 先检查邮箱是否已存在（排除当前用户）
  if (email) {
    const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
    db.query(checkEmailQuery, [email, userId], (err, results) => {
      if (err) {
        console.error('检查邮箱失败:', err);
        return res.status(500).json({ message: '更新用户时发生错误' });
      }
      if (results.length > 0) {
        return res.status(400).json({ message: '该邮箱已被其他用户使用' });
      }
      // 执行更新操作
      executeUpdate();
    });
  } else {
    // 如果没有更新邮箱，直接执行更新操作
    executeUpdate();
  }
  function executeUpdate() {
    db.query(query, queryParams, (err, result) => {
      if (err) {
        console.error('更新用户失败:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: '用户名或学号已存在' });
        }
        return res.status(500).json({ message: '更新用户时发生错误' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '用户不存在' });
      }
      // 获取更新后的用户信息
      const getUserQuery = 'SELECT id, username, avatar, student_id, bio, email, role, points, created_at FROM users WHERE id = ?';
      db.query(getUserQuery, [userId], (err, results) => {
        if (err || results.length === 0) {
          return res.json({ message: '用户信息已更新' });
        }
        res.json({
          message: '用户信息已更新',
          user: results[0]
        });
      });
    });
  }
};

// 获取用户列表（仅管理员）
const getAllUsers = (req, res) => {
  const query = 'SELECT id, username, avatar, student_id, bio, email, role, points, created_at FROM users';

  db.query(query, (err, results) => {
    if (err) {
      console.error('获取用户列表失败:', err);
      return res.status(500).json({ message: '获取用户列表时发生错误' });
    }

    res.json({ users: results });
  });
};

// 修改用户角色（仅管理员）
const changeUserRole = (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!role || !['admin', 'student', 'club_admin'].includes(role)) {
    return res.status(400).json({ message: '无效的角色' });
  }

  const query = 'UPDATE users SET role = ? WHERE id = ?';

  db.query(query, [role, userId], (err, result) => {
    if (err) {
      console.error('修改用户角色失败:', err);
      return res.status(500).json({ message: '修改用户角色时发生错误' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({ message: '用户角色已更新' });
  });
};

// 删除用户（仅管理员）
const deleteUser = (req, res) => {
  const userId = req.params.id;

  // 防止自我删除
  if (req.user.id == userId) {
    return res.status(400).json({ message: '不能删除当前登录的用户' });
  }

  // 删除用户前先检查是否存在
  const checkUserQuery = 'SELECT * FROM users WHERE id = ?';

  db.query(checkUserQuery, [userId], (err, results) => {
    if (err) {
      console.error('检查用户失败:', err);
      return res.status(500).json({ message: '检查用户时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 由于存在外键约束，需要先检查用户是否与其他表有关联
    const checkRelationsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM club_members WHERE user_id = ?) as club_member_count,
        (SELECT COUNT(*) FROM user_activities WHERE user_id = ?) as activity_count,
        (SELECT COUNT(*) FROM clubs WHERE admin_id = ?) as club_admin_count
    `;

    db.query(checkRelationsQuery, [userId, userId, userId], (err, relationResults) => {
      if (err) {
        console.error('检查用户关联失败:', err);
        return res.status(500).json({ message: '检查用户关联时发生错误' });
      }

      const relations = relationResults[0];

      if (relations.club_member_count > 0 || relations.activity_count > 0 || relations.club_admin_count > 0) {
        return res.status(400).json({
          message: '无法删除该用户，因为他/她还有关联的数据。请先处理以下关联:',
          details: {
            is_club_member: relations.club_member_count > 0,
            has_activities: relations.activity_count > 0,
            is_club_admin: relations.club_admin_count > 0
          }
        });
      }

      // 执行删除用户操作
      const deleteUserQuery = 'DELETE FROM users WHERE id = ?';

      db.query(deleteUserQuery, [userId], (err, result) => {
        if (err) {
          console.error('删除用户失败:', err);
          return res.status(500).json({ message: '删除用户时发生错误' });
        }

        res.json({ message: '用户已成功删除' });
      });
    });
  });
};

// 获取积分排行榜
const getPointsRanking = (req, res) => {
  const { search } = req.query;

  let query = `
    SELECT id, username, avatar, student_id, email, role, points 
    FROM users 
  `;

  // 如果有搜索参数，添加WHERE条件
  if (search) {
    query += `WHERE username LIKE ? OR email LIKE ? OR student_id LIKE ? `;
  }

  // 按积分排序
  query += `ORDER BY points DESC LIMIT 100`;

  const queryParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('获取积分排行榜失败:', err);
      return res.status(500).json({ message: '获取积分排行榜时发生错误' });
    }

    res.json({ rankings: results });
  });
};

// 创建用户（仅管理员）
const createUser = async (req, res) => {
  // 确保req.body存在
  if (!req.body) {
    return res.status(400).json({ message: '请求体为空' });
  }

  const { username, password, email, student_id, role, bio } = req.body;

  // 验证必要字段
  if (!username || !password || !email || !student_id) {
    return res.status(400).json({ message: '请提供所有必要信息（用户名、密码、邮箱、学号）' });
  }

  try {
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 设置角色，确保只有管理员可以创建管理员用户
    let userRole = role || 'student';
    if (userRole === 'admin' && req.user.role !== 'admin') {
      userRole = 'student'; // 非管理员不能创建管理员账户
    }

    // 处理头像上传
    let avatarPath = null;
    if (req.file) {
      avatarPath = '/uploads/' + req.file.filename;
    }

    // 插入新用户
    const query = `
      INSERT INTO users (username, password, student_id, bio, email, role, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [username, hashedPassword, student_id, bio || null, email, userRole, avatarPath],
      (err, result) => {
        if (err) {
          console.error('创建用户失败:', err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '用户名、邮箱或学号已存在' });
          }
          return res.status(500).json({ message: '创建用户过程中发生错误' });
        }

        res.status(201).json({
          message: '用户创建成功',
          userId: result.insertId,
          username: username,
          role: userRole
        });
      }
    );
  } catch (error) {
    console.error('创建用户过程中发生错误:', error);
    res.status(500).json({ message: '创建用户过程中发生错误' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateUser,
  getAllUsers,
  changeUserRole,
  deleteUser,
  getPointsRanking,
  createUser
}; 