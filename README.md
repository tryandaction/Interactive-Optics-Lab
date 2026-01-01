# 🔬 交互式光学实验平台

> 可视化光学仿真 | 纯前端运行 | 专业级光学元件库

**🌐 在线体验：[https://tryandaction.github.io/Interactive-Optics-Lab](https://tryandaction.github.io/Interactive-Optics-Lab)**

## 📋 项目简介

这是一个基于浏览器的交互式光学实验平台，专为光学课题组设计。通过可视化的方式模拟光路传播、干涉、衍射等光学现象。

**✨ 核心特点：**
- 🚀 **零安装** - 直接访问网页即可使用，无需任何安装
- 💾 **本地存储** - 所有数据保存在浏览器中，完全离线可用
- 🔓 **开源免费** - MIT 许可证，可自由使用和修改
- 📱 **跨平台** - 支持 Windows、macOS、Linux 及移动设备

## ✨ 核心功能

### 🎨 可视化画布
- **拖放式元件布局** - 直观的操作方式
- **实时光线追踪** - 精确的物理计算
- **多场景管理** - 支持保存和切换多个实验场景
- **网格对齐** - 精确定位元件位置
- **缩放平移** - 自由查看细节

### 🔧 丰富的光学元件

#### 光源类
- 点光源（激光）、扇形光源、线光源、白光光源

#### 光学器件
- **透镜系统**: 凸透镜、凹透镜
- **反射镜**: 平面镜、凹面镜、凸面镜、抛物面镜
- **分束器**: 半透镜、偏振分束器
- **棱镜**: 三角棱镜、介质块
- **光栅**: 衍射光栅、光阑/多缝

#### 偏振元件
- 偏振片、半波片、四分之一波片
- 法拉第旋光器、光隔离器

#### 探测器
- 屏幕（显示干涉图样）
- 光度计（测量光强）

### 📐 精确的光学计算
- **Snell定律** - 折射计算
- **Fresnel方程** - 反射/透射系数
- **偏振模拟** - Jones矩阵计算
- **色散效应** - 波长相关光学特性
- **干涉模拟** - 相干叠加计算

## 🚀 快速开始

### 方式一：直接在线使用（推荐）
访问 [https://tryandaction.github.io/Interactive-Optics-Lab](https://tryandaction.github.io/Interactive-Optics-Lab)

### 方式二：本地运行
```bash
# 克隆项目
git clone https://github.com/tryandaction/Interactive-Optics-Lab.git

# 进入目录
cd Interactive-Optics-Lab

# 用浏览器打开 index.html
# 或使用本地服务器
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 📖 使用指南

### 基本操作
1. **添加元件**: 点击左侧工具栏的元件按钮，然后在画布上点击放置
2. **选择元件**: 直接点击画布上的元件（Shift+点击可多选）
3. **移动元件**: 拖动选中的元件
4. **旋转元件**: 拖动元件的角度控制柄，或悬停时滚动鼠标滚轮
5. **删除元件**: 选中后按 Delete 或 Backspace 键

### 视图控制
- **缩放**: 鼠标滚轮或双指捏合
- **平移**: 按住鼠标中键拖动或双指拖动
- **重置视图**: 通过"视图"菜单

### 场景管理
- **保存场景**: 右侧"场景"标签页 → "保存当前场景"
- **加载场景**: 点击已保存的场景名称
- **导出/导入**: 通过"文件"菜单导出/导入 JSON 文件

### 快捷键
```
Ctrl + Z    撤销
Ctrl + Y    重做
Ctrl + S    保存场景
Ctrl + E    导出文件
Delete      删除选中元件
Space       平移画布（按住拖动）
G           显示/隐藏网格
```

## 🏗️ 技术架构

```
Interactive-Optics-Lab/
├── index.html              # 主页面
├── style.css               # 主样式
├── collaboration.css       # 协作样式
├── main.js                 # 主逻辑
├── components.js           # 光学元件类库
├── ray.js                  # 光线追踪引擎
├── vector.js               # 向量运算
├── history.js              # 操作历史管理
├── sceneManager.js         # 场景管理
├── user.js                 # 本地用户管理
├── projectManager.js       # 项目管理
├── interactionEnhancer.js  # 交互增强
├── collaborationManager.js # 协作管理
├── collaborationUI.js      # 协作UI
├── presets/                # 预设场景
│   └── preset_double_slit.json
└── README.md
```

### 核心技术
- **HTML5 Canvas** - 图形渲染
- **JavaScript ES6+** - 核心逻辑
- **LocalStorage** - 数据持久化
- **纯前端架构** - 无需后端服务器

## 🎓 教学应用

### 适用课程
- **几何光学**: 透镜成像、反射折射
- **波动光学**: 干涉、衍射、偏振
- **激光物理**: 谐振腔、高斯光束
- **光纤通信**: 光纤耦合、传输

### 教学优势
- ✅ **直观可视**: 看到光路传播过程
- ✅ **参数可调**: 实时调整观察效果
- ✅ **零成本**: 无需购买昂贵仪器
- ✅ **安全**: 无激光危险
- ✅ **可重复**: 随时重做实验

## 🔬 示例实验

### 1. 双缝干涉
激光源 → 双缝 → 屏幕 → 观察干涉条纹

### 2. 透镜成像
物体 → 凸透镜 → 像屏 → 观察成像规律

### 3. 棱镜色散
白光 → 棱镜 → 屏幕 → 观察光谱分离

### 4. 偏振光学
光源 → 偏振片 → 波片 → 分析器 → 观察偏振态变化

## 🤝 贡献指南

欢迎贡献代码！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/NewFeature`)
3. 提交更改 (`git commit -m 'Add new feature'`)
4. 推送到分支 (`git push origin feature/NewFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📞 联系方式

- **GitHub**: [https://github.com/tryandaction/Interactive-Optics-Lab](https://github.com/tryandaction/Interactive-Optics-Lab)
- **问题反馈**: [Issues](https://github.com/tryandaction/Interactive-Optics-Lab/issues)

## 🙏 致谢

感谢所有为光学教育和开源软件做出贡献的人们！

---

**交互式光学实验平台** - 让光学学习更直观，让科研探索更高效 🔬

*用代码照亮光学世界* ✨
