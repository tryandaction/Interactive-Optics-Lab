/**
 * DiagramSystemCore.js - 专业图表系统核心
 * 整合所有功能模块的中央控制器
 */

import { getIconPalettePanel } from '../ui/panels/IconPalettePanel.js';
import { getLayerPanel } from '../ui/panels/LayerPanel.js';
import { getThemePanel } from '../ui/panels/ThemePanel.js';
import { getAnnotationManager } from './annotations/AnnotationManager.js';
import { getGridManager } from './grid/GridManager.js';
import { getAlignmentManager } from './alignment/AlignmentManager.js';
import { getLayerManager } from './layers/LayerManager.js';
import { getStyleManager } from './styling/StyleManager.js';
import { getThemeManager } from './styling/ThemeManager.js';
import { getMinimap } from './navigation/Minimap.js';
import { getMeasurementTools } from './measurement/MeasurementTools.js';
import { getOpticsCalculator } from './calculation/OpticsCalculator.js';
import { getConnectionPointManager } from './ConnectionPointManager.js';
import { getRayLinkManager } from './RayLinkManager.js';

/**
 * 专业图表系统核心类
 */
export class DiagramSystemCore {
    constructor(config = {}) {
        this.canvas = config.canvas;
        this.ctx = this.canvas?.getContext('2d');
        
        // 初始化所有管理器
        this.iconPalette = null;
        this.layerPanel = null;
        this.themePanel = null;
        this.annotationMgr = getAnnotationManager();
        this.gridMgr = getGridManager();
        this.alignMgr = getAlignmentManager();
        this.layerMgr = getLayerManager();
        this.styleMgr = getStyleManager();
        this.themeMgr = getThemeManager();
        this.minimap = null;
        this.measurementTools = getMeasurementTools();
        this.opticsCalc = getOpticsCalculator();
        this.connectionMgr = getConnectionPointManager();
        this.rayLinkMgr = getRayLinkManager();
        
        // 组件和光线
        this.components = [];
        this.rays = [];
        
        // 视口
        this.viewport = {
            x: 0,
            y: 0,
            width: this.canvas?.width || 1920,
            height: this.canvas?.height || 1080,
            scale: 1
        };
        
        // 状态
        this.selectedComponents = [];
        this.isDragging = false;
        this.dragStartPos = null;
        this.currentTool = null;
        
        // 配置
        this.config = {
            autoSave: config.autoSave !== false,
            autoSaveInterval: config.autoSaveInterval || 30000,
            showMinimap: config.showMinimap !== false,
            showGrid: config.showGrid !== false,
            enableSnapping: config.enableSnapping !== false,
            ...config
        };
        
        // 自动保存定时器
        this.autoSaveTimer = null;
        
        if (this.config.autoSave) {
            this._startAutoSave();
        }
    }

    /**
     * 初始化UI面板
     */
    initializePanels(containers) {
        if (containers.iconPalette) {
            this.iconPalette = getIconPalettePanel(containers.iconPalette);
            this.iconPalette.setOnIconSelect((type, icon) => {
                this._handleIconSelect(type, icon);
            });
        }
        
        if (containers.layerPanel) {
            this.layerPanel = getLayerPanel(containers.layerPanel);
            this.layerPanel.setOnLayerChange(() => {
                this.render();
            });
        }
        
        if (containers.themePanel) {
            this.themePanel = getThemePanel(containers.themePanel);
            this.themePanel.setOnThemeChange((themeId) => {
                this.render();
            });
        }
        
        if (this.config.showMinimap && containers.minimap) {
            this.minimap = getMinimap({
                width: 200,
                height: 150,
                position: 'bottom-right'
            });
            this.minimap.mount(containers.minimap);
            this.minimap.setOnViewportChange((viewport) => {
                this._handleViewportChange(viewport);
            });
        }
    }

    /**
     * 添加组件
     */
    addComponent(component) {
        this.components.push(component);
        
        // 添加到活动图层
        const activeLayer = this.layerMgr.getActiveLayer();
        if (activeLayer) {
            this.layerMgr.addObjectToLayer(component.id, activeLayer.id);
        }
        
        // 初始化连接点
        this.connectionMgr.initializeComponentPoints(component);
        
        this.render();
    }

