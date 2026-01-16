/**
 * DiagramModeIntegration.js - 专业绘图模式集成
 * 将所有diagram模块与主应用连接
 * 
 * Requirements: 1.2, 1.4, 1.7, 1.8, 1.9, 2.7, 3.10
 */

import { getModeManager, APP_MODES } from './ModeManager.js';
import { createModeSwitcher } from './ModeSwitcher.js';
import { getSymbolLibrary } from './SymbolLibrary.js';
import { getAnnotationManager } from './AnnotationSystem.js';
import { getLayoutEngine } from './LayoutEngine.js';
import { getExportEngine } from './ExportEngine.js';
import { openExportDialog } from './ExportUI.js';
import { getRayStyleManager } from './RayStyleManager.js';
import { getTechnicalNotesManager } from './TechnicalNotes.js';
import { getParameterDisplayManager } from './ParameterDisplay.js';
import { getTemplateManager } from './TemplateManager.js';
import { getBatchExportManager } from './BatchExport.js';

/**
 * 专业绘图模式集成类
 * 负责初始化和协调所有diagram模块
 */
export class DiagramModeIntegration {
    constructor(options = {}) {
        /** @type {Object} 配置选项 */
        this.options = options;
        
        /** @type {boolean} 是否已初始化 */
        this.initialized = false;
        
        /** @type {Object} 模块引用 */
        this.modules = {
            modeManager: null,
            modeSwitcher: null,
            symbolLibrary: null,
            annotationManager: null,
            layoutEngine: null,
            exportEngine: null,
            rayStyleManager: null,
            technicalNotesManager: null,
            parameterDisplayManager: null,
            templateManager: null,
            batchExportManager: null
        };
        
        /** @type {HTMLElement|null} */
        this.toolbarContainer = null;
        
        /** @type {HTMLElement|null} */
        this.panelContainer = null;
        
        /** @type {Array<Function>} 清理函数 */
        this.cleanupFunctions = [];
    }

    /**
     * 初始化集成
     * @param {Object} appContext - 应用上下文
     */
    initialize(appContext = {}) {
        if (this.initialized) {
            console.warn('DiagramModeIntegration: Already initialized');
            return;
        }

        console.log('DiagramModeIntegration: Initializing...');

        // 初始化所有模块
        this._initializeModules(appContext);
        
        // 设置模式切换监听
        this._setupModeChangeListener();
        
        // 创建UI组件
        this._createUIComponents();
        
        // 注入样式
        this._injectStyles();
        
        this.initialized = true;
        console.log('DiagramModeIntegration: Initialization complete');
    }

    /**
     * 初始化所有模块
     * @private
     */
    _initializeModules(appContext) {
        // 状态提供者
        const stateProvider = {
            getComponents: () => appContext.components || window.components || [],
            getAnnotations: () => this.modules.annotationManager?.getAllAnnotations() || [],
            getCameraState: () => appContext.cameraState || null,
            getDiagramSettings: () => this._getDiagramSettings()
        };

        // 初始化模式管理器
        this.modules.modeManager = getModeManager({
            stateProvider,
            onModeChange: (oldMode, newMode, phase) => {
                if (phase === 'after') {
                    this._handleModeChange(newMode);
                }
            }
        });

        // 初始化其他模块
        this.modules.symbolLibrary = getSymbolLibrary();
        this.modules.annotationManager = getAnnotationManager();
        this.modules.layoutEngine = getLayoutEngine();
        this.modules.exportEngine = getExportEngine();
        this.modules.rayStyleManager = getRayStyleManager();
        this.modules.technicalNotesManager = getTechnicalNotesManager();
        this.modules.parameterDisplayManager = getParameterDisplayManager();
        this.modules.templateManager = getTemplateManager();
        this.modules.batchExportManager = getBatchExportManager();
    }

    /**
     * 设置模式切换监听
     * @private
     */
    _setupModeChangeListener() {
        const unsubscribe = this.modules.modeManager.onModeChange((oldMode, newMode, phase) => {
            if (phase === 'after') {
                // 更新UI可见性
                this._updateUIVisibility(newMode);
                
                // 触发自定义事件
                if (typeof document !== 'undefined') {
                    document.dispatchEvent(new CustomEvent('diagram-mode-change', {
                        detail: { oldMode, newMode }
                    }));
                }
            }
        });
        
        this.cleanupFunctions.push(unsubscribe);
    }

