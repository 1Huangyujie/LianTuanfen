import axios from 'axios';
import { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_URL = 'http://localhost:5000/api';

// 配置默认设置
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.put['Content-Type'] = 'application/json';

// 请求拦截器
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`发送 ${config.method?.toUpperCase() || 'GET'} 请求到 ${config.url || '未知URL'}`, config.data || config.params || {});
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axios.interceptors.response.use(
  (response) => {
    console.log(`从 ${response.config.url || '未知URL'} 收到响应:`, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`错误响应 (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      console.error('无响应错误:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

// 创建登录和注册的API
const authAPI = {
  // 用户登录
  login: (credentials: { username: string; password: string }) =>
    axios.post(`${API_URL}/users/login`, credentials),

  // 用户注册
  register: (userData: FormData) =>
    axios.post(`${API_URL}/users/register`, userData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
};

// 用户相关API
export const userAPI = {
  // 获取积分排行榜
  getRankings: (searchParams?: { search?: string }) =>
    axios.get(`${API_URL}/users/rankings`, { params: searchParams }),

  // 获取所有用户（管理员）
  getAllUsers: () => axios.get(`${API_URL}/users/all`),

  // 获取用户（适用于MemberManagement）
  getUsers: () => axios.get(`${API_URL}/users`),

  // 获取用户详情
  getUserById: (userId: number) => axios.get(`${API_URL}/users/${userId}`),

  // 创建用户（适用于MemberManagement）
  createUser: (userData: FormData) =>
    axios.post(`${API_URL}/users`, userData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // 更新用户（适用于MemberManagement）
  updateUser: (userId: number, userData: FormData) =>
    axios.put(`${API_URL}/users/${userId}`, userData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // 删除用户（适用于MemberManagement）
  deleteUser: (userId: number) => axios.delete(`${API_URL}/users/${userId}`),

  // 修改用户角色（管理员）
  changeUserRole: (userId: number, role: string) =>
    axios.put(`${API_URL}/users/role/${userId}`, { role }),

  // 登录和注册
  ...authAPI
};

// 社团相关API
export const clubAPI = {
  // 获取所有社团
  // 返回: { success: true, clubs: [...社团列表], user_joined_clubs: [用户加入的社团ID] }
  getAllClubs: () => axios.get(`${API_URL}/clubs`),

  // 获取社团详情
  // 返回: { success: true, club: {...社团信息}, members: [...成员列表], is_joined: true/false }
  getClubById: (clubId: number) => axios.get(`${API_URL}/clubs/${clubId}`),

  // 创建社团
  createClub: (clubData: FormData) => axios.post(`${API_URL}/clubs`, clubData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // 更新社团信息
  updateClub: (clubId: number, clubData: FormData) => axios.put(`${API_URL}/clubs/${clubId}`, clubData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // 删除社团
  deleteClub: (clubId: number) => axios.delete(`${API_URL}/clubs/${clubId}`),

  // 加入社团
  // 返回: { success: true, message: '加入社团成功', member_count: 10, is_joined: true }
  joinClub: (clubId: number) => axios.post(`${API_URL}/clubs/${clubId}/join`),

  // 退出社团
  // 返回: { success: true, message: '退出社团成功', member_count: 9, is_joined: false }
  leaveClub: (clubId: number) => axios.delete(`${API_URL}/clubs/${clubId}/leave`),

  // 更新社团成员角色
  updateMemberRole: (clubId: number, userId: number, role: string) =>
    axios.put(`${API_URL}/clubs/${clubId}/members/role`, { userId, role })
};

// 活动相关API
export const activityAPI = {
  // 获取所有活动（可筛选）
  getAllActivities: (params?: { status?: string, club_id?: number }) =>
    axios.get(`${API_URL}/activities`, { params }),

  // 获取活动详情
  getActivityById: (activityId: number) => axios.get(`${API_URL}/activities/${activityId}`),

  // 创建活动
  createActivity: (activityData: FormData) => axios.post(`${API_URL}/activities`, activityData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // 更新活动
  updateActivity: (activityId: number, activityData: FormData) =>
    axios.put(`${API_URL}/activities/${activityId}`, activityData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),

  // 删除活动
  deleteActivity: (activityId: number) => axios.delete(`${API_URL}/activities/${activityId}`),

  // 参与活动
  joinActivity: (activityId: number) => axios.post(`${API_URL}/activities/${activityId}/join`),

  // 取消报名活动
  leaveActivity: (activityId: number) => axios.delete(`${API_URL}/activities/${activityId}/leave`),

  // 完成活动（管理员）
  completeActivity: (activityId: number, userIds: number[]) =>
    axios.post(`${API_URL}/activities/${activityId}/complete`, { user_ids: userIds }),

  // 审核活动（管理员）
  reviewActivity: (activityId: number, status: 'approved' | 'rejected', feedback?: string) =>
    axios.put(`${API_URL}/activities/${activityId}/review`, { status, feedback }),

  // 获取待审核活动（管理员）
  getPendingActivities: () => axios.get(`${API_URL}/activities/pending/list`),

  // 获取当前用户参与的活动
  getUserActivities: () => axios.get(`${API_URL}/activities/user/joined`),

  // 获取活动统计数据
  getActivityStats: () => axios.get(`${API_URL}/activities/stats/summary`)
}; 