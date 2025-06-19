import React, { useEffect, useState, useContext } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Spin, Popconfirm, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { userAPI, clubAPI } from '../api/api';
import { AuthContext } from '../contexts/AuthContext';

const { Title } = Typography;
const { Option } = Select;

interface Member {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  student_id: string;
  role: string;
  points: number;
  joined_clubs: string[];
}

interface Club {
  id: number;
  name: string;
}

const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form] = Form.useForm();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      setMembers(response.data.users || []);
    } catch (error) {
      console.error('获取会员列表失败', error);
      message.error('获取会员列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs || []);
    } catch (error) {
      console.error('获取社团列表失败', error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchClubs();
  }, []);

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setModalTitle('编辑会员');
      setEditingMember(member);
      form.setFieldsValue({
        name: member.name,
        email: member.email,
        phone: member.phone,
        student_id: member.student_id,
        role: member.role,
        points: member.points,
        joined_clubs: member.joined_clubs,
      });
    } else {
      setModalTitle('添加会员');
      setEditingMember(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingMember) {
        await userAPI.updateUser(editingMember.id, values);
        message.success('会员信息更新成功');
      } else {
        await userAPI.createUser(values);
        message.success('会员添加成功');
      }

      handleCloseModal();
      fetchMembers();
    } catch (error) {
      console.error('提交表单失败', error);
      message.error('操作失败，请重试');
    }
  };

  const handleDelete = async (memberId: number) => {
    try {
      await userAPI.deleteUser(memberId);
      message.success('会员删除成功');
      fetchMembers();
    } catch (error) {
      console.error('删除会员失败', error);
      message.error('删除失败，请重试');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red';
      case 'club_admin':
        return 'blue';
      case 'member':
        return 'green';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '学号',
      dataIndex: 'student_id',
      key: 'student_id',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {role === 'admin' ? '管理员' :
            role === 'club_admin' ? '社团管理员' :
              role === 'member' ? '普通会员' : '未知'}
        </Tag>
      )
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
    },
    {
      title: '加入的社团',
      dataIndex: 'joined_clubs',
      key: 'joined_clubs',
      render: (joined_clubs: string[]) => (
        <>
          {joined_clubs && joined_clubs.map(club => (
            <Tag color="cyan" key={club}>
              {club}
            </Tag>
          ))}
        </>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Member) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            disabled={!isAdmin}
          />
          <Popconfirm
            title="确定要删除这个会员吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!isAdmin}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={!isAdmin}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="member-management-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <TeamOutlined style={{ marginRight: 10 }} />
            会员管理
          </Title>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加会员
            </Button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={members}
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
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
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

          <Form.Item
            name="phone"
            label="电话"
            rules={[
              { required: true, message: '请输入电话号码' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input placeholder="请输入电话号码" />
          </Form.Item>

          <Form.Item
            name="student_id"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input placeholder="请输入学号" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="club_admin">社团管理员</Option>
              <Option value="member">普通会员</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="points"
            label="积分"
            rules={[{ required: true, message: '请输入积分' }]}
          >
            <Input type="number" placeholder="请输入积分" />
          </Form.Item>

          <Form.Item
            name="joined_clubs"
            label="加入的社团"
          >
            <Select
              mode="multiple"
              placeholder="请选择加入的社团"
              optionFilterProp="children"
            >
              {clubs.map(club => (
                <Option key={club.id} value={club.name}>{club.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemberManagement; 