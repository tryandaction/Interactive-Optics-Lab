# 光学模拟器 - 模块化代码结构

## 目录结构

```
src/
├── index.js                    # 主入口，导出所有模块
├── README.md                   # 本文档
│
├── core/                       # 核心模块
│   ├── index.js               # 核心模块导出
│   ├── constants.js           # 全局常量（物理常数、渲染参数等）
│   ├── Vector.js              # 2D向量类
│   ├── Ray.js                 # 光线类
│   ├── GameObject.js          # 游戏对象基类
│   └── OpticalComponent.js    # 光学元件基类
│
├── components/                 # 光学元件组件
│   ├── index.js               # 组件导出
│   │
│   ├── sources/               # 光源
│   │   ├── index.js
│   │   ├── LaserSource.js     # 激光光源
│   │   ├── FanSource.js       # 扇形光源
│   │   ├── LineSource.js      # 线光源
│   │   └── WhiteLightSource.js # 白光光源
│   │
│   ├── mirrors/               # 反射镜
│   │   ├── index.js
│   │   ├── Mirror.js          # 平面镜
│   │   ├── SphericalMirror.js # 球面镜
│   │   └── ParabolicMirror.js # 抛物面镜
│   │
│   ├── lenses/                # 透镜
│   │   ├── index.js
│   │   └── ThinLens.js        # 薄透镜
│   │
│   ├── polarizers/            # 偏振器件
│   │   ├── index.js
│   │   ├── Polarizer.js       # 偏振片
│   │   ├── BeamSplitter.js    # 分束器
│   │   ├── WavePlate.js       # 波片基类
│   │   ├── HalfWavePlate.js   # 半波片
│   │   ├── QuarterWavePlate.js # 四分之一波片
│   │   ├── FaradayRotator.js  # 法拉第旋光器
│   │   └── FaradayIsolator.js # 光隔离器
│   │
│   ├── detectors/             # 探测器
│   │   ├── index.js
│   │   ├── Screen.js          # 屏幕
│   │   └── Photodiode.js      # 光电二极管
│   │
│   ├── special/               # 特殊元件
│   │   ├── index.js
│   │   ├── Aperture.js        # 光阑/狭缝
│   │   ├── Prism.js           # 棱镜
│   │   ├── DiffractionGrating.js # 衍射光栅
│   │   ├── DielectricBlock.js # 介质块
│   │   ├── OpticalFiber.js    # 光纤
│   │   └── AcoustoOpticModulator.js # 声光调制器
│   │
│   └── misc/                  # 辅助元件
│       ├── index.js
│       └── CustomComponent.js # 自定义文本框
│
├── state/                      # 状态管理
│   ├── index.js               # 状态模块导出
│   ├── GlobalState.js         # 全局状态管理
│   ├── CameraState.js         # 相机/视图状态
│   └── SelectionState.js      # 选择状态管理
│
├── utils/                      # 工具函数
│   ├── index.js               # 工具模块导出
│   ├── ColorUtils.js          # 颜色处理工具
│   ├── MathUtils.js           # 数学工具函数
│   └── Serialization.js       # 序列化工具
│
├── rendering/                  # 渲染模块
│   ├── index.js               # 渲染模块导出
│   ├── RayRenderer.js         # 光线渲染器
│   ├── GridRenderer.js        # 网格渲染器
│   ├── ArrowRenderer.js       # 箭头动画渲染器
│   ├── PreviewRenderer.js     # 放置预览渲染器
│   └── GuideRenderer.js       # 对齐辅助线渲染器
│
├── simulation/                 # 模拟模块
│   ├── index.js               # 模拟模块导出
│   ├── RayTracer.js           # 光线追踪器
│   ├── GameLoop.js            # 游戏循环管理器
│   └── LensImaging.js         # 透镜成像图绘制器
│
├── ui/                         # UI模块
│   ├── index.js               # UI模块导出
│   ├── EventHandler.js        # 事件处理器
│   ├── Inspector.js           # 属性检查器
│   └── Toolbar.js             # 工具栏管理器
│
├── managers/                   # 管理器
│   ├── index.js               # 管理器导出
│   ├── HistoryManager.js      # 撤销/重做管理器
│   └── SceneManager.js        # 场景管理器
│
├── app/                        # 应用层
│   ├── index.js               # 应用模块导出
│   └── SimulationApp.js       # 模拟应用主类
│
└── compat/                     # 兼容层
    └── legacy-globals.js      # 旧代码兼容（全局变量导出）
```

## 使用方式

