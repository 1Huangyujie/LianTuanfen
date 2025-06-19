import React, { useContext, useState } from 'react';
import { Form, Input, Button, Upload, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined, MailOutlined, UploadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';

const { Title } = Typography;
const { TextArea } = Input;

const Register: React.FC = () => {
  const { register, loading } = useContext(AuthContext);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<UploadFile | null>(null);

  const onFinish = async (values: any) => {
    try {
      setError(null);

      const formData = new FormData();
      formData.append('username', values.username);
      formData.append('password', values.password);
      formData.append('student_id', values.student_id);
      formData.append('email', values.email);

      if (values.bio) {
        formData.append('bio', values.bio);
      }

      if (avatar && avatar.originFileObj) {
        formData.append('avatar', avatar.originFileObj);
      }

      await register(formData);
      message.success('注册成功，已自动登录');
      navigate('/');
    } catch (err) {
      console.error('注册失败:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('注册失败，请稍后重试');
      }
    }
  };

  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG图片!');
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB!');
    }

    return false;
  };

  const handleChange = (info: any) => {
    setAvatar(info.file);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '50px 0',
      backgroundImage: 'linear-gradient(to right, #1890ff, #52c41a)'
    }}>
      <Card
        style={{ width: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        cover={
          <div style={{
            padding: '30px 0 10px',
            textAlign: 'center',
            backgroundColor: '#fff'
          }}>
            <Title level={2} style={{ color: '#1890ff' }}>
              注册账号
            </Title>
          </div>
        }
      >
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请确认密码" />
          </Form.Item>

          <Form.Item
            name="student_id"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="请输入学号" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="bio"
            label="个人简介"
          >
            <TextArea rows={4} placeholder="请简单介绍一下自己" />
          </Form.Item>

          <Form.Item label="头像">
            <Upload
              listType="picture"
              maxCount={1}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              fileList={avatar ? [avatar] : []}
            >
              <Button icon={<UploadOutlined />}>选择头像</Button>
            </Upload>
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
              loading={loading}
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            已有账号？ <Link to="/login">立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register; 