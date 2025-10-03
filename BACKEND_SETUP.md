# 后端API设置指南

## 环境要求

- Node.js 16.0.0 或更高版本
- MongoDB 4.4 或更高版本

## 安装步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   创建 `.env` 文件并配置以下变量：
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/opticslab
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   FRONTEND_URL=http://localhost:8080
   ```

3. **启动MongoDB**
   确保MongoDB服务正在运行

4. **启动服务器**
   ```bash
   # 开发模式（自动重启）
   npm run dev
   
   # 生产模式
   npm start
   ```

## API接口文档

### 认证接口

#### 用户注册
- **POST** `/api/auth/register`
- **请求体**:
  ```json
  {
    "username": "用户名",
    "email": "邮箱",
    "password": "密码"
  }
  ```

#### 用户登录
- **POST** `/api/auth/login`
- **请求体**:
  ```json
  {
    "username": "用户名或邮箱",
    "password": "密码"
  }
  ```

#### 获取用户信息
- **GET** `/api/user/profile`
- **请求头**: `Authorization: Bearer <token>`

### 场景管理接口

#### 获取场景列表
- **GET** `/api/scenes?page=1&limit=20&search=关键词&tags=标签1,标签2`
- **请求头**: `Authorization: Bearer <token>`

#### 获取单个场景
- **GET** `/api/scenes/:id`
- **请求头**: `Authorization: Bearer <token>`

#### 创建场景
- **POST** `/api/scenes`
- **请求头**: `Authorization: Bearer <token>`
- **请求体**:
  ```json
  {
    "name": "场景名称",
    "description": "场景描述",
    "tags": ["标签1", "标签2"],
    "data": { /* 场景数据 */ },
    "isPublic": false
  }
  ```

#### 更新场景
- **PUT** `/api/scenes/:id`
- **请求头**: `Authorization: Bearer <token>`

#### 删除场景
- **DELETE** `/api/scenes/:id`
- **请求头**: `Authorization: Bearer <token>`

## 数据库模型

### 用户模型 (User)
```javascript
{
  username: String,      // 用户名（唯一）
  email: String,         // 邮箱（唯一）
  password: String,      // 加密后的密码
  preferences: {         // 用户偏好
    theme: String,       // 主题设置
    language: String     // 语言设置
  },
  createdAt: Date,       // 创建时间
  lastLogin: Date        // 最后登录时间
}
```

### 场景模型 (Scene)
```javascript
{
  userId: ObjectId,      // 用户ID
  name: String,          // 场景名称
  description: String,   // 场景描述
  tags: [String],        // 标签数组
  data: Object,          // 场景数据
  isPublic: Boolean,     // 是否公开
  createdAt: Date,       // 创建时间
  updatedAt: Date        // 更新时间
}
```

## 安全特性

- JWT令牌认证
- 密码bcrypt加密
- 请求频率限制
- CORS跨域保护
- 输入验证和清理
- Helmet安全头

## 开发说明

- 使用Express.js框架
- MongoDB数据库
- JWT令牌认证
- 支持分页查询
- 完整的错误处理
- 输入验证中间件

