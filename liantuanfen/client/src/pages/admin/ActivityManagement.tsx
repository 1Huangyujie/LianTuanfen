import React, { useEffect, useState, useContext } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Spin, Popconfirm, DatePicker, Select, InputNumber, Upload, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import { activityAPI, clubAPI } from '../../api/api';
import { AuthContext } from '../../contexts/AuthContext';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 活动接口定义
interface Activity {
  id: number;
  title: string;
  club_id: number;
  club_name?: string;
  location: string;
  start_time: string;
  end_time: string;
  points: number;
  max_participants: number;
  current_participants?: number;
  description: string;
  image_url?: string;
  status: string;
}

// 社团接口定义
interface Club {
  id: number;
  name: string;
}

// 活动管理页面组件
const ActivityManagement: React.FC = () => {
  // 活动列表
  const [activities, setActivities] = useState<Activity[]>([]);
  // 筛选后的活动列表
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  // 社团列表
  const [clubs, setClubs] = useState<Club[]>([]);
  // 加载状态
  const [loading, setLoading] = useState<boolean>(true);
  // 控制弹窗显示
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  // 弹窗标题
  const [modalTitle, setModalTitle] = useState<string>('');
  // 当前正在编辑的活动
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  // 活动图片上传文件列表
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  // 搜索关键词
  const [searchText, setSearchText] = useState<string>('');
  // 状态筛选
  const [statusFilter, setStatusFilter] = useState<string>('');
  // 排序方式
  const [sortOrder, setSortOrder] = useState<string>('time');
  // antd表单实例
  const [form] = Form.useForm();
  // 当前登录用户信息
  const { user } = useContext(AuthContext);
  // 是否为管理员
  const isAdmin = user?.role === 'admin';

  // 获取所有活动
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getAllActivities();
      const activitiesList = response.data.activities;
      setActivities(activitiesList);
      setFilteredActivities(activitiesList);
    } catch (error) {
      console.error('获取活动列表失败', error);
      message.error('获取活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取所有社团
  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs);
    } catch (error) {
      console.error('获取社团列表失败', error);
    }
  };

  // 页面加载时获取活动和社团列表
  useEffect(() => {
    fetchActivities();
    fetchClubs();
  }, []);

  // 根据搜索、筛选、排序条件过滤活动
  useEffect(() => {
    let filtered = [...activities];
    // 搜索
    if (searchText) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchText.toLowerCase()) ||
        activity.club_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        activity.location.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    // 状态筛选
    if (statusFilter) {
      filtered = filtered.filter(activity => activity.status === statusFilter);
    }
    // 排序
    if (sortOrder === 'time') {
      filtered.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    } else if (sortOrder === 'popularity') {
      filtered.sort((a, b) => (b.current_participants || 0) - (a.current_participants || 0));
    } else if (sortOrder === 'points') {
      filtered.sort((a, b) => b.points - a.points);
    }
    setFilteredActivities(filtered);
  }, [searchText, statusFilter, sortOrder, activities]);

  // 打开弹窗（添加或编辑活动）
  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setModalTitle('编辑活动');
      setEditingActivity(activity);
      form.setFieldsValue({
        title: activity.title,
        clubId: activity.club_id,
        location: activity.location,
        time: [dayjs(activity.start_time), dayjs(activity.end_time)],
        points: activity.points,
        maxParticipants: activity.max_participants,
        description: activity.description
      });
      setFileList(activity.image_url ? [
        {
          uid: '-1',
          name: 'image.png',
          status: 'done',
          url: `http://localhost:5000${activity.image_url}`
        }
      ] : []);
    } else {
      setModalTitle('添加活动');
      setEditingActivity(null);
      form.resetFields();
      form.setFieldsValue({
        points: 0,
        maxParticipants: 20
      });
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

  // 上传图片前的校验
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

  // 提交表单（添加或编辑活动）
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('club_id', values.clubId);
      formData.append('location', values.location);
      formData.append('start_time', values.time[0].format('YYYY-MM-DD HH:mm:ss'));
      formData.append('end_time', values.time[1].format('YYYY-MM-DD HH:mm:ss'));
      formData.append('points', values.points);
      formData.append('max_participants', values.maxParticipants);
      formData.append('description', values.description);
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('image', fileList[0].originFileObj as RcFile);
      }
      if (editingActivity) {
        // 编辑活动
        await activityAPI.updateActivity(editingActivity.id, formData);
        message.success('活动更新成功');
      } else {
        // 添加活动
        await activityAPI.createActivity(formData);
        message.success('活动创建成功');
      }
      handleCloseModal();
      fetchActivities();
    } catch (error) {
      console.error('提交表单失败', error);
      message.error('操作失败，请重试');
    }
  };

  // 删除活动
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

  // 获取活动状态标签
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '即将开始';
      case 'ongoing':
        return '进行中';
      case 'completed':
        return '已结束';
      case 'pending':
        return '待审核';
      case 'rejected':
        return '已拒绝';
      default:
        return '未知';
    }
  };

  // 获取活动状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'blue';
      case 'ongoing':
        return 'green';
      case 'completed':
        return 'gray';
      case 'pending':
        return 'orange';
      case 'rejected':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Activity) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {record.image_url ? (
            <img
              src={`http://localhost:5000${record.image_url}`}
              alt={record.title}
              style={{ width: 40, height: 40, marginRight: 10, objectFit: 'cover', borderRadius: '4px' }}
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
              borderRadius: '4px'
            }}>
              <CalendarOutlined style={{ fontSize: 20 }} />
            </div>
          )}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '社团',
      dataIndex: 'club_name',
      key: 'club_name',
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
    },
    {
      title: '时间',
      key: 'time',
      render: (_: React.ReactNode, record: Activity) => (
        <>
          {dayjs(record.start_time).format('YYYY-MM-DD HH:mm')} 至<br />
          {dayjs(record.end_time).format('YYYY-MM-DD HH:mm')}
        </>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      sorter: (a: Activity, b: Activity) => a.points - b.points,
    },
    {
      title: '参与情况',
      key: 'participants',
      render: (_: React.ReactNode, record: Activity) => (
        <>{record.current_participants || 0} / {record.max_participants}</>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Space>
          <Button
            size="small"
            style={{ color: getStatusColor(status), borderColor: getStatusColor(status) }}
          >
            {getStatusLabel(status)}
          </Button>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: React.ReactNode, record: Activity) => (
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

  const handleFileChange = ({ fileList }: { fileList: UploadFile[] }) => {
    const newFileList = fileList.slice(-1);
    setFileList(newFileList);
  };

  return (
    <div className="activity-management-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <CalendarOutlined style={{ marginRight: 10 }} />
            活动管理
          </Title>
          <div>
            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
                style={{ marginLeft: 8 }}
              >
                添加活动
              </Button>
            )}
          </div>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="搜索活动名称、社团或地点"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="按状态筛选"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={value => setStatusFilter(value)}
              allowClear
            >
              <Option value="pending">待审核</Option>
              <Option value="approved">已审核</Option>
              <Option value="rejected">已拒绝</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="排序方式"
              style={{ width: '100%' }}
              value={sortOrder}
              onChange={value => setSortOrder(value)}
            >
              <Option value="time">按时间排序</Option>
              <Option value="popularity">按热门程度排序</Option>
              <Option value="points">按积分排序</Option>
            </Select>
          </Col>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredActivities}
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
            name="title"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Form.Item
            name="clubId"
            label="所属社团"
            rules={[{ required: true, message: '请选择所属社团' }]}
          >
            <Select placeholder="请选择所属社团">
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
            name="time"
            label="活动时间"
            rules={[{ required: true, message: '请选择活动时间' }]}
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder={['开始时间', '结束时间']}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="points"
            label="活动积分"
            rules={[{ required: true, message: '请输入活动积分' }]}
          >
            <InputNumber min={0} placeholder="请输入活动积分" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="maxParticipants"
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
                  <div style={{ marginTop: 8 }}>上传海报</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ActivityManagement; 