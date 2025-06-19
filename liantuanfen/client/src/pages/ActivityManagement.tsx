import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Spin, Popconfirm, DatePicker, Select, InputNumber, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import { activityAPI, clubAPI } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import type { UploadFile, UploadChangeParam } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Activity {
  id: number;
  title: string;
  description: string;
  club_id: number;
  club_name: string;
  location: string;
  start_time: string;
  end_time: string;
  points: number;
  max_participants: number;
  image_url?: string;
}

interface Club {
  id: number;
  name: string;
}

const ActivityManagement: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getAllActivities();
      setActivities(response.data.activities);
    } catch (error) {
      console.error('获取活动列表失败', error);
      message.error('获取活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs);
    } catch (error) {
      console.error('获取社团列表失败', error);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchClubs();
  }, []);

  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setModalTitle('编辑活动');
      setEditingActivity(activity);
      form.setFieldsValue({
        title: activity.title,
        description: activity.description,
        club_id: activity.club_id,
        location: activity.location,
        time_range: [dayjs(activity.start_time), dayjs(activity.end_time)],
        points: activity.points,
        max_participants: activity.max_participants,
      });
      if (activity.image_url) {
        const imageUrl = activity.image_url.startsWith('http')
          ? activity.image_url
          : `http://localhost:5000${activity.image_url}`;

        setFileList([{
          uid: '-1',
          name: 'current-image.jpg',
          status: 'done',
          url: imageUrl,
        }]);
      } else {
        setFileList([]);
      }
    } else {
      setModalTitle('添加活动');
      setEditingActivity(null);
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 转换日期范围为ISO字符串
      const formData = {
        ...values,
        start_time: values.time_range[0].toISOString(),
        end_time: values.time_range[1].toISOString(),
      };

      // 移除time_range字段
      delete formData.time_range;

      // 处理图片上传
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const file = fileList[0].originFileObj as RcFile;
        const formDataWithFile = new FormData();

        // 添加文件和其他字段到FormData
        formDataWithFile.append('image', file);
        Object.keys(formData).forEach(key => {
          formDataWithFile.append(key, formData[key]);
        });

        if (editingActivity) {
          await activityAPI.updateActivity(editingActivity.id, formDataWithFile);
          message.success('活动更新成功');
        } else {
          await activityAPI.createActivity(formDataWithFile);
          message.success('活动创建成功');
        }
      } else {
        // 没有新图片时直接提交JSON数据
        if (editingActivity) {
          await activityAPI.updateActivity(editingActivity.id, formData);
          message.success('活动更新成功');
        } else {
          await activityAPI.createActivity(formData);
          message.success('活动创建成功');
        }
      }

      handleCloseModal();
      fetchActivities();
    } catch (error) {
      console.error('提交表单失败', error);
      message.error('操作失败，请重试');
    }
  };

  const handleDelete = async (activityId: number) => {
    try {
      await activityAPI.deleteActivity(activityId);
      message.success('活动删除成功');
      fetchActivities();
    } catch (error) {
      console.error('删除活动失败', error);
      message.error('删除失败，请重试');
    }
  };

  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG/GIF/WEBP格式的图片!');
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片必须小于5MB!');
    }
    return isJpgOrPng && isLt5M;
  };

  const handleChange = (info: UploadChangeParam) => {
    // 如果上传失败，不更新fileList
    if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败: ${info.file.error}`);
      return;
    }

    // 更新fileList状态
    let newFileList = [...info.fileList];

    // 限制只有一个文件
    newFileList = newFileList.slice(-1);

    // 如果文件已上传并有响应，设置URL
    newFileList = newFileList.map(file => {
      if (file.response) {
        file.url = file.response.url;
      }
      return file;
    });

    setFileList(newFileList);
  };

  // 图片预览功能
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      if (file.originFileObj) {
        file.preview = await getBase64(file.originFileObj as Blob);
      }
    }

    setPreviewImage(file.url || (file.preview as string) || '');
    setPreviewVisible(true);
    setPreviewTitle(file.name || '预览图片');
  };

  const handlePreviewCancel = () => setPreviewVisible(false);

  // 将文件转换为base64以便预览
  const getBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '举办社团',
      dataIndex: 'club_name',
      key: 'club_name',
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
    },
    {
      title: '活动海报',
      dataIndex: 'image_url',
      key: 'image_url',
      render: (imageUrl: string) => (
        imageUrl ? (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setPreviewImage(imageUrl.startsWith('http') ? imageUrl : `http://localhost:5000${imageUrl}`);
              setPreviewVisible(true);
              setPreviewTitle('活动海报');
            }}
          >
            查看海报
          </Button>
        ) : '无海报'
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Activity) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            disabled={!isAdmin}
          />
          <Popconfirm
            title="确定要删除这个活动吗？"
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
    <div className="activity-management-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <CalendarOutlined style={{ marginRight: 10 }} />
            活动管理
          </Title>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加活动
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
            dataSource={activities}
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
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Form.Item
            name="club_id"
            label="举办社团"
            rules={[{ required: true, message: '请选择举办社团' }]}
          >
            <Select placeholder="请选择举办社团">
              {clubs.map(club => (
                <Option key={club.id} value={club.id}>{club.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="location"
            label="活动地点"
            rules={[{ required: true, message: '请输入活动地点' }]}
          >
            <Input placeholder="请输入活动地点" />
          </Form.Item>

          <Form.Item
            name="time_range"
            label="活动时间"
            rules={[{ required: true, message: '请选择活动时间范围' }]}
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>

          <Form.Item
            name="points"
            label="活动积分"
            rules={[{ required: true, message: '请输入活动积分' }]}
          >
            <InputNumber min={1} placeholder="请输入活动积分" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="max_participants"
            label="最大参与人数"
            rules={[{ required: true, message: '请输入最大参与人数' }]}
          >
            <InputNumber min={1} placeholder="请输入最大参与人数" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <TextArea rows={4} placeholder="请输入活动描述" />
          </Form.Item>

          <Form.Item
            name="image"
            label="活动海报"
            valuePropName="fileList"
            extra="支持JPG/PNG/GIF/WEBP格式，大小不超过5MB"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              onPreview={handlePreview}
              maxCount={1}
              customRequest={({ onSuccess }) => {
                setTimeout(() => {
                  onSuccess && onSuccess("ok");
                }, 0);
              }}
            >
              {fileList.length >= 1 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传海报</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={handlePreviewCancel}
      >
        <Image
          alt={previewTitle}
          style={{ width: '100%' }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
};

export default ActivityManagement; 