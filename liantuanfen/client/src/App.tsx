import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';

// 导入布局组件
import AppLayout from './components/layout/AppLayout';

// 导入页面组件
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ClubList from './pages/ClubList';
import ClubDetail from './pages/ClubDetail';
import ActivityList from './pages/ActivityList';
import ActivityDetail from './pages/ActivityDetail';
import PointsRanking from './pages/PointsRanking';
import UserManagement from './pages/admin/UserManagement';
import ClubManagement from './pages/admin/ClubManagement';
import ActivityManagement from './pages/admin/ActivityManagement';
import ActivityReview from './pages/admin/ActivityReview';

// 导入权限控制组件
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';

// 导入全局样式
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<AppLayout />}>
            {/* 公共路由 */}
            <Route index element={<Home />} />
            <Route path="clubs" element={<ClubList />} />
            <Route path="clubs/:id" element={<ClubDetail />} />
            <Route path="activities" element={<ActivityList />} />
            <Route path="activities/:id" element={<ActivityDetail />} />
            <Route path="ranking" element={<PointsRanking />} />

            {/* 需要登录的路由 */}
            <Route
              path="profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            {/* 管理员路由 */}
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="admin/clubs"
              element={
                <AdminRoute>
                  <ClubManagement />
                </AdminRoute>
              }
            />
            <Route
              path="admin/activities"
              element={
                <AdminRoute>
                  <ActivityManagement />
                </AdminRoute>
              }
            />
            <Route
              path="admin/activities/review"
              element={
                <AdminRoute>
                  <ActivityReview />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
