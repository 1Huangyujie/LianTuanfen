const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

// 数据库连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'liantuanfen'
});

// 检查并添加字段
const checkAndAddColumns = () => {
  // 检查max_participants字段
  const checkMaxParticipantsQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'liantuanfen' 
    AND TABLE_NAME = 'activities' 
    AND COLUMN_NAME = 'max_participants'
  `;

  db.query(checkMaxParticipantsQuery, (err, results) => {
    if (err) {
      console.error('检查max_participants字段失败:', err);
      return;
    }

    if (results.length === 0) {
      // 添加max_participants字段
      const addMaxParticipantsQuery = `
        ALTER TABLE activities
        ADD COLUMN max_participants INT DEFAULT 100 AFTER points
      `;

      db.query(addMaxParticipantsQuery, (err) => {
        if (err) {
          console.error('添加max_participants字段失败:', err);
        } else {
          console.log('成功添加max_participants字段');
        }
      });
    }
  });

  // 检查image_url字段
  const checkImageUrlQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'liantuanfen' 
    AND TABLE_NAME = 'activities' 
    AND COLUMN_NAME = 'image_url'
  `;

  db.query(checkImageUrlQuery, (err, results) => {
    if (err) {
      console.error('检查image_url字段失败:', err);
      return;
    }

    if (results.length === 0) {
      // 添加image_url字段
      const addImageUrlQuery = `
        ALTER TABLE activities
        ADD COLUMN image_url VARCHAR(255) AFTER max_participants
      `;

      db.query(addImageUrlQuery, (err) => {
        if (err) {
          console.error('添加image_url字段失败:', err);
        } else {
          console.log('成功添加image_url字段');
        }
      });
    }
  });
};

// 在初始化时检查并添加字段
checkAndAddColumns();

