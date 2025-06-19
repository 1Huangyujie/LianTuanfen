const mysql = require('mysql2');

// 数据库连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'liantuanfen'
});

// 创建社团
const createClub = (req, res) => {
  const { name, description } = req.body;
  const logo = req.file ? `/uploads/${req.file.filename}` : null;
  const admin_id = req.user.id;

  if (!name || !description) {
    return res.status(400).json({ message: '请提供社团名称和描述' });
  }

  const query = `
    INSERT INTO clubs (name, description, logo, admin_id)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [name, description, logo, admin_id], (err, result) => {
    if (err) {
      console.error('创建社团失败:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: '社团名称已存在' });
      }
      return res.status(500).json({ message: '创建社团时发生错误' });
    }

    // 将创建者添加为社团会长
    const clubId = result.insertId;
    const memberQuery = `
      INSERT INTO club_members (user_id, club_id, role)
      VALUES (?, ?, 'president')
    `;

    db.query(memberQuery, [admin_id, clubId], (err) => {
      if (err) {
        console.error('添加社团会长失败:', err);
        return res.status(500).json({ message: '添加社团会长时发生错误' });
      }

      // 始终将创建者更新为社团管理员角色，除非是系统管理员
      if (req.user.role !== 'admin') {
        const updateRoleQuery = `
          UPDATE users SET role = 'club_admin' WHERE id = ?
        `;

        db.query(updateRoleQuery, [admin_id], (err) => {
          if (err) {
            console.error('更新用户角色失败:', err);
            // 即使更新角色失败，社团创建仍然成功，所以继续
          }
        });
      }

      res.status(201).json({
        message: '社团创建成功',
        clubId,
        club: {
          id: clubId,
          name,
          description,
          logo,
          admin_id
        }
      });
    });
  });
};

// 获取所有社团
const getAllClubs = (req, res) => {
  const query = `
    SELECT c.*, 
      (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as member_count 
    FROM clubs c
    ORDER BY c.name
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('获取社团列表失败:', err);
      return res.status(500).json({ message: '获取社团列表时发生错误' });
    }

    // 如果用户已登录，检查用户加入的社团
    if (req.user) {
      const userId = req.user.id;
      const userClubsQuery = `
        SELECT club_id FROM club_members WHERE user_id = ?
      `;

      db.query(userClubsQuery, [userId], (err, userClubs) => {
        if (err) {
          console.error('获取用户社团失败:', err);
          return res.status(500).json({ message: '获取用户社团时发生错误' });
        }

        // 获取用户加入的社团ID列表
        const userClubIds = userClubs.map(club => club.club_id);

        // 标记用户已加入的社团
        const clubsWithJoinStatus = results.map(club => ({
          ...club,
          is_member: userClubIds.includes(club.id)
        }));

        res.json({ clubs: clubsWithJoinStatus });
      });
    } else {
      // 未登录用户，所有社团都未加入
      const clubsWithJoinStatus = results.map(club => ({
        ...club,
        is_member: false
      }));

      res.json({ clubs: clubsWithJoinStatus });
    }
  });
};

