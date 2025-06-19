import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Descriptions, Tag, Divider, Image, Spin, message, Modal, List, Avatar, Tooltip } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, TeamOutlined, TrophyOutlined, ArrowLeftOutlined, UserOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { activityAPI } from '../api/api';
import { AuthContext } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

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
  current_participants: number;
  status: string;
  image_url?: string;
  is_joined?: boolean;
}

interface Participant {
  id: number;
  user_id: number;
  name: string;
  avatar?: string;
  join_time: string;
}

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useContext(AuthContext);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [joinLoading, setJoinLoading] = useState<boolean>(false);
  const [leaveLoading, setLeaveLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchActivityDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await activityAPI.getActivityById(parseInt(id));
        setActivity(response.data.activity);
        setParticipants(response.data.participants || []);
      } catch (error) {
        console.error('获取活动详情失败', error);
        message.error('获取活动详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchActivityDetails();
  }, [id]);

  const handleJoinActivity = async () => {
    if (!id || !isAuthenticated) {
      if (!isAuthenticated) {
        message.warning('请先登录');
        navigate('/login');
      }
      return;
    }

    try {
      setJoinLoading(true);
      const activityId = parseInt(id);
      await activityAPI.joinActivity(activityId);

      // 获取最新的活动信息和参与者列表
      const response = await activityAPI.getActivityById(activityId);
      setActivity(response.data.activity);
      setParticipants(response.data.participants || []);

      // 显示成功弹框
      Modal.success({
        title: '报名成功',
        content: (
          <div>
            <p>您已成功报名参加"{activity?.title}"活动！</p>
            <p>活动信息：</p>
            <ul>
              <li>时间：{dayjs(activity?.start_time).format('YYYY-MM-DD HH:mm')} 至 {dayjs(activity?.end_time).format('YYYY-MM-DD HH:mm')}</li>
              <li>地点：{activity?.location}</li>
              <li>积分：{activity?.points} 分</li>
            </ul>
            <p>请准时参加活动！您可以在活动开始前取消报名。</p>
          </div>
        )
      });
    } catch (error: any) {
      console.error('报名活动失败', error);
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('报名失败，请稍后重试');
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveActivity = async () => {
    if (!id || !isAuthenticated) {
      if (!isAuthenticated) {
        message.warning('请先登录');
        navigate('/login');
      }
      return;
    }

    try {
      setLeaveLoading(true);
      const activityId = parseInt(id);
      await activityAPI.leaveActivity(activityId);
      message.success('已取消报名');

      const response = await activityAPI.getActivityById(activityId);
      setActivity(response.data.activity);
      setParticipants(response.data.participants || []);
    } catch (error: any) {
      console.error('取消报名失败', error);
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('取消报名失败，请稍后重试');
      }
    } finally {
      setLeaveLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '即将开始';
      case 'ongoing':
        return '进行中';
      case 'completed':
        return '已结束';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'blue';
      case 'ongoing':
        return 'green';
      case 'completed':
        return 'gray';
      default:
        return 'default';
    }
  };

  const showJoinConfirm = () => {
    Modal.confirm({
      title: '确认报名',
      content: '确定要报名参加该活动吗？',
      onOk: handleJoinActivity,
    });
  };

  const showLeaveConfirm = () => {
    Modal.confirm({
      title: '确认取消报名',
      content: '确定要取消报名该活动吗？',
      onOk: handleLeaveActivity,
    });
  };

  // 判断是否可以报名
  const canRegister = (activity: Activity): boolean => {
    if (!activity || activity.status === 'completed') return false;
    if (activity.is_joined) return false;
    if (activity.current_participants >= activity.max_participants) return false;

    // 活动状态为upcoming或正在进行中但仍在开始后1小时内可以报名
    const now = new Date();
    const startTime = new Date(activity.start_time);
    const oneHourAfterStart = new Date(startTime);
    oneHourAfterStart.setHours(startTime.getHours() + 1);

    return activity.status === 'upcoming' || (activity.status === 'ongoing' && now <= oneHourAfterStart);
  };

  // 判断是否可以取消报名
  const canCancelRegistration = (): boolean => {
    if (!activity || !activity.is_joined) return false;

    // 只有活动开始前可以取消报名
    const now = new Date();
    const startTime = new Date(activity.start_time);

    return now < startTime;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!activity) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={3}>活动不存在或已被删除</Title>
          <Button type="primary" onClick={() => navigate('/activities')}>返回活动列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="activity-detail-container">
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            type="link"
            onClick={() => navigate('/activities')}
            style={{ padding: 0 }}
          >
            返回活动列表
          </Button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <Title level={2}>{activity.title}</Title>
          <Tag color={getStatusColor(activity.status)} style={{ fontSize: 14, padding: '4px 8px' }}>
            {getStatusLabel(activity.status)}
          </Tag>
        </div>

        {activity.image_url && (
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Image
              src={`http://localhost:5000${activity.image_url}`}
              alt={activity.title}
              style={{ maxHeight: 400, maxWidth: '100%' }}
            />
          </div>
        )}

        <Descriptions bordered column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
          <Descriptions.Item label={<><TeamOutlined /> 举办社团</>}>
            {activity.club_name}
          </Descriptions.Item>
          <Descriptions.Item label={<><EnvironmentOutlined /> 活动地点</>}>
            {activity.location}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> 活动时间</>}>
            {dayjs(activity.start_time).format('YYYY-MM-DD HH:mm')} 至 {dayjs(activity.end_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label={<><TrophyOutlined /> 活动积分</>}>
            <span style={{ color: '#f50', fontWeight: 'bold' }}>{activity.points} 分</span>
          </Descriptions.Item>
          <Descriptions.Item label="报名情况">
            {activity.current_participants} / {activity.max_participants} 人
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          {isAuthenticated && canRegister(activity) ? (
            activity.is_joined ? (
              canCancelRegistration() ? (
                <Button
                  danger
                  size="large"
                  icon={<CloseCircleOutlined />}
                  loading={leaveLoading}
                  onClick={showLeaveConfirm}
                  style={{ width: 200 }}
                >
                  取消报名
                </Button>
              ) : (
                <Tooltip title="活动开始后无法取消报名">
                  <Button size="large" disabled style={{ width: 200 }}>
                    已报名
                  </Button>
                </Tooltip>
              )
            ) : (
              <Button
                type="primary"
                size="large"
                loading={joinLoading}
                onClick={showJoinConfirm}
                style={{ width: 200 }}
              >
                立即报名
              </Button>
            )
          ) : isAuthenticated && activity.is_joined ? (
            canCancelRegistration() ? (
              <Button
                danger
                size="large"
                icon={<CloseCircleOutlined />}
                loading={leaveLoading}
                onClick={showLeaveConfirm}
                style={{ width: 200 }}
              >
                取消报名
              </Button>
            ) : (
              <Tooltip title="活动开始后无法取消报名">
                <Button type="primary" size="large" style={{ width: 200 }}>
                  已报名 - {activity.status === 'ongoing' ? '活动进行中' : '等待活动开始'}
                </Button>
              </Tooltip>
            )
          ) : isAuthenticated && activity.current_participants >= activity.max_participants ? (
            <Button size="large" disabled style={{ width: 200 }}>
              名额已满
            </Button>
          ) : isAuthenticated && activity.status === 'completed' ? (
            <Button size="large" disabled style={{ width: 200 }}>
              活动已结束
            </Button>
          ) : isAuthenticated ? (
            <Button size="large" disabled style={{ width: 200 }}>
              {activity.status === 'ongoing' ? '活动已开始超过1小时，无法报名' : '无法报名'}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{ width: 200 }}
            >
              登录后报名
            </Button>
          )}
        </div>

        <Divider orientation="left">活动详情</Divider>
        <Paragraph style={{ fontSize: 16 }}>
          {activity.description}
        </Paragraph>

        <Divider orientation="left">参与者 ({participants.length})</Divider>
        {participants.length > 0 ? (
          <List
            grid={{ gutter: 16, column: 6 }}
            dataSource={participants}
            renderItem={participant => (
              <List.Item key={participant.id}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    size={64}
                    src={participant.avatar ? `http://localhost:5000${participant.avatar}` : undefined}
                    icon={!participant.avatar ? <UserOutlined /> : undefined}
                  />
                  <div style={{ marginTop: 8 }}>
                    {participant.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {dayjs(participant.join_time).format('MM-DD HH:mm')}
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            暂无参与者
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityDetail;