// 创建活动
const createActivity = (req, res) => {
  // 确保req.body存在
  if (!req.body) {
    return res.status(400).json({ message: '请求体为空' });
  }
  // 解构请求体参数
  const { title, description, club_id, location, start_time, end_time, points, max_participants } = req.body;
  // 校验必要字段
  if (!title || !description || !club_id || !location || !start_time || !end_time) {
    return res.status(400).json({ message: '请提供所有必要的活动信息' });
  }
  // 处理图片上传
  let imagePath = null;
  if (req.file) {
    imagePath = '/uploads/activities/' + req.file.filename;
    console.log('活动图片已上传:', imagePath);
  }
  // 检查用户是否有权限创建活动
  const checkPermissionQuery = `
    SELECT c.id, c.admin_id 
    FROM clubs c 
    WHERE c.id = ?
  `;
  db.query(checkPermissionQuery, [club_id], (err, results) => {
    if (err) {
      console.error('检查权限失败:', err);
      return res.status(500).json({ message: '检查权限时发生错误' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: '社团不存在' });
    }
    const club = results[0];
    // 允许系统管理员和社团管理员创建活动
    if (req.user.role !== 'admin' && req.user.role !== 'club_admin') {
      return res.status(403).json({ message: '您没有权限创建活动' });
    }
    // 如果是社团管理员，需校验是否为该社团的管理员
    if (req.user.role === 'club_admin' && club.admin_id !== req.user.id) {
      return res.status(403).json({ message: '您不是此社团的管理员，无法为该社团创建活动' });
    }
    // 创建活动SQL
    const createActivityQuery = `
      INSERT INTO activities (title, description, club_id, location, start_time, end_time, points, max_participants, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // 设置默认积分和最大参与人数
    const activityPoints = points || 0;
    const maxParticipants = max_participants || 100;
    // 管理员创建的活动直接通过，社团管理员需审核
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    db.query(
      createActivityQuery,
      [title, description, club_id, location, start_time, end_time, activityPoints, maxParticipants, status, imagePath],
      (err, result) => {
        if (err) {
          console.error('创建活动失败:', err);
          return res.status(500).json({ message: '创建活动时发生错误' });
        }
        res.status(201).json({
          message: '活动创建成功，' + (status === 'pending' ? '等待审核' : '已自动审核通过'),
          activityId: result.insertId,
          status
        });
      }
    );
  });
};

// 获取所有活动
const getAllActivities = (req, res) => {
  let query = `
    SELECT a.*, c.name as club_name, c.logo as club_logo,
    (SELECT COUNT(*) FROM user_activities WHERE activity_id = a.id) as current_participants
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
  `;
  let queryParams = [];
  // 可根据状态和社团筛选
  const { status, club_id } = req.query;
  let conditions = [];
  if (status) {
    conditions.push('a.status = ?');
    queryParams.push(status);
  }
  if (club_id) {
    conditions.push('a.club_id = ?');
    queryParams.push(club_id);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  // 按时间倒序
  query += ' ORDER BY a.start_time DESC';
  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('获取活动列表失败:', err);
      return res.status(500).json({ message: '获取活动列表时发生错误' });
    }
    // 处理活动状态（根据时间动态调整）
    const now = new Date();
    results.forEach(activity => {
      if (activity.status === 'approved') {
        const startTime = new Date(activity.start_time);
        const endTime = new Date(activity.end_time);
        if (now >= startTime && now <= endTime) {
          activity.status = 'ongoing';
        } else if (now > endTime) {
          activity.status = 'completed';
        } else if (now < startTime) {
          activity.status = 'upcoming';
        }
      }
    });
    res.json({ activities: results });
  });
};

// 获取单个活动详情
const getActivityById = (req, res) => {
  const activityId = req.params.id;

  const query = `
    SELECT a.*, c.name as club_name, c.logo as club_logo,
    (SELECT COUNT(*) FROM user_activities WHERE activity_id = a.id) as current_participants
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    WHERE a.id = ?
  `;

  db.query(query, [activityId], (err, results) => {
    if (err) {
      console.error('获取活动详情失败:', err);
      return res.status(500).json({ message: '获取活动详情时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '活动不存在' });
    }

    const activity = results[0];

    // 处理活动状态
    if (activity.status === 'approved') {
      const now = new Date();
      const startTime = new Date(activity.start_time);
      const endTime = new Date(activity.end_time);

      if (now >= startTime && now <= endTime) {
        activity.status = 'ongoing';
      } else if (now > endTime) {
        activity.status = 'completed';
      } else if (now < startTime) {
        activity.status = 'upcoming';
      }
    }

    // 如果有用户认证，检查用户是否已参与
    if (req.user) {
      const checkParticipationQuery = `
        SELECT * FROM user_activities
        WHERE user_id = ? AND activity_id = ?
      `;

      db.query(checkParticipationQuery, [req.user.id, activityId], (err, participationResults) => {
        if (err) {
          console.error('检查用户参与状态失败:', err);
          return res.status(500).json({ message: '检查用户参与状态时发生错误' });
        }

        activity.is_joined = participationResults.length > 0;

        // 获取活动参与者信息
        const participantsQuery = `
          SELECT u.id, u.username as name, u.avatar, ua.created_at as join_time
          FROM user_activities ua
          JOIN users u ON ua.user_id = u.id
          WHERE ua.activity_id = ?
          ORDER BY ua.created_at ASC
        `;

        db.query(participantsQuery, [activityId], (err, participantsResults) => {
          if (err) {
            console.error('获取参与者信息失败:', err);
            return res.status(500).json({ message: '获取参与者信息时发生错误' });
          }

          res.json({
            activity,
            participants: participantsResults
          });
        });
      });
    } else {
      // 获取活动参与者信息
      const participantsQuery = `
        SELECT u.id, u.username as name, u.avatar, ua.created_at as join_time
        FROM user_activities ua
        JOIN users u ON ua.user_id = u.id
        WHERE ua.activity_id = ?
        ORDER BY ua.created_at ASC
      `;

      db.query(participantsQuery, [activityId], (err, participantsResults) => {
        if (err) {
          console.error('获取参与者信息失败:', err);
          return res.status(500).json({ message: '获取参与者信息时发生错误' });
        }

        res.json({
          activity,
          participants: participantsResults
        });
      });
    }
  });
};

// 更新活动信息
const updateActivity = (req, res) => {
  const activityId = req.params.id;

  // 确保req.body存在
  if (!req.body) {
    return res.status(400).json({ message: '请求体为空' });
  }

  const { title, description, club_id, location, start_time, end_time, points, max_participants } = req.body;

  // 处理图片上传
  let imagePath = null;
  if (req.file) {
    imagePath = '/uploads/activities/' + req.file.filename;
    console.log('活动图片已更新:', imagePath);
  }

  // 检查活动是否存在并验证权限
  const checkActivityQuery = `
    SELECT a.*, c.admin_id, a.image_url as current_image_url
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    WHERE a.id = ?
  `;

  db.query(checkActivityQuery, [activityId], (err, results) => {
    if (err) {
      console.error('检查活动失败:', err);
      return res.status(500).json({ message: '检查活动时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '活动不存在' });
    }

    const activity = results[0];
    const oldImageUrl = activity.current_image_url;

    // 检查权限，只有社团管理员或系统管理员可以更新
    if (req.user.role !== 'admin' && (req.user.role !== 'club_admin' || activity.admin_id !== req.user.id)) {
      return res.status(403).json({ message: '您没有权限更新此活动' });
    }

    // 构建更新查询
    let updateFields = [];
    let queryParams = [];

    if (title) {
      updateFields.push('title = ?');
      queryParams.push(title);
    }

    if (description) {
      updateFields.push('description = ?');
      queryParams.push(description);
    }

    if (club_id) {
      updateFields.push('club_id = ?');
      queryParams.push(club_id);
    }

    if (location) {
      updateFields.push('location = ?');
      queryParams.push(location);
    }

    if (start_time) {
      updateFields.push('start_time = ?');
      queryParams.push(start_time);
    }

    if (end_time) {
      updateFields.push('end_time = ?');
      queryParams.push(end_time);
    }

    if (points !== undefined) {
      updateFields.push('points = ?');
      queryParams.push(points);
    }

    if (max_participants !== undefined) {
      updateFields.push('max_participants = ?');
      queryParams.push(max_participants);
    }

    if (imagePath) {
      updateFields.push('image_url = ?');
      queryParams.push(imagePath);

      // 如果有旧图片，可以在更新成功后删除
      // 注意这里不直接删除，而是在更新成功后处理
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: '未提供任何要更新的字段' });
    }

    // 更新之后，活动需要重新审核（除非是系统管理员）
    if (req.user.role !== 'admin') {
      updateFields.push('status = ?');
      queryParams.push('pending');
    }

    queryParams.push(activityId);

    const updateQuery = `
      UPDATE activities 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    db.query(updateQuery, queryParams, (err, result) => {
      if (err) {
        console.error('更新活动失败:', err);
        return res.status(500).json({ message: '更新活动时发生错误' });
      }

      // 如果更新了图片且旧图片存在，尝试删除旧图片文件
      if (imagePath && oldImageUrl) {
        try {
          const oldImagePath = path.join(__dirname, '..', '..', oldImageUrl.substring(1));
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('旧图片已删除:', oldImagePath);
          }
        } catch (error) {
          console.error('删除旧图片失败:', error);
          // 这里不需要向客户端返回错误，因为更新已经成功
        }
      }

      res.json({
        message: '活动已更新' + (req.user.role !== 'admin' ? '，等待重新审核' : ''),
        activity_id: activityId,
        image_url: imagePath || oldImageUrl
      });
    });
  });
};

