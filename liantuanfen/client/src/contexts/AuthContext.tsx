import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  avatar?: string;
  email?: string;
  role: string;
  points: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClubAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: FormData) => Promise<void>;
  logout: () => void;
  updateUser: (userId: number, userData: FormData) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const initialAuthContext: AuthContextType = {
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  isClubAdmin: false,
  login: async () => { },
  register: async () => { },
  logout: () => { },
  updateUser: async () => { },
  loading: false,
  error: null
};

export const AuthContext = createContext<AuthContextType>(initialAuthContext);

// 添加useAuth钩子函数
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 尝试从localStorage和sessionStorage恢复用户会话
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  const initialUser = storedUser ? JSON.parse(storedUser) : null;

  const [user, setUser] = useState<User | null>(initialUser);
  const [token, setToken] = useState<string | null>(storedToken);
  const [loading, setLoading] = useState<boolean>(!!storedToken && !initialUser); // 仅当有token但没有用户数据时才加载
  const [initialized, setInitialized] = useState<boolean>(!storedToken || !!initialUser);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isClubAdmin = user?.role === 'club_admin' || user?.role === 'admin';

  // 设置axios默认配置
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // 验证token并获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token && (!user || !initialized)) {
        try {
          setLoading(true);
          // 添加超时处理
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 增加超时时间

          const response = await axios.get('http://localhost:5000/api/users/me', {
            signal: controller.signal,
            headers: { 'Authorization': `Bearer ${token}` } // 确保发送token
          });

          clearTimeout(timeoutId);
          const userData = response.data.user;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setInitialized(true);
        } catch (err) {
          console.error('获取用户信息失败:', err);
          // 如果token无效，清除登录状态
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setInitialized(true);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setInitialized(true);
      }
    };

    // 检查token是否存在，如果存在则尝试获取用户信息
    if (token) {
      fetchCurrentUser();
    } else {
      setInitialized(true);
    }
  }, [token, user, initialized]);

  // 登录函数
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('http://localhost:5000/api/users/login', {
        username,
        password
      });

      const { token: newToken, user: userData } = response.data;

      // 保存token和用户信息到localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      console.error('登录失败:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
      } else {
        setError('登录过程中发生错误');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 注册函数
  const register = async (userData: FormData) => {
    try {
      setLoading(true);
      setError(null);

      await axios.post('http://localhost:5000/api/users/register', userData);

      // 注册成功后自动登录
      const username = userData.get('username') as string;
      const password = userData.get('password') as string;

      await login(username, password);
    } catch (err) {
      console.error('注册失败:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || '注册失败');
      } else {
        setError('注册过程中发生错误');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('joinedClubs'); // 清除用户加入的社团信息
    setToken(null);
    setUser(null);

    // 清除axios默认头
    delete axios.defaults.headers.common['Authorization'];

    // 导航回登录页，解决无法退出的问题
    window.location.href = '/login';
  };

  // 更新用户信息
  const updateUser = async (userId: number, userData: FormData) => {
    try {
      setLoading(true);
      setError(null);

      await axios.put(`http://localhost:5000/api/users/update/${userId}`, userData);

      // 更新后重新获取用户信息
      const response = await axios.get('http://localhost:5000/api/users/me');
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('更新用户信息失败:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || '更新用户信息失败');
      } else {
        setError('更新用户信息过程中发生错误');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isClubAdmin,
    login,
    register,
    logout,
    updateUser,
    loading,
    error
  };

  // 等待初始化完成再渲染子组件
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>联团分</div>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 