### ES6 模块导入
```javascript
import { Vector, Ray, LaserSource, Mirror, Prism } from './src/index.js';
import { GlobalState, CameraState } from './src/state/index.js';
import { RayTracer, GameLoop } from './src/simulation/index.js';
import { EventHandler, Inspector } from './src/ui/index.js';

// 创建组件
const laser = new LaserSource(new Vector(100, 100), 550, 1.0, 0);
const mirror = new Mirror(new Vector(300, 100), 100, 45);
const prism = new Prism(new Vector(400, 200), 100, 60, 0);

// 使用光线追踪器
const tracer = new RayTracer();
const result = tracer.traceAllRays(components, canvasWidth, canvasHeight);
```

### 传统脚本方式（兼容旧代码）
```html
<script type="module" src="./src/compat/legacy-globals.js"></script>
<script>
    // 全局变量可用
    const laser = new LaserSource(new Vector(100, 100));
    const tracer = new RayTracer();
</script>
```

## 核心类说明

### Vector
2D向量类，提供向量运算、变换、距离计算等功能。

### Ray
光线类，包含：
- 位置、方向、波长、强度、相位
- 偏振状态（Jones矢量）
- 高斯光束参数
- 历史路径记录

### GameObject
所有模拟对象的基类，提供：
- 位置和角度管理
- 拖拽交互
- 属性编辑
- 序列化/反序列化

### OpticalComponent
光学元件基类，继承自GameObject，定义：
- `intersect()` - 计算光线交点
- `interact()` - 处理光线交互

## 模块说明

### 渲染模块 (rendering/)
- **RayRenderer** - 绘制光线路径
- **GridRenderer** - 绘制背景网格
- **ArrowRenderer** - 管理和绘制箭头动画
- **PreviewRenderer** - 绘制组件放置预览
- **GuideRenderer** - 绘制对齐辅助线

### 模拟模块 (simulation/)
- **RayTracer** - 执行光线追踪算法
- **GameLoop** - 管理模拟主循环
- **LensImaging** - 绘制透镜成像图

### UI模块 (ui/)
- **EventHandler** - 处理鼠标和键盘事件
- **Inspector** - 显示和编辑组件属性
- **Toolbar** - 管理工具栏按钮

### 管理器 (managers/)
- **HistoryManager** - 撤销/重做功能
- **SceneManager** - 场景保存/加载

## 组件分类

### 光源 (sources/)
- **LaserSource** - 单色激光光源
- **FanSource** - 扇形发散光源
- **LineSource** - 线状光源
- **WhiteLightSource** - 白光光源（多波长）

### 反射镜 (mirrors/)
- **Mirror** - 平面反射镜
- **SphericalMirror** - 球面镜
- **ParabolicMirror** - 抛物面镜

### 透镜 (lenses/)
- **ThinLens** - 薄透镜（凸/凹）

### 偏振器件 (polarizers/)
- **Polarizer** - 线偏振片
- **BeamSplitter** - 分束器（BS/PBS）
- **WavePlate** - 波片基类
- **HalfWavePlate** - 半波片
- **QuarterWavePlate** - 四分之一波片
- **FaradayRotator** - 法拉第旋光器
- **FaradayIsolator** - 光隔离器

### 探测器 (detectors/)
- **Screen** - 观察屏
- **Photodiode** - 光电探测器

### 特殊元件 (special/)
- **Aperture** - 光阑/单缝/双缝
- **Prism** - 三棱镜（色散）
- **DiffractionGrating** - 衍射光栅
- **DielectricBlock** - 介质块（折射/全反射）
- **OpticalFiber** - 光纤
- **AcoustoOpticModulator** - 声光调制器

### 辅助元件 (misc/)
- **CustomComponent** - 自定义文本标签

## 状态管理

### GlobalState
管理全局模拟状态：组件列表、光线路径、模拟设置等。

### CameraState
管理视图状态：缩放、平移、坐标转换。

### SelectionState
管理选择状态：单选、多选、框选。

## 工具函数

### ColorUtils
- `hexToRgba()` - 十六进制转RGBA
- `wavelengthToRgb()` - 波长转RGB颜色
- `blendColors()` - 颜色混合

### MathUtils
- `clamp()` - 值限制
- `lerp()` - 线性插值
- `degToRad()` / `radToDeg()` - 角度转换
- `pointToSegmentDistance()` - 点到线段距离

### Serialization
- `serializeScene()` - 场景序列化
- `deserializeScene()` - 场景反序列化
- `exportSceneToFile()` - 导出场景文件

## 添加新组件

1. 在对应目录创建新文件
2. 继承 `OpticalComponent` 类
3. 实现 `intersect()` 和 `interact()` 方法
4. 添加 `toJSON()` 方法支持序列化
5. 在目录的 `index.js` 中导出
6. 在 `compat/legacy-globals.js` 中添加全局导出

## 设计原则

1. **单一职责**: 每个文件只负责一个类或一组相关功能
2. **模块化**: 使用ES6模块系统，清晰的导入导出
3. **向后兼容**: 通过全局导出支持旧代码
4. **可扩展**: 易于添加新的光学元件
5. **可测试**: 模块化设计便于单元测试
