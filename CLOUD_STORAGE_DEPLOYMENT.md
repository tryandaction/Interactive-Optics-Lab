# OpticsLab 云端存储系统部署指南

## 概述

OpticsLab 云端存储系统使用 **GitHub OAuth + GitHub Gists** 实现零成本云端场景存储。本指南介绍如何配置和部署云端存储功能。

---

## 系统架构

```
用户浏览器
    ↓
GitHub OAuth 登录
    ↓
Vercel OAuth Proxy (保护 Client Secret)
    ↓
GitHub API (Gists)
    ↓
场景 JSON 存储在私密 Gist
```

### 成本分析

| 服务 | 免费额度 | 成本 |
|------|---------|------|
| GitHub Gists | 无限制 | $0 |
| GitHub API | 5,000 请求/小时 | $0 |
| Vercel Functions | 100GB-hours/月 | $0 |
| **总计** | - | **$0/月** |

---

## 第一步：注册 GitHub OAuth App

### 1.1 创建 OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息:
   - **Application name**: OpticsLab
   - **Homepage URL**: `https://tryandaction.github.io/Interactive-Optics-Lab`
   - **Authorization callback URL**: `https://tryandaction.github.io/Interactive-Optics-Lab/`
   - **Application description**: 光学实验模拟器云端存储

4. 点击 "Register application"

### 1.2 获取凭据

注册后会获得:
- **Client ID**: 公开的，可以嵌入前端代码
- **Client Secret**: 保密的，只能在服务器端使用

**重要:** Client Secret 必须保密，不能提交到 Git 仓库！

---

## 第二步：部署 OAuth Proxy 到 Vercel

### 2.1 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2.2 登录 Vercel

```bash
vercel login
```

### 2.3 部署项目

```bash
cd OpticsLab
vercel deploy
```

按照提示操作:
1. Set up and deploy? **Y**
2. Which scope? 选择你的账户
3. Link to existing project? **N**
4. What's your project's name? **opticslab**
5. In which directory is your code located? **.**

### 2.4 设置环境变量

```bash
# 添加 GitHub Client Secret
vercel env add GITHUB_CLIENT_SECRET

# 粘贴你的 Client Secret
# 选择环境: Production, Preview, Development (全选)
```

### 2.5 重新部署

```bash
vercel --prod
```

部署完成后，你会获得一个 URL，例如:
```
https://opticslab-xxxxx.vercel.app
```

记下这个 URL，后面会用到。

---

## 第三步：配置前端

### 3.1 添加 Client ID 到 HTML

在 `index.html` 的 `<head>` 部分添加:

```html
<meta name="github-client-id" content="YOUR_GITHUB_CLIENT_ID">
```

### 3.2 更新 OAuth Proxy URL

在 `src/cloud/GitHubAuth.js` 中，更新 `proxyUrl`:

```javascript
this.proxyUrl = config.proxyUrl || 'https://opticslab-xxxxx.vercel.app/api/token';
```

或者在初始化时传入:

```javascript
const githubAuth = new GitHubAuth({
    clientId: 'YOUR_CLIENT_ID',
    proxyUrl: 'https://opticslab-xxxxx.vercel.app/api/token'
});
```

---

## 第四步：测试云端存储

### 4.1 本地测试

```bash
# 启动本地服务器
npm start

# 访问 http://localhost:8080
```

### 4.2 测试登录流程

1. 打开 OpticsLab
2. 打开浏览器控制台 (F12)
3. 输入:
   ```javascript
   githubAuth.login();
   ```
4. 应该跳转到 GitHub 授权页面
5. 点击 "Authorize"
6. 应该跳转回 OpticsLab
7. 控制台显示: `GitHub authentication successful`

### 4.3 测试保存场景

```javascript
// 创建测试场景
const testScene = {
    components: [],
    settings: {},
    version: '1.0'
};

// 保存到云端
await cloudStorage.saveScene('test-scene', testScene);
// 应该显示: Scene saved to cloud: test-scene
```

### 4.4 测试加载场景

```javascript
// 列出所有场景
const scenes = await cloudStorage.listScenes();
console.log(scenes);

// 加载场景
const sceneData = await cloudStorage.loadScene('test-scene');
console.log(sceneData);
```

---

## 第五步：部署到生产环境

### 5.1 GitHub Pages 部署

```bash
# 构建项目（如果需要）
npm run build

# 部署到 GitHub Pages
git add .
git commit -m "Add cloud storage feature"
git push origin main

# 启用 GitHub Pages
# Settings → Pages → Source: main branch
```

### 5.2 更新 OAuth App 回调 URL

回到 GitHub OAuth App 设置页面，更新回调 URL:

```
https://tryandaction.github.io/Interactive-Optics-Lab/auth/callback
```

### 5.3 测试生产环境

访问 `https://tryandaction.github.io/Interactive-Optics-Lab`，测试登录和云端存储功能。

---

## 使用指南

### 用户登录

**方法 A: 通过 UI**
1. 点击顶部菜单栏的 "Cloud" 按钮
2. 点击 "Login with GitHub"
3. 授权后自动跳转回应用

**方法 B: 通过控制台**
```javascript
githubAuth.login();
```

### 保存场景到云端

**方法 A: 通过 UI**
1. File → Save to Cloud
2. 输入场景名称
3. 点击 "Save"

**方法 B: 通过控制台**
```javascript
await saveSceneToCloud();
```

### 加载场景从云端

**方法 A: 通过 UI**
1. File → Load from Cloud
2. 选择场景
3. 点击场景名称加载

**方法 B: 通过控制台**
```javascript
await loadSceneFromCloud();
```

### 查看云端场景列表

