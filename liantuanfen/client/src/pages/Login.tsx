import React, { useContext, useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const { Title } = Typography;

const Login: React.FC = () => {
  const { login, loading, isAuthenticated } = useContext(AuthContext);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  // 获取上一个页面的路径
  const from = location.state?.from?.pathname || '/';

  // 如果已经登录，自动重定向到之前的页面或首页
  useEffect(() => {
    if (isAuthenticated) {
      // 检查是否有保存的跳转路径
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {
        sessionStorage.removeItem('redirectPath');
        navigate(redirectPath);
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, navigate, from]);

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setError(null);
      await login(values.username, values.password);
      message.success('登录成功');

      // 登录成功后，检查是否有保存的跳转路径
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {
        sessionStorage.removeItem('redirectPath');
        navigate(redirectPath);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('登录失败:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登录失败，请稍后重试');
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundImage: 'linear-gradient(to right, #1890ff, #52c41a)'
    }}>
      <Card
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        cover={
          <div style={{
            padding: '30px 0 10px',
            textAlign: 'center',
            backgroundColor: '#fff'
          }}>
            <Title level={2} style={{ color: '#1890ff' }}>
              校园社团活动积分系统
            </Title>
          </div>
        }
      >
        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          {error && (
            <div style={{ color: 'red', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            还没有账号？ <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 