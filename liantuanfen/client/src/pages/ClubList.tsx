import React, { useEffect, useState, useContext } from 'react';
import { Card, Row, Col, Typography, Spin, Input, Empty, Button, message, Modal } from 'antd';
import { SearchOutlined, TeamOutlined, PlusOutlined, UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { clubAPI } from '../api/api';
import { AuthContext } from '../contexts/AuthContext';

const { Title, Paragraph } = Typography;
const { Search } = Input;

interface Club {
  id: number;
  name: string;
  description: string;
  logo?: string;
  member_count?: number;
  is_member?: boolean;
}

// 添加成员接口
interface Club_Members {
  id: number;
  user_id: number;
  clud_id: number;
  role: string;
}

const ClubList: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>('');
  const [joiningClubId, setJoiningClubId] = useState<number | null>(null);
  const [leavingClubId, setLeavingClubId] = useState<number | null>(null);
  const { user, isAuthenticated, isAdmin, isClubAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await clubAPI.getAllClubs();

      // 获取后端返回的数据
      const { clubs: clubsData, user_joined_clubs = [] } = response.data;

      // 使用后端返回的用户加入社团信息来设置is_member标志
      const processedClubs = clubsData.map((club: Club) => ({
        ...club,
        is_member: isAuthenticated ? user_joined_clubs.includes(club.id) : false
      }));

      setClubs(processedClubs);
      setFilteredClubs(processedClubs);
    } catch (error) {
      console.error('获取社团列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [isAuthenticated]); // 当认证状态变化时重新获取社团列表

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (!value.trim()) {
      setFilteredClubs(clubs);
      return;
    }

    const filtered = clubs.filter(club =>
      club.name.toLowerCase().includes(value.toLowerCase()) ||
      club.description.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredClubs(filtered);
  };

  const handleJoinClub = async (clubId: number, clubName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      message.warning('请先登录后再加入社团');
      navigate('/login');
      return;
    }

    try {
      setJoiningClubId(clubId);
      const response = await clubAPI.joinClub(clubId);

      // 获取当前社团成员数量
      const memberCount = response.data.member_count || 0;

      // 更新本地数据状态
      const updatedClubs = clubs.map(club =>
        club.id === clubId ? { ...club, is_member: true, member_count: memberCount } : club
      );
      setClubs(updatedClubs);
      setFilteredClubs(updatedClubs);

      // 保存到本地存储，解决刷新后状态丢失问题
      const joinedClubs = JSON.parse(localStorage.getItem('joinedClubs') || '[]');
      if (!joinedClubs.includes(clubId)) {
        joinedClubs.push(clubId);
        localStorage.setItem('joinedClubs', JSON.stringify(joinedClubs));
      }

      // 通知其他页面社团状态已变更
      window.dispatchEvent(new CustomEvent('club-membership-changed', {
        detail: { clubId, isJoined: true }
      }));

      // 显示成功弹框而不是简单的信息提示
      Modal.success({
        title: '加入社团成功',
        content: (
          <div>
            <p>您已成功加入「{clubName}」社团！</p>
            <p>现在您可以：</p>
            <ul>
              <li>查看社团详情</li>
              <li>参与社团活动</li>
              <li>与其他成员互动</li>
            </ul>
          </div>
        ),
        onOk: () => {
          // 成功后可以选择导航到社团详情页
          navigate(`/clubs/${clubId}`);
        }
      });
    } catch (error: any) {
      console.error('加入社团失败', error);
      message.error(error.response?.data?.message || '加入社团失败，请重试');
    } finally {
      setJoiningClubId(null);
    }
  };

  const handleLeaveClub = async (clubId: number, clubName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    try {
      setLeavingClubId(clubId);
      const response = await clubAPI.leaveClub(clubId);

      // 获取退出后的成员数量
      const memberCount = response.data.member_count || 0;

      // 更新本地数据状态
      const updatedClubs = clubs.map(club =>
        club.id === clubId ? { ...club, is_member: false, member_count: memberCount } : club
      );
      setClubs(updatedClubs);
      setFilteredClubs(updatedClubs);

      // 从本地存储中移除
      const joinedClubs = JSON.parse(localStorage.getItem('joinedClubs') || '[]');
      const updatedJoinedClubs = joinedClubs.filter((id: number) => id !== clubId);
      localStorage.setItem('joinedClubs', JSON.stringify(updatedJoinedClubs));

      // 通知其他页面社团状态已变更
      window.dispatchEvent(new CustomEvent('club-membership-changed', {
        detail: { clubId, isJoined: false }
      }));

      message.success(`已成功退出「${clubName}」社团`);
    } catch (error: any) {
      console.error('退出社团失败', error);
      message.error(error.response?.data?.message || '退出社团失败，请重试');
    } finally {
      setLeavingClubId(null);
    }
  };

  const showJoinConfirm = (clubId: number, clubName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      message.warning('请先登录后再加入社团');
      navigate('/login');
      return;
    }

    Modal.confirm({
      title: '加入社团',
      content: `确定要加入「${clubName}」社团吗？`,
      onOk: () => handleJoinClub(clubId, clubName, e),
    });
  };

  const showLeaveConfirm = (clubId: number, clubName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    Modal.confirm({
      title: '退出社团',
      content: (
        <div>
          <p>确定要退出「{clubName}」社团吗？</p>
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
      onOk: () => handleLeaveClub(clubId, clubName, e),
    });
  };

  // 添加监听事件，处理从其他页面发起的社团会员变化
  useEffect(() => {
    const handleMembershipChange = (event: any) => {
      const { clubId, isJoined } = event.detail;

      // 更新列表中的社团状态
      const updatedClubs = clubs.map(club =>
        club.id === clubId ? { ...club, is_member: isJoined } : club
      );

      setClubs(updatedClubs);
      setFilteredClubs(updatedClubs.filter(club =>
        !searchValue.trim() ||
        club.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        club.description.toLowerCase().includes(searchValue.toLowerCase())
      ));
    };

    window.addEventListener('club-membership-changed', handleMembershipChange);

    return () => {
      window.removeEventListener('club-membership-changed', handleMembershipChange);
    };
  }, [clubs, searchValue]);

  return (
    <div className="club-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <TeamOutlined style={{ marginRight: 10 }} />
            社团列表
          </Title>
          <div>
            <Search
              placeholder="搜索社团名称或描述"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 300, marginRight: 16 }}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              value={searchValue}
            />
            {isAuthenticated && (isAdmin || isClubAdmin) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/admin/clubs')}
              >
                创建社团
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : filteredClubs.length === 0 ? (
          <Empty description="暂无社团" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredClubs.map(club => (
              <Col xs={24} sm={12} md={8} lg={6} key={club.id}>
                <Card
                  hoverable
                  cover={
                    club.logo ? (
                      <Link to={`/clubs/${club.id}`}>
                        <img
                          alt={club.name}
                          src={`http://localhost:5000${club.logo}`}
                          style={{ height: 160, objectFit: 'cover' }}
                        />
                      </Link>
                    ) : (
                      <Link to={`/clubs/${club.id}`}>
                        <div style={{
                          height: 160,
                          background: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <TeamOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        </div>
                      </Link>
                    )
                  }
                  actions={[
                    <Link to={`/clubs/${club.id}`}>查看详情</Link>,
                    isAuthenticated && !club.is_member ? (
                      <Button
                        type="link"
                        icon={<UserAddOutlined />}
                        loading={joiningClubId === club.id}
                        onClick={(e) => showJoinConfirm(club.id, club.name, e)}
                      >
                        加入社团
                      </Button>
                    ) : isAuthenticated && club.is_member ? (
                      <Button
                        type="link"
                        danger
                        loading={leavingClubId === club.id}
                        icon={<UserDeleteOutlined />}
                        onClick={(e) => showLeaveConfirm(club.id, club.name, e)}
                      >
                        退出社团
                      </Button>
                    ) : null
                  ]}
                >
                  <Card.Meta
                    title={<Link to={`/clubs/${club.id}`}>{club.name}</Link>}
                    description={
                      <div>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ height: 44 }}>
                          {club.description}
                        </Paragraph>
                        <div style={{ marginTop: 10 }}>
                          <span style={{ fontSize: 12, color: '#999' }}>
                            {club.member_count || 0} 名成员
                          </span>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default ClubList; 