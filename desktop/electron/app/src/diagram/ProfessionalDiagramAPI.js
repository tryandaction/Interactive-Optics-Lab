/**
 * ProfessionalDiagramAPI.js - 专业图表系统统一API
 * 提供简单易用的接口访问所有功能
 */

// 导入所有管理器
import { getIconPalettePanel } from '../ui/panels/IconPalettePanel.js';
import { getLayerPanel } from '../ui/panels/LayerPanel.js';
import { getThemePanel } from '../ui/panels/ThemePanel.js';
import { getAnnotationManager } from './annotations/AnnotationManager.js';
import { getGridManager } from './grid/GridManager.js';
import { getAlignmentManager } from './alignment/AlignmentManager.js';
import { getLayerManager } from './layers/LayerManager.js';
import { getStyleManager } from './styling/StyleManager.js';
import { getThemeManager } from './styling/ThemeManager.js';
import { getMeasurementTools } from './measurement/MeasurementTools.js';
import { getOpticsCalculator } from './calculation/OpticsCalculator.js';
import { getMinimap } from './navigation/Minimap.js';
import { getProfessionalIconManager } from './ProfessionalIconManager.js';
import { getConnectionPointManager } from './ConnectionPointManager.js';
import { getRayLinkManager } from './RayLinkManager.js';
import { getKeyboardShortcutManager } from './KeyboardShortcutManager.js';
import { getUnifiedHistoryManager } from './UnifiedHistoryManager.js';
import { getEventBus } from './EventBus.js';
import { getPerformanceOptimizer } from './PerformanceOptimizer.js';
import { getDebugPanel } from './DebugPanel.js';
import { getSVGImporter } from './import/SVGImporter.js';
import { getImageImporter } from './import/ImageImporter.js';
import { getInitializationManager } from './InitializationManager.js';
import { getDiagnosticSystem } from './DiagnosticSystem.js';

/**
 * 专业图表系统API类
 */
export class ProfessionalDiagramAPI {
    constructor() {
        this.initialized = false;
        this.managers = {};
        this.panels = {};
        this.canvas = null;
        this.ctx = null;
        this.eventBus = getEventBus();
        this.diagnosticSystem = getDiagnosticSystem();
    }

