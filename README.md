# OpticsLab — 科研光路草图与交互式光学验证工作台

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.0-green.svg)](package.json)

OpticsLab 当前定位为面向教学、AMO/激光实验草图和科研光路快速验证的 Web 工作台。项目正在救援重构阶段：核心光线追踪、理想薄透镜成像和科研图示能力可用，但专业仿真精度、厚透镜模型和出版级导出仍需要逐项验证与重构。

An interactive optics workbench for educational ray tracing, AMO/laser-lab sketching, ideal thin-lens diagrams, and research diagram prototyping. This project is under active rescue/refactoring; physics fidelity and publication export quality are being rebuilt around explicit validation.

## 当前可信边界 / Current Reliability Scope

- **适合使用**：几何光路演示、反射/折射/TIR/色散的交互观察、理想薄透镜教学图、科研光路草图。
- **谨慎使用**：厚透镜、非球面/GRIN、高斯光束、复杂偏振系统、衍射/干涉的定量结论。
- **暂不承诺**：替代 Zemax/COMSOL/CODE V 等专业光学设计软件，或直接生成无需人工审校的期刊最终图。

## 主要特性 / Key Features

### 模拟模式 — 交互式光线追踪
- 光线折射、反射、全反射、色散模拟
- 部分偏振态追踪（Jones 矩阵）与高斯光束近似
- 薄透镜近轴模型；厚透镜模型处于待验证状态
- 衍射光栅、声光调制器、法布里-珀罗腔等高级元件处于实验性阶段

### 理想薄透镜成像模式 — 教学主光线图
- 薄透镜方程 (1/f = 1/u + 1/v) 实时计算
- 三条主光线自动绘制（平行光线、过光心、过焦点）
- 可拖拽物体箭头，实时更新像的位置、大小和性质
- 实像/虚像自动判断与渲染（虚线表示虚像）
- 仅用于理想薄透镜教学图，不代表复杂透镜系统仿真

### 绘图模式 — 科研图示原型
- 光学元件图标库和科研光路连接草图
- 光线链接与连接点系统
- 标注系统（文本、上下标、自动布局）
- SVG/PNG/JPEG/PDF/EPS 导出能力正在验证中
- 论文/报告/海报模板预设处于重构前状态

## 快速开始 / Quick Start

```bash
# 克隆仓库
git clone https://github.com/<username>/OpticsLab.git
cd OpticsLab

# 启动本地服务器（任选其一）
npm start
# 或
npx http-server . -p 8080 -o
# 或
python -m http.server 8080

# 访问 http://localhost:8080
```

### 预设场景 / Preset Scenes

OpticsLab 提供 5 个专业预设场景，快速开始学习：

1. **basic_refraction.json** — 基础折射演示（棱镜色散）
2. **telescope_system.json** — 望远镜系统（物镜+目镜）
3. **fiber_coupling.json** — 光纤耦合系统
4. **polarization_demo.json** — 偏振态演示（偏振片+波片）
5. **interferometer.json** — 迈克尔逊干涉仪

加载方式：File → Import Scene → 选择 `presets/` 目录下的 JSON 文件

### 代码示例 / Code Example

```javascript
import { ProfessionalDiagramAPI } from './src/diagram/ProfessionalDiagramAPI.js';

// 初始化
const api = ProfessionalDiagramAPI.quickStart('canvas-id');

// 使用
api.icons.render('laser', 100, 100);
api.annotations.createText('激光源', { x: 100, y: 150 });
```

## 文档 / Documentation

- **用户指南**: [UserGuide.md](UserGuide.md)
- **示例页面**: [example-complete-system.html](example-complete-system.html)
- **故障排除**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **科研图示示例预设**: `presets/diagram_example_mot_paper.json`
- **桌面版打包**: [DESKTOP_GUIDE.md](DESKTOP_GUIDE.md)
- **商业化草案**: [MONETIZATION_STRATEGY.md](MONETIZATION_STRATEGY.md) — 历史草案，核心质量稳定前不建议启用
- **许可证系统**: [LICENSE_SYSTEM.md](LICENSE_SYSTEM.md) — 实验性实现，当前不作为产品承诺
- **API文档**: 查看代码中的JSDoc注释

## 商业化状态 / Commercialization Status

商业化、许可证、云同步和 Pro 版本仍是历史草案或实验性功能。当前优先级是恢复核心物理可信度、绘图审美和导出可靠性。请不要在完成验证基线前将本项目作为收费产品发布。

## 快捷键 / Shortcuts

| 功能 | 快捷键 |
|------|--------|
| 保存 | `Ctrl+S` |
| 撤销 | `Ctrl+Z` |
| 重做 | `Ctrl+Y` |
| 删除 | `Del` |
| 网格 | `Ctrl+'` |
| 帮助 | `F1` |

按 `Ctrl+/` 查看完整快捷键列表

## 项目结构 / Structure

```
├── src/
│   ├── core/               # 核心类（Vector, Ray, OpticalComponent）
│   ├── components/         # 光学元件（光源、透镜、反射镜、偏振器等）
│   ├── simulation/         # 模拟引擎（RayTracer, LensImaging）
│   ├── rendering/          # 渲染器（光线、箭头、网格）
│   ├── diagram/            # 绘图模式（专业图标、模式转换）
│   ├── ui/                 # UI 组件（Inspector, Toolbar）
│   └── compat/             # 兼容层（ES6 模块 → window 全局）
├── presets/                # 预设与示例场景
├── desktop/                # Electron 桌面版
├── tests/                  # 测试
├── index.html              # 主页面
└── main.js                 # 主逻辑
```

## 性能 / Performance

- FPS: 55-60 (100+组件)
- 初始化: <500ms
- 快捷键响应: <50ms
- 自动保存: 每 60 秒
- 内存泄漏防护: 事件监听器自动清理

## Phase 2 改进 (v1.2.0)

### 数据安全
- ✅ AutoRecoveryManager 自动保存（每 60 秒）
- ✅ localStorage 配额检查与备份机制
- ✅ 全局错误处理器（防止白屏崩溃）

### 核心 Bug 修复
- ✅ Vector.divide() 零除防护
- ✅ GameLoop 错误计数与通知（连续 5 次错误后暂停）

### UI/UX 优化
- ✅ HTML meta 标签（SEO + Open Graph）
- ✅ Canvas ARIA 标签（屏幕阅读器支持）
- ✅ 系统暗色模式偏好检测 (prefers-color-scheme)
- ✅ Ctrl+A 全选、Ctrl+D 复制快捷键

### 性能与安全
- ✅ 事件监听器清理注册表（防止内存泄漏）
- ✅ innerHTML XSS 防护（4 处关键修复）
- ✅ GlobalState Map 泄漏防护

### 测试与文档
- ✅ 单元测试（Vector, ThinLens）
- ✅ 5 个专业预设场景
- ✅ 部署指南 (DEPLOYMENT.md)
- ✅ 商业化落地规划 (COMMERCIAL_PLAN.md)

## 浏览器支持 / Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 部署 / Deployment

查看 [DEPLOYMENT.md](DEPLOYMENT.md) 了解：
- 静态托管部署（GitHub Pages / Netlify / Vercel）
- Docker 容器化部署
- Electron 桌面版打包

## 贡献 / Contributing

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发指南和 PR 流程。

## 许可证 / License

MIT License

---

**版本 / Version**: 1.2.0
