# 校园社团活动积分系统

基于React和MySQL的校园社团活动积分系统，帮助管理社团、活动和积分排名。

## 功能特性

- 用户管理：注册、登录、个人信息管理
- 社团管理：创建社团、管理社团成员、社团详情查看
- 活动管理：创建活动、活动审核、活动参与
- 积分系统：活动完成后获取积分，积分排行榜
- 权限控制：管理员、社团管理员和普通用户权限分级

## 技术栈

### 前端
- React 18
- TypeScript
- Ant Design 组件库
- React Router 路由管理
- Axios 网络请求

### 后端
- Node.js
- Express 框架
- MySQL 数据库
- JWT 用户认证
- Multer 文件上传

## 运行说明

### 数据库配置
1. 创建MySQL数据库：
   ```sql
   CREATE DATABASE liantuanfen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. 配置数据库连接信息（默认）：
   - 主机：localhost
   - 用户：root
   - 密码：123456
   - 数据库：liantuanfen

### 后端运行
1. 进入后端目录：
   ```
   cd liantuanfen/server
   ```
2. 安装依赖：
   ```
   npm install
   ```
3. 启动开发服务器：
   ```
   npm run dev
   ```
4. 服务器将在 http://localhost:5000 运行

### 前端运行
1. 进入前端目录：
   ```
   cd liantuanfen/client
   ```
2. 安装依赖：
   ```
   npm install
   ```
3. 启动开发服务器：
   ```
   npm start
   ```
4. 前端将在 http://localhost:3000 运行

## 项目结构

```
liantuanfen/
├── client/                 # 前端代码
│   ├── public/             # 静态资源
│   └── src/                # 源代码
│       ├── api/            # API调用
│       ├── components/     # 组件
│       ├── contexts/       # 上下文
│       └── pages/          # 页面
├── server/                 # 后端代码
│   ├── controllers/        # 控制器
│   ├── middleware/         # 中间件
│   ├── routes/             # 路由
│   ├── uploads/            # 文件上传目录
│   └── index.js            # 入口文件
└── README.md               # 项目说明
```

## 用户角色

- 管理员（admin）：系统管理，用户管理，社团管理，活动审核
- 社团管理员（club_admin）：社团管理，活动创建和管理
- 普通学生（student）：参与活动，加入社团

## 初始管理员账号

在数据库中手动创建一个管理员账号：

```sql
INSERT INTO users (username, password, role, student_id, email)
VALUES ('admin', '$2b$10$aOI5estDmw0QJuNzm0QyMOwYeY5lObr3O57X0tn1yjnCw3w4JGXUq', 'admin', 'admin', 'admin@example.com');
```

这将创建一个用户名为 `admin`，密码为 `123456` 的管理员账号。

## 许可证

MIT 