// 获取单个社团详情
const getClubById = async (req, res) => {
  const clubId = req.params.id;
  const query = `
    SELECT c.*, 
      (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as member_count
    FROM clubs c 
    WHERE c.id = ?
  `;

  db.query(query, [clubId], (err, results) => {
    if (err) {
      console.error('获取社团详情失败:', err);
      return res.status(500).json({ message: '获取社团详情时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '社团不存在' });
    }

    const club = results[0];

    // 获取社团成员
    const membersQuery = `
      SELECT u.id, u.username, u.avatar, cm.role
      FROM club_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ?
      ORDER BY 
        CASE 
          WHEN cm.role = 'president' THEN 1
          WHEN cm.role = 'officer' THEN 2
          ELSE 3
        END,
        cm.joined_at DESC
    `;

    db.query(membersQuery, [clubId], (err, memberResults) => {
      if (err) {
        console.error('获取成员列表失败:', err);
        return res.status(500).json({ message: '获取成员列表时发生错误' });
      }

      // 设置成员列表
      const members = memberResults;

      // 检查当前用户是否已加入社团
      let isJoined = false;
      if (req.user) {
        isJoined = members.some(member => member.id === req.user.id);
      }

      res.json({
        club,
        members,
        is_joined: isJoined
      });
    });
  });
};

// 更新社团信息
const updateClub = (req, res) => {
  const clubId = req.params.id;
  const { name, description } = req.body;
  const logo = req.file ? `/uploads/${req.file.filename}` : null;

  // 检查用户是否有权限更新社团信息
  const checkPermissionQuery = `
    SELECT admin_id FROM clubs WHERE id = ?
  `;

  db.query(checkPermissionQuery, [clubId], (err, results) => {
    if (err) {
      console.error('检查权限失败:', err);
      return res.status(500).json({ message: '检查权限时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '社团不存在' });
    }

    const club = results[0];

    // 只有社团管理员或系统管理员可以更新
    if (club.admin_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权更新社团信息' });
    }

    let updateFields = [];
    let queryParams = [];

    if (name) {
      updateFields.push('name = ?');
      queryParams.push(name);
    }

    if (description) {
      updateFields.push('description = ?');
      queryParams.push(description);
    }

    if (logo) {
      updateFields.push('logo = ?');
      queryParams.push(logo);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: '未提供任何要更新的字段' });
    }

    queryParams.push(clubId);

    const updateQuery = `
      UPDATE clubs 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    db.query(updateQuery, queryParams, (err, result) => {
      if (err) {
        console.error('更新社团失败:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: '社团名称已存在' });
        }
        return res.status(500).json({ message: '更新社团时发生错误' });
      }

      res.json({ message: '社团信息已更新' });
    });
  });
};

// 加入社团
const joinClub = async (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;

  // 检查用户是否已经是社团成员
  const checkMemberQuery = 'SELECT * FROM club_members WHERE club_id = ? AND user_id = ?';

  db.query(checkMemberQuery, [clubId, userId], async (err, results) => {
    if (err) {
      console.error('检查社团成员失败:', err);
      return res.status(500).json({ message: '加入社团时发生错误' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: '您已经是该社团成员' });
    }

    // 检查社团是否存在
    const checkClubQuery = 'SELECT * FROM clubs WHERE id = ?';

    db.query(checkClubQuery, [clubId], async (err, clubResults) => {
      if (err) {
        console.error('检查社团失败:', err);
        return res.status(500).json({ message: '加入社团时发生错误' });
      }

      if (clubResults.length === 0) {
        return res.status(404).json({ message: '社团不存在' });
      }

      // 添加用户到社团成员
      const addMemberQuery = `
        INSERT INTO club_members 
        (club_id, user_id, role, joined_at) 
        VALUES (?, ?, 'member', NOW())
      `;

      db.query(addMemberQuery, [clubId, userId], (err, result) => {
        if (err) {
          console.error('添加社团成员失败:', err);
          return res.status(500).json({ message: '加入社团时发生错误' });
        }

        // 获取更新后的社团信息和成员列表
        const getClubQuery = `
          SELECT c.*, 
            (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as member_count
          FROM clubs c 
          WHERE c.id = ?
        `;

        const getMembersQuery = `
          SELECT u.id, u.username, u.avatar, cm.role
          FROM club_members cm
          JOIN users u ON cm.user_id = u.id
          WHERE cm.club_id = ?
          ORDER BY 
            CASE 
              WHEN cm.role = 'president' THEN 1
              WHEN cm.role = 'officer' THEN 2
              ELSE 3
            END,
            cm.joined_at DESC
        `;

        db.query(getClubQuery, [clubId], (err, clubResults) => {
          if (err) {
            console.error('获取社团信息失败:', err);
            return res.status(500).json({ message: '获取社团信息时发生错误' });
          }

          db.query(getMembersQuery, [clubId], (err, memberResults) => {
            if (err) {
              console.error('获取成员列表失败:', err);
              return res.status(500).json({ message: '获取成员列表时发生错误' });
            }

            const club = clubResults[0];
            club.members = memberResults;

            res.json({
              message: '成功加入社团',
              club: club
            });
          });
        });
      });
    });
  });
};

// 退出社团
const leaveClub = async (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;

  // 检查用户是否是社团成员
  const checkMemberQuery = `
    SELECT cm.*, c.admin_id 
    FROM club_members cm
    JOIN clubs c ON cm.club_id = c.id
    WHERE cm.club_id = ? AND cm.user_id = ?
  `;

  db.query(checkMemberQuery, [clubId, userId], async (err, results) => {
    if (err) {
      console.error('检查社团成员失败:', err);
      return res.status(500).json({ message: '退出社团时发生错误' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: '您不是该社团成员' });
    }

    // 检查是否是社团负责人
    if (results[0].role === 'president') {
      return res.status(400).json({ message: '社团负责人不能退出社团' });
    }

    // 从社团成员中移除用户
    const removeMemberQuery = 'DELETE FROM club_members WHERE club_id = ? AND user_id = ?';

    db.query(removeMemberQuery, [clubId, userId], (err, result) => {
      if (err) {
        console.error('移除社团成员失败:', err);
        return res.status(500).json({ message: '退出社团时发生错误' });
      }

      // 获取更新后的社团信息和成员列表
      const getClubQuery = `
        SELECT c.*, 
          (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as member_count
        FROM clubs c 
        WHERE c.id = ?
      `;

      const getMembersQuery = `
        SELECT u.id, u.username, u.avatar, cm.role
        FROM club_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.club_id = ?
        ORDER BY 
          CASE 
            WHEN cm.role = 'president' THEN 1
            WHEN cm.role = 'officer' THEN 2
            ELSE 3
          END,
          cm.joined_at DESC
      `;

      db.query(getClubQuery, [clubId], (err, clubResults) => {
        if (err) {
          console.error('获取社团信息失败:', err);
          return res.status(500).json({ message: '获取社团信息时发生错误' });
        }

        db.query(getMembersQuery, [clubId], (err, memberResults) => {
          if (err) {
            console.error('获取成员列表失败:', err);
            return res.status(500).json({ message: '获取成员列表时发生错误' });
          }

          const club = clubResults[0];
          club.members = memberResults;

          res.json({
            message: '成功退出社团',
            club: club
          });
        });
      });
    });
  });
};

// 修改社团成员角色
const updateMemberRole = (req, res) => {
  const { userId, role } = req.body;
  const clubId = req.params.id;

  if (!userId || !role || !['member', 'officer', 'president'].includes(role)) {
    return res.status(400).json({ message: '请提供有效的用户ID和角色' });
  }

  // 检查操作者是否有权限（是否是社团会长或管理员）
  const checkPermissionQuery = `
    SELECT c.admin_id, cm.role 
    FROM clubs c
    LEFT JOIN club_members cm ON c.id = cm.club_id AND cm.user_id = ?
    WHERE c.id = ?
  `;

  db.query(checkPermissionQuery, [req.user.id, clubId], (err, results) => {
    if (err) {
      console.error('检查权限失败:', err);
      return res.status(500).json({ message: '检查权限时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '社团不存在' });
    }

    const club = results[0];

    // 只有社团会长或系统管理员可以修改成员角色
    if (club.role !== 'president' && req.user.id !== club.admin_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改社团成员角色' });
    }

    // 更新成员角色
    const updateRoleQuery = 'UPDATE club_members SET role = ? WHERE user_id = ? AND club_id = ?';

    db.query(updateRoleQuery, [role, userId, clubId], (err, result) => {
      if (err) {
        console.error('更新成员角色失败:', err);
        return res.status(500).json({ message: '更新成员角色时发生错误' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '用户不是该社团的成员' });
      }

      // 如果更新角色为会长，需要将当前用户设置为社团管理员
      if (role === 'president') {
        // 更新社团管理员
        const updateClubAdminQuery = 'UPDATE clubs SET admin_id = ? WHERE id = ?';

        db.query(updateClubAdminQuery, [userId, clubId], (err) => {
          if (err) {
            console.error('更新社团管理员失败:', err);
            return res.status(500).json({ message: '更新社团管理员时发生错误' });
          }

          // 将原会长角色更新为干部
          const updateOldPresidentQuery = `
            UPDATE club_members 
            SET role = 'officer' 
            WHERE club_id = ? AND user_id = ? AND user_id != ?
          `;

          db.query(updateOldPresidentQuery, [clubId, req.user.id, userId], (err) => {
            if (err) {
              console.error('更新原会长角色失败:', err);
            }
          });

          // 将新会长角色更新为社团管理员（如果不是管理员）
          const checkUserRoleQuery = 'SELECT role FROM users WHERE id = ?';

          db.query(checkUserRoleQuery, [userId], (err, userResults) => {
            if (err || userResults.length === 0) {
              console.error('检查用户角色失败:', err);
              return res.status(500).json({ message: '检查用户角色时发生错误' });
            }

            if (userResults[0].role === 'student') {
              const updateUserRoleQuery = 'UPDATE users SET role = "club_admin" WHERE id = ?';

              db.query(updateUserRoleQuery, [userId], (err) => {
                if (err) {
                  console.error('更新用户角色失败:', err);
                }
              });
            }
          });
        });
      }

      res.json({ message: '社团成员角色已更新' });
    });
  });
};

// 删除社团（仅社团管理员和系统管理员）
const deleteClub = (req, res) => {
  const clubId = req.params.id;

  // 检查社团是否存在及用户权限
  const checkPermissionQuery = `
    SELECT admin_id FROM clubs WHERE id = ?
  `;

  db.query(checkPermissionQuery, [clubId], (err, results) => {
    if (err) {
      console.error('检查权限失败:', err);
      return res.status(500).json({ message: '检查权限时发生错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '社团不存在' });
    }

    const club = results[0];

    // 只有社团管理员或系统管理员可以删除
    if (club.admin_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除该社团' });
    }

    // 检查社团是否有关联数据
    const checkRelationsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM club_members WHERE club_id = ?) as member_count,
        (SELECT COUNT(*) FROM activities WHERE club_id = ?) as activity_count
    `;

    db.query(checkRelationsQuery, [clubId, clubId], (err, relationResults) => {
      if (err) {
        console.error('检查社团关联失败:', err);
        return res.status(500).json({ message: '检查社团关联时发生错误' });
      }

      const relations = relationResults[0];

      // 如果社团有活动或成员，先删除关联数据
      if (relations.activity_count > 0) {
        return res.status(400).json({
          message: '该社团有关联的活动，无法删除。请先删除社团的所有活动。',
          activity_count: relations.activity_count
        });
      }

      // 先删除社团成员关系
      const deleteMembersQuery = 'DELETE FROM club_members WHERE club_id = ?';

      db.query(deleteMembersQuery, [clubId], (err) => {
        if (err) {
          console.error('删除社团成员失败:', err);
          return res.status(500).json({ message: '删除社团成员时发生错误' });
        }

        // 最后删除社团
        const deleteClubQuery = 'DELETE FROM clubs WHERE id = ?';

        db.query(deleteClubQuery, [clubId], (err) => {
          if (err) {
            console.error('删除社团失败:', err);
            return res.status(500).json({ message: '删除社团时发生错误' });
          }

          res.json({
            message: '社团及其成员已成功删除',
            deleted_members: relations.member_count
          });
        });
      });
    });
  });
};

module.exports = {
  createClub,
  getAllClubs,
  getClubById,
  updateClub,
  joinClub,
  leaveClub,
  updateMemberRole,
  deleteClub
}; 