/**
 * DiagramIntegrationExample.js - 完整集成示例
 * 展示如何使用所有专业绘图功能
 */

import { getMinimap } from './navigation/index.js';
import { getMeasurementTools, MeasurementType, Units } from './measurement/index.js';
import { getAnnotationManager, AnnotationType } from './annotations/index.js';
import { getGridManager, GridType } from './grid/index.js';
import { getAlignmentManager, AlignDirection, DistributeDirection } from './alignment/index.js';
import { getLayerManager } from './layers/index.js';
import { getStyleManager } from './styling/index.js';
import { getThemeManager } from './styling/index.js';
import { getIconPalettePanel } from '../ui/panels/index.js';
import { getLayerPanel } from '../ui/panels/index.js';
import { getThemePanel } from '../ui/panels/index.js';

/**
 * 完整的专业绘图系统集成示例
 */
export class DiagramIntegrationExample {
    constructor(canvasId, containerId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById(containerId);
        
        // 初始化所有管理器
        this.initializeManagers();
        
        // 初始化UI面板
        this.initializePanels();
        
        // 绑定事件
        this.bindEvents();
        
        // 场景数据
        this.components = [];
        this.rays = [];
        this.selectedComponents = [];
    }

    /**
     * 初始化所有管理器
     */
    initializeManagers() {
        // 网格管理器
        this.gridManager = getGridManager();
        this.gridManager.setType(GridType.RECTANGULAR);
        this.gridManager.setSpacing(20);
        this.gridManager.snapEnabled = true;
        
        // 对齐管理器
        this.alignmentManager = getAlignmentManager();
        
        // 图层管理器
        this.layerManager = getLayerManager();
        const defaultLayer = this.layerManager.createLayer({ name: 'Default' });
        const opticsLayer = this.layerManager.createLayer({ name: 'Optics' });
        const annotationsLayer = this.layerManager.createLayer({ name: 'Annotations' });
        
        // 样式管理器
        this.styleManager = getStyleManager();
        
        // 主题管理器
        this.themeManager = getThemeManager();
        this.themeManager.applyTheme('professional');
        
        // 注释管理器
        this.annotationManager = getAnnotationManager();
        
        // 测量工具
        this.measurementTools = getMeasurementTools();
        this.measurementTools.setPixelsPerMM(3.78);
        this.measurementTools.setDefaultUnits(Units.MM, Units.DEGREE);
        
        // 缩略图导航
        this.minimap = getMinimap({
            width: 200,
            height: 150,
            position: 'bottom-right'
        });
        this.minimap.mount(this.container);
        this.minimap.setOnViewportChange((viewport) => {
            this.updateViewport(viewport);
        });
    }

