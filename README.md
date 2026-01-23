# 专业光学图表系统 / Professional Optics Diagram System

一个功能完整的专业光学图表绘制系统，用于创建出版级质量的光学实验图表。

A complete professional optics diagram system for creating publication-quality optical experiment diagrams.

## ✨ 主要特性 / Key Features

- 🎨 **94+ 光学元件** - 激光器、透镜、反射镜、偏振器、探测器等
- 📝 **标注系统** - 文本、尺寸、角度、距离标注
- 📐 **对齐工具** - 智能对齐和网格系统
- 📊 **图层管理** - 完整层级结构
- 🎨 **主题系统** - 6个专业主题
- 📏 **测量工具** - 距离、角度、面积测量
- 🧮 **光学计算** - 15+ 光学公式
- ⌨️ **快捷键** - 50+ 键盘快捷键
- ↩️ **撤销/重做** - 完整历史记录
- 📤 **导出** - SVG、PNG、JPEG、PDF、EPS
- 📥 **导入** - SVG和图像导入

## 🚀 快速开始 / Quick Start

```bash
# 启动本地服务器
python -m http.server 8080
# 或
npx http-server -p 8080

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

**版本 / Version**: 1.0.0  
**更新 / Updated**: 2026-01-23
