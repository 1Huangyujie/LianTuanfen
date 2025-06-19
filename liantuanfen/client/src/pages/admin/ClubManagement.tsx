import React, { useEffect, useState, useContext } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Spin, Popconfirm, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import { clubAPI } from '../../api/api';
import { AuthContext } from '../../contexts/AuthContext';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

const { Title } = Typography;
const { TextArea } = Input;

interface Club {
  id: number;
  name: string;
  description: string;
  member_count: number;
  logo?: string;
  created_at: string;
}

const ClubManagement: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();
  const { user } = useContext(AuthContext);
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
        description: club.description
      });
      setFileList(club.logo ? [
        {
          uid: '-1',
          name: 'logo.png',
          status: 'done',
          url: `http://localhost:5000${club.logo}`
        }
      ] : []);
    } else {
      setModalTitle('添加社团');
      setEditingClub(null);
      form.resetFields();
      setFileList([]);
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    form.resetFields();
    setFileList([]);
  };

  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片必须小于2MB!');
    }
    return isJpgOrPng && isLt2M;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();

      formData.append('name', values.name);
      formData.append('description', values.description);

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('logo', fileList[0].originFileObj as RcFile);
      }

      if (editingClub) {
        await clubAPI.updateClub(editingClub.id, formData);
        message.success('社团更新成功');
      } else {
        await clubAPI.createClub(formData);
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
      render: (text: string, record: Club) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {record.logo ? (
            <img
              src={`http://localhost:5000${record.logo}`}
              alt={record.name}
              style={{ width: 40, height: 40, marginRight: 10, objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <div style={{
              width: 40,
              height: 40,
              marginRight: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f0f0f0',
              borderRadius: '50%'
            }}>
              <TeamOutlined style={{ fontSize: 20 }} />
            </div>
          )}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '社团描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '成员数量',
      dataIndex: 'member_count',
      key: 'member_count',
      sorter: (a: Club, b: Club) => a.member_count - b.member_count,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
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

  const handleFileChange = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList);
  };

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
        width={600}
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

          <Form.Item
            name="logo"
            label="社团Logo"
            valuePropName="fileList"
            getValueFromEvent={e => e.fileList}
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              maxCount={1}
              customRequest={({ onSuccess }) => {
                setTimeout(() => {
                  onSuccess && onSuccess("ok");
                }, 0);
              }}
            >
              {fileList.length < 1 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传Logo</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClubManagement; 