    /**
     * 初始化UI面板
     */
    initializePanels() {
        // 图标面板
        this.iconPalette = getIconPalettePanel('icon-palette-container');
        this.iconPalette.setOnIconSelect((type, icon) => {
            this.addComponent(type, icon);
        });
        
        // 图层面板
        this.layerPanel = getLayerPanel('layer-panel-container');
        this.layerPanel.setOnLayerChange(() => {
            this.render();
        });
        
        // 主题面板
        this.themePanel = getThemePanel('theme-panel-container');
        this.themePanel.setOnThemeChange((themeId) => {
            this.themeManager.applyTheme(themeId);
            this.render();
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * 添加组件
     */
    addComponent(type, icon) {
        const pos = this.gridManager.snapToGridPoint({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        });
        
        const component = {
            id: `comp_${Date.now()}`,
            type: type,
            icon: icon,
            pos: pos,
            rotation: 0,
            getBounds: () => ({ width: 60, height: 60 })
        };
        
        this.components.push(component);
        
        // 添加到图层
        const opticsLayer = this.layerManager.getLayerByName('Optics');
        if (opticsLayer) {
            this.layerManager.addObjectToLayer(component.id, opticsLayer.id);
        }
        
        // 应用样式
        this.styleManager.setComponentStyle(component.id, {
            color: '#4488ff',
            fillColor: '#88bbff',
            lineWidth: 2
        });
        
        this.render();
    }

    /**
     * 对齐选中的组件
     */
    alignSelected(direction) {
        if (this.selectedComponents.length < 2) return;
        
        this.alignmentManager.alignObjects(this.selectedComponents, direction);
        this.render();
    }

    /**
     * 分布选中的组件
     */
    distributeSelected(direction) {
        if (this.selectedComponents.length < 3) return;
        
        this.alignmentManager.distributeObjects(this.selectedComponents, direction);
        this.render();
    }

    /**
     * 添加注释
     */
    addAnnotation(type, ...args) {
        let annotation;
        
        switch (type) {
            case AnnotationType.TEXT:
                annotation = this.annotationManager.createTextAnnotation(...args);
                break;
            case AnnotationType.DIMENSION:
                annotation = this.annotationManager.createDimensionAnnotation(...args);
                break;
            case AnnotationType.ANGLE:
                annotation = this.annotationManager.createAngleAnnotation(...args);
                break;
            case AnnotationType.LABEL:
                annotation = this.annotationManager.createLabelAnnotation(...args);
                break;
        }
        
        if (annotation) {
            const annotationsLayer = this.layerManager.getLayerByName('Annotations');
            if (annotationsLayer) {
                this.layerManager.addObjectToLayer(annotation.id, annotationsLayer.id);
            }
        }
        
        this.render();
    }

    /**
     * 开始测量
     */
    startMeasurement(type) {
        this.measurementTools.startMeasurement(type);
        this.currentTool = 'measurement';
    }

    /**
     * 处理鼠标点击
     */
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // 如果正在测量，添加测量点
        if (this.currentTool === 'measurement') {
            this.measurementTools.addPoint(point);
            this.render();
        }
    }

    /**
     * 处理键盘事件
     */
    handleKeyDown(e) {
        // Ctrl/Cmd + A: 全选
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            this.selectedComponents = [...this.components];
            this.render();
        }
        
        // Ctrl/Cmd + L: 左对齐
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            this.alignSelected(AlignDirection.LEFT);
        }
        
        // Ctrl/Cmd + R: 右对齐
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.alignSelected(AlignDirection.RIGHT);
        }
        
