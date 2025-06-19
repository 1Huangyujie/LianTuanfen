import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Spin, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { clubAPI } from '../api/api';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;
const { TextArea } = Input;

interface Club {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

const ClubManagement: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs);
    } catch (error) {
      console.error('获取社团列表失败', error);
      message.error('获取社团列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleOpenModal = (club?: Club) => {
    if (club) {
      setModalTitle('编辑社团');
      setEditingClub(club);
      form.setFieldsValue({
        name: club.name,
        description: club.description,
      });
    } else {
      setModalTitle('添加社团');
      setEditingClub(null);
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

      if (editingClub) {
        await clubAPI.updateClub(editingClub.id, values);
        message.success('社团更新成功');
      } else {
        await clubAPI.createClub(values);
        message.success('社团创建成功');
      }

      handleCloseModal();
      fetchClubs();
    } catch (error) {
      console.error('提交表单失败', error);
      message.error('操作失败，请重试');
    }
  };

  const handleDelete = async (clubId: number) => {
    try {
      await clubAPI.deleteClub(clubId);
      message.success('社团删除成功');
      fetchClubs();
    } catch (error) {
      console.error('删除社团失败', error);
      message.error('删除失败，请重试');
    }
  };

  const columns = [
    {
      title: '社团名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '社团描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Club) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            disabled={!isAdmin}
          />
          <Popconfirm
            title="确定要删除这个社团吗？"
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
    <div className="club-management-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <TeamOutlined style={{ marginRight: 10 }} />
            社团管理
          </Title>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加社团
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
            dataSource={clubs}
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
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="社团名称"
            rules={[{ required: true, message: '请输入社团名称' }]}
          >
            <Input placeholder="请输入社团名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="社团描述"
            rules={[{ required: true, message: '请输入社团描述' }]}
          >
            <TextArea rows={4} placeholder="请输入社团描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClubManagement; 