import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { Spin, Result, Button } from 'antd';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, token } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    // 记录要跳转的页面路径，以便登录后能跳回来
    if (!isAuthenticated && !loading && location.pathname !== '/login') {
      sessionStorage.setItem('redirectPath', location.pathname);
    }
  }, [isAuthenticated, loading, location.pathname]);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="验证管理员权限..." />
      </div>
    );
  }

  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果登录了但不是管理员，显示403页面
  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="无权访问"
        subTitle="抱歉，您没有管理员权限，无法访问此页面"
        extra={
          <Button type="primary" onClick={() => window.location.href = '/'}>
            返回首页
          </Button>
        }
      />
    );
  }

  // 通过所有验证，渲染子组件
  return <>{children}</>;
};

export default AdminRoute; 