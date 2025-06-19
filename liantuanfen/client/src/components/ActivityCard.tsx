import React, { useState, useContext } from 'react';
import { Card, Button, Tag, message, Modal, Tooltip } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, TeamOutlined, UserAddOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { activityAPI } from '../api/api';
import { AuthContext } from '../contexts/AuthContext';
import dayjs from 'dayjs';

interface Activity {
  id: number;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  status: string;
  club_name: string;
  points: number;
  max_participants: number;
  current_participants: number;
  image_url?: string;
  is_joined?: boolean;
}

interface ActivityCardProps {
  activity: Activity;
  onJoinSuccess?: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onJoinSuccess }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();

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

  // 判断是否可以报名
  const canRegister = (activity: Activity): boolean => {
    if (!activity || activity.status === 'completed' ||
      activity.status === 'pending' || activity.status === 'rejected')
      return false;

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
  const canCancelRegistration = (activity: Activity): boolean => {
    if (!activity || !activity.is_joined) return false;

    // 只有活动开始前可以取消报名
    const now = new Date();
    const startTime = new Date(activity.start_time);

    return now < startTime;
  };

  const handleJoinActivity = async () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    try {
      setJoining(true);
      await activityAPI.joinActivity(activity.id);

      // 显示成功弹框而不是简单的信息提示
      Modal.success({
        title: '报名成功',
        content: (
          <div>
            <p>您已成功报名参加"{activity.title}"活动！</p>
            <p>活动信息：</p>
            <ul>
              <li>时间：{dayjs(activity.start_time).format('YYYY-MM-DD HH:mm')} 至 {dayjs(activity.end_time).format('YYYY-MM-DD HH:mm')}</li>
              <li>地点：{activity.location}</li>
              <li>积分：{activity.points} 分</li>
            </ul>
            <p>请准时参加活动！</p>
          </div>
        ),
        onOk: () => {
          // 如果提供了成功回调，则调用
          if (onJoinSuccess) {
            onJoinSuccess();
          }
        }
      });
    } catch (error: any) {
      console.error('报名活动失败', error);
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('报名失败，请稍后重试');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveActivity = async () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    try {
      setLeaving(true);
      await activityAPI.leaveActivity(activity.id);
      message.success('已取消报名');

      // 如果提供了成功回调，则调用
      if (onJoinSuccess) {
        onJoinSuccess();
      }
    } catch (error: any) {
      console.error('取消报名失败', error);
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('取消报名失败，请稍后重试');
      }
    } finally {
      setLeaving(false);
    }
  };

  const showJoinConfirm = () => {
    Modal.confirm({
      title: '确认报名',
      content: `确定要报名参加"${activity.title}"活动吗？`,
      onOk: handleJoinActivity,
    });
  };

  const showLeaveConfirm = () => {
    Modal.confirm({
      title: '确认取消报名',
      content: `确定要取消报名"${activity.title}"活动吗？`,
      onOk: handleLeaveActivity,
    });
  };

  return (
    <Card
      hoverable
      cover={
        activity.image_url ? (
          <Link to={`/activities/${activity.id}`}>
            <div style={{ height: 180, overflow: 'hidden' }}>
              <img
                src={`http://localhost:5000${activity.image_url}`}
                alt={activity.title}
                style={{ width: '100%', objectFit: 'cover' }}
              />
            </div>
          </Link>
        ) : (
          <Link to={`/activities/${activity.id}`}>
            <div
              style={{
                height: 180,
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </div>
          </Link>
        )
      }
      actions={[
        <Link to={`/activities/${activity.id}`}>查看详情</Link>,
        isAuthenticated && canRegister(activity) ? (
          activity.is_joined ? (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              loading={leaving}
              onClick={showLeaveConfirm}
            >
              取消报名
            </Button>
          ) : (
            <Button
              type="link"
              icon={<UserAddOutlined />}
              loading={joining}
              onClick={showJoinConfirm}
            >
              立即报名
            </Button>
          )
        ) : activity.is_joined ? (
          canCancelRegistration(activity) ? (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              loading={leaving}
              onClick={showLeaveConfirm}
            >
              取消报名
            </Button>
          ) : (
            <Tooltip title="活动开始后无法取消报名">
              <span style={{ color: '#52c41a' }}>已报名</span>
            </Tooltip>
          )
        ) : null
      ]}
    >
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
        <Tag color={getStatusColor(activity.status)}>
          {getStatusLabel(activity.status)}
        </Tag>
      </div>

      <Card.Meta
        title={<Link to={`/activities/${activity.id}`}>{activity.title}</Link>}
        description={
          <div>
            <div style={{ marginBottom: 8 }}>
              <EnvironmentOutlined style={{ marginRight: 5 }} />
              {activity.location}
            </div>
            <div style={{ marginBottom: 8 }}>
              <CalendarOutlined style={{ marginRight: 5 }} />
              {dayjs(activity.start_time).format('YYYY-MM-DD HH:mm')}
            </div>
            <div style={{ marginBottom: 8 }}>
              <TeamOutlined style={{ marginRight: 5 }} />
              {activity.club_name}
            </div>
            <div>
              <span style={{ color: '#f50', fontWeight: 'bold' }}>{activity.points} 积分</span>
              <span style={{ float: 'right', color: '#999' }}>
                {activity.current_participants}/{activity.max_participants} 人
              </span>
            </div>
          </div>
        }
      />
    </Card>
  );
};

export default ActivityCard; 