/**
 * ComprehensiveIntegrationExample.js - 完整系统集成示例
 * 展示如何将所有专业绘图功能集成到应用中
 */

// 导入所有主要模块
import { getMinimap } from './navigation/Minimap.js';
import { getMeasurementPanel } from '../ui/panels/MeasurementPanel.js';
import { getCalculatorPanel } from '../ui/panels/CalculatorPanel.js';
import { getNavigationPanel } from '../ui/panels/NavigationPanel.js';
import { getIconPalettePanel } from '../ui/panels/IconPalettePanel.js';
import { getLayerPanel } from '../ui/panels/LayerPanel.js';
import { getThemePanel } from '../ui/panels/ThemePanel.js';
import { getExportDialog } from '../ui/dialogs/ExportDialog.js';
import { getAnnotationManager } from './annotations/AnnotationManager.js';
import { getGridManager } from './grid/GridManager.js';
import { getAlignmentManager } from './alignment/AlignmentManager.js';
import { getLayerManager } from './layers/LayerManager.js';
import { getStyleManager } from './styling/StyleManager.js';
import { getThemeManager } from './styling/ThemeManager.js';
import { getAutoRouter } from './AutoRouter.js';
import { getModeIntegrationManager } from './integration/ModeIntegration.js';

/**
 * 专业绘图系统类
 * 整合所有功能模块
 */
export class ProfessionalDiagramSystem {
    constructor(config = {}) {
        this.container = config.container;
        this.canvas = config.canvas;
        this.components = [];
        this.rays = [];
        
        // 初始化所有模块
        this._initializeModules();
        
        // 设置事件监听
        this._setupEventListeners();
        
        // 应用初始配置
        if (config.theme) {
            this.themeManager.applyTheme(config.theme);
        }
    }

    /**
     * 初始化所有模块
     * @private
     */
    _initializeModules() {
        // 1. 导航和视图
        this.minimap = getMinimap({
            width: 200,
            height: 150,
            position: 'bottom-right'
        });
        this.minimap.mount(this.container);
        
        this.navigationPanel = getNavigationPanel({
            position: 'top-right'
        });
        this.navigationPanel.mount(this.container);
        
        // 2. 工具面板
        this.iconPalette = getIconPalettePanel();
        this.iconPalette.mount(this.container);
        
        this.measurementPanel = getMeasurementPanel();
        this.measurementPanel.mount(this.container);
        
        this.calculatorPanel = getCalculatorPanel();
        this.calculatorPanel.mount(this.container);
        
        this.layerPanel = getLayerPanel();
        this.layerPanel.mount(this.container);
        
        this.themePanel = getThemePanel();
        this.themePanel.mount(this.container);
        
        // 3. 对话框
        this.exportDialog = getExportDialog();
        
        // 4. 核心管理器
        this.annotationManager = getAnnotationManager();
        this.gridManager = getGridManager();
        this.alignmentManager = getAlignmentManager();
        this.layerManager = getLayerManager();
        this.styleManager = getStyleManager();
        this.themeManager = getThemeManager();
        this.autoRouter = getAutoRouter();
        this.modeIntegration = getModeIntegrationManager();
        
        // 5. 创建默认图层
        this.layerManager.createLayer('Background', 0);
        this.layerManager.createLayer('Components', 1);
        this.layerManager.createLayer('Rays', 2);
        this.layerManager.createLayer('Annotations', 3);
    }