// 审核活动（仅管理员）
const reviewActivity = (req, res) => {
  const activityId = req.params.id;
  const { status, feedback } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: '请提供有效的审核状态' });
  }

  // 更新活动状态
  const updateQuery = `
    UPDATE activities 
    SET status = ?, feedback = ? 
    WHERE id = ?
  `;

  db.query(updateQuery, [status, feedback || null, activityId], (err, result) => {
    if (err) {
      console.error('审核活动失败:', err);
      return res.status(500).json({ message: '审核活动时发生错误' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '活动不存在' });
    }

    res.json({ message: `活动已${status === 'approved' ? '通过' : '拒绝'}审核` });
  });
};

// 参与活动
const joinActivity = (req, res) => {
  const activityId = req.params.id;
  const userId = req.user.id;

  // 检查活动是否存在且已审核通过
  const checkActivityQuery = `
    SELECT * FROM activities 
    WHERE id = ? AND status = 'approved'
  `;

  db.query(checkActivityQuery, [activityId], (err, results) => {
    if (err) {
      console.error('检查活动失败:', err);
      return res.status(500).json({ message: '检查活动时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '活动不存在或未通过审核' });
    }

    const activity = results[0];
    const now = new Date();
    const startTime = new Date(activity.start_time);
    const endTime = new Date(activity.end_time);

    // 计算开始时间前一小时
    const oneHourBeforeStart = new Date(startTime);
    oneHourBeforeStart.setHours(startTime.getHours() - 1);

    // 检查活动是否已经结束
    if (now > endTime) {
      return res.status(400).json({ message: '活动已结束，无法报名' });
    }

    // 检查活动是否正在进行，且不在开始前一小时内
    if (now > startTime && now < oneHourBeforeStart) {
      return res.status(400).json({ message: '活动已经开始，无法报名' });
    }

    // 检查当前参与人数是否已达上限
    const checkParticipantsCountQuery = `
      SELECT COUNT(*) as count FROM user_activities
      WHERE activity_id = ?
    `;

    db.query(checkParticipantsCountQuery, [activityId], (err, countResults) => {
      if (err) {
        console.error('检查参与人数失败:', err);
        return res.status(500).json({ message: '检查参与人数时发生错误' });
      }

      const currentParticipants = countResults[0].count;

      if (currentParticipants >= activity.max_participants) {
        return res.status(400).json({ message: '活动报名人数已达上限' });
      }

      // 检查用户是否已参与该活动
      const checkParticipationQuery = `
        SELECT * FROM user_activities
        WHERE user_id = ? AND activity_id = ?
      `;

      db.query(checkParticipationQuery, [userId, activityId], (err, participationResults) => {
        if (err) {
          console.error('检查用户参与状态失败:', err);
          return res.status(500).json({ message: '检查用户参与状态时发生错误' });
        }

        if (participationResults.length > 0) {
          return res.status(400).json({ message: '您已经报名参加此活动' });
        }

        // 报名参加活动
        const joinActivityQuery = `
          INSERT INTO user_activities (user_id, activity_id, status)
          VALUES (?, ?, 'registered')
        `;

        db.query(joinActivityQuery, [userId, activityId], (err) => {
          if (err) {
            console.error('参与活动失败:', err);
            return res.status(500).json({ message: '参与活动时发生错误' });
          }

          res.json({ message: '成功报名参加活动' });
        });
      });
    });
  });
};

// 完成活动并获取积分
const completeActivity = (req, res) => {
  const activityId = req.params.id;
  const { user_ids } = req.body;

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: '请提供参与用户ID列表' });
  }

  // 检查活动是否存在且已审核通过
  const checkActivityQuery = 'SELECT * FROM activities WHERE id = ? AND status = "approved"';

  db.query(checkActivityQuery, [activityId], (err, activities) => {
    if (err) {
      console.error('检查活动失败:', err);
      return res.status(500).json({ message: '检查活动时发生错误' });
    }

    if (activities.length === 0) {
      return res.status(404).json({ message: '活动不存在或未通过审核' });
    }

    const activity = activities[0];

    // 检查权限，只有社团管理员或系统管理员可以标记完成
    const checkPermissionQuery = 'SELECT admin_id FROM clubs WHERE id = ?';

    db.query(checkPermissionQuery, [activity.club_id], (err, clubs) => {
      if (err) {
        console.error('检查权限失败:', err);
        return res.status(500).json({ message: '检查权限时发生错误' });
      }

      if (clubs.length === 0) {
        return res.status(404).json({ message: '社团不存在' });
      }

      const club = clubs[0];

      if (req.user.role !== 'admin' && club.admin_id !== req.user.id) {
        return res.status(403).json({ message: '您没有权限完成此活动' });
      }

      // 更新用户活动状态为已完成并添加积分
      const updateParticipantsQuery = `
        UPDATE user_activities 
        SET status = 'completed', earned_points = ?
        WHERE activity_id = ? AND user_id IN (?) AND status IN ('registered', 'participated')
      `;

      db.query(updateParticipantsQuery, [activity.points, activityId, user_ids], (err, result) => {
        if (err) {
          console.error('更新参与状态失败:', err);
          return res.status(500).json({ message: '更新参与状态时发生错误' });
        }

        const affectedUsers = result.affectedRows;

        // 为用户增加积分
        if (affectedUsers > 0) {
          const updateUserPointsQuery = `
            UPDATE users u
            JOIN user_activities ua ON u.id = ua.user_id
            SET u.points = u.points + ua.earned_points
            WHERE ua.activity_id = ? AND ua.user_id IN (?) AND ua.status = 'completed'
          `;

          db.query(updateUserPointsQuery, [activityId, user_ids], (err) => {
            if (err) {
              console.error('更新用户积分失败:', err);
              return res.status(500).json({ message: '更新用户积分时发生错误' });
            }

            // 更新活动状态为已完成
            const updateActivityQuery = 'UPDATE activities SET status = "completed" WHERE id = ?';

            db.query(updateActivityQuery, [activityId], (err) => {
              if (err) {
                console.error('更新活动状态失败:', err);
              }
            });

            res.json({
              message: '活动完成，已为参与者添加积分',
              affected_users: affectedUsers
            });
          });
        } else {
          res.status(400).json({ message: '没有符合条件的用户需要更新' });
        }
      });
    });
  });
};

