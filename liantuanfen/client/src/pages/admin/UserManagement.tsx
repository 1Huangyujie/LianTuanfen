import React, { useEffect, useState, useContext } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Spin, Popconfirm, Select, Tag, Avatar, Row, Col, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import { userAPI } from '../../api/api';
import { AuthContext } from '../../contexts/AuthContext';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  points: number;
  avatar?: string;
  student_id?: string;
  bio?: string;
}

// 用户管理页面组件
const UserManagement: React.FC = () => {
  // 用户列表
  const [users, setUsers] = useState<User[]>([]);
  // 搜索过滤后的用户列表
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  // 加载状态
  const [loading, setLoading] = useState<boolean>(true);
  // 控制弹窗显示
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  // 弹窗标题
  const [modalTitle, setModalTitle] = useState<string>('');
  // 当前正在编辑的用户
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // antd表单实例
  const [form] = Form.useForm();
  // 当前登录用户信息
  const { user } = useContext(AuthContext);
  // 是否为管理员
  const isAdmin = user?.role === 'admin';
  // 搜索关键词
  const [searchTerm, setSearchTerm] = useState<string>('');
  // 头像上传文件列表
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 获取所有用户
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      const usersList = response.data.users || [];
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      console.error('获取用户列表失败', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取用户列表
  useEffect(() => {
    fetchUsers();
  }, []);

  // 搜索用户（用户名或学号）
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        user =>
          user.username.toLowerCase().includes(value.toLowerCase()) ||
          (user.student_id && user.student_id.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  };

  // 打开弹窗（添加或编辑用户）
  const handleOpenModal = (user?: User) => {
    if (user) {
      setModalTitle('编辑用户');
      setEditingUser(user);
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        student_id: user.student_id,
        bio: user.bio,
      });
      // 如果有头像，设置头像文件
      if (user.avatar) {
        setFileList([
          {
            uid: '-1',
            name: 'avatar.png',
            status: 'done',
            url: `http://localhost:5000${user.avatar}`
          }
        ]);
      } else {
        setFileList([]);
      }
    } else {
      setModalTitle('添加用户');
      setEditingUser(null);
      form.resetFields();
      form.setFieldsValue({ role: 'student', points: 0 });
      setFileList([]);
    }
    setModalVisible(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalVisible(false);
    form.resetFields();
    setFileList([]);
  };

  // 上传头像前的校验
  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB!');
    }
    return false;
  };

  // 头像文件变化时处理
  const handleFileChange = (info: any) => {
    setFileList(info.fileList.slice(-1));
  };

  // 提交表单（添加或编辑用户）
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      // 处理基本字段
      Object.keys(values).forEach(key => {
        // 跳过空值，但保留数字0
        if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
          if (key === 'points') {
            formData.append(key, String(values[key]));
          } else {
            formData.append(key, values[key]);
          }
        }
      });
      // 处理头像
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('avatar', fileList[0].originFileObj);
      }
      if (editingUser) {
        // 编辑用户
        try {
          const response = await userAPI.updateUser(editingUser.id, formData);
          if (response.data) {
            message.success('用户信息更新成功');
            handleCloseModal();
            fetchUsers();
          }
        } catch (error: any) {
          if (error.response?.data?.message) {
            message.error(error.response.data.message);
          } else if (error.message === 'Network Error') {
            message.error('网络错误，请检查网络连接');
          } else {
            message.error('更新用户信息失败，请重试');
          }
          console.error('更新用户失败:', error);
        }
      } else {
        // 添加用户
        try {
          const response = await userAPI.createUser(formData);
          if (response.data) {
            message.success('用户添加成功');
            handleCloseModal();
            fetchUsers();
          }
        } catch (error: any) {
          if (error.response?.data?.message) {
            message.error(error.response.data.message);
          } else if (error.message === 'Network Error') {
            message.error('网络错误，请检查网络连接');
          } else {
            message.error('添加用户失败，请重试');
          }
          console.error('添加用户失败:', error);
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('请检查表单填写是否正确');
    }
  };

  // 删除用户
  const handleDelete = async (userId: number) => {
    try {
      await userAPI.deleteUser(userId);
      message.success('用户删除成功');
      fetchUsers();
    } catch (error: any) {
      console.error('删除用户失败', error);
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('删除失败，请重试');
      }
    }
  };

  // 修改用户角色
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await userAPI.changeUserRole(userId, newRole);
      message.success('用户角色修改成功');
      fetchUsers();
    } catch (error) {
      console.error('修改用户角色失败', error);
      message.error('操作失败，请重试');
    }
  };

  // 获取角色颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red';
      case 'club_admin':
        return 'blue';
      case 'student':
        return 'green';
      default:
        return 'default';
    }
  };

  // 获取角色标签
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'club_admin':
        return '社团管理员';
      case 'student':
        return '学生';
      default:
        return '未知';
    }
  };

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 80,
      render: (avatar: string, record: User) => (
        <Avatar
          src={avatar ? `http://localhost:5000${avatar}` : undefined}
          icon={!avatar ? <UserOutlined /> : undefined}
        />
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '学号',
      dataIndex: 'student_id',
      key: 'student_id',
    },
    {
      title: '个人简介',
      dataIndex: 'bio',
      key: 'bio',
      ellipsis: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: User) => (
        <Select
          value={role}
          style={{ width: 120 }}
          onChange={(value) => handleRoleChange(record.id, value)}
          disabled={!isAdmin || record.id === user?.id}
        >
          <Option value="admin">
            <Tag color="red">管理员</Tag>
          </Option>
          <Option value="club_admin">
            <Tag color="blue">社团管理员</Tag>
          </Option>
          <Option value="student">
            <Tag color="green">学生</Tag>
          </Option>
        </Select>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      sorter: (a: User, b: User) => a.points - b.points,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: User) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            disabled={!isAdmin}
          />
          <Popconfirm
            title="确定要删除该用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!isAdmin || record.id === user?.id}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={!isAdmin || record.id === user?.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="user-management-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <UserOutlined style={{ marginRight: 10 }} />
            用户管理
          </Title>
          <div>
            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
                style={{ marginRight: 16 }}
              >
                添加用户
              </Button>
            )}
          </div>
        </div>

        <Row style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索用户名或学号"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              value={searchTerm}
            />
          </Col>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        okText="提交"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="avatar"
            label="头像"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              maxCount={1}
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传头像</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item
            name="student_id"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input placeholder="请输入学号" />
          </Form.Item>

          <Form.Item
            name="bio"
            label="个人简介"
          >
            <Input.TextArea placeholder="请输入个人简介" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="club_admin">社团管理员</Option>
              <Option value="student">学生</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="points"
            label="积分"
            rules={[{ required: true, message: '请输入积分' }]}
          >
            <Input type="number" placeholder="请输入积分" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement; 