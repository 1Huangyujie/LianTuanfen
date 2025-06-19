import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Tabs, Descriptions, Avatar, Tag, List, Spin, message, Modal, Empty, Popconfirm } from 'antd';
import { TeamOutlined, CalendarOutlined, UserOutlined, ArrowLeftOutlined, EnvironmentOutlined, TrophyOutlined, UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { clubAPI, activityAPI } from '../api/api';
import { AuthContext } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

// 扩展用户类型以匹配AuthContext中的定义
interface User {
  id: number;
  username: string;
  avatar?: string;
  email?: string;
  role: string;
  points: number;
}

interface ClubMember {
  id: number;
  username: string;
  avatar?: string;
  role: 'member' | 'officer' | 'president';
}

interface Club {
  id: number;
  name: string;
  description: string;
  logo?: string;
  admin_id: number;
  created_at: string;
  members?: ClubMember[];
  member_count?: number;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  points: number;
  status: string;
  image_url?: string;
}

const ClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useContext(AuthContext);

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isJoined, setIsJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  const fetchClubDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await clubAPI.getClubById(Number(id));
      setClub(response.data.club);
      setMembers(response.data.members || []);

      // 获取后端返回的是否已加入状态
      const isJoinedFromApi = response.data.is_joined || false;

      // 如果后端返回false，检查本地存储作为备份
      let finalIsJoined = isJoinedFromApi;
      if (!isJoinedFromApi && user) {
        // 从本地存储获取用户加入的社团
        const joinedClubs = JSON.parse(localStorage.getItem('joinedClubs') || '[]');
        finalIsJoined = joinedClubs.includes(Number(id));
      }

      setIsJoined(finalIsJoined);

      // 获取社团活动
      const activitiesResponse = await activityAPI.getAllActivities({ club_id: Number(id) });
      setActivities(activitiesResponse.data.activities || []);
    } catch (error) {
      console.error('获取社团详情失败', error);
      message.error('获取社团详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchClubDetails();
  }, [fetchClubDetails]);

  const handleJoinLeave = async () => {
    if (!user) {
      message.warning('请先登录');
      return;
    }

    if (!id) {
      message.error('社团ID无效');
      return;
    }

    try {
      setJoining(true);
      if (isJoined) {
        // 使用更明确的确认对话框
        Modal.confirm({
          title: '退出社团',
          content: (
            <div>
              <p>确定要退出「{club?.name}」社团吗？</p>
              <p style={{ color: '#ff4d4f' }}>退出后您将：</p>
              <ul>
                <li>不再接收社团通知</li>
                <li>无法参与仅限社团成员的活动</li>
                <li>在社团成员列表中被移除</li>
              </ul>
            </div>
          ),
          okText: '确认退出',
          okButtonProps: { danger: true },
          cancelText: '取消',
          onOk: async () => {
            try {
              // 调用退出社团API
              await clubAPI.leaveClub(Number(id));

              // 更新本地状态
              setIsJoined(false);

              // 从本地存储中删除
              const joinedClubs = JSON.parse(localStorage.getItem('joinedClubs') || '[]');
              const updatedJoinedClubs = joinedClubs.filter((clubId: number) => clubId !== Number(id));
              localStorage.setItem('joinedClubs', JSON.stringify(updatedJoinedClubs));

              // 更新成员列表
              if (club && members) {
                const updatedMembers = members.filter(member => member.id !== user.id);
                setMembers(updatedMembers);

                // 更新社团对象
                setClub(prevClub => ({
                  ...prevClub!,
                  members: updatedMembers,
                  member_count: (prevClub?.member_count || 0) - 1
                }));
              }

              message.success('已成功退出社团');

              // 通知其他同时打开的页面社团状态已变更
              window.dispatchEvent(new CustomEvent('club-membership-changed', {
                detail: { clubId: Number(id), isJoined: false }
              }));
            } catch (error: any) {
              console.error('退出社团失败:', error);
              message.error(error.response?.data?.message || '退出社团失败，请重试');
            } finally {
              setJoining(false);
            }
          },
          onCancel: () => {
            setJoining(false);
          }
        });
      } else {
        // 加入社团逻辑
        const response = await clubAPI.joinClub(Number(id));

        // 获取加入后的成员数量（如果后端返回）
        const memberCount = response.data?.member_count;

        // 更新本地成员列表
        if (club && user) {
          // 创建一个新成员对象
          const newMember: ClubMember = {
            id: user.id,
            username: user.username || '用户',
            avatar: user.avatar,
            role: 'member' // 默认角色为普通成员
          };

          // 更新成员列表
          const updatedMembers = [...members, newMember];
          setMembers(updatedMembers);

          // 更新社团对象中的成员数量
          setClub({
            ...club,
            members: updatedMembers,
            // 如果后端返回了新的成员数，使用它；否则使用更新后的成员列表长度
            member_count: memberCount !== undefined ? memberCount : updatedMembers.length
          });
        }

        // 保存到本地存储
        const joinedClubs = JSON.parse(localStorage.getItem('joinedClubs') || '[]');
        if (!joinedClubs.includes(Number(id))) {
          joinedClubs.push(Number(id));
          localStorage.setItem('joinedClubs', JSON.stringify(joinedClubs));
        }

        setIsJoined(true);

        // 通知其他同时打开的页面社团状态已变更
        window.dispatchEvent(new CustomEvent('club-membership-changed', {
          detail: { clubId: Number(id), isJoined: true }
        }));

        // 显示成功弹框
        Modal.success({
          title: '加入社团成功',
          content: (
            <div>
              <p>您已成功加入「{club?.name}」社团！</p>
              <p>现在您可以：</p>
              <ul>
                <li>参与社团活动</li>
                <li>与社团其他成员互动</li>
                <li>获取社团最新动态</li>
              </ul>
            </div>
          )
        });
      }
    } catch (error: any) {
      console.error('操作失败:', error);
      message.error(error.response?.data?.message || '操作失败，请重试');
    } finally {
      setJoining(false);
    }
  };

  // 添加监听事件，处理社团会员变化
  useEffect(() => {
    // 监听社团会员变化事件
    const handleMembershipChange = (event: any) => {
      const { clubId, isJoined } = event.detail;
      // 检查是否是当前查看的社团
      if (clubId === Number(id)) {
        setIsJoined(isJoined);

        // 如果退出了社团，更新成员列表
        if (!isJoined && user) {
          const updatedMembers = members.filter(member => member.id !== user.id);
          setMembers(updatedMembers);

          // 更新社团对象
          if (club) {
            setClub({
              ...club,
              members: updatedMembers,
              member_count: updatedMembers.length // 更新member_count属性
            });
          }
        }
      }
    };

    window.addEventListener('club-membership-changed', handleMembershipChange);

    return () => {
      window.removeEventListener('club-membership-changed', handleMembershipChange);
    };
  }, [id, club, members, user]);

  const getRoleTag = (role: string) => {
    switch (role) {
      case 'president':
        return <Tag color="red">社长</Tag>;
      case 'officer':
        return <Tag color="blue">干部</Tag>;
      case 'member':
        return <Tag color="green">成员</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!club) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={3}>社团不存在或已被删除</Title>
          <Button type="primary" onClick={() => navigate('/clubs')}>返回社团列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="club-detail-container">
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            type="link"
            onClick={() => navigate('/clubs')}
            style={{ padding: 0 }}
          >
            返回社团列表
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ marginRight: 24 }}>
            {club.logo ? (
              <img
                src={`http://localhost:5000${club.logo}`}
                alt={club.name}
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }}
              />
            ) : (
              <div style={{
                width: 120,
                height: 120,
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4
              }}>
                <TeamOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={2}>{club.name}</Title>
              {user && user.id !== club.admin_id && (
                <Button
                  type={isJoined ? 'default' : 'primary'}
                  danger={isJoined}
                  icon={isJoined ? <UserDeleteOutlined /> : <UserAddOutlined />}
                  onClick={handleJoinLeave}
                  loading={joining}
                >
                  {isJoined ? '退出社团' : '加入社团'}
                </Button>
              )}
            </div>

            <Descriptions column={3} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="成员数">{club.member_count !== undefined ? club.member_count : club.members?.length || 0} 人</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(club.created_at).toLocaleDateString('zh-CN')}</Descriptions.Item>
            </Descriptions>

            <Paragraph>
              {club.description}
            </Paragraph>
          </div>
        </div>

        <Tabs defaultActiveKey="1">
          <TabPane tab="社团活动" key="1">
            {activities.length === 0 ? (
              <Empty description="暂无活动" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={activities}
                renderItem={activity => (
                  <List.Item
                    key={activity.id}
                    actions={[
                      <Button
                        type="primary"
                        onClick={() => navigate(`/activities/${activity.id}`)}
                      >
                        查看详情
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        activity.image_url ? (
                          <Avatar
                            shape="square"
                            size={64}
                            src={`http://localhost:5000${activity.image_url}`}
                          />
                        ) : (
                          <Avatar
                            shape="square"
                            size={64}
                            icon={<CalendarOutlined />}
                            style={{ backgroundColor: '#1890ff' }}
                          />
                        )
                      }
                      title={<span style={{ fontSize: 16, fontWeight: 'bold' }}>{activity.title}</span>}
                      description={
                        <>
                          <div><CalendarOutlined style={{ marginRight: 8 }} />
                            {dayjs(activity.start_time).format('YYYY-MM-DD HH:mm')} 至 {dayjs(activity.end_time).format('HH:mm')}
                          </div>
                          <div><EnvironmentOutlined style={{ marginRight: 8 }} />{activity.location}</div>
                          <div><TrophyOutlined style={{ marginRight: 8 }} />{activity.points} 分</div>
                          <div>
                            状态:
                            <Tag color={
                              activity.status === 'upcoming' ? 'blue' :
                                activity.status === 'ongoing' ? 'green' :
                                  activity.status === 'completed' ? 'gray' : 'default'
                            }>
                              {
                                activity.status === 'upcoming' ? '即将开始' :
                                  activity.status === 'ongoing' ? '进行中' :
                                    activity.status === 'completed' ? '已结束' : '未知'
                              }
                            </Tag>
                          </div>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </TabPane>
          <TabPane tab={`社团成员 (${members.length})`} key="2">
            {members.length === 0 ? (
              <Empty description="暂无成员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 6, xl: 8, xxl: 8 }}
                dataSource={members}
                renderItem={(member: ClubMember) => (
                  <List.Item key={member.id}>
                    <Card hoverable>
                      <div style={{ textAlign: 'center' }}>
                        <Avatar
                          size={80}
                          src={member.avatar ? `http://localhost:5000${member.avatar}` : undefined}
                          icon={!member.avatar ? <UserOutlined /> : undefined}
                        />
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{member.username}</div>
                          <div>
                            {getRoleTag(member.role)}
                            {member.id === user?.id && (
                              <Tag color="purple" style={{ marginLeft: 4 }}>我</Tag>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ClubDetail; 