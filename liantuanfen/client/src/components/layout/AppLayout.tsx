import React, { useState, useContext } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Modal } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  CalendarOutlined,
  UserOutlined,
  TrophyOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout, isClubAdmin } = useContext(AuthContext);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
    // 退出后会自动导航到登录页
  };

  // 用户菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">个人中心</Link>,
    },
    ...(isAdmin ? [{
      key: 'admin',
      icon: <SettingOutlined />,
      label: <Link to="/admin/users">管理后台</Link>,
    }] : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="logo">
          {!collapsed && <span>校园社团活动积分系统</span>}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultSelectedKeys={['/']}
        >
              <Menu.Item key="/" icon={<HomeOutlined />}>
                <Link to="/">首页</Link>
              </Menu.Item>          
          {!isAdmin && (
            <>
              <Menu.Item key="/clubs" icon={<TeamOutlined />}>
                <Link to="/clubs">社团</Link>
              </Menu.Item>
              <Menu.Item key="/activities" icon={<CalendarOutlined />}>
                <Link to="/activities">活动中心</Link>
              </Menu.Item>
              <Menu.Item key="/ranking" icon={<TrophyOutlined />}>
                <Link to="/ranking">积分排行榜</Link>
              </Menu.Item>
            </>
          )}

          {isAdmin && (
            <>
              <Menu.Item key="/admin/users" icon={<UserOutlined />}>
                <Link to="/admin/users">用户管理</Link>
              </Menu.Item>
              <Menu.Item key="/admin/clubs" icon={<TeamOutlined />}>
                <Link to="/admin/clubs">社团管理</Link>
              </Menu.Item>
              <Menu.Item key="/admin/activities" icon={<CalendarOutlined />}>
                <Link to="/admin/activities">活动管理</Link>
              </Menu.Item>
              {/* <Menu.Item key="/admin/activities/review" icon={<CalendarOutlined />}>
                <Link to="/admin/activities/review">活动审核</Link>
              </Menu.Item> */}
            </>
          )}

          {!isAdmin && isClubAdmin && (
            <>
              <Menu.Divider />
              <Menu.SubMenu key="clubadmin" icon={<SettingOutlined />} title="社团管理">
                <Menu.Item key="/admin/clubs">
                  <Link to="/admin/clubs">社团管理</Link>
                </Menu.Item>
                <Menu.Item key="/admin/activities">
                  <Link to="/admin/activities">活动管理</Link>
                </Menu.Item>
              </Menu.SubMenu>
            </>
          )}
        </Menu>
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div className="header-right">
            {isAuthenticated ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div className="user-info">
                  <span className="username">{user?.username}</span>
                  <Avatar
                    src={user?.avatar ? `http://localhost:5000${user.avatar}` : undefined}
                    icon={!user?.avatar ? <UserOutlined /> : undefined}
                  />
                </div>
              </Dropdown>
            ) : (
              <div>
                <Button type="link" onClick={() => navigate('/login')}>登录</Button>
                <Button type="primary" onClick={() => navigate('/register')}>注册</Button>
              </div>
            )}
          </div>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout; 