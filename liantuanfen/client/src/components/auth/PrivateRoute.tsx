import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { Spin } from 'antd';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, token } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    // 记录要跳转的页面路径，以便登录后能跳回来
    if (!isAuthenticated && !loading && location.pathname !== '/login') {
      sessionStorage.setItem('redirectPath', location.pathname);
    }
  }, [isAuthenticated, loading, location.pathname]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="验证登录状态..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // 保存要跳转的页面路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute; 