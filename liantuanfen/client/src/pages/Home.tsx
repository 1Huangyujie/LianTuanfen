import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Typography, Spin, Button } from 'antd';
import { TeamOutlined, TrophyOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { clubAPI, activityAPI, userAPI } from '../api/api';

const { Title, Paragraph } = Typography;

interface Club {
  id: number;
  name: string;
  logo?: string;
}

interface Activity {
  id: number;
  title: string;
  start_time: string;
  club_name: string;
}

interface User {
  id: number;
  username: string;
  avatar?: string;
  points: number;
}

const Home: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rankings, setRankings] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 并行获取数据
        const [clubsResponse, activitiesResponse, rankingsResponse] = await Promise.all([
          clubAPI.getAllClubs(),
          activityAPI.getAllActivities({ status: 'approved' }),
          userAPI.getRankings()
        ]);

        setClubs(clubsResponse.data.clubs);
        setActivities(activitiesResponse.data.activities); // 只展示前5个活动
        setRankings(rankingsResponse.data.rankings); // 只展示前5名
        // .slice(0, 5
      } catch (error) {
        console.error('获取数据失败', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="welcome-section" style={{ marginBottom: 32 }}>
        <Title level={2}>欢迎使用校园社团活动积分系统</Title>
        <Paragraph>
          本系统帮助学生管理社团活动，记录活动参与情况，累积积分，促进校园社团文化建设。
        </Paragraph>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="社团总数"
              value={clubs.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="活动总数"
              value={activities.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="用户总数"
              value={rankings.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card
            title={<span><TeamOutlined /> 热门社团</span>}
            extra={<Link to="/clubs">查看全部</Link>}
            style={{ height: 400, overflow: 'auto' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={clubs.slice(0, 5)}
              renderItem={club => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '50%' }}>
                        {club.logo ? (
                          <img
                            src={`http://localhost:5000${club.logo}`}
                            alt={club.name}
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        )}
                      </div>
                    }
                    title={<Link to={`/clubs/${club.id}`}>{club.name}</Link>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title={<span><CalendarOutlined /> 近期活动</span>}
            extra={<Link to="/activities">查看全部</Link>}
            style={{ height: 400, overflow: 'auto' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={activities}
              renderItem={activity => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '50%' }}>
                        <CalendarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      </div>
                    }
                    title={<Link to={`/activities/${activity.id}`}>{activity.title}</Link>}
                    description={
                      <>
                        <div>社团: {activity.club_name}</div>
                        <div>时间: {new Date(activity.start_time).toLocaleString()}</div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title={<span><TrophyOutlined /> 积分排行榜</span>}
            extra={<Link to="/ranking">查看全部</Link>}
            style={{ height: 400, overflow: 'auto' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={rankings}
              renderItem={(user, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 50,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: index < 3 ? ['#f5bf42', '#c0c0c0', '#cd7f32'][index] : '#f0f0f0',
                        borderRadius: '50%',
                        color: index < 3 ? '#fff' : undefined
                      }}>
                        {user.avatar ? (
                          <img
                            src={`http://localhost:5000${user.avatar}`}
                            alt={user.username}
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontWeight: 'bold' }}>{index + 1}</span>
                        )}
                      </div>
                    }
                    title={user.username}
                    description={`积分: ${user.points}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <div className="action-buttons" style={{ textAlign: 'center', marginTop: 40 }}>
        <Link to="/clubs">
          <Button type="primary" size="large" style={{ margin: '0 10px' }}>
            浏览社团
          </Button>
        </Link>
        <Link to="/activities">
          <Button type="primary" size="large" style={{ margin: '0 10px' }}>
            参与活动
          </Button>
        </Link>
        <Link to="/ranking">
          <Button type="primary" size="large" style={{ margin: '0 10px' }}>
            查看排行
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Home; 