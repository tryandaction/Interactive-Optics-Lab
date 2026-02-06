# 专业光学图表系统 / Professional Optics Diagram System

一个功能完整的专业光学图表绘制系统，用于创建出版级质量的光学实验图表。

A complete professional optics diagram system for creating publication-quality optical experiment diagrams.

## ✨ 主要特性 / Key Features

- 🎨 **94+ 光学元件** - 激光器、透镜、反射镜、偏振器、探测器等
- 🧭 **双模式工作流** - 模拟/专业绘图自由切换，样式与标注保持
- 📝 **标注系统** - 文本标注、上下标、拖拽定位、自动布局
- 🔗 **连接点与光线连接** - 可视化连接点、吸附、手动/自动光线连接
- 📐 **布局与对齐** - 网格、吸附、对齐参考线、分组与均匀分布
- 🎨 **样式与主题** - 全局样式、组件样式、专业主题与自定义主题
- 📋 **技术说明** - 论文式说明区与分节管理
- 📦 **模板与预设** - 论文/报告/海报模板，一键套用
- 📤 **高质量导出** - SVG/PNG/JPEG/PDF/EPS，支持用途/范围/裁剪/网格/注释
- 🔌 **插件扩展** - 工具栏插件与可扩展接口

## 🚀 快速开始 / Quick Start

```bash
# 启动本地服务器
python -m http.server 8080
# 或
npx http-server -p 8080
#
# Windows 可使用
# .\\快速启动.bat

# 访问
http://localhost:8080
```

### 代码示例 / Code Example

```javascript
import { ProfessionalDiagramAPI } from './src/diagram/ProfessionalDiagramAPI.js';

// 初始化
const api = ProfessionalDiagramAPI.quickStart('canvas-id');

// 使用
api.icons.render('laser', 100, 100);
api.annotations.createText('激光源', { x: 100, y: 150 });
```

## 📖 文档 / Documentation

- **用户指南**: [UserGuide.md](UserGuide.md)
- **示例页面**: [example-complete-system.html](example-complete-system.html)
- **故障排除**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **论文级示例预设**: `presets/diagram_example_mot_paper.json`
- **API文档**: 查看代码中的JSDoc注释

## ⌨️ 常用快捷键 / Common Shortcuts

| 功能 | 快捷键 |
|------|--------|
| 保存 | `Ctrl+S` |
| 撤销 | `Ctrl+Z` |
| 重做 | `Ctrl+Y` |
| 删除 | `Del` |
| 网格 | `Ctrl+'` |
| 帮助 | `F1` |

按 `Ctrl+/` 查看完整快捷键列表

## 🏗️ 项目结构 / Structure

```
├── src/
│   ├── diagram/          # 核心系统
│   ├── ui/               # UI组件
│   └── components/       # 光学元件
├── presets/              # 预设与示例
├── tests/                # 测试
├── index.html            # 主页面
└── example-complete-system.html  # 完整示例
```

## 📊 性能 / Performance

- FPS: 55-60 (100+组件)
- 初始化: <500ms
- 快捷键响应: <50ms

## 🌐 浏览器支持 / Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 📄 许可证 / License

MIT License

---

**版本 / Version**: 1.1.0  
**更新 / Updated**: 2026-02-05