    /**
     * 设置事件监听
     * @private
     */
    _setupEventListeners() {
        // 导航面板回调
        this.navigationPanel.onZoomChange = (zoom) => {
            if (this.canvas && this.canvas.camera) {
                this.canvas.camera.zoom = zoom;
                this.render();
            }
        };
        
        this.navigationPanel.onPan = (dx, dy) => {
            if (this.canvas && this.canvas.camera) {
                this.canvas.camera.x += dx;
                this.canvas.camera.y += dy;
                this.render();
            }
        };
        
        this.navigationPanel.onFitView = () => {
            this.fitView();
        };
        
        // 缩略图回调
        this.minimap.setOnViewportChange((viewport) => {
            if (this.canvas && this.canvas.camera) {
                this.canvas.camera.x = viewport.x;
                this.canvas.camera.y = viewport.y;
                this.render();
            }
        });
        
        // 图标面板回调
        this.iconPalette.onIconSelect = (iconType) => {
            console.log('Selected icon:', iconType);
            // 进入放置模式
            this.enterPlacementMode(iconType);
        };
        
        // 图层面板回调
        this.layerPanel.onLayerChange = () => {
            this.render();
        };
        
        // 主题面板回调
        this.themePanel.onThemeChange = (themeName) => {
            this.themeManager.applyTheme(themeName);
            this.render();
        };
        
        // 画布事件
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this._handleCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this._handleCanvasMouseMove(e));
            this.canvas.addEventListener('wheel', (e) => this._handleCanvasWheel(e));
        }
    }

    /**
     * 处理画布点击
     * @private
     */
    _handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 转换为世界坐标
        const worldX = (x / this.canvas.camera.zoom) + this.canvas.camera.x;
        const worldY = (y / this.canvas.camera.zoom) + this.canvas.camera.y;
        
        // 如果在测量模式
        if (this.measurementPanel.measurementTools.currentTool) {
            this.measurementPanel.measurementTools.addPoint({ x: worldX, y: worldY });
            this.measurementPanel.refresh();
            this.render();
        }
        
        // 如果在放置模式
        if (this.placementMode) {
            this.placeComponent(worldX, worldY);
        }
    }

    /**
     * 处理画布鼠标移动
     * @private
     */
    _handleCanvasMouseMove(e) {
        // 更新智能对齐指南
        if (this.alignmentManager) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const worldX = (x / this.canvas.camera.zoom) + this.canvas.camera.x;
            const worldY = (y / this.canvas.camera.zoom) + this.canvas.camera.y;
            
            // 检查对齐
            const guides = this.alignmentManager.getSmartGuides(
                { x: worldX, y: worldY, width: 60, height: 60 },
                this.components
            );
            
            if (guides.length > 0) {
                this.render();
            }
        }
    }

    /**
     * 处理画布滚轮
     * @private
     */
    _handleCanvasWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.1, Math.min(10, this.navigationPanel.zoom + delta));
        
        this.navigationPanel.setZoom(newZoom);
    }

    /**
     * 进入放置模式
     */
    enterPlacementMode(componentType) {
        this.placementMode = true;
        this.placementComponentType = componentType;
        this.canvas.style.cursor = 'crosshair';
    }

    /**
     * 退出放置模式
     */
    exitPlacementMode() {
        this.placementMode = false;
        this.placementComponentType = null;
        this.canvas.style.cursor = 'default';
    }

    /**
     * 放置组件
     */
    placeComponent(x, y) {
        if (!this.placementComponentType) return;
        
        const component = {
            id: `comp_${Date.now()}`,
            type: this.placementComponentType,
            pos: { x, y },
            angle: 0,
            layer: 'Components'
        };
        
        this.components.push(component);
        this.layerManager.addObjectToLayer('Components', component.id);
        
        this.exitPlacementMode();
        this.render();
    }

    /**
     * 添加组件
     */
    addComponent(component) {
        this.components.push(component);
        
        // 添加到图层
        const layerName = component.layer || 'Components';
        this.layerManager.addObjectToLayer(layerName, component.id);
        
        this.render();
    }

    /**
     * 添加光线
     */
    addRay(ray) {
        this.rays.push(ray);
        
        // 添加到图层
        this.layerManager.addObjectToLayer('Rays', ray.id || `ray_${Date.now()}`);
        
        this.render();
    }

    /**
     * 自动路由光线
     */
    autoRouteRays() {
        this.rays.forEach(ray => {
            if (ray.source && ray.target) {
                const path = this.autoRouter.findPath(
                    ray.source,
                    ray.target,
                    this.components
                );
                
                if (path) {
                    ray.pathPoints = path;
                }
            }
        });
        
        this.render();
    }

    /**
     * 对齐选中的组件
     */
    alignComponents(direction) {
        const selected = this.components.filter(c => c.selected);
        if (selected.length < 2) return;
        
        this.alignmentManager.align(selected, direction);
        this.render();
    }

    /**
     * 分布选中的组件
     */
    distributeComponents(direction) {
        const selected = this.components.filter(c => c.selected);
        if (selected.length < 3) return;
        
        this.alignmentManager.distribute(selected, direction);
        this.render();
    }

    /**
     * 适应视图
     */
    fitView() {
        this.minimap.updateSceneBounds(this.components);
        const bounds = this.minimap.sceneBounds;
        
        if (this.canvas && this.canvas.camera) {
            const scaleX = this.canvas.width / (bounds.maxX - bounds.minX);
            const scaleY = this.canvas.height / (bounds.maxY - bounds.minY);
            const zoom = Math.min(scaleX, scaleY) * 0.9;
            
            this.canvas.camera.zoom = zoom;
            this.canvas.camera.x = (bounds.minX + bounds.maxX) / 2 - this.canvas.width / (2 * zoom);
            this.canvas.camera.y = (bounds.minY + bounds.maxY) / 2 - this.canvas.height / (2 * zoom);
            
            this.navigationPanel.setZoom(zoom);
        }
        
        this.render();
    }

    /**
     * 切换到模拟模式
     */
    switchToSimulation() {
        const simulationScene = this.modeIntegration.diagramToSimulation.convert({
            components: this.components,
            rays: this.rays
        });
        
        return simulationScene;
    }

    /**
     * 从模拟模式转换
     */
    switchFromSimulation(simulationScene) {
        const diagramScene = this.modeIntegration.simulationToDiagram.convert(simulationScene);
        
        this.components = diagramScene.components;
        this.rays = diagramScene.rays;
        
        this.render();
    }

    /**
     * 导出场景
     */
    exportScene() {
        const scene = {
            components: this.components,
            rays: this.rays,
            annotations: this.annotationManager.getAllAnnotations(),
            notes: []
        };
        
        this.exportDialog.show(scene);
    }

    /**
     * 渲染场景
     */
    render() {
        if (!this.canvas) return;
        
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        
        // 应用相机变换
        if (this.canvas.camera) {
            ctx.scale(this.canvas.camera.zoom, this.canvas.camera.zoom);
            ctx.translate(-this.canvas.camera.x, -this.canvas.camera.y);
        }
        
        // 渲染网格
        if (this.gridManager.visible) {
            this.gridManager.render(ctx);
        }
        
        // 按图层顺序渲染
        const layers = this.layerManager.getAllLayers();
        layers.sort((a, b) => a.zIndex - b.zIndex);
        
        layers.forEach(layer => {
            if (!layer.visible) return;
            
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            
            if (layer.name === 'Rays') {
                this._renderRays(ctx);
            } else if (layer.name === 'Components') {
                this._renderComponents(ctx);
            } else if (layer.name === 'Annotations') {
                this.annotationManager.render(ctx);
            }
            
            ctx.restore();
        });
        
        // 渲染测量
        if (this.measurementPanel.measurementTools) {
            this.measurementPanel.measurementTools.render(ctx);
        }
        
        // 渲染智能对齐指南
        if (this.alignmentManager) {
            this.alignmentManager.renderSmartGuides(ctx);
        }
        
        ctx.restore();
        
        // 更新缩略图
        this.minimap.updateSceneBounds(this.components);
        if (this.canvas.camera) {
            this.minimap.updateViewport({
                x: this.canvas.camera.x,
                y: this.canvas.camera.y,
                width: this.canvas.width / this.canvas.camera.zoom,
                height: this.canvas.height / this.canvas.camera.zoom
            });
        }
        this.minimap.render(this.components, this.rays);
    }

    /**
     * 渲染光线
     * @private
     */
    _renderRays(ctx) {
        this.rays.forEach(ray => {
            if (!ray.pathPoints || ray.pathPoints.length < 2) return;
            
            ctx.save();
            ctx.strokeStyle = ray.color || '#ff0000';
            ctx.lineWidth = ray.lineWidth || 2;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(ray.pathPoints[0].x, ray.pathPoints[0].y);
            for (let i = 1; i < ray.pathPoints.length; i++) {
                ctx.lineTo(ray.pathPoints[i].x, ray.pathPoints[i].y);
            }
            ctx.stroke();
            ctx.restore();
        });
    }

    /**
     * 渲染组件
     * @private
     */
    _renderComponents(ctx) {
        this.components.forEach(comp => {
            ctx.save();
            ctx.translate(comp.pos.x, comp.pos.y);
            ctx.rotate(comp.angle || 0);
            
            // 简单矩形表示
            ctx.fillStyle = comp.selected ? '#4488ff' : '#333333';
            ctx.fillRect(-30, -30, 60, 60);
            
            ctx.restore();
        });
    }

    /**
     * 显示/隐藏面板
     */
    togglePanel(panelName) {
        const panels = {
            'icons': this.iconPalette,
            'measurement': this.measurementPanel,
            'calculator': this.calculatorPanel,
            'layers': this.layerPanel,
            'themes': this.themePanel,
            'navigation': this.navigationPanel
        };
        
        const panel = panels[panelName];
        if (panel) {
            panel.toggle();
        }
    }

    /**
     * 销毁系统
     */
    destroy() {
        this.minimap.destroy();
        this.navigationPanel.destroy();
        this.iconPalette.destroy();
        this.measurementPanel.destroy();
        this.calculatorPanel.destroy();
        this.layerPanel.destroy();
        this.themePanel.destroy();
        this.exportDialog.destroy();
    }
}

/**
 * 快速初始化函数
 */
export function initializeProfessionalDiagramSystem(containerId, canvasId, options = {}) {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId);
    
    if (!container || !canvas) {
        throw new Error('Container or canvas not found');
    }
    
    // 初始化相机
    if (!canvas.camera) {
        canvas.camera = {
            x: 0,
            y: 0,
            zoom: 1.0
        };
    }
    
    const system = new ProfessionalDiagramSystem({
        container,
        canvas,
        ...options
    });
    
    // 初始渲染
    system.render();
    
    return system;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ProfessionalDiagramSystem = ProfessionalDiagramSystem;
    window.initializeProfessionalDiagramSystem = initializeProfessionalDiagramSystem;
}