        // Ctrl/Cmd + T: 顶部对齐
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            this.alignSelected(AlignDirection.TOP);
        }
        
        // Ctrl/Cmd + B: 底部对齐
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.alignSelected(AlignDirection.BOTTOM);
        }
        
        // Ctrl/Cmd + H: 水平分布
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            this.distributeSelected(DistributeDirection.HORIZONTAL);
        }
        
        // Ctrl/Cmd + V: 垂直分布
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            this.distributeSelected(DistributeDirection.VERTICAL);
        }
        
        // G: 切换网格
        if (e.key === 'g') {
            this.gridManager.visible = !this.gridManager.visible;
            this.render();
        }
        
        // M: 切换缩略图
        if (e.key === 'm') {
            this.minimap.toggle();
        }
        
        // Escape: 取消当前操作
        if (e.key === 'Escape') {
            this.currentTool = null;
            this.measurementTools.cancelMeasurement();
            this.render();
        }
    }

    /**
     * 更新视口
     */
    updateViewport(viewport) {
        // 更新相机位置
        // 这里需要根据实际的相机系统实现
        this.render();
    }

    /**
     * 渲染场景
     */
    render() {
        const ctx = this.ctx;
        
        // 清空画布
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 渲染网格
        if (this.gridManager.visible) {
            this.gridManager.render(ctx, {
                x: 0,
                y: 0,
                width: this.canvas.width,
                height: this.canvas.height
            });
        }
        
        // 渲染组件（按图层顺序）
        const layers = this.layerManager.getAllLayers();
        layers.forEach(layer => {
            if (!layer.visible) return;
            
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            
            const layerObjects = this.layerManager.getObjectsInLayer(layer.id);
            layerObjects.forEach(objId => {
                const component = this.components.find(c => c.id === objId);
                if (component) {
                    this.renderComponent(ctx, component);
                }
            });
            
            ctx.restore();
        });
        
        // 渲染光线
        this.rays.forEach(ray => {
            this.renderRay(ctx, ray);
        });
        
        // 渲染注释
        this.annotationManager.render(ctx);
        
        // 渲染测量
        this.measurementTools.render(ctx);
        
        // 渲染智能对齐线
        if (this.isDragging && this.draggedComponent) {
            const guides = this.alignmentManager.generateSmartGuides(
                this.draggedComponent,
                this.components.filter(c => c !== this.draggedComponent),
                this.draggedComponent.pos
            );
            this.alignmentManager.renderSmartGuides(ctx);
        }
        
        // 更新缩略图
        this.minimap.updateSceneBounds(this.components);
        this.minimap.updateViewport({
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height
        });
        this.minimap.render(this.components, this.rays);
    }

    /**
     * 渲染组件
     */
    renderComponent(ctx, component) {
        const style = this.styleManager.getEffectiveStyle(component.id, component.type);
        
        ctx.save();
        ctx.translate(component.pos.x, component.pos.y);
        ctx.rotate(component.rotation);
        
        // 应用样式
        ctx.strokeStyle = style.color || '#4488ff';
        ctx.fillStyle = style.fillColor || '#88bbff';
        ctx.lineWidth = style.lineWidth || 2;
        
        // 绘制组件（简化示例）
        const bounds = component.getBounds();
        ctx.fillRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
        ctx.strokeRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
        
        ctx.restore();
    }

    /**
     * 渲染光线
     */
    renderRay(ctx, ray) {
        if (!ray.pathPoints || ray.pathPoints.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = ray.color || '#ff0000';
        ctx.lineWidth = ray.lineWidth || 2;
        
        ctx.beginPath();
        ctx.moveTo(ray.pathPoints[0].x, ray.pathPoints[0].y);
        for (let i = 1; i < ray.pathPoints.length; i++) {
            ctx.lineTo(ray.pathPoints[i].x, ray.pathPoints[i].y);
        }
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * 导出场景
     */
    exportScene() {
        return {
            components: this.components,
            rays: this.rays,
            layers: this.layerManager.serialize(),
            styles: this.styleManager.serialize(),
            theme: this.themeManager.getCurrentTheme(),
            annotations: this.annotationManager.serialize(),
            measurements: this.measurementTools.serialize(),
            grid: this.gridManager.serialize()
        };
    }

    /**
     * 加载场景
     */
    loadScene(data) {
        if (data.components) this.components = data.components;
        if (data.rays) this.rays = data.rays;
        if (data.layers) this.layerManager.deserialize(data.layers);
        if (data.styles) this.styleManager.deserialize(data.styles);
        if (data.theme) this.themeManager.applyTheme(data.theme);
        if (data.annotations) this.annotationManager.deserialize(data.annotations);
        if (data.measurements) this.measurementTools.deserialize(data.measurements);
        if (data.grid) this.gridManager.deserialize(data.grid);
        
        this.render();
    }
}

// 使用示例
export function createDiagramExample() {
    const diagram = new DiagramIntegrationExample('main-canvas', 'canvas-container');
    
    // 添加一些示例组件
    diagram.addComponent('LaserSource', { name: 'Laser' });
    diagram.addComponent('Mirror', { name: 'Mirror' });
    diagram.addComponent('ThinLens', { name: 'Lens' });
    
    // 添加注释
    diagram.addAnnotation(
        AnnotationType.LABEL,
        'λ = 780 nm',
        { x: 100, y: 100 },
        { x: 150, y: 50 }
    );
    
    // 开始距离测量
    diagram.startMeasurement(MeasurementType.DISTANCE);
    
    return diagram;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DiagramIntegrationExample = DiagramIntegrationExample;
    window.createDiagramExample = createDiagramExample;
}