    /**
     * 移除组件
     */
    removeComponent(componentId) {
        const index = this.components.findIndex(c => c.id === componentId);
        if (index !== -1) {
            this.components.splice(index, 1);
            this.layerMgr.removeObjectFromLayer(componentId);
            this.connectionMgr.removeComponentPoints(componentId);
            this.rayLinkMgr.deleteLinksForComponent(componentId);
            this.render();
        }
    }

    /**
     * 选择组件
     */
    selectComponents(componentIds, addToSelection = false) {
        if (!addToSelection) {
            this.selectedComponents = [];
        }
        
        componentIds.forEach(id => {
            if (!this.selectedComponents.includes(id)) {
                this.selectedComponents.push(id);
            }
        });
        
        this.render();
    }

    /**
     * 对齐选中的组件
     */
    alignSelected(direction) {
        const selected = this.components.filter(c => 
            this.selectedComponents.includes(c.id)
        );
        
        if (selected.length > 1) {
            this.alignMgr.alignObjects(selected, direction);
            this.render();
        }
    }

    /**
     * 分布选中的组件
     */
    distributeSelected(direction) {
        const selected = this.components.filter(c => 
            this.selectedComponents.includes(c.id)
        );
        
        if (selected.length > 2) {
            this.alignMgr.distributeObjects(selected, direction);
            this.render();
        }
    }

    /**
     * 应用主题
     */
    applyTheme(themeId) {
        this.themeMgr.applyTheme(themeId);
        this.render();
    }

    /**
     * 创建标注
     */
    createAnnotation(type, ...args) {
        let annotation;
        
        switch (type) {
            case 'text':
                annotation = this.annotationMgr.createTextAnnotation(...args);
                break;
            case 'dimension':
                annotation = this.annotationMgr.createDimensionAnnotation(...args);
                break;
            case 'angle':
                annotation = this.annotationMgr.createAngleAnnotation(...args);
                break;
            case 'label':
                annotation = this.annotationMgr.createLabelAnnotation(...args);
                break;
        }
        
        if (annotation) {
            this.render();
        }
        
        return annotation;
    }

    /**
     * 开始测量
     */
    startMeasurement(type) {
        this.measurementTools.startMeasurement(type);
        this.currentTool = 'measurement';
    }

    /**
     * 计算光学参数
     */
    calculate(formula, ...params) {
        return this.opticsCalc[formula]?.(...params);
    }

    /**
     * 渲染整个场景
     */
    render() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const { width, height } = this.canvas;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 应用视口变换
        ctx.save();
        ctx.translate(this.viewport.x, this.viewport.y);
        ctx.scale(this.viewport.scale, this.viewport.scale);
        
        // 背景
        const theme = this.themeMgr.getCurrentTheme();
        if (theme) {
            ctx.fillStyle = theme.globalStyle.backgroundColor || '#ffffff';
            ctx.fillRect(-this.viewport.x / this.viewport.scale, 
                        -this.viewport.y / this.viewport.scale,
                        width / this.viewport.scale,
                        height / this.viewport.scale);
        }
        
        // 网格
        if (this.config.showGrid && this.gridMgr.visible) {
            this.gridMgr.render(ctx, {
                x: -this.viewport.x / this.viewport.scale,
                y: -this.viewport.y / this.viewport.scale,
                width: width / this.viewport.scale,
                height: height / this.viewport.scale
            });
        }
        
        // 按图层顺序渲染组件
        const orderedLayers = this.layerMgr.getOrderedLayers();
        orderedLayers.forEach(layer => {
            if (!layer.visible) return;
            
            ctx.globalAlpha = layer.opacity;
            
            layer.objects.forEach(objId => {
                const component = this.components.find(c => c.id === objId);
                if (component && component.draw) {
                    // 应用样式
                    this.styleMgr.applyToContext(ctx, component.id, component.type);
                    component.draw(ctx);
                    
                    // 选中高亮
                    if (this.selectedComponents.includes(component.id)) {
                        this._drawSelection(ctx, component);
                    }
                }
            });
            
            ctx.globalAlpha = 1;
        });
        
        // 光线
        this.rays.forEach(ray => {
            if (ray.draw) ray.draw(ctx);
        });
        
        // 光线链接
        this.rayLinkMgr.render(ctx);
        
        // 连接点
        if (this.currentTool === 'connect') {
            this.connectionMgr.render(ctx, this.components);
        }
        
        // 标注
        this.annotationMgr.render(ctx);
        
        // 测量
        this.measurementTools.render(ctx);
        