// 获取待审核活动
const getPendingActivities = (req, res) => {
  const query = `
    SELECT a.*, c.name as club_name, c.logo as club_logo,
    (SELECT COUNT(*) FROM user_activities WHERE activity_id = a.id) as current_participants
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    WHERE a.status = 'pending'
    ORDER BY a.created_at ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('获取待审核活动失败:', err);
      return res.status(500).json({ message: '获取待审核活动时发生错误' });
    }

    res.json({ activities: results });
  });
};

// 删除活动
const deleteActivity = (req, res) => {
  const activityId = req.params.id;

  // 检查活动是否存在并验证权限
  const checkActivityQuery = `
    SELECT a.*, c.admin_id, c.name as club_name
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    WHERE a.id = ?
  `;

  db.query(checkActivityQuery, [activityId], (err, results) => {
    if (err) {
      console.error('检查活动失败:', err);
      return res.status(500).json({ message: '检查活动时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '活动不存在' });
    }

    const activity = results[0];

    // 检查权限，只有社团管理员或系统管理员可以删除
    if (req.user.role !== 'admin' && activity.admin_id !== req.user.id) {
      return res.status(403).json({ message: '您没有权限删除此活动' });
    }

    // 检查活动是否有参与者
    const checkParticipantsQuery = `
      SELECT COUNT(*) as participant_count 
      FROM user_activities 
      WHERE activity_id = ?
    `;

    db.query(checkParticipantsQuery, [activityId], (err, participantResults) => {
      if (err) {
        console.error('检查活动参与者失败:', err);
        return res.status(500).json({ message: '检查活动参与者时发生错误' });
      }

      const participantCount = participantResults[0].participant_count;

      // 如果有人参与，先删除参与记录
      if (participantCount > 0) {
        const deleteParticipantsQuery = `
          DELETE FROM user_activities 
          WHERE activity_id = ?
        `;

        db.query(deleteParticipantsQuery, [activityId], (err) => {
          if (err) {
            console.error('删除活动参与记录失败:', err);
            return res.status(500).json({ message: '删除活动参与记录时发生错误' });
          }

          // 删除活动本身
          deleteActivityRecord(activityId, res, activity.club_name, participantCount);
        });
      } else {
        // 直接删除活动
        deleteActivityRecord(activityId, res, activity.club_name, 0);
      }
    });
  });
};

// 辅助函数：删除活动记录
const deleteActivityRecord = (activityId, res, clubName, participantCount) => {
  const deleteQuery = 'DELETE FROM activities WHERE id = ?';

  db.query(deleteQuery, [activityId], (err) => {
    if (err) {
      console.error('删除活动失败:', err);
      return res.status(500).json({ message: '删除活动时发生错误' });
    }

    res.json({
      message: '活动已成功删除',
      club_name: clubName,
      deleted_participants: participantCount
    });
  });
};

// 获取用户参与的活动
const getUserActivities = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT a.*, c.name as club_name, c.logo as club_logo, ua.status as participation_status, ua.earned_points
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    JOIN user_activities ua ON a.id = ua.activity_id
    WHERE ua.user_id = ?
    ORDER BY a.start_time DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('获取用户参与活动失败:', err);
      return res.status(500).json({ message: '获取用户参与活动时发生错误' });
    }

    res.json({ activities: results });
  });
};

// 获取活动统计数据
const getActivityStats = (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total_activities,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_activities,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_activities,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_activities,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_activities
    FROM activities
  `;

  db.query(statsQuery, (err, results) => {
    if (err) {
      console.error('获取活动统计失败:', err);
      return res.status(500).json({ message: '获取活动统计时发生错误' });
    }

    // 获取当月活动数量
    const currentMonthQuery = `
      SELECT COUNT(*) as current_month_activities
      FROM activities
      WHERE MONTH(start_time) = MONTH(CURRENT_DATE()) 
      AND YEAR(start_time) = YEAR(CURRENT_DATE())
    `;

    db.query(currentMonthQuery, (err, monthResults) => {
      if (err) {
        console.error('获取当月活动数量失败:', err);
        return res.status(500).json({ message: '获取当月活动数量时发生错误' });
      }

      // 获取参与者最多的活动
      const popularQuery = `
        SELECT a.id, a.title, COUNT(ua.id) as participant_count
        FROM activities a
        LEFT JOIN user_activities ua ON a.id = ua.activity_id
        GROUP BY a.id
        ORDER BY participant_count DESC
        LIMIT 5
      `;

      db.query(popularQuery, (err, popularResults) => {
        if (err) {
          console.error('获取热门活动失败:', err);
          return res.status(500).json({ message: '获取热门活动时发生错误' });
        }

        const stats = {
          ...results[0],
          current_month_activities: monthResults[0].current_month_activities,
          popular_activities: popularResults
        };

        res.json({ stats });
      });
    });
  });
};

