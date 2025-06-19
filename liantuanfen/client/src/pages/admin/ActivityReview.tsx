import React, { useEffect, useState, useContext } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Typography, Spin, Tag, Image } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, AuditOutlined } from '@ant-design/icons';
import { activityAPI } from '../../api/api';
import { AuthContext } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

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
  status: string;
  image_url?: string;
  created_at: string;
}

const ActivityReview: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const fetchPendingActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getPendingActivities();
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('获取待审核活动列表失败', error);
      message.error('获取待审核活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingActivities();
  }, []);

  const handleOpenReviewModal = (activity: Activity) => {
    setCurrentActivity(activity);
    form.resetFields();
    setReviewModalVisible(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalVisible(false);
  };

  const handleOpenDetailModal = (activity: Activity) => {
    setCurrentActivity(activity);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
  };

  const handleApprove = async () => {
    if (!currentActivity) return;

    try {
      await activityAPI.reviewActivity(currentActivity.id, 'approved');
      message.success('活动已审核通过');
      handleCloseReviewModal();
      fetchPendingActivities();
    } catch (error) {
      console.error('审核活动失败', error);
      message.error('操作失败，请重试');
    }
  };

  const handleReject = async () => {
    if (!currentActivity) return;

    try {
      const values = await form.validateFields();
      await activityAPI.reviewActivity(currentActivity.id, 'rejected', values.feedback);
      message.success('活动已拒绝');
      handleCloseReviewModal();
      fetchPendingActivities();
    } catch (error) {
      console.error('审核活动失败', error);
      message.error('操作失败，请重试');
    }
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '社团',
      dataIndex: 'club_name',
      key: 'club_name',
    },
    {
      title: '活动地点',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '活动时间',
      key: 'time',
      render: (_: any, record: Activity) => (
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
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: Activity) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetailModal(record)}
            type="link"
          >
            查看详情
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleOpenReviewModal(record)}
            disabled={!isAdmin}
          >
            审核
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="activity-review-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <AuditOutlined style={{ marginRight: 10 }} />
            活动审核
          </Title>
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
            locale={{ emptyText: '暂无待审核的活动' }}
          />
        )}
      </Card>

      {/* 活动详情模态框 */}
      <Modal
        title="活动详情"
        open={detailModalVisible}
        onCancel={handleCloseDetailModal}
        footer={[
          <Button key="back" onClick={handleCloseDetailModal}>
            关闭
          </Button>,
          isAdmin && (
            <Button
              key="review"
              type="primary"
              onClick={() => {
                handleCloseDetailModal();
                if (currentActivity) {
                  handleOpenReviewModal(currentActivity);
                }
              }}
            >
              审核此活动
            </Button>
          ),
        ]}
        width={700}
      >
        {currentActivity && (
          <div>
            <Title level={4}>{currentActivity.title}</Title>
            <Paragraph>
              <strong>社团：</strong> {currentActivity.club_name}
            </Paragraph>
            <Paragraph>
              <strong>地点：</strong> {currentActivity.location}
            </Paragraph>
            <Paragraph>
              <strong>时间：</strong> {dayjs(currentActivity.start_time).format('YYYY-MM-DD HH:mm')} 至 {dayjs(currentActivity.end_time).format('YYYY-MM-DD HH:mm')}
            </Paragraph>
            <Paragraph>
              <strong>积分：</strong> {currentActivity.points}
            </Paragraph>
            <Paragraph>
              <strong>参与人数上限：</strong> {currentActivity.max_participants} 人
            </Paragraph>
            <div style={{ marginBottom: 16 }}>
              <strong>活动描述：</strong>
              <Paragraph style={{ marginTop: 8 }}>
                {currentActivity.description}
              </Paragraph>
            </div>
            {currentActivity.image_url && (
              <div style={{ marginTop: 16 }}>
                <strong>活动海报：</strong>
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Image
                    src={`http://localhost:5000${currentActivity.image_url}`}
                    alt={currentActivity.title}
                    style={{ maxHeight: 300 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 审核活动模态框 */}
      <Modal
        title="审核活动"
        open={reviewModalVisible}
        onCancel={handleCloseReviewModal}
        footer={null}
        width={600}
      >
        {currentActivity && (
          <div>
            <Paragraph>
              <strong>活动名称：</strong> {currentActivity.title}
            </Paragraph>
            <Paragraph>
              <strong>社团：</strong> {currentActivity.club_name}
            </Paragraph>
            <Form form={form} layout="vertical">
              <Form.Item
                name="feedback"
                label="审核反馈"
                rules={[{ required: true, message: '请输入审核反馈' }]}
              >
                <TextArea rows={4} placeholder="请输入审核反馈意见" />
              </Form.Item>
              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={handleCloseReviewModal}>取消</Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={handleReject}
                  >
                    拒绝
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleApprove}
                  >
                    通过
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActivityReview; 