    /**
     * 创建UI组件
     * @private
     */
    _createUIComponents() {
        if (typeof document === 'undefined') return;

        // 查找HTML中已有的模式切换器容器
        const existingModeSwitcherContainer = document.getElementById('mode-switcher-container');
        
        // 查找或创建工具栏容器（用于绘图模式专属工具）
        this.toolbarContainer = document.querySelector('.diagram-toolbar-container');
        if (!this.toolbarContainer) {
            this.toolbarContainer = document.createElement('div');
            this.toolbarContainer.className = 'diagram-toolbar-container diagram-only';
            
            // 尝试插入到模拟区域顶部
            const simulationArea = document.getElementById('simulation-area');
            const topMenubar = document.getElementById('top-menubar');
            if (simulationArea) {
                simulationArea.insertBefore(this.toolbarContainer, simulationArea.firstChild);
            } else if (topMenubar && topMenubar.nextSibling) {
                topMenubar.parentNode.insertBefore(this.toolbarContainer, topMenubar.nextSibling);
            } else {
                document.body.appendChild(this.toolbarContainer);
            }
        }

        // 如果HTML中没有模式切换器容器，则创建一个
        if (!existingModeSwitcherContainer) {
            const switcherContainer = document.createElement('div');
            switcherContainer.className = 'mode-switcher-container';
            switcherContainer.id = 'mode-switcher-container-diagram';
            this.toolbarContainer.appendChild(switcherContainer);
            
            this.modules.modeSwitcher = createModeSwitcher(switcherContainer, {
                modeManager: this.modules.modeManager
            });
        }
        // 如果HTML中已有容器，ModeSwitcher应该已经由main.js初始化

        // 创建绘图模式工具栏
        this._createDiagramToolbar();
    }

    /**
     * 创建绘图模式工具栏
     * @private
     */
    _createDiagramToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'diagram-mode-toolbar diagram-only';
        toolbar.innerHTML = `
            <div class="toolbar-group">
                <button class="toolbar-btn" id="btn-export" title="导出图像">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v8M4 6l4-4 4 4M2 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>导出</span>
                </button>
                <button class="toolbar-btn" id="btn-align" title="对齐工具">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 2v12M6 4h8M6 8h6M6 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>对齐</span>
                </button>
                <button class="toolbar-btn" id="btn-grid" title="显示网格">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 2h12v12H2zM2 6h12M2 10h12M6 2v12M10 2v12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
                    </svg>
                    <span>网格</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="toolbar-btn" id="btn-annotation" title="添加标注">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 12l2-6 6 6-6-2-2 2z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <path d="M8 4h6M8 7h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>标注</span>
                </button>
                <button class="toolbar-btn" id="btn-style" title="样式设置">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>样式</span>
                </button>
            </div>
        `;
        
        this.toolbarContainer.appendChild(toolbar);
        
