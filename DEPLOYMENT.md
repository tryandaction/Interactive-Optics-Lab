# OpticsLab 部署指南

本文档提供 OpticsLab 的多种部署方式，适用于不同的使用场景。

---

## 目录

1. [静态托管部署](#静态托管部署)
2. [Docker 容器化部署](#docker-容器化部署)
3. [Electron 桌面版打包](#electron-桌面版打包)
4. [本地开发环境](#本地开发环境)

---

## 静态托管部署

OpticsLab 是纯前端应用，可直接部署到任何静态托管服务。

### GitHub Pages

1. **Fork 或克隆仓库**
   ```bash
   git clone https://github.com/tryandaction/Interactive-Optics-Lab.git
   cd OpticsLab
   ```

2. **推送到 GitHub**
   ```bash
   git remote add origin https://github.com/tryandaction/Interactive-Optics-Lab.git
   git push -u origin main
   ```

3. **启用 GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source 选择 `main` 分支，目录选择 `/ (root)`
   - 保存后等待几分钟，访问 `https://tryandaction.github.io/Interactive-Optics-Lab/`

### Netlify

1. **连接 Git 仓库**
   - 登录 [Netlify](https://netlify.com)
   - 点击 "New site from Git"
   - 选择 GitHub/GitLab/Bitbucket 并授权

2. **配置构建设置**
   - Build command: (留空)
   - Publish directory: `.`
   - 点击 "Deploy site"

3. **自定义域名（可选）**
   - Site settings → Domain management → Add custom domain

### Vercel

1. **导入项目**
   - 登录 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 导入 Git 仓库

2. **配置**
   - Framework Preset: Other
   - Build Command: (留空)
   - Output Directory: `.`
   - 点击 "Deploy"

3. **环境变量（如需要）**
   - Settings → Environment Variables

---

## Docker 容器化部署

使用 Docker 可以快速部署到任何支持容器的环境。

### Dockerfile

在项目根目录创建 `Dockerfile`:

```dockerfile
FROM nginx:alpine

# 复制项目文件到 nginx 默认目录
COPY . /usr/share/nginx/html

# 复制自定义 nginx 配置（可选）
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t opticslab:latest .

# 运行容器
docker run -d -p 8080:80 --name opticslab opticslab:latest

# 访问 http://localhost:8080
```

### Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  opticslab:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
    volumes:
      - ./presets:/usr/share/nginx/html/presets:ro
```

运行:
```bash
docker-compose up -d
```

---

## Electron 桌面版打包

OpticsLab 提供 Electron 桌面版，支持 Windows、macOS、Linux。

### 前置要求

- Node.js >= 18.0.0
- npm 或 yarn

### 打包步骤

1. **进入 Electron 目录**
   ```bash
   cd desktop/electron
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **打包所有平台**
   ```bash
   npm run build
   ```

4. **打包特定平台**
   ```bash
   # Windows
   npm run build:win

   # macOS
   npm run build:mac

   # Linux
   npm run build:linux
   ```

5. **输出位置**
   - 打包后的文件位于 `desktop/electron/dist/`
   - Windows: `.exe` 安装程序
   - macOS: `.dmg` 磁盘镜像
   - Linux: `.AppImage` 或 `.deb`

### 代码签名（可选）

**Windows:**
```bash
# 需要代码签名证书
npm run build:win -- --sign
```

**macOS:**
```bash
# 需要 Apple Developer 账户
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
npm run build:mac -- --sign
```

---

## 本地开发环境

### 快速启动

```bash
# 安装 http-server（如未安装）
npm install -g http-server

# 启动开发服务器
npm run dev

# 或直接使用 http-server
http-server . -p 8080 -c-1 -o
```

### 运行测试

```bash
# 单元测试
npm run test:unit

# E2E 测试
npm run test:e2e

# 代码检查
npm run lint
```

---

## 生产环境优化

### 性能优化

1. **启用 Gzip 压缩**
   - Nginx: 在 `nginx.conf` 中添加 `gzip on;`
   - Apache: 启用 `mod_deflate`

2. **设置缓存头**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **CDN 加速**
   - 将静态资源上传到 CDN
   - 更新 `index.html` 中的资源路径

### 安全配置

1. **Content Security Policy**
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
   ```

2. **HTTPS 强制**
   ```nginx
   server {
       listen 80;
       return 301 https://$host$request_uri;
   }
   ```

---

## 故障排除

### 常见问题

**问题 1: 页面空白**
- 检查浏览器控制台是否有 CORS 错误
- 确保所有资源路径正确（相对路径 vs 绝对路径）

**问题 2: 模块加载失败**
- 确保服务器正确设置 MIME 类型
- Nginx: `include mime.types;`
- 检查 `Content-Type: application/javascript`

**问题 3: localStorage 配额已满**
- 清理浏览器缓存
- 导出场景文件作为备份
- 使用 IndexedDB 替代方案（未来版本）

---

## 监控和日志

### 浏览器控制台

- 打开开发者工具 (F12)
- 查看 Console 标签页的错误和警告
- 检查 Network 标签页的资源加载情况

### 服务器日志

**Nginx:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**Docker:**
```bash
docker logs -f opticslab
```

---

## 联系支持

如遇到部署问题，请：
1. 查看 [GitHub Issues](https://github.com/tryandaction/Interactive-Optics-Lab/issues)
2. 提交新 Issue 并附上详细错误信息
3. 加入社区讨论

---

**最后更新:** 2026-02-16