    /**
     * 初始化系统
     */
    initialize(canvasId, config = {}) {
        if (this.initialized) {
            console.warn('ProfessionalDiagramAPI: Already initialized');
            return this;
        }

        // 获取Canvas
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element "${canvasId}" not found`);
        }
        this.ctx = this.canvas.getContext('2d');

        // 初始化所有管理器
        this.managers = {
            icons: getProfessionalIconManager(),
            annotations: getAnnotationManager(),
            grid: getGridManager(),
            alignment: getAlignmentManager(),
            layers: getLayerManager(),
            style: getStyleManager(),
            theme: getThemeManager(),
            measurement: getMeasurementTools(),
            calculator: getOpticsCalculator(),
            connectionPoints: getConnectionPointManager(),
            rayLinks: getRayLinkManager(),
            keyboard: getKeyboardShortcutManager({ 
                eventBus: this.eventBus,
                diagnosticSystem: this.diagnosticSystem
            }),
            history: getUnifiedHistoryManager({
                eventBus: this.eventBus,
                diagnosticSystem: this.diagnosticSystem
            }),
            performance: getPerformanceOptimizer({
                eventBus: this.eventBus,
                diagnosticSystem: this.diagnosticSystem
            }),
            svgImporter: getSVGImporter({
                diagnosticSystem: this.diagnosticSystem,
                iconManager: getProfessionalIconManager()
            }),
            imageImporter: getImageImporter({
                diagnosticSystem: this.diagnosticSystem
            }),
            initialization: getInitializationManager()
        };

        // 初始化面板（如果提供了容器ID）
        if (config.iconPaletteContainer) {
            this.panels.iconPalette = getIconPalettePanel(config.iconPaletteContainer);
        }
        if (config.layerPanelContainer) {
            this.panels.layerPanel = getLayerPanel(config.layerPanelContainer);
        }
        if (config.themePanelContainer) {
            this.panels.themePanel = getThemePanel(config.themePanelContainer);
        }

        // 初始化Minimap
        if (config.enableMinimap !== false) {
            this.managers.minimap = getMinimap(config.minimapConfig);
            this.managers.minimap.mount(this.canvas.parentElement);
        }

        // 应用默认主题
        if (config.theme) {
            this.managers.theme.applyTheme(config.theme);
        }

        // 配置网格
        if (config.gridSpacing) {
            this.managers.grid.setSpacing(config.gridSpacing);
        }

        // 初始化调试面板（如果启用）
        if (config.enableDebugPanel) {
            this.panels.debugPanel = getDebugPanel({
                diagnosticSystem: this.diagnosticSystem,
                eventBus: this.eventBus,
                initializationManager: this.managers.initialization,
                modeManager: config.modeManager
            });
        }

        // 设置键盘快捷键事件监听
        this._setupKeyboardShortcuts();

        // 设置历史记录事件监听
        this._setupHistoryIntegration();

        this.initialized = true;
        
        this.diagnosticSystem.log('info', 'ProfessionalDiagramAPI initialized successfully');
        
        return this;
    }

    /**
     * 快速访问 - 图标
     */
    get icons() {
        return {
            manager: this.managers.icons,
            panel: this.panels.iconPalette,
            render: (type, x, y, angle = 0, scale = 1, style = {}) => {
                this.managers.icons.renderIcon(this.ctx, type, x, y, angle, scale, style);
            },
            getAll: () => this.managers.icons.getAllIconTypes(),
            getByCategory: (category) => this.managers.icons.getIconsByCategory(category)
        };
    }

    /**
     * 快速访问 - 标注
     */
    get annotations() {
        return {
            manager: this.managers.annotations,
            createText: (text, pos, options) => 
                this.managers.annotations.createTextAnnotation(text, pos, options),
            createDimension: (start, end, options) => 
                this.managers.annotations.createDimensionAnnotation(start, end, options),
            createAngle: (vertex, startAngle, endAngle, options) => 
                this.managers.annotations.createAngleAnnotation(vertex, startAngle, endAngle, options),
            createLabel: (text, anchor, pos, options) => 
                this.managers.annotations.createLabelAnnotation(text, anchor, pos, options),
            render: () => this.managers.annotations.render(this.ctx),
            getAll: () => this.managers.annotations.getAllAnnotations(),
            clear: () => this.managers.annotations.clear()
        };
    }

    /**
     * 快速访问 - 网格
     */
    get grid() {
        return {
            manager: this.managers.grid,
            render: (viewport) => this.managers.grid.render(this.ctx, viewport),
            snap: (pos) => this.managers.grid.snapToGridPoint(pos),
            snapAngle: (angle) => this.managers.grid.snapAngle(angle),
            setSpacing: (spacing) => this.managers.grid.setSpacing(spacing),
            toggle: () => this.managers.grid.toggleVisible(),
            enable: () => { this.managers.grid.visible = true; },
            disable: () => { this.managers.grid.visible = false; }
        };
    }

    /**
     * 快速访问 - 对齐
     */
    get alignment() {
        return {
            manager: this.managers.alignment,
            align: (objects, direction) => 
                this.managers.alignment.alignObjects(objects, direction),
            distribute: (objects, direction) => 
                this.managers.alignment.distributeObjects(objects, direction),
            smartGuides: (dragged, all, pos) => 
                this.managers.alignment.generateSmartGuides(dragged, all, pos),
            renderGuides: () => this.managers.alignment.renderSmartGuides(this.ctx)
        };
    }

    /**
     * 快速访问 - 图层
     */
    get layers() {
        return {
            manager: this.managers.layers,
            panel: this.panels.layerPanel,
            create: (config) => this.managers.layers.createLayer(config),
            delete: (id) => this.managers.layers.deleteLayer(id),
            addObject: (objId, layerId) => 
                this.managers.layers.addObjectToLayer(objId, layerId),
            getActive: () => this.managers.layers.getActiveLayer(),
            setActive: (id) => this.managers.layers.setActiveLayer(id),
            isVisible: (objId) => this.managers.layers.isObjectVisible(objId),
            isLocked: (objId) => this.managers.layers.isObjectLocked(objId)
        };
    }

    /**
     * 快速访问 - 样式
     */
    get style() {
        return {
            manager: this.managers.style,
            set: (compId, style) => this.managers.style.setComponentStyle(compId, style),
            get: (compId, type) => this.managers.style.getEffectiveStyle(compId, type),
            applyToContext: (compId, type) => 
                this.managers.style.applyToContext(this.ctx, compId, type),
            setGlobal: (style) => this.managers.style.setGlobalStyle(style)
        };
    }

    /**
     * 快速访问 - 主题
     */
    get theme() {
        return {
            manager: this.managers.theme,
            panel: this.panels.themePanel,
            apply: (themeId) => this.managers.theme.applyTheme(themeId),
            getCurrent: () => this.managers.theme.getCurrentTheme(),
            getAll: () => this.managers.theme.getAllThemes(),
            create: (config) => this.managers.theme.createCustomTheme(config)
        };
    }

    /**
     * 快速访问 - 测量
     */
    get measurement() {
        return {
            manager: this.managers.measurement,
            distance: (p1, p2) => this.managers.measurement.measureDistance(p1, p2),
            angle: (p1, vertex, p2) => this.managers.measurement.measureAngle(p1, vertex, p2),
            area: (points) => this.managers.measurement.measureArea(points),
            opticalPath: (points, indices) => 
                this.managers.measurement.measureOpticalPath(points, indices),
            render: () => this.managers.measurement.render(this.ctx),
            getAll: () => this.managers.measurement.getAllMeasurements(),
            clear: () => this.managers.measurement.clearAll()
        };
    }

    /**
     * 快速访问 - 计算器
     */
    get calculator() {
        return {
            manager: this.managers.calculator,
            thinLens: (f, so, si) => this.managers.calculator.thinLensEquation(f, so, si),
            magnification: (si, so) => this.managers.calculator.magnification(si, so),
            gaussianBeam: (lambda, w0, z) => 
                this.managers.calculator.gaussianBeam(lambda, w0, z),
            wavelengthFreq: (lambda, f) => 
                this.managers.calculator.wavelengthFrequency(lambda, f),
            photonEnergy: (lambda) => this.managers.calculator.photonEnergy(lambda),
            snellsLaw: (n1, theta1, n2, theta2) => 
                this.managers.calculator.snellsLaw(n1, theta1, n2, theta2),
            brewsterAngle: (n1, n2) => this.managers.calculator.brewsterAngle(n1, n2)
        };
    }

    /**
     * 快速访问 - Minimap
     */
    get minimap() {
        if (!this.managers.minimap) return null;
        return {
            manager: this.managers.minimap,
            render: (components, rays) => 
                this.managers.minimap.render(components, rays),
            updateViewport: (viewport) => 
                this.managers.minimap.updateViewport(viewport),
            show: () => this.managers.minimap.show(),
            hide: () => this.managers.minimap.hide(),
            toggle: () => this.managers.minimap.toggle()
        };
    }

    /**
     * 快速访问 - 连接点
     */
    get connections() {
        return {
            manager: this.managers.connectionPoints,
            init: (component) => 
                this.managers.connectionPoints.initializeComponentPoints(component),
            findNearest: (pos, exclude, maxDist) => 
                this.managers.connectionPoints.findNearestPoint(pos, exclude, maxDist),
            render: (components) => 
                this.managers.connectionPoints.render(this.ctx, components)
        };
    }

    /**
     * 快速访问 - 光线链接
     */
    get rayLinks() {
        return {
            manager: this.managers.rayLinks,
            create: (config) => this.managers.rayLinks.createLink(config),
            delete: (id) => this.managers.rayLinks.deleteLink(id),
            autoRoute: (linkId, obstacles, options) => 
                this.managers.rayLinks.applyAutoRouting(linkId, obstacles, options),
            render: () => this.managers.rayLinks.render(this.ctx),
            getAll: () => this.managers.rayLinks.getAllLinks()
        };
    }

    /**
     * 快速访问 - 键盘快捷键
     */
    get keyboard() {
        return {
            manager: this.managers.keyboard,
            register: (key, handler, options) => 
                this.managers.keyboard.register(key, handler, options),
            unregister: (key, context) => 
                this.managers.keyboard.unregister(key, context),
            setContext: (context) => this.managers.keyboard.setContext(context),
            getContext: () => this.managers.keyboard.getContext(),
            showHelp: () => this.managers.keyboard.showShortcutHelp(),
            enable: (key, context) => this.managers.keyboard.enable(key, context),
            disable: (key, context) => this.managers.keyboard.disable(key, context),
            getAll: () => this.managers.keyboard.getAllShortcuts()
        };
    }

    /**
     * 快速访问 - 历史记录
     */
    get history() {
        return {
            manager: this.managers.history,
            record: (action) => this.managers.history.record(action),
            undo: () => this.managers.history.undo(),
            redo: () => this.managers.history.redo(),
            canUndo: () => this.managers.history.canUndo(),
            canRedo: () => this.managers.history.canRedo(),
            clear: () => this.managers.history.clear(),
            beginBatch: (name) => this.managers.history.beginBatch(name),
            endBatch: () => this.managers.history.endBatch(),
            getHistory: () => this.managers.history.getHistory(),
            getStats: () => this.managers.history.getStats()
        };
    }

    /**
     * 快速访问 - 性能优化
     */
    get performance() {
        return {
            manager: this.managers.performance,
            updateViewport: (viewport) => this.managers.performance.updateViewport(viewport),
            markDirty: (componentId) => this.managers.performance.markDirty(componentId),
            markAllDirty: () => this.managers.performance.markAllDirty(),
            optimizedRender: (ctx, components, renderFunc) => 
                this.managers.performance.optimizedRender(ctx, components, renderFunc),
            batchRender: (renderFunc) => this.managers.performance.batchRender(renderFunc),
            getMetrics: () => this.managers.performance.getMetrics(),
            cleanupCache: () => this.managers.performance.cleanupCache(),
            setConfig: (config) => this.managers.performance.setConfig(config),
            getSuggestions: () => this.managers.performance.getOptimizationSuggestions()
        };
    }

    /**
     * 快速访问 - 导入
     */
    get import() {
        return {
            svg: async (input) => await this.managers.svgImporter.importSVG(input),
            image: async (file, options) => await this.managers.imageImporter.importImage(file, options),
            imageFromURL: async (url, options) => 
                await this.managers.imageImporter.importFromURL(url, options),
            multipleImages: async (files, options) => 
                await this.managers.imageImporter.importMultiple(files, options)
        };
    }

    /**
     * 快速访问 - 调试
     */
    get debug() {
        if (!this.panels.debugPanel) return null;
        return {
            panel: this.panels.debugPanel,
            show: () => this.panels.debugPanel.show(),
            hide: () => this.panels.debugPanel.hide(),
            toggle: () => this.panels.debugPanel.toggle()
        };
    }

    /**
     * 设置键盘快捷键
     * @private
     */
    _setupKeyboardShortcuts() {
        const kb = this.managers.keyboard;
        
        // 连接到历史记录
        this.eventBus.on('edit:undo', () => this.history.undo());
        this.eventBus.on('edit:redo', () => this.history.redo());
        
        // 连接到图层操作
        this.eventBus.on('layer:bringForward', () => {
            const activeLayer = this.layers.getActive();
            if (activeLayer) {
                // 实现图层前移逻辑
            }
        });
        
        // 连接到对齐操作
        this.eventBus.on('align:left', () => {
            // 获取选中的对象并对齐
        });
        
        // 连接到网格操作
        this.eventBus.on('grid:toggle', () => this.grid.toggle());
        this.eventBus.on('grid:snap:toggle', () => {
            this.managers.grid.snapEnabled = !this.managers.grid.snapEnabled;
        });
        
        // 连接到面板操作
        this.eventBus.on('panel:icons:toggle', () => {
            if (this.panels.iconPalette) {
                this.panels.iconPalette.toggle();
            }
        });
        
        this.eventBus.on('panel:layers:toggle', () => {
            if (this.panels.layerPanel) {
                this.panels.layerPanel.toggle();
            }
        });
        
        // 连接到调试面板
        this.eventBus.on('debug:toggle', () => {
            if (this.panels.debugPanel) {
                this.panels.debugPanel.toggle();
            }
        });
        
        // 连接到帮助
        this.eventBus.on('help:show', () => {
            kb.showShortcutHelp();
        });
    }

    /**
     * 设置历史记录集成
     * @private
     */
    _setupHistoryIntegration() {
        // 监听各种操作并记录到历史
        
        // 标注操作
        this.eventBus.on('annotation:created', (data) => {
            this.history.record({
                type: 'annotation:create',
                name: 'Create Annotation',
                data,
                undo: () => this.managers.annotations.deleteAnnotation(data.id),
                redo: () => this.managers.annotations.addAnnotation(data)
            });
        });
        
        // 图层操作
        this.eventBus.on('layer:created', (data) => {
            this.history.record({
                type: 'layer:create',
                name: 'Create Layer',
                data,
                undo: () => this.managers.layers.deleteLayer(data.id),
                redo: () => this.managers.layers.createLayer(data)
            });
        });
        
        // 样式更改
        this.eventBus.on('style:changed', (data) => {
            this.history.record({
                type: 'style:change',
                name: 'Change Style',
                previousState: data.previous,
                newState: data.new,
                restore: (state) => {
                    this.managers.style.setComponentStyle(data.componentId, state);
                }
            });
        });
    }

    /**
     * 渲染所有内容（带性能优化）
     */
    renderAll(components = [], rays = [], viewport = null) {
        if (!this.ctx) return;

        const vp = viewport || {
            x: 0, y: 0,
            width: this.canvas.width,
            height: this.canvas.height,
            scale: 1
        };

        // 更新性能优化器视口
        this.managers.performance.updateViewport(vp);

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 渲染网格
        if (this.managers.grid.visible) {
            this.managers.grid.render(this.ctx, vp);
        }

        // 使用性能优化渲染组件
        if (components.length > 0) {
            this.managers.performance.optimizedRender(
                this.ctx,
                components,
                (ctx, component) => {
                    // 应用样式
                    const compId = component.id || component.uuid;
                    this.managers.style.applyToContext(ctx, compId, 'component');
                    
                    // 渲染组件（由外部提供具体渲染逻辑）
                    if (component.render) {
                        component.render(ctx);
                    }
                }
            );
        }

        // 渲染光线链接
        this.managers.rayLinks.render(this.ctx);

        // 渲染连接点
        if (this.managers.connectionPoints.visible) {
            this.managers.connectionPoints.render(this.ctx, components);
        }

        // 渲染标注
        this.managers.annotations.render(this.ctx);

        // 渲染测量
        this.managers.measurement.render(this.ctx);

        // 渲染对齐参考线
        this.managers.alignment.renderSmartGuides(this.ctx);

        // 更新Minimap
        if (this.managers.minimap) {
            this.managers.minimap.updateViewport(vp);
            this.managers.minimap.render(components, rays);
        }
    }

    /**
     * 保存状态
     */
    saveState() {
        return {
            annotations: this.managers.annotations.serialize(),
            grid: this.managers.grid.serialize(),
            alignment: this.managers.alignment.serialize(),
            layers: this.managers.layers.serialize(),
            style: this.managers.style.serialize(),
            theme: this.managers.theme.serialize(),
            measurement: this.managers.measurement.serialize(),
            rayLinks: this.managers.rayLinks.serialize(),
            keyboard: this.managers.keyboard.serialize(),
            history: this.managers.history.serialize(),
            performance: {
                config: this.managers.performance.config,
                metrics: this.managers.performance.getMetrics()
            },
            version: '1.0.0',
            timestamp: Date.now()
        };
    }

    /**
     * 加载状态
     */
    loadState(state) {
        if (state.annotations) this.managers.annotations.deserialize(state.annotations);
        if (state.grid) this.managers.grid.deserialize(state.grid);
        if (state.alignment) this.managers.alignment.deserialize(state.alignment);
        if (state.layers) this.managers.layers.deserialize(state.layers);
        if (state.style) this.managers.style.deserialize(state.style);
        if (state.theme) this.managers.theme.deserialize(state.theme);
        if (state.measurement) this.managers.measurement.deserialize(state.measurement);
        if (state.rayLinks) this.managers.rayLinks.deserialize(state.rayLinks);
        if (state.keyboard) this.managers.keyboard.deserialize(state.keyboard);
        if (state.history) this.managers.history.deserialize(state.history);
        if (state.performance?.config) {
            this.managers.performance.setConfig(state.performance.config);
        }
        
        this.diagnosticSystem.log('info', 'State loaded successfully');
    }

    /**
     * 导出为JSON
     */
    exportJSON() {
        return JSON.stringify(this.saveState(), null, 2);
    }

    /**
     * 从JSON导入
     */
    importJSON(json) {
        try {
            const state = JSON.parse(json);
            this.loadState(state);
            return true;
        } catch (e) {
            console.error('Failed to import JSON:', e);
            return false;
        }
    }

    /**
     * 重置所有
     */
    reset() {
        this.managers.annotations.clear();
        this.managers.layers.clear();
        this.managers.measurement.clearAll();
        this.managers.rayLinks.clear();
        this.managers.style.clear();
        this.managers.grid.clearGuides();
        this.managers.alignment.clearSmartGuides();
    }

    /**
     * 获取所有管理器
     */
    getAllManagers() {
        return { ...this.managers };
    }

    /**
     * 获取所有面板
     */
    getAllPanels() {
        return { ...this.panels };
    }

    /**
     * 生产环境快速初始化
     * @param {string} canvasId - Canvas元素ID
     * @param {Object} options - 配置选项
     * @returns {ProfessionalDiagramAPI}
     */
    static quickStart(canvasId, options = {}) {
        const api = getProfessionalDiagramAPI();
        
        // 默认配置
        const config = {
            // 面板容器
            iconPaletteContainer: options.iconPaletteContainer || 'icon-palette',
            layerPanelContainer: options.layerPanelContainer || 'layer-panel',
            themePanelContainer: options.themePanelContainer || 'theme-panel',
            
            // 功能开关
            enableMinimap: options.enableMinimap !== false,
            enableDebugPanel: options.enableDebugPanel || false,
            
            // 主题
            theme: options.theme || 'professional',
            
            // 网格
            gridSpacing: options.gridSpacing || 20,
            
            // Minimap配置
            minimapConfig: {
                width: options.minimapWidth || 200,
                height: options.minimapHeight || 150,
                position: options.minimapPosition || 'bottom-right'
            },
            
            // 性能配置
            performanceConfig: {
                enableIncrementalRendering: true,
                enableViewportCulling: true,
                enableOffscreenCache: true,
                enableBatchRendering: true
            },
            
            // 历史记录配置
            historyConfig: {
                maxHistorySize: options.maxHistorySize || 100,
                enableBatching: true
            },
            
            ...options
        };
        
        // 初始化
        api.initialize(canvasId, config);
        
        // 应用性能配置
        if (config.performanceConfig) {
            api.performance.setConfig(config.performanceConfig);
        }
        
        // 显示欢迎信息
        if (!options.silent) {
            console.log('%c🎨 Professional Diagram System Ready!', 
                'color: #4CAF50; font-size: 16px; font-weight: bold;');
            console.log('API:', api);
            console.log('Press Ctrl+/ to see keyboard shortcuts');
            console.log('Press F1 for help');
        }
        
        return api;
    }

    /**
     * 获取系统信息
     * @returns {Object}
     */
    getSystemInfo() {
        return {
            version: '1.0.0',
            initialized: this.initialized,
            managers: Object.keys(this.managers),
            panels: Object.keys(this.panels),
            performance: this.managers.performance.getMetrics(),
            history: this.managers.history.getStats(),
            keyboard: {
                shortcuts: this.managers.keyboard.getAllShortcuts().length,
                context: this.managers.keyboard.getContext()
            },
            features: {
                icons: this.managers.icons.getAllIconTypes().length,
                themes: this.managers.theme.getAllThemes().length,
                layers: this.managers.layers.getAllLayers().length,
                annotations: this.managers.annotations.getAllAnnotations().length,
                measurements: this.managers.measurement.getAllMeasurements().length
            }
        };
    }

    /**
     * 运行系统诊断
     * @returns {Object}
     */
    runDiagnostic() {
        const info = this.getSystemInfo();
        const suggestions = this.managers.performance.getOptimizationSuggestions();
        
        return {
            system: info,
            performance: {
                metrics: info.performance,
                suggestions
            },
            health: {
                status: info.performance.fps > 30 ? 'good' : 'poor',
                issues: suggestions.filter(s => s.severity === 'high')
            },
            timestamp: Date.now()
        };
    }
}

// ========== 单例模式 ==========
let apiInstance = null;

export function getProfessionalDiagramAPI() {
    if (!apiInstance) {
        apiInstance = new ProfessionalDiagramAPI();
    }
    return apiInstance;
}

export function resetProfessionalDiagramAPI() {
    apiInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ProfessionalDiagramAPI = ProfessionalDiagramAPI;
    window.getProfessionalDiagramAPI = getProfessionalDiagramAPI;
}
