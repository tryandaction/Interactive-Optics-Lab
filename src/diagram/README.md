# 专业绘图模式 - 论文发表级光路图导出

本模块为交互式光学实验室平台提供专业绘图模式，支持生成符合学术出版标准的高质量光路图。

## 功能特性

### 模式切换
- **模拟模式**：交互式光学模拟，实时光线追踪和动画
- **绘图模式**：专业光路图绘制，优化的符号渲染和导出功能

### 符号库
支持标准光学元件符号：
- 激光光源 (LaserSource)
- 反射镜 (Mirror)
- 薄透镜 (ThinLens)
- 声光调制器 (AOM)
- 分束器 (BeamSplitter, PBS)
- 偏振片 (Polarizer)
- 波片 (HalfWavePlate, QuarterWavePlate)
- 探测器 (Screen, Photodiode)
- 原子气室 (AtomicCell)
- 光阑 (Aperture)
- 光纤 (Fiber)

### 标注系统
- 支持上下标语法：`AOM_1` 或 `f^2`
- 支持花括号多字符：`λ_{pump}` 或 `ω^{2π}`
- 支持Unicode上下标字符
- 自动定位和手动调整
- 重叠检测

### 布局工具
- 网格吸附（可配置网格大小）
- 角度吸附（默认15°间隔）
- 对齐功能（左/右/上/下/居中）
- 均匀分布
- 对齐参考线
- 元件分组

### 导出功能
- **SVG**：矢量图，适合网页和进一步编辑
- **PNG**：高分辨率位图，支持DPI配置
- **PDF**：文档格式，适合论文投稿

### 预设模板
- 期刊论文 (3000×2000, 300DPI)
- 演示文稿 (1920×1080, 150DPI)
- 海报 (4000×3000, 300DPI)
- 网页 (1200×800, SVG)
- 学位论文 (2400×1600, 300DPI)

## 快速开始

### 初始化

```javascript
import { initializeDiagramMode } from './diagram/index.js';

// 初始化专业绘图模式
const diagramMode = initializeDiagramMode({
    components: window.components,  // 元件数组
    rays: window.rays               // 光路数组
});
```

### 切换模式

```javascript
import { getModeManager, APP_MODES } from './diagram/index.js';

const modeManager = getModeManager();

// 切换到绘图模式
modeManager.switchMode(APP_MODES.DIAGRAM);

// 切换到模拟模式
modeManager.switchMode(APP_MODES.SIMULATION);

// 切换模式
modeManager.toggleMode();

// 检查当前模式
if (modeManager.isDiagramMode()) {
    console.log('当前为绘图模式');
}
```

### 使用符号库

```javascript
import { getSymbolLibrary } from './diagram/index.js';

const symbolLibrary = getSymbolLibrary();

// 渲染符号到Canvas
symbolLibrary.renderSymbol(ctx, 'LaserSource', x, y, angle, size, {
    color: '#000000',
    lineWidth: 2,
    filled: false
});

// 获取所有符号类型
const types = symbolLibrary.getAllSymbolTypes();

// 按分类获取符号
const sources = symbolLibrary.getSymbolsByCategory('sources');
```

### 添加标注

```javascript
import { getAnnotationManager, Annotation } from './diagram/index.js';

const annotationManager = getAnnotationManager();

// 创建标注
const annotation = annotationManager.addAnnotation({
    componentId: 'laser1',
    text: 'λ = 780 nm',
    offset: { x: 30, y: -20 },
    style: {
        fontSize: 14,
        color: '#000000'
    }
});

// 使用上下标
annotationManager.addAnnotation({
    componentId: 'aom1',
    text: 'AOM_1 (f = 80 MHz)',
    autoPosition: true
});

// 渲染所有标注
annotationManager.renderAll(ctx, componentsMap);
```

### 使用布局引擎

```javascript
import { getLayoutEngine, AlignDirection, DistributeDirection } from './diagram/index.js';

const layoutEngine = getLayoutEngine();

// 配置网格
layoutEngine.setGridSize(20);
layoutEngine.setGridSnapEnabled(true);

// 吸附到网格
const snappedPos = layoutEngine.snapToGrid({ x: 123, y: 456 });

// 角度吸附
const snappedAngle = layoutEngine.snapAngle(0.52); // 约30°

// 对齐元件
const aligned = layoutEngine.alignComponents(selectedComponents, AlignDirection.LEFT);

// 均匀分布
layoutEngine.distributeComponents(selectedComponents, DistributeDirection.HORIZONTAL);

// 获取对齐参考线
const guides = layoutEngine.getAlignmentGuides(draggedComponent, allComponents);

// 渲染参考线
layoutEngine.renderAlignmentGuides(ctx, guides, canvasWidth, canvasHeight);

// 创建分组
const group = layoutEngine.createGroup(['comp1', 'comp2', 'comp3'], '光源组');

// 移动分组
layoutEngine.moveGroup(group.id, deltaX, deltaY, componentsMap);
```

### 导出图像

```javascript
import { getExportEngine, ExportFormat, openExportDialog } from './diagram/index.js';

// 方式1：使用导出对话框
openExportDialog(sceneData);

// 方式2：直接导出
const exportEngine = getExportEngine();

// 导出SVG
const svgString = await exportEngine.export(scene, {
    format: ExportFormat.SVG,
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff'
});

// 导出PNG
const pngBlob = await exportEngine.export(scene, {
    format: ExportFormat.PNG,
    width: 3000,
    height: 2000,
    dpi: 300
});

// 导出PDF
const pdfBlob = await exportEngine.export(scene, {
    format: ExportFormat.PDF,
    width: 3000,
    height: 2000,
    dpi: 300
});

// 生成预览
const previewUrl = await exportEngine.generatePreview(scene);
```