        // 绑定按钮事件
        this._bindToolbarEvents(toolbar);
    }

    /**
     * 绑定工具栏事件
     * @private
     */
    _bindToolbarEvents(toolbar) {
        // 导出按钮
        toolbar.querySelector('#btn-export')?.addEventListener('click', () => {
            this.openExportDialog();
        });

        // 网格按钮
        toolbar.querySelector('#btn-grid')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isActive = btn.classList.toggle('active');
            this.modules.layoutEngine.setShowGrid(isActive);
        });

        // 对齐按钮 - 显示对齐菜单
        toolbar.querySelector('#btn-align')?.addEventListener('click', (e) => {
            this._showAlignMenu(e.currentTarget);
        });

        // 标注按钮
        toolbar.querySelector('#btn-annotation')?.addEventListener('click', () => {
            this._toggleAnnotationMode();
        });

        // 样式按钮
        toolbar.querySelector('#btn-style')?.addEventListener('click', () => {
            this._showStylePanel();
        });
    }

    /**
     * 显示对齐菜单
     * @private
     */
    _showAlignMenu(button) {
        // 简单实现：创建下拉菜单
        const existingMenu = document.querySelector('.align-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'align-menu dropdown-menu';
        menu.innerHTML = `
            <button data-align="left">左对齐</button>
            <button data-align="right">右对齐</button>
            <button data-align="top">顶部对齐</button>
            <button data-align="bottom">底部对齐</button>
            <button data-align="center-horizontal">水平居中</button>
            <button data-align="center-vertical">垂直居中</button>
            <hr>
            <button data-distribute="horizontal">水平分布</button>
            <button data-distribute="vertical">垂直分布</button>
        `;

        // 定位菜单
        const rect = button.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;

        document.body.appendChild(menu);

        // 绑定菜单事件
        menu.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const alignDir = btn.dataset.align;
            const distributeDir = btn.dataset.distribute;

            if (alignDir) {
                this._alignSelectedComponents(alignDir);
            } else if (distributeDir) {
                this._distributeSelectedComponents(distributeDir);
            }

            menu.remove();
        });

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== button) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }

    /**
     * 对齐选中的元件
     * @private
     */
    _alignSelectedComponents(direction) {
        // 获取选中的元件
        const selectedComponents = this._getSelectedComponents();
        if (selectedComponents.length < 2) {
            console.warn('DiagramModeIntegration: Need at least 2 components to align');
            return;
        }

        const aligned = this.modules.layoutEngine.alignComponents(selectedComponents, direction);
        
        // 应用对齐结果
        aligned.forEach((alignedComp, index) => {
            const original = selectedComponents[index];
            if (original.pos) {
                original.pos.x = alignedComp.pos.x;
                original.pos.y = alignedComp.pos.y;
            }
        });

        // 触发重绘
        this._triggerRedraw();
    }

    /**
     * 分布选中的元件
     * @private
     */
    _distributeSelectedComponents(direction) {
        const selectedComponents = this._getSelectedComponents();
        if (selectedComponents.length < 3) {
            console.warn('DiagramModeIntegration: Need at least 3 components to distribute');
            return;
        }

        this.modules.layoutEngine.distributeComponents(selectedComponents, direction);
        this._triggerRedraw();
    }

    /**
     * 获取选中的元件
     * @private
     */
    _getSelectedComponents() {
        // 尝试从全局状态获取
        if (window.selectedComponents) {
            return window.selectedComponents;
        }
        if (window.selection && Array.isArray(window.selection)) {
            return window.selection;
        }
        return [];
    }

    /**
     * 触发重绘
     * @private
     */
    _triggerRedraw() {
        if (typeof window !== 'undefined') {
            if (window.requestRedraw) {
                window.requestRedraw();
            } else if (window.render) {
                window.render();
            }
            
            document.dispatchEvent(new CustomEvent('diagram-redraw-requested'));
        }
    }

    /**
     * 切换标注模式
     * @private
     */
    _toggleAnnotationMode() {
        // 实现标注模式切换逻辑
        console.log('DiagramModeIntegration: Toggle annotation mode');
    }

    /**
     * 显示样式面板
     * @private
     */
    _showStylePanel() {
        // 实现样式面板显示逻辑
        console.log('DiagramModeIntegration: Show style panel');
    }

    /**
     * 更新UI可见性
     * @private
     */
    _updateUIVisibility(mode) {
        if (typeof document === 'undefined') return;

        const isDiagramMode = mode === APP_MODES.DIAGRAM;
        
        // 更新diagram-only元素
        document.querySelectorAll('.diagram-only').forEach(el => {
            el.style.display = isDiagramMode ? '' : 'none';
        });

        // 更新simulation-only元素
        document.querySelectorAll('.simulation-only').forEach(el => {
            el.style.display = isDiagramMode ? 'none' : '';
        });
    }

    /**
     * 处理模式切换
     * @private
     */
    _handleModeChange(newMode) {
        console.log(`DiagramModeIntegration: Mode changed to ${newMode}`);
        
        if (newMode === APP_MODES.DIAGRAM) {
            // 进入绘图模式
            this._enterDiagramMode();
        } else {
            // 退出绘图模式
            this._exitDiagramMode();
        }
    }

    /**
     * 进入绘图模式
     * @private
     */
    _enterDiagramMode() {
        // 启用布局引擎功能
        this.modules.layoutEngine.setShowAlignmentGuides(true);
    }

    /**
     * 退出绘图模式
     * @private
     */
    _exitDiagramMode() {
        // 禁用布局引擎功能
        this.modules.layoutEngine.setShowGrid(false);
        this.modules.layoutEngine.clearAlignmentGuides();
    }

    /**
     * 获取绘图设置
     * @private
     */
    _getDiagramSettings() {
        return {
            layoutEngine: this.modules.layoutEngine.serialize(),
            rayStyleManager: this.modules.rayStyleManager.serialize(),
            technicalNotes: this.modules.technicalNotesManager.serialize(),
            parameterDisplay: this.modules.parameterDisplayManager.serialize()
        };
    }

    /**
     * 打开导出对话框
     * @param {Object} [scene] - 场景数据
     */
    openExportDialog(scene) {
        const sceneData = scene || this._getCurrentScene();
        openExportDialog(sceneData, {
            exportEngine: this.modules.exportEngine,
            onExport: (result, config) => {
                console.log('DiagramModeIntegration: Export completed', config);
            }
        });
    }

    /**
     * 获取当前场景数据
     * @private
     */
    _getCurrentScene() {
        const components = window.components || [];
        const rays = window.rays || [];
        const annotations = this.modules.annotationManager.getAllAnnotations();
        const notes = this.modules.technicalNotesManager.getAllNotes().map(n => n.text);

        return {
            name: 'Optical Diagram',
            components,
            rays: rays.map(ray => ({
                pathPoints: ray.pathPoints || ray.path || [],
                color: ray.color,
                lineWidth: ray.lineWidth,
                lineStyle: ray.lineStyle
            })),
            annotations: annotations.map(a => a.serialize()),
            notes
        };
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        const styleId = 'diagram-integration-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .diagram-toolbar-container {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                background: var(--toolbar-bg, #1e1e1e);
                border-bottom: 1px solid var(--border-color, #333);
            }

            .diagram-mode-toolbar {
                display: flex;
                gap: 8px;
            }

            .toolbar-group {
                display: flex;
                gap: 4px;
                padding: 0 8px;
                border-right: 1px solid var(--border-color, #333);
            }

            .toolbar-group:last-child {
                border-right: none;
            }

            .toolbar-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: 6px 10px;
                background: transparent;
                border: none;
                border-radius: 4px;
                color: var(--text-secondary, #888);
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }

            .toolbar-btn:hover {
                background: var(--hover-bg, rgba(255, 255, 255, 0.1));
                color: var(--text-primary, #fff);
            }

            .toolbar-btn.active {
                background: var(--accent-color, #0078d4);
                color: #fff;
            }

            .toolbar-btn svg {
                width: 18px;
                height: 18px;
            }

            .dropdown-menu {
                background: var(--menu-bg, #2d2d2d);
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                min-width: 150px;
            }

            .dropdown-menu button {
                display: block;
                width: 100%;
                padding: 8px 12px;
                background: none;
                border: none;
                color: var(--text-primary, #fff);
                text-align: left;
                cursor: pointer;
                font-size: 13px;
            }

            .dropdown-menu button:hover {
                background: var(--hover-bg, rgba(255, 255, 255, 0.1));
            }

            .dropdown-menu hr {
                margin: 4px 0;
                border: none;
                border-top: 1px solid var(--border-color, #444);
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 销毁集成
     */
    destroy() {
        // 执行清理函数
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];

        // 销毁模式切换器
        if (this.modules.modeSwitcher) {
            this.modules.modeSwitcher.destroy();
        }

        // 移除UI元素
        if (this.toolbarContainer) {
            this.toolbarContainer.remove();
        }

        this.initialized = false;
        console.log('DiagramModeIntegration: Destroyed');
    }

    /**
     * 获取模块引用
     * @param {string} moduleName - 模块名称
     * @returns {Object|null}
     */
    getModule(moduleName) {
        return this.modules[moduleName] || null;
    }

    /**
     * 检查是否为绘图模式
     * @returns {boolean}
     */
    isDiagramMode() {
        return this.modules.modeManager?.isDiagramMode() || false;
    }

    /**
     * 切换到绘图模式
     */
    switchToDiagramMode() {
        this.modules.modeManager?.switchMode(APP_MODES.DIAGRAM);
    }

    /**
     * 切换到模拟模式
     */
    switchToSimulationMode() {
        this.modules.modeManager?.switchMode(APP_MODES.SIMULATION);
    }
}

// 创建单例实例
let integrationInstance = null;

/**
 * 获取DiagramModeIntegration单例实例
 * @param {Object} options
 * @returns {DiagramModeIntegration}
 */
export function getDiagramModeIntegration(options = {}) {
    if (!integrationInstance) {
        integrationInstance = new DiagramModeIntegration(options);
    }
    return integrationInstance;
}

/**
 * 初始化专业绘图模式
 * @param {Object} appContext - 应用上下文
 * @returns {DiagramModeIntegration}
 */
export function initializeDiagramMode(appContext = {}) {
    const integration = getDiagramModeIntegration();
    integration.initialize(appContext);
    return integration;
}

/**
 * 重置DiagramModeIntegration单例
 */
export function resetDiagramModeIntegration() {
    if (integrationInstance) {
        integrationInstance.destroy();
    }
    integrationInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.DiagramModeIntegration = DiagramModeIntegration;
    window.initializeDiagramMode = initializeDiagramMode;
    window.getDiagramModeIntegration = getDiagramModeIntegration;
}