        // 对齐参考线
        this.alignMgr.renderSmartGuides(ctx);
        
        ctx.restore();
        
        // 更新缩略图
        if (this.minimap && this.minimap.visible) {
            this.minimap.updateSceneBounds(this.components);
            this.minimap.updateViewport(this.viewport);
            this.minimap.render(this.components, this.rays);
        }
    }

    /**
     * 绘制选中高亮
     * @private
     */
    _drawSelection(ctx, component) {
        const bounds = component.getBounds?.() || { width: 60, height: 60 };
        const pos = component.pos || { x: 0, y: 0 };
        
        ctx.save();
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 2 / this.viewport.scale;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            pos.x - bounds.width / 2 - 5,
            pos.y - bounds.height / 2 - 5,
            bounds.width + 10,
            bounds.height + 10
        );
        ctx.restore();
    }

    /**
     * 处理图标选择
     * @private
     */
    _handleIconSelect(type, icon) {
        this.currentTool = 'add-component';
        this.pendingComponentType = type;
    }

    /**
     * 处理视口变化
     * @private
     */
    _handleViewportChange(viewport) {
        this.viewport = { ...this.viewport, ...viewport };
        this.render();
    }

    /**
     * 开始自动保存
     * @private
     */
    _startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            this.save();
        }, this.config.autoSaveInterval);
    }

    /**
     * 停止自动保存
     * @private
     */
    _stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * 保存场景
     */
    save() {
        const data = {
            version: '1.0.0',
            timestamp: Date.now(),
            viewport: { ...this.viewport },
            components: this.components.map(c => c.serialize?.() || c),
            rays: this.rays.map(r => r.serialize?.() || r),
            layers: this.layerMgr.serialize(),
            annotations: this.annotationMgr.serialize(),
            measurements: this.measurementTools.serialize(),
            styles: this.styleMgr.serialize(),
            theme: this.themeMgr.serialize(),
            grid: this.gridMgr.serialize(),
            alignment: this.alignMgr.serialize()
        };
        
        // 触发保存事件
        this._dispatchEvent('save', data);
        
        return data;
    }

    /**
     * 加载场景
     */
    load(data) {
        if (!data) return;
        
        // 清空当前场景
        this.components = [];
        this.rays = [];
        this.selectedComponents = [];
        
        // 加载数据
        if (data.viewport) this.viewport = { ...data.viewport };
        if (data.components) this.components = data.components;
        if (data.rays) this.rays = data.rays;
        if (data.layers) this.layerMgr.deserialize(data.layers);
        if (data.annotations) this.annotationMgr.deserialize(data.annotations);
        if (data.measurements) this.measurementTools.deserialize(data.measurements);
        if (data.styles) this.styleMgr.deserialize(data.styles);
        if (data.theme) this.themeMgr.deserialize(data.theme);
        if (data.grid) this.gridMgr.deserialize(data.grid);
        if (data.alignment) this.alignMgr.deserialize(data.alignment);
        
        // 重新初始化连接点
        this.components.forEach(comp => {
            this.connectionMgr.initializeComponentPoints(comp);
        });
        
        this.render();
        
        // 触发加载事件
        this._dispatchEvent('load', data);
    }

    /**
     * 导出为JSON
     */
    exportJSON() {
        return JSON.stringify(this.save(), null, 2);
    }

    /**
     * 从JSON导入
     */
    importJSON(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.load(data);
            return true;
        } catch (e) {
            console.error('Failed to import JSON:', e);
            return false;
        }
    }

    /**
     * 触发事件
     * @private
     */
    _dispatchEvent(eventName, detail) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`diagram-${eventName}`, { detail }));
        }
    }

    /**
     * 销毁系统
     */
    destroy() {
        this._stopAutoSave();
        
        if (this.minimap) {
            this.minimap.destroy();
        }
        
        // 清空所有数据
        this.components = [];
        this.rays = [];
        this.selectedComponents = [];
    }
}

// ========== 单例模式 ==========
let diagramSystemInstance = null;

export function getDiagramSystem(config) {
    if (!diagramSystemInstance) {
        diagramSystemInstance = new DiagramSystemCore(config);
    }
    return diagramSystemInstance;
}

export function resetDiagramSystem() {
    if (diagramSystemInstance) {
        diagramSystemInstance.destroy();
    }
    diagramSystemInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DiagramSystemCore = DiagramSystemCore;
    window.getDiagramSystem = getDiagramSystem;
}