### 使用模板

```javascript
import { getTemplateManager } from './diagram/index.js';

const templateManager = getTemplateManager();

// 获取所有模板
const templates = templateManager.getAllTemplates();

// 获取内置模板
const builtinTemplates = templateManager.getBuiltinTemplates();

// 使用模板
const journalTemplate = templateManager.getTemplate('journal');
const config = journalTemplate.toExportConfig();

// 创建自定义模板
const customTemplate = templateManager.createTemplate({
    name: '我的模板',
    format: 'png',
    width: 2000,
    height: 1500,
    dpi: 300
});

// 导出模板为JSON
const json = templateManager.exportTemplateJSON('journal');

// 导入模板
templateManager.importTemplateJSON(jsonString);
```

### 批量导出

```javascript
import { getBatchExportManager } from './diagram/index.js';

const batchManager = getBatchExportManager();

// 添加场景
batchManager.addScenes([scene1, scene2, scene3]);

// 设置配置
batchManager.setConfig({
    format: 'png',
    width: 1920,
    height: 1080,
    dpi: 150
});

// 设置文件命名模式
batchManager.setNamingPattern('{name}_{index}_{date}');

// 监听进度
batchManager.onProgress((current, total, task) => {
    console.log(`导出进度: ${current}/${total}`);
});

// 开始导出
const summary = await batchManager.start();

// 下载所有结果
await batchManager.downloadAll(summary);
```

### 光路样式

```javascript
import { getRayStyleManager, LineStyle, ColorSchemes } from './diagram/index.js';

const rayStyleManager = getRayStyleManager();

// 设置光路样式
rayStyleManager.setStyle('ray1', {
    color: '#FF0000',
    lineWidth: 2,
    lineStyle: LineStyle.SOLID,
    opacity: 1
});

// 使用预设配色方案
rayStyleManager.setColorScheme('PUBLICATION');

// 自动分配颜色
const color = rayStyleManager.autoAssignColor('ray2');

// 应用样式到Canvas
rayStyleManager.applyToContext(ctx, 'ray1');
```

### 技术说明

```javascript
import { getTechnicalNotesManager, NoteType } from './diagram/index.js';

const notesManager = getTechnicalNotesManager();

// 添加说明
notesManager.addNote({
    type: NoteType.TEXT,
    text: '实验装置示意图'
});

notesManager.addNote({
    type: NoteType.BULLET,
    text: '激光波长: 780 nm'
});

notesManager.addNote({
    type: NoteType.NUMBERED,
    text: 'AOM频率: 80 MHz'
});

// 渲染到Canvas
notesManager.render(ctx, canvasWidth, canvasHeight);

// 导出为纯文本
const text = notesManager.exportToText();
```

### 参数显示

```javascript
import { getParameterDisplayManager, LabelPosition } from './diagram/index.js';

const paramManager = getParameterDisplayManager();

// 启用参数显示
paramManager.setGlobalEnabled(true);

// 配置特定参数
paramManager.configureParameter('lens1', 'focalLength', {
    visible: true,
    label: 'f',
    position: LabelPosition.RIGHT
});

// 渲染参数标签
paramManager.renderComponentParameters(ctx, component);
```

## 事件监听

```javascript
// 监听模式切换
document.addEventListener('diagram-mode-change', (e) => {
    console.log('模式切换:', e.detail.oldMode, '->', e.detail.newMode);
});

// 监听重绘请求
document.addEventListener('diagram-redraw-requested', () => {
    render();
});
```

## 场景数据格式

```javascript
const scene = {
    name: '光路图名称',
    components: [
        {
            id: 'laser1',
            type: 'LaserSource',
            pos: { x: 100, y: 300 },
            angle: 0,
            wavelength: 780
        },
        // ...更多元件
    ],
    rays: [
        {
            pathPoints: [
                { x: 100, y: 300 },
                { x: 500, y: 300 }
            ],
            color: '#FF0000',
            lineWidth: 2,
            lineStyle: 'solid'
        }
    ],
    annotations: [
        {
            componentId: 'laser1',
            text: 'λ = 780 nm',
            offset: { x: 20, y: -20 }
        }
    ],
    notes: [
        '实验装置示意图',
        '激光波长: 780 nm'
    ]
};
```

## 最佳实践

1. **导出前检查**：确保所有元件都有正确的位置和角度
2. **使用模板**：对于常见用途，使用预设模板可以节省时间
3. **标注简洁**：标注文字应简洁明了，避免过长
4. **对齐元件**：使用对齐和分布功能使图像更整洁
5. **选择合适格式**：
   - SVG：需要进一步编辑或网页展示
   - PNG：演示文稿或一般用途
   - PDF：论文投稿或打印

## 模块结构

```
src/diagram/
├── index.js                 # 模块导出入口
├── ModeManager.js           # 模式管理器
├── ModeSwitcher.js          # 模式切换UI
├── SymbolLibrary.js         # 符号库
├── AnnotationSystem.js      # 标注系统
├── LayoutEngine.js          # 布局引擎
├── ExportEngine.js          # 导出引擎
├── ExportUI.js              # 导出UI
├── RayStyleManager.js       # 光路样式管理
├── TechnicalNotes.js        # 技术说明
├── ParameterDisplay.js      # 参数显示
├── TemplateManager.js       # 模板管理
├── BatchExport.js           # 批量导出
├── DiagramModeIntegration.js # 集成入口
└── README.md                # 本文档
```

## 依赖

- 核心功能无外部依赖
- PDF导出需要 jsPDF 库（可选，会自动尝试加载）
- 批量ZIP打包需要 JSZip 库（可选）

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