```javascript
const scenes = await cloudStorage.listScenes();
console.table(scenes);
```

### 删除云端场景

```javascript
await cloudStorage.deleteScene('scene-name');
```

### 分享场景

```javascript
const shareUrl = await cloudStorage.getShareLink('scene-name');
console.log(shareUrl);
// 复制链接发送给其他用户
```

### 查看存储统计

```javascript
const stats = await cloudStorage.getStorageStats();
console.log(stats);
// {
//   sceneCount: 5,
//   totalSize: 12345,
//   totalSizeFormatted: '12.06 KB',
//   scenes: [...]
// }
```

---

## 高级功能

### 版本历史

GitHub Gists 自动保存每次修改的历史记录:

```javascript
const history = await cloudStorage.getVersionHistory('scene-name');
console.log(history);
```

### 导入场景从 URL

```javascript
const url = 'https://gist.githubusercontent.com/...';
const sceneData = await cloudStorage.importFromUrl(url);
loadSceneDataObject(sceneData);
```

### API 速率限制检查

```javascript
const rateLimit = await githubAuth.getRateLimit();
console.log(rateLimit);
// {
//   resources: {
//     core: { limit: 5000, remaining: 4999, reset: 1234567890 }
//   }
// }
```

---

## 故障排查

### 问题 1: OAuth 回调失败

**症状:** 授权后跳转到空白页面或 404

**原因:**
- 回调 URL 配置错误
- OAuth App 未正确设置

**解决:**
1. 检查 GitHub OAuth App 的回调 URL 是否正确
2. 确保回调 URL 与实际部署 URL 一致
3. 检查浏览器控制台错误信息

### 问题 2: Token 交换失败

**症状:** 控制台显示 "Token exchange failed"

**原因:**
- Vercel 环境变量未设置
- Client Secret 错误
- OAuth Proxy 未部署

**解决:**
```bash
# 检查环境变量
vercel env ls

# 重新设置 Client Secret
vercel env add GITHUB_CLIENT_SECRET

# 重新部署
vercel --prod
```

### 问题 3: 保存场景失败

**症状:** "Failed to save scene to cloud"

**原因:**
- 未登录
- Token 过期
- GitHub API 速率限制

**解决:**
```javascript
// 检查登录状态
console.log(githubAuth.isLoggedIn());

// 重新登录
githubAuth.logout();
githubAuth.login();

// 检查 API 速率限制
const rateLimit = await githubAuth.getRateLimit();
console.log(rateLimit.resources.core.remaining);
```

### 问题 4: CORS 错误

**症状:** "Access to fetch blocked by CORS policy"

**原因:**
- OAuth Proxy 未正确配置 CORS
- 使用了错误的 Proxy URL

**解决:**
1. 检查 `api/token.js` 中的 CORS 头设置
2. 确保 Proxy URL 正确
3. 重新部署 Vercel Function

---

## 安全性

### Token 存储

- Access Token 存储在 `localStorage`
- 仅请求 `gist` 权限（最小权限原则）
- Token 不会过期（GitHub Personal Access Token 特性）

### Client Secret 保护

- Client Secret 仅存储在 Vercel 环境变量
- 前端代码不包含 Client Secret
- OAuth Proxy 充当中间层保护密钥

### Gist 隐私

- 所有场景存储在私密 Gist
- 只有用户本人可以访问
- 分享链接可以设置为公开（可选）

---

## 扩展性

### 免费额度限制

| 指标 | 限制 | 说明 |
|------|------|------|
| GitHub API | 5,000 请求/小时 | 每个用户独立计算 |
| Gist 大小 | 无限制 | 单个文件建议 < 1MB |
| Vercel Functions | 100GB-hours/月 | 约 100 万次请求 |

### 用户增长预估

- **100 用户:** 完全免费
- **1,000 用户:** 完全免费
- **10,000 用户:** 可能需要升级 Vercel Pro ($20/月)

### 备选方案

如果 GitHub API 限制不够，可以切换到:
- **Supabase**: 500MB 免费存储
- **Firebase**: 1GB 免费存储
- **Cloudflare Workers KV**: 100K 请求/天免费

---

## 监控和维护

### 监控 API 使用

```javascript
// 定期检查 API 速率限制
setInterval(async () => {
    if (githubAuth.isLoggedIn()) {
        const rateLimit = await githubAuth.getRateLimit();
        console.log(`API remaining: ${rateLimit.resources.core.remaining}/5000`);
    }
}, 60000); // 每分钟检查一次
```

### 日志记录

在 Vercel Dashboard 查看 Function 日志:
1. 访问 https://vercel.com/dashboard
2. 选择项目 "opticslab"
3. 点击 "Functions" 标签
4. 查看 `/api/token` 的调用日志

### 错误追踪

建议集成错误追踪服务（可选）:
- **Sentry**: 免费额度 5K 错误/月
- **LogRocket**: 免费额度 1K 会话/月

---

## 下一步

1. **添加 UI 按钮**
   - 在顶部菜单栏添加 "Cloud" 菜单
   - 添加 "Login", "Save to Cloud", "Load from Cloud" 按钮

2. **自动同步**
   - 实现自动保存到云端（每 5 分钟）
   - 冲突检测和合并

3. **团队协作**
   - 共享场景库
   - 实时协作编辑（使用 WebSocket）

4. **离线支持**
   - Service Worker 缓存
   - 离线队列（在线时自动同步）

---

## 支持

如有问题，请联系:
- Email: support@opticslab.app
- GitHub Issues: https://github.com/tryandaction/Interactive-Optics-Lab/issues
- 文档: https://opticslab.app/docs

---

**OpticsLab 云端存储系统 v1.0**
