# OpticsLab 项目文档结构

## 📁 核心文档（根目录）

### 用户文档
- **README.md** - 项目概述、快速开始、功能介绍
- **UserGuide.md** - 详细使用指南
- **TROUBLESHOOTING.md** - 常见问题和故障排查

### 部署文档
- **DEPLOYMENT.md** - 通用部署指南（GitHub Pages、Netlify、Vercel）
- **CLOUD_STORAGE_DEPLOYMENT.md** - 云端存储部署指南（GitHub OAuth + Gists）
- **DESKTOP_GUIDE.md** - 桌面版打包指南（Electron）

### 商业化文档
- **LICENSE_SYSTEM.md** - 许可证系统实施指南
- **MONETIZATION_STRATEGY.md** - 商业化策略详解（Open Core 模式）

### 开发者文档
- **CONTRIBUTING.md** - 贡献指南
- **SECURITY.md** - 安全政策
- **TODO.md** - 开发者操作清单（不上传 Git）

### GitHub 模板
- **.github/ISSUE_TEMPLATE/** - Issue 模板
- **.github/PULL_REQUEST_TEMPLATE.md** - PR 模板

---

## 📂 项目结构

```
OpticsLab/
├── index.html                  # 主页面
├── main.js                     # 主逻辑（310KB，待重构）
├── style.css                   # 主样式
├── package.json                # 项目配置
├── vercel.json                 # Vercel 部署配置
│
├── src/                        # 源代码
│   ├── core/                   # 核心模块
│   │   ├── Vector.js           # 向量运算
│   │   ├── Ray.js              # 光线类
│   │   └── GameLoop.js         # 渲染循环
│   │
│   ├── components/             # 光学元件
│   │   ├── lenses/             # 透镜类
│   │   ├── mirrors/            # 反射镜类
│   │   ├── sources/            # 光源类
│   │   └── ...                 # 其他元件
│   │
│   ├── simulation/             # 模拟系统
│   │   ├── LensImaging.js      # 透镜成像
│   │   └── index.js            # 模块导出
│   │
│   ├── diagram/                # 绘图模式
│   │   ├── icons/              # 元件图标
│   │   ├── ProfessionalDiagramAPI.js
│   │   └── ...
│   │
│   ├── ui/                     # UI 组件
│   │   ├── UnifiedProjectPanel.js
│   │   └── project-panel.css
│   │
│   ├── license/                # 许可证系统
│   │   ├── LicenseValidator.js # 许可证验证
│   │   └── LicenseUI.js        # 许可证 UI
│   │
│   ├── cloud/                  # 云端存储
│   │   ├── GitHubAuth.js       # GitHub OAuth
│   │   └── GistSceneStorage.js # Gist 存储
│   │
│   ├── state/                  # 状态管理
│   │   └── GlobalState.js
│   │
│   └── compat/                 # 兼容层
│       └── legacy-globals.js   # ES6 → 全局变量
│
├── api/                        # Serverless Functions
│   └── token.js                # OAuth Proxy
│
├── scripts/                    # 工具脚本
│   └── generate-license.js     # 许可证生成
│
├── presets/                    # 预设场景
│   ├── basic_refraction.json
│   ├── telescope_system.json
│   └── ...
│
├── tests/                      # 测试
│   └── unit/                   # 单元测试
│       ├── Vector.test.js
│       └── ThinLens.test.js
│
└── desktop/                    # 桌面版（Electron）
    └── electron/
        └── ...
```

---

## 🗂️ 文档分类

### 必读文档（新用户）
1. README.md - 了解项目
2. UserGuide.md - 学习使用
3. TROUBLESHOOTING.md - 解决问题

### 部署文档（开发者）
1. TODO.md - **开始这里！** 部署操作清单
2. DEPLOYMENT.md - 基础部署
3. CLOUD_STORAGE_DEPLOYMENT.md - 云端功能部署
4. LICENSE_SYSTEM.md - 许可证系统部署

### 商业化文档（创业者）
1. MONETIZATION_STRATEGY.md - 商业模式
2. LICENSE_SYSTEM.md - 许可证实施
3. CLOUD_STORAGE_DEPLOYMENT.md - 云端存储

### 贡献文档（贡献者）
1. CONTRIBUTING.md - 贡献指南
2. SECURITY.md - 安全政策
3. src/README.md - 代码结构

---

## 🚫 已删除的文档

以下阶段性文档已删除（内容已整合到核心文档）：

- ~~PHASE2_VERIFICATION.md~~ → 内容已整合
- ~~PHASE2_QUICKSTART.md~~ → 内容已整合
- ~~PHASE2_GIT_COMMIT.md~~ → 不再需要
- ~~PHASE3_COMPLETION_REPORT.md~~ → 内容已整合
- ~~PHASE3_ZERO_COST_PLAN.md~~ → 整合到 CLOUD_STORAGE_DEPLOYMENT.md
- ~~COMMERCIAL_PLAN.md~~ → 整合到 MONETIZATION_STRATEGY.md
- ~~ROOT_GUIDE.md~~ → 整合到 README.md
- ~~TEST_PLAN_DESKTOP.md~~ → 整合到 DESKTOP_GUIDE.md
- ~~CHANGELOG.md~~ → 使用 Git 历史
- ~~COMMERCIAL_LANDING_PAGE.md~~ → 营销材料，非技术文档

---

## 📝 文档维护原则

### 保留标准
✅ **保留：**
- 用户需要的文档（README, UserGuide）
- 部署必需的文档（DEPLOYMENT, CLOUD_STORAGE_DEPLOYMENT）
- 商业化核心文档（LICENSE_SYSTEM, MONETIZATION_STRATEGY）
- 开发者指南（CONTRIBUTING, SECURITY）

❌ **删除：**
- 阶段性报告（PHASE*）
- 临时计划文档
- 重复内容的文档
- 营销材料（非技术文档）

### 更新频率
- **README.md**: 每次重大功能更新
- **TODO.md**: 每次部署前更新
- **DEPLOYMENT.md**: 部署流程变更时
- **LICENSE_SYSTEM.md**: 许可证系统变更时
- **其他文档**: 按需更新

---

## 🔍 快速查找

**我想...**
- 了解项目 → README.md
- 学习使用 → UserGuide.md
- 部署项目 → TODO.md（开始这里！）
- 启用云端存储 → CLOUD_STORAGE_DEPLOYMENT.md
- 实施许可证 → LICENSE_SYSTEM.md
- 商业化 → MONETIZATION_STRATEGY.md
- 贡献代码 → CONTRIBUTING.md
- 解决问题 → TROUBLESHOOTING.md

---

**最后更新：** 2026-02-16
