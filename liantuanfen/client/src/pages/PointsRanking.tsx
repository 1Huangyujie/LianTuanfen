import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Spin, Tag, Avatar, Input, Select, Button } from 'antd';
import { TrophyOutlined, UserOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { userAPI } from '../api/api';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  points: number;
  rank: number;
}

const PointsRanking: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>('');
  const [sortType, setSortType] = useState<string>('rank');

  const fetchRankings = async (search?: string) => {
    try {
      setLoading(true);
      const response = await userAPI.getRankings(search ? { search } : undefined);
      const rankingUsers = response.data.rankings.map((user: User, index: number) => ({
        ...user,
        rank: index + 1
      }));
      setUsers(rankingUsers);
      setFilteredUsers(rankingUsers);
    } catch (error) {
      console.error('获取积分排行榜失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    fetchRankings(value);
  };

  const handleSortTypeChange = (value: string) => {
    setSortType(value);

    let sorted = [...filteredUsers];
    if (value === 'rank') {
      sorted.sort((a, b) => a.rank - b.rank);
    } else if (value === 'points_desc') {
      sorted.sort((a, b) => b.points - a.points);
    } else if (value === 'points_asc') {
      sorted.sort((a, b) => a.points - b.points);
    } else if (value === 'name') {
      sorted.sort((a, b) => a.username.localeCompare(b.username));
    }

    setFilteredUsers(sorted);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '';
  };

  const getRoleTag = (role: string) => {
    if (role === 'admin') {
      return <Tag color="red">管理员</Tag>;
    } else if (role === 'club_admin') {
      return <Tag color="blue">社团管理员</Tag>;
    } else {
      return <Tag color="green">学生</Tag>;
    }
  };

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <div style={{ textAlign: 'center' }}>
          {rank <= 3 ? (
            <TrophyOutlined style={{ fontSize: 24, color: getRankColor(rank) }} />
          ) : (
            <span>{rank}</span>
          )}
        </div>
      ),
    },
    {
      title: '用户',
      key: 'user',
      render: (_: any, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={record.avatar ? `http://localhost:5000${record.avatar}` : undefined}
            icon={!record.avatar ? <UserOutlined /> : undefined}
            size="large"
          />
          <div style={{ marginLeft: 12 }}>
            <div>{record.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => getRoleTag(role),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      render: (points: number) => (
        <span style={{ fontWeight: 'bold', color: points > 0 ? '#f50' : '#999' }}>
          {points}
        </span>
      ),
    },
  ];

  return (
    <div className="points-ranking-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <TrophyOutlined style={{ marginRight: 10 }} />
            积分排行榜
          </Title>
          <div style={{ display: 'flex', gap: 16 }}>
            <Search
              placeholder="搜索用户名或邮箱"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => setSearchValue(e.target.value)}
              value={searchValue}
              style={{ width: 250 }}
            />
            <Select
              defaultValue="rank"
              style={{ width: 120 }}
              onChange={handleSortTypeChange}
              value={sortType}
            >
              <Option value="rank">默认排序</Option>
              <Option value="points_desc">积分高到低</Option>
              <Option value="points_asc">积分低到高</Option>
              <Option value="name">按用户名</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchValue('');
                fetchRankings();
              }}
              title="刷新"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            locale={{ emptyText: '暂无数据' }}
          />
        )}
      </Card>
    </div>
  );
};

export default PointsRanking; 