// 取消报名活动
const leaveActivity = (req, res) => {
  const activityId = req.params.id;
  const userId = req.user.id;

  // 检查活动是否存在
  const checkActivityQuery = `
    SELECT * FROM activities 
    WHERE id = ?
  `;

  db.query(checkActivityQuery, [activityId], (err, activities) => {
    if (err) {
      console.error('检查活动失败:', err);
      return res.status(500).json({ message: '检查活动时发生错误' });
    }

    if (activities.length === 0) {
      return res.status(404).json({ message: '活动不存在' });
    }

    const activity = activities[0];
    const now = new Date();
    const startTime = new Date(activity.start_time);

    // 活动已经开始，不能取消报名
    if (now >= startTime) {
      return res.status(400).json({ message: '活动已经开始，无法取消报名' });
    }

    // 检查用户是否已报名该活动
    const checkRegistrationQuery = `
      SELECT * FROM user_activities
      WHERE user_id = ? AND activity_id = ?
    `;

    db.query(checkRegistrationQuery, [userId, activityId], (err, results) => {
      if (err) {
        console.error('检查报名记录失败:', err);
        return res.status(500).json({ message: '检查报名记录时发生错误' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: '您尚未报名此活动' });
      }

      // 删除报名记录
      const deleteRegistrationQuery = `
        DELETE FROM user_activities
        WHERE user_id = ? AND activity_id = ?
      `;

      db.query(deleteRegistrationQuery, [userId, activityId], (err, result) => {
        if (err) {
          console.error('取消报名失败:', err);
          return res.status(500).json({ message: '取消报名时发生错误' });
        }

        res.json({ message: '已成功取消报名' });
      });
    });
  });
};

module.exports = {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  reviewActivity,
  joinActivity,
  completeActivity,
  getPendingActivities,
  deleteActivity,
  getUserActivities,
  getActivityStats,
  leaveActivity
}; 