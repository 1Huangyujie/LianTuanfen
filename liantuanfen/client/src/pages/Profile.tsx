import React, { useState, useContext } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, message, Typography, Row, Col, Tabs, Spin } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { AuthContext } from '../contexts/AuthContext';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

const { Title } = Typography;
const { TabPane } = Tabs;

const Profile: React.FC = () => {
  const { user, updateUser, loading } = useContext(AuthContext);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片必须小于2MB!');
    }
    return isJpgOrPng && isLt2M;
  };

  const handleChange = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList);
  };

  const onFinish = async (values: any) => {
    if (!user) return;

    try {
      setSubmitting(true);
      const formData = new FormData();

      // 添加表单字段
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
          formData.append(key, values[key]);
        }
      });

      // 添加头像文件
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('avatar', fileList[0].originFileObj as RcFile);
      }

      await updateUser(user.id, formData);
      message.success('个人信息更新成功');
    } catch (error) {
      console.error('更新个人信息失败', error);
      message.error('更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Card>
        <Title level={2} style={{ marginBottom: 30 }}>个人中心</Title>

        <Tabs defaultActiveKey="1">
          <TabPane tab="个人资料" key="1">
            <Row gutter={24}>
              <Col span={8}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <Avatar
                    size={120}
                    src={user.avatar ? `http://localhost:5000${user.avatar}` : undefined}
                    icon={!user.avatar ? <UserOutlined /> : undefined}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Upload
                      name="avatar"
                      listType="picture"
                      fileList={fileList}
                      beforeUpload={beforeUpload}
                      onChange={handleChange}
                      maxCount={1}
                      showUploadList={false}
                      customRequest={({ onSuccess }) => {
                        setTimeout(() => {
                          onSuccess && onSuccess("ok");
                        }, 0);
                      }}
                    >
                      <Button icon={<UploadOutlined />}>更换头像</Button>
                    </Upload>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>{user.username}</Title>
                  <p>角色: {user.role === 'admin' ? '管理员' :
                    user.role === 'club_admin' ? '社团管理员' : '学生'}</p>
                  <p>积分: {user.points}</p>
                </div>
              </Col>
              <Col span={16}>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{
                    username: user.username,
                    email: user.email,
                  }}
                  onFinish={onFinish}
                >
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input placeholder="请输入用户名" />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input placeholder="请输入邮箱" />
                  </Form.Item>
                  <Form.Item
                    name="oldPassword"
                    label="当前密码"
                  >
                    <Input.Password placeholder="留空表示不修改密码" />
                  </Form.Item>
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                  >
                    <Input.Password placeholder="留空表示不修改密码" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    dependencies={['newPassword']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject('两次输入的密码不一致');
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="请再次输入新密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </TabPane>
          <TabPane tab="我的活动" key="2">
            <p>暂无参与的活动</p>
          </TabPane>
          <TabPane tab="我的社团" key="3">
            <p>暂无加入的社团</p>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Profile; 