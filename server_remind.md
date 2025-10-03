# 🚨 服务器启动提醒

## 问题描述
您遇到登录功能无法使用，显示"网络问题"的错误。

## 解决方案
**原因**：前后端服务器没有同时运行。登录功能需要后端API服务器提供支持。

### 当前状态 ✅
- ✅ 前端服务器：http://localhost:8080 (正在运行)
- ✅ 后端API：http://localhost:3000 (正在运行)
- ✅ MongoDB：连接正常

### 启动步骤
如果将来遇到类似问题，请按以下步骤操作：

1. **启动MongoDB**（如果未启动）：
   ```bash
   net start MongoDB
   ```

2. **启动后端服务器**：
   ```bash
   cd backend
   npm install  # 首次运行需要安装依赖
   npm run dev
   ```

3. **启动前端服务器**：
   ```bash
   cd frontend
   python -m http.server 8080
   ```

4. **验证服务器状态**：
   - 前端：http://localhost:8080
   - 后端健康检查：http://localhost:3000/api/health

### 便捷启动脚本
使用项目根目录的启动脚本：
- **Linux/Mac**：`./start-dev.sh`
- **Windows**：`.\start-dev.ps1`

## 测试登录功能
现在您可以正常使用：
- 用户注册
- 用户登录
- 密码重置
- 云端场景存储

---
*此文件将在问题解决后可以删除*