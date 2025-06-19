import React, { useEffect, useState, useContext } from 'react';
import { Card, Row, Col, Typography, Spin, Input, Empty, Button, Select, DatePicker } from 'antd';
import { SearchOutlined, CalendarOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { activityAPI, clubAPI } from '../api/api';
import dayjs from 'dayjs';
import { AuthContext } from '../contexts/AuthContext';
import ActivityCard from '../components/ActivityCard';

const { Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

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

interface Club {
  id: number;
  name: string;
}

const ActivityList: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const { user, isAuthenticated, isAdmin, isClubAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getAllActivities();
      setActivities(response.data.activities);
      setFilteredActivities(response.data.activities);
    } catch (error) {
      console.error('获取活动列表失败', error);
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

  const applyFilters = () => {
    let result = [...activities];

    // 搜索过滤
    if (searchValue.trim()) {
      result = result.filter(activity =>
        activity.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchValue.toLowerCase()) ||
        activity.location.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      result = result.filter(activity => activity.status === statusFilter);
    }

    // 社团过滤
    if (clubFilter) {
      result = result.filter(activity => activity.club_id === clubFilter);
    }

    // 日期范围过滤
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');

      result = result.filter(activity => {
        const activityStart = dayjs(activity.start_time);
        const activityEnd = dayjs(activity.end_time);

        // 活动的时间范围与所选时间范围有重叠
        return (
          (activityStart.isAfter(startDate) || activityStart.isSame(startDate)) &&
          (activityEnd.isBefore(endDate) || activityEnd.isSame(endDate))
        );
      });
    }

    setFilteredActivities(result);
  };

  useEffect(() => {
    applyFilters();
  }, [searchValue, statusFilter, clubFilter, dateRange, activities]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleClubChange = (value: number | null) => {
    setClubFilter(value);
  };

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
  };

  const resetFilters = () => {
    setSearchValue('');
    setStatusFilter('all');
    setClubFilter(null);
    setDateRange(null);
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

  const handleRefresh = () => {
    fetchActivities();
  };

  const handleActivityJoin = () => {
    // 当活动报名成功后刷新列表
    fetchActivities();
  };

  return (
    <div className="activity-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2}>
            <CalendarOutlined style={{ marginRight: 10 }} />
            活动中心
          </Title>
          <div>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              style={{ marginRight: 16 }}
            >
              刷新
            </Button>
            {isAuthenticated && (isAdmin || isClubAdmin) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/admin/activities')}
              >
                创建活动
              </Button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={24} md={8} lg={6}>
              <Search
                placeholder="搜索活动名称、描述或地点"
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
                onChange={(e) => setSearchValue(e.target.value)}
                value={searchValue}
              />
            </Col>
            <Col xs={12} sm={12} md={4} lg={4}>
              <Select
                placeholder="活动状态"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <Option value="all">所有状态</Option>
                <Option value="upcoming">即将开始</Option>
                <Option value="ongoing">进行中</Option>
                <Option value="completed">已结束</Option>
              </Select>
            </Col>
            <Col xs={12} sm={12} md={6} lg={6}>
              <Select
                placeholder="选择社团"
                style={{ width: '100%' }}
                value={clubFilter}
                onChange={handleClubChange}
                allowClear
              >
                {clubs.map(club => (
                  <Option key={club.id} value={club.id}>{club.name}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={18} sm={18} md={6} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange as any}
                onChange={handleDateRangeChange}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
            <Col xs={6} sm={6} md={0} lg={0}>
              <Button onClick={resetFilters}>重置</Button>
            </Col>
            <Col xs={0} sm={0} md={0} lg={2}>
              <Button onClick={resetFilters}>重置筛选</Button>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : filteredActivities.length === 0 ? (
          <Empty description="暂无符合条件的活动" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredActivities.map(activity => (
              <Col xs={24} sm={12} md={8} lg={6} key={activity.id}>
                <ActivityCard activity={activity} onJoinSuccess={handleActivityJoin} />
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default ActivityList; 