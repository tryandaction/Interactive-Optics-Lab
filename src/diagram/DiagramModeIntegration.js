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
// 专业绘图模式新模块
import { getProfessionalIconManager } from './ProfessionalIconManager.js';
import { registerProfessionalIcons } from './ProfessionalIconLibrary.js';
import { getConnectionPointManager } from './ConnectionPointManager.js';
import { getRayLinkManager } from './RayLinkManager.js';
import { getIconBrowserPanel } from './IconBrowserPanel.js';
import { getProfessionalLabelManager } from './ProfessionalLabelSystem.js';
import { getTechnicalNotesArea } from './TechnicalNotesArea.js';
import { getInteractionManager } from './InteractionManager.js';
import { getDiagramTemplateManager, TemplateBrowserPanel } from './DiagramTemplateSystem.js';
import { getCustomConnectionPointEditor } from './CustomConnectionPointEditor.js';
import { getMinimap } from './Minimap.js';

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
            batchExportManager: null,
            // 专业绘图模式新模块
            professionalIconManager: null,
            connectionPointManager: null,
            rayLinkManager: null,
            iconBrowserPanel: null,
            professionalLabelManager: null,
            technicalNotesArea: null,
            interactionManager: null,
            templateManager: null,
            templateBrowser: null,
            customConnectionPointEditor: null,
            minimap: null
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
        
        // 初始化专业绘图模式新模块
        this.modules.professionalIconManager = getProfessionalIconManager();
        this.modules.connectionPointManager = getConnectionPointManager();
        this.modules.rayLinkManager = getRayLinkManager();
        this.modules.professionalLabelManager = getProfessionalLabelManager();
        this.modules.technicalNotesArea = getTechnicalNotesArea();
        
        // 初始化图标浏览器（带回调）
        this.modules.iconBrowserPanel = getIconBrowserPanel({
            onIconSelect: (iconType) => this._handleIconSelect(iconType),
            onIconDragStart: (iconType, e) => this._handleIconDragStart(iconType, e)
        });
        
        // 初始化交互管理器
        this.modules.interactionManager = getInteractionManager();
        this._setupInteractionEvents();
        
        // 初始化自定义连接点编辑器
        this.modules.customConnectionPointEditor = getCustomConnectionPointEditor({
            onPointAdded: (point, component) => {
                console.log('DiagramModeIntegration: Custom point added', point);
                this._triggerRedraw();
            },
            onPointRemoved: (point, component) => {
                console.log('DiagramModeIntegration: Custom point removed', point);
                this._triggerRedraw();
            },
            onPointUpdated: (point, component) => {
                console.log('DiagramModeIntegration: Custom point updated', point);
                this._triggerRedraw();
            }
        });
        
        // 初始化模板系统
        this.modules.templateManager = getDiagramTemplateManager();
        this.modules.templateBrowser = new TemplateBrowserPanel({
            manager: this.modules.templateManager,
            onSelect: (template) => console.log('Template selected:', template.name),
            onApply: (template) => this._applyTemplate(template)
        });
        
        // 初始化小地图
        this.modules.minimap = getMinimap({
            position: 'bottom-right',
            onViewportChange: (newPos) => {
                // 更新相机位置
                if (typeof window !== 'undefined') {
                    if (window.cameraOffset) {
                        window.cameraOffset.x = -newPos.x;
                        window.cameraOffset.y = -newPos.y;
                    }
                    this._triggerRedraw();
                }
            }
        });
        
        // 注册专业SVG图标
        registerProfessionalIcons();
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
     * 设置交互事件监听
     * @private
     */
    _setupInteractionEvents() {
        if (typeof document === 'undefined') return;
        
        const interactionManager = this.modules.interactionManager;
        if (!interactionManager) return;
        
        // 监听粘贴事件
        const pasteHandler = (e) => {
            const { items, links } = e.detail;
            if (items && items.length > 0) {
                // 添加粘贴的组件到场景
                if (window.components) {
                    items.forEach(item => {
                        window.components.push(item);
                    });
                }
                // 添加粘贴的链接
                if (links && links.length > 0 && this.modules.rayLinkManager) {
                    links.forEach(link => {
                        this.modules.rayLinkManager.links.set(link.id, link);
                    });
                }
                this._triggerRedraw();
            }
        };
        document.addEventListener('diagram-paste', pasteHandler);
        this.cleanupFunctions.push(() => document.removeEventListener('diagram-paste', pasteHandler));
        
        // 监听删除选中事件
        const deleteHandler = (e) => {
            const { items } = e.detail;
            if (items && items.length > 0 && window.components) {
                const itemIds = items.map(i => i.id || i.uuid);
                window.components = window.components.filter(c => 
                    !itemIds.includes(c.id || c.uuid)
                );
                // 删除相关链接
                if (this.modules.rayLinkManager) {
                    itemIds.forEach(id => {
                        this.modules.rayLinkManager.removeLinksForComponent(id);
                    });
                }
                this._triggerRedraw();
            }
        };
        document.addEventListener('diagram-delete-selection', deleteHandler);
        this.cleanupFunctions.push(() => document.removeEventListener('diagram-delete-selection', deleteHandler));
        
        // 监听全选事件
        const selectAllHandler = () => {
            if (window.components && interactionManager.selection) {
                window.components.forEach(c => {
                    interactionManager.selection.select(c, true);
                });
            }
        };
        document.addEventListener('diagram-select-all', selectAllHandler);
        this.cleanupFunctions.push(() => document.removeEventListener('diagram-select-all', selectAllHandler));
        
        // 监听撤销事件
        const undoHandler = (e) => {
            const action = e.detail;
            this._applyUndoAction(action);
        };
        document.addEventListener('diagram-undo', undoHandler);
        this.cleanupFunctions.push(() => document.removeEventListener('diagram-undo', undoHandler));
        
        // 监听重做事件
        const redoHandler = (e) => {
            const action = e.detail;
            this._applyRedoAction(action);
        };
        document.addEventListener('diagram-redo', redoHandler);
        this.cleanupFunctions.push(() => document.removeEventListener('diagram-redo', redoHandler));
        
        console.log('DiagramModeIntegration: Interaction events setup complete');
    }

    /**
     * 应用撤销操作
     * @private
     */
    _applyUndoAction(action) {
        if (!action || !action.undoData) return;
        
        const { ActionType } = require('./InteractionManager.js');
        
        switch (action.type) {
            case ActionType.ADD_COMPONENT:
                // 撤销添加 = 删除
                if (window.components && action.data.componentId) {
                    window.components = window.components.filter(c => 
                        (c.id || c.uuid) !== action.data.componentId
                    );
                }
                break;
            case ActionType.DELETE_COMPONENT:
                // 撤销删除 = 恢复
                if (window.components && action.undoData.component) {
                    window.components.push(action.undoData.component);
                }
                break;
            case ActionType.MOVE_COMPONENT:
                // 撤销移动 = 恢复原位置
                if (window.components && action.undoData.position) {
                    const comp = window.components.find(c => 
                        (c.id || c.uuid) === action.data.componentId
                    );
                    if (comp) {
                        if (comp.pos) {
                            comp.pos.x = action.undoData.position.x;
                            comp.pos.y = action.undoData.position.y;
                        }
                    }
                }
                break;
        }
        
        this._triggerRedraw();
    }

    /**
     * 应用重做操作
     * @private
     */
    _applyRedoAction(action) {
        if (!action) return;
        
        const { ActionType } = require('./InteractionManager.js');
        
        switch (action.type) {
            case ActionType.ADD_COMPONENT:
                // 重做添加
                if (window.components && action.data.component) {
                    window.components.push(action.data.component);
                }
                break;
            case ActionType.DELETE_COMPONENT:
                // 重做删除
                if (window.components && action.data.componentId) {
                    window.components = window.components.filter(c => 
                        (c.id || c.uuid) !== action.data.componentId
                    );
                }
                break;
            case ActionType.MOVE_COMPONENT:
                // 重做移动
                if (window.components && action.data.position) {
                    const comp = window.components.find(c => 
                        (c.id || c.uuid) === action.data.componentId
                    );
                    if (comp) {
                        if (comp.pos) {
                            comp.pos.x = action.data.position.x;
                            comp.pos.y = action.data.position.y;
                        }
                    }
                }
                break;
        }
        
        this._triggerRedraw();
    }

    /**
     * 应用模板到场景
     * @private
     */
    _applyTemplate(template) {
        if (!template) return;
        
        console.log('DiagramModeIntegration: Applying template', template.name);
        
        // 确认是否清空当前场景
        const hasContent = window.components && window.components.length > 0;
        if (hasContent) {
            const confirmed = confirm(`应用模板"${template.name}"将替换当前场景内容，是否继续？`);
            if (!confirmed) return;
        }
        
        // 清空当前场景
        if (window.components) {
            window.components.length = 0;
        }
        
        // 清空光线链接
        if (this.modules.rayLinkManager) {
            this.modules.rayLinkManager.clear();
        }
        
        // 清空标注
        if (this.modules.professionalLabelManager) {
            this.modules.professionalLabelManager.clear();
        }
        
        // 添加模板组件
        if (template.components && window.components) {
            template.components.forEach(comp => {
                // 创建组件实例（简化版，实际需要根据类型创建）
                const component = {
                    ...comp,
                    id: comp.id,
                    uuid: comp.id,
                    type: comp.type,
                    pos: { ...comp.pos },
                    angle: comp.angle || 0,
                    params: { ...comp.params }
                };
                window.components.push(component);
            });
        }
        
        // 添加光线链接
        if (template.rayLinks && this.modules.rayLinkManager) {
            template.rayLinks.forEach(link => {
                this.modules.rayLinkManager.addLink({
                    ...link,
                    sourceComponentId: link.sourceComponentId,
                    sourcePointId: link.sourcePoint,
                    targetComponentId: link.targetComponentId,
                    targetPointId: link.targetPoint,
                    style: link.style || 'solid',
                    color: link.color || '#ff0000',
                    label: link.label || null
                });
            });
        }
        
        // 添加标注
        if (template.labels && this.modules.professionalLabelManager) {
            template.labels.forEach(label => {
                this.modules.professionalLabelManager.addLabel({
                    text: label.text,
                    position: { ...label.position },
                    targetId: label.targetId,
                    targetType: 'component',
                    color: label.color || '#ffffff'
                });
            });
        }
        
        // 设置技术说明
        if (template.technicalNotes && this.modules.technicalNotesArea) {
            this.modules.technicalNotesArea.clear();
            if (template.technicalNotes.sections) {
                template.technicalNotes.sections.forEach(section => {
                    this.modules.technicalNotesArea.addSection({
                        title: section.title,
                        color: section.color,
                        items: [...section.items]
                    });
                });
            }
            this.modules.technicalNotesArea.visible = true;
        }
        
        // 触发重绘
        this._triggerRedraw();
        
        console.log('DiagramModeIntegration: Template applied successfully');
    }

    /**
     * 保存当前场景为模板
     */
    saveAsTemplate(name, description = '') {
        if (!this.modules.templateManager) return null;
        
        const sceneData = {
            components: (window.components || []).map(c => ({
                id: c.id || c.uuid,
                type: c.type || c.constructor?.name,
                pos: c.pos ? { ...c.pos } : { x: c.x || 0, y: c.y || 0 },
                angle: c.angle || 0,
                params: c.params ? { ...c.params } : {}
            })),
            rayLinks: this.modules.rayLinkManager?.getAllLinks().map(l => l.serialize()) || [],
            labels: this.modules.professionalLabelManager?.getAllLabels().map(l => l.serialize()) || [],
            technicalNotes: this.modules.technicalNotesArea?.serialize() || null,
            groups: this.modules.interactionManager?.groups.serialize() || [],
            canvasSize: { width: 1200, height: 800 }
        };
        
        return this.modules.templateManager.createTemplateFromScene(name, description, sceneData);
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
                <button class="toolbar-btn" id="btn-icon-browser" title="图标库">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="5" height="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="9" y="2" width="5" height="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="2" y="9" width="5" height="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="9" y="9" width="5" height="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                    <span>图标</span>
                </button>
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
                <button class="toolbar-btn" id="btn-raylink" title="光线链接">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="3" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                        <circle cx="13" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M5 8h6" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M9 6l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>链接</span>
                </button>
                <button class="toolbar-btn" id="btn-connection-points" title="连接点编辑">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <circle cx="3" cy="8" r="2" fill="currentColor"/>
                        <circle cx="13" cy="8" r="2" fill="currentColor"/>
                        <circle cx="8" cy="3" r="2" fill="currentColor"/>
                        <circle cx="8" cy="13" r="2" fill="currentColor"/>
                    </svg>
                    <span>连接点</span>
                </button>
                <button class="toolbar-btn" id="btn-auto-route" title="自动布线">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="3" cy="3" r="2" stroke="currentColor" stroke-width="1.5"/>
                        <circle cx="13" cy="13" r="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M5 3h4v10h4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                    <span>布线</span>
                </button>
                <button class="toolbar-btn" id="btn-minimap" title="小地图">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="8" y="8" width="4" height="4" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.3"/>
                    </svg>
                    <span>地图</span>
                </button>
                <button class="toolbar-btn" id="btn-notes" title="技术说明">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>说明</span>
                </button>
                <button class="toolbar-btn" id="btn-template" title="模板库">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="5" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="9" y="2" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="2" y="10" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <rect x="9" y="8" width="5" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                    <span>模板</span>
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
            
            // 同步到全局showGrid变量（兼容主渲染循环）
            if (typeof window !== 'undefined') {
                window.showGrid = isActive;
            }
            
            // 触发重绘
            this._triggerRedraw();
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
        
        // 光线链接按钮
        toolbar.querySelector('#btn-raylink')?.addEventListener('click', (e) => {
            this._toggleRayLinkMode(e.currentTarget);
        });
        
        // 图标浏览器按钮
        toolbar.querySelector('#btn-icon-browser')?.addEventListener('click', (e) => {
            this.modules.iconBrowserPanel?.toggle(e.currentTarget);
        });
        
        // 技术说明按钮
        toolbar.querySelector('#btn-notes')?.addEventListener('click', () => {
            this._toggleTechnicalNotes();
        });
        
        // 模板库按钮
        toolbar.querySelector('#btn-template')?.addEventListener('click', () => {
            this.modules.templateBrowser?.toggle();
        });
        
        // 连接点编辑按钮
        toolbar.querySelector('#btn-connection-points')?.addEventListener('click', (e) => {
            this._openConnectionPointEditor(e.currentTarget);
        });
        
        // 自动布线按钮
        toolbar.querySelector('#btn-auto-route')?.addEventListener('click', (e) => {
            this._showAutoRoutingMenu(e.currentTarget);
        });
        
        // 小地图按钮
        toolbar.querySelector('#btn-minimap')?.addEventListener('click', (e) => {
            this._toggleMinimap(e.currentTarget);
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

        // 定位菜单 - 使用fixed定位确保不被遮挡
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '10001';

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
        const btn = document.querySelector('#btn-annotation');
        if (!btn) return;
        
        const isActive = btn.classList.toggle('active');
        
        if (isActive) {
            // 进入标注模式
            this._annotationModeActive = true;
            document.body.style.cursor = 'crosshair';
            
            // 添加画布点击监听
            this._annotationClickHandler = (e) => {
                const canvas = document.getElementById('opticsCanvas');
                if (!canvas) return;
                
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // 创建标注输入框
                this._showAnnotationInput(x, y, rect);
            };
            
            const canvas = document.getElementById('opticsCanvas');
            if (canvas) {
                canvas.addEventListener('click', this._annotationClickHandler);
            }
            
            console.log('DiagramModeIntegration: Annotation mode enabled');
        } else {
            // 退出标注模式
            this._annotationModeActive = false;
            document.body.style.cursor = '';
            
            const canvas = document.getElementById('opticsCanvas');
            if (canvas && this._annotationClickHandler) {
                canvas.removeEventListener('click', this._annotationClickHandler);
            }
            
            console.log('DiagramModeIntegration: Annotation mode disabled');
        }
    }

    /**
     * 显示标注输入框
     * @private
     */
    _showAnnotationInput(x, y, canvasRect) {
        // 移除已有的输入框
        const existingInput = document.querySelector('.annotation-input-container');
        if (existingInput) existingInput.remove();
        
        const container = document.createElement('div');
        container.className = 'annotation-input-container';
        container.style.cssText = `
            position: fixed;
            left: ${canvasRect.left + x}px;
            top: ${canvasRect.top + y}px;
            z-index: 10002;
            background: var(--dropdown-bg, #2d2d2d);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        container.innerHTML = `
            <input type="text" class="annotation-text-input" placeholder="输入标注文字..." style="
                width: 200px;
                padding: 6px 8px;
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                background: var(--input-bg, #343a40);
                color: var(--text-color, #fff);
                font-size: 13px;
                outline: none;
            ">
            <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="annotation-cancel-btn" style="
                    padding: 4px 12px;
                    border: 1px solid var(--border-color, #444);
                    border-radius: 4px;
                    background: transparent;
                    color: var(--text-color, #fff);
                    cursor: pointer;
                    font-size: 12px;
                ">取消</button>
                <button class="annotation-confirm-btn" style="
                    padding: 4px 12px;
                    border: none;
                    border-radius: 4px;
                    background: var(--primary-color, #0078d4);
                    color: #fff;
                    cursor: pointer;
                    font-size: 12px;
                ">添加</button>
            </div>
        `;
        
        document.body.appendChild(container);
        
        const input = container.querySelector('.annotation-text-input');
        input.focus();
        
        // 确认添加标注
        const confirmAdd = () => {
            const text = input.value.trim();
            if (text && this.modules.annotationManager) {
                this.modules.annotationManager.addAnnotation({
                    text,
                    position: { x, y },
                    style: {
                        fontSize: 14,
                        color: '#ffffff'
                    }
                });
                this._triggerRedraw();
            }
            container.remove();
        };
        
        container.querySelector('.annotation-confirm-btn').addEventListener('click', confirmAdd);
        container.querySelector('.annotation-cancel-btn').addEventListener('click', () => container.remove());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmAdd();
            if (e.key === 'Escape') container.remove();
        });
        
        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', function closeInput(e) {
                if (!container.contains(e.target)) {
                    container.remove();
                    document.removeEventListener('click', closeInput);
                }
            });
        }, 100);
    }

    /**
     * 显示样式面板
     * @private
     */
    _showStylePanel() {
        // 检查是否已有样式面板
        const existingPanel = document.querySelector('.style-panel-overlay');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'style-panel-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const panel = document.createElement('div');
        panel.className = 'style-panel';
        panel.style.cssText = `
            background: var(--panel-bg, #212529);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 400px;
            max-height: 80vh;
            overflow: auto;
        `;
        
        const rayStyleManager = this.modules.rayStyleManager;
        const currentScheme = rayStyleManager?.getCurrentScheme?.() || 'DEFAULT';
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color, #444);">
                <h3 style="margin: 0; font-size: 16px; color: var(--text-color, #fff);">样式设置</h3>
                <button class="style-panel-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-color-secondary, #888);">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-color-secondary, #888);">配色方案</label>
                    <select class="color-scheme-select" style="
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid var(--border-color, #444);
                        border-radius: 4px;
                        background: var(--input-bg, #343a40);
                        color: var(--text-color, #fff);
                        font-size: 13px;
                    ">
                        <option value="DEFAULT" ${currentScheme === 'DEFAULT' ? 'selected' : ''}>默认配色</option>
                        <option value="PUBLICATION" ${currentScheme === 'PUBLICATION' ? 'selected' : ''}>论文发表</option>
                        <option value="PRESENTATION" ${currentScheme === 'PRESENTATION' ? 'selected' : ''}>演示文稿</option>
                        <option value="COLORBLIND" ${currentScheme === 'COLORBLIND' ? 'selected' : ''}>色盲友好</option>
                        <option value="MONOCHROME" ${currentScheme === 'MONOCHROME' ? 'selected' : ''}>单色</option>
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-color-secondary, #888);">默认线宽</label>
                    <input type="range" class="line-width-slider" min="1" max="5" step="0.5" value="2" style="width: 100%;">
                    <span class="line-width-value" style="font-size: 12px; color: var(--text-color-secondary, #888);">2px</span>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-color-secondary, #888);">线条样式</label>
                    <div style="display: flex; gap: 8px;">
                        <button class="line-style-btn" data-style="solid" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid var(--border-color, #444);
                            border-radius: 4px;
                            background: var(--primary-color, #0078d4);
                            color: #fff;
                            cursor: pointer;
                            font-size: 12px;
                        ">实线</button>
                        <button class="line-style-btn" data-style="dashed" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid var(--border-color, #444);
                            border-radius: 4px;
                            background: transparent;
                            color: var(--text-color, #fff);
                            cursor: pointer;
                            font-size: 12px;
                        ">虚线</button>
                        <button class="line-style-btn" data-style="dotted" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid var(--border-color, #444);
                            border-radius: 4px;
                            background: transparent;
                            color: var(--text-color, #fff);
                            cursor: pointer;
                            font-size: 12px;
                        ">点线</button>
                    </div>
                </div>
            </div>
            <div style="padding: 16px 20px; border-top: 1px solid var(--border-color, #444); display: flex; justify-content: flex-end; gap: 8px;">
                <button class="style-panel-apply" style="
                    padding: 8px 20px;
                    border: none;
                    border-radius: 4px;
                    background: var(--primary-color, #0078d4);
                    color: #fff;
                    cursor: pointer;
                    font-size: 13px;
                ">应用</button>
            </div>
        `;
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        // 绑定事件
        panel.querySelector('.style-panel-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        // 配色方案切换
        panel.querySelector('.color-scheme-select').addEventListener('change', (e) => {
            if (rayStyleManager?.setColorScheme) {
                rayStyleManager.setColorScheme(e.target.value);
            }
        });
        
        // 线宽滑块
        const lineWidthSlider = panel.querySelector('.line-width-slider');
        const lineWidthValue = panel.querySelector('.line-width-value');
        lineWidthSlider.addEventListener('input', (e) => {
            lineWidthValue.textContent = `${e.target.value}px`;
        });
        
        // 线条样式按钮
        panel.querySelectorAll('.line-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.line-style-btn').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-color, #fff)';
                });
                btn.style.background = 'var(--primary-color, #0078d4)';
                btn.style.color = '#fff';
            });
        });
        
        // 应用按钮
        panel.querySelector('.style-panel-apply').addEventListener('click', () => {
            this._triggerRedraw();
            overlay.remove();
        });
        
        console.log('DiagramModeIntegration: Style panel opened');
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
        
        // 启用连接点显示
        if (this.modules.connectionPointManager) {
            this.modules.connectionPointManager.visible = true;
        }
        
        // 显示小地图
        if (this.modules.minimap) {
            this.modules.minimap.show();
        }
    }

    /**
     * 退出绘图模式
     * @private
     */
    _exitDiagramMode() {
        // 禁用布局引擎功能
        this.modules.layoutEngine.setShowGrid(false);
        this.modules.layoutEngine.clearAlignmentGuides();
        
        // 禁用连接点显示
        if (this.modules.connectionPointManager) {
            this.modules.connectionPointManager.visible = false;
        }
        
        // 取消光线链接模式
        this._rayLinkModeActive = false;
        if (this.modules.rayLinkManager) {
            this.modules.rayLinkManager.cancelLinkCreation();
        }
        
        // 隐藏小地图
        if (this.modules.minimap) {
            this.modules.minimap.hide();
        }
    }

    /**
     * 切换小地图显示
     * @private
     */
    _toggleMinimap(btn) {
        if (!this.modules.minimap) return;
        
        this.modules.minimap.toggle();
        
        if (btn) {
            btn.classList.toggle('active', this.modules.minimap.visible);
        }
    }

    /**
     * 更新小地图
     * 在主渲染循环中调用
     */
    updateMinimap(components, links, viewport) {
        if (!this.modules.minimap || !this.modules.minimap.visible) return;
        
        this.modules.minimap.updateSceneBounds(components);
        
        if (viewport) {
            this.modules.minimap.updateViewport(
                viewport.x, viewport.y,
                viewport.width, viewport.height,
                viewport.scale || 1
            );
        }
        
        const allLinks = this.modules.rayLinkManager?.getAllLinks() || [];
        this.modules.minimap.render(components, allLinks);
    }

    /**
     * 切换光线链接模式
     * @private
     */
    _toggleRayLinkMode(btn) {
        if (!btn) return;
        
        const isActive = btn.classList.toggle('active');
        this._rayLinkModeActive = isActive;
        
        if (isActive) {
            document.body.style.cursor = 'crosshair';
            console.log('DiagramModeIntegration: Ray link mode enabled');
        } else {
            document.body.style.cursor = '';
            if (this.modules.rayLinkManager) {
                this.modules.rayLinkManager.cancelLinkCreation();
            }
            console.log('DiagramModeIntegration: Ray link mode disabled');
        }
    }

    /**
     * 打开连接点编辑器
     * @private
     */
    _openConnectionPointEditor(anchorElement) {
        // 获取当前选中的组件
        const selectedComponents = this._getSelectedComponents();
        
        if (selectedComponents.length === 0) {
            // 如果没有选中组件，提示用户
            alert('请先选择一个组件来编辑其连接点');
            return;
        }
        
        if (selectedComponents.length > 1) {
            alert('请只选择一个组件来编辑连接点');
            return;
        }
        
        const component = selectedComponents[0];
        
        // 打开编辑器
        if (this.modules.customConnectionPointEditor) {
            this.modules.customConnectionPointEditor.toggle(component, anchorElement);
        }
    }

    /**
     * 显示自动布线菜单
     * @private
     */
    _showAutoRoutingMenu(button) {
        const existingMenu = document.querySelector('.auto-route-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        
        const menu = document.createElement('div');
        menu.className = 'auto-route-menu dropdown-menu';
        menu.innerHTML = `
            <div class="menu-section">
                <div class="menu-label">布线样式</div>
                <button data-style="orthogonal">正交布线</button>
                <button data-style="diagonal">对角线布线</button>
                <button data-style="direct">直线布线</button>
                <button data-style="curved">曲线布线</button>
            </div>
            <hr>
            <div class="menu-section">
                <div class="menu-label">操作</div>
                <button data-action="apply-all">应用到所有链接</button>
                <button data-action="apply-selected">应用到选中链接</button>
                <button data-action="clear-all">清除所有布线</button>
            </div>
        `;
        
        // 定位菜单
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '10001';
        
        document.body.appendChild(menu);
        
        // 绑定事件
        menu.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const style = btn.dataset.style;
            const action = btn.dataset.action;
            
            if (style) {
                this._setAutoRoutingStyle(style);
            } else if (action) {
                this._executeAutoRoutingAction(action);
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
     * 设置自动布线样式
     * @private
     */
    _setAutoRoutingStyle(style) {
        if (this.modules.rayLinkManager) {
            this.modules.rayLinkManager.setAutoRoutingStyle(style);
            console.log(`DiagramModeIntegration: Auto-routing style set to ${style}`);
        }
    }

    /**
     * 执行自动布线操作
     * @private
     */
    _executeAutoRoutingAction(action) {
        const rayLinkManager = this.modules.rayLinkManager;
        if (!rayLinkManager) return;
        
        const components = window.components || [];
        
        switch (action) {
            case 'apply-all':
                const countAll = rayLinkManager.applyAutoRoutingToAll(components);
                console.log(`DiagramModeIntegration: Applied auto-routing to ${countAll} links`);
                break;
                
            case 'apply-selected':
                if (rayLinkManager.selectedLink) {
                    rayLinkManager.applyAutoRouting(rayLinkManager.selectedLink.id, components);
                    console.log('DiagramModeIntegration: Applied auto-routing to selected link');
                } else {
                    alert('请先选择一个光线链接');
                }
                break;
                
            case 'clear-all':
                rayLinkManager.clearAllAutoRouting();
                console.log('DiagramModeIntegration: Cleared all auto-routing');
                break;
        }
        
        this._triggerRedraw();
    }

    /**
     * 渲染专业绘图模式元素
     * 在主渲染循环中调用
     */
    renderProfessionalDiagram(ctx, components, canvasWidth, canvasHeight) {
        if (!this.isDiagramMode()) return;
        
        // 渲染连接点
        if (this.modules.connectionPointManager?.visible) {
            this.modules.connectionPointManager.render(ctx, components);
        }
        
        // 渲染光线链接
        if (this.modules.rayLinkManager) {
            this.modules.rayLinkManager.render(ctx);
        }
        
        // 渲染专业标注
        if (this.modules.professionalLabelManager) {
            this.modules.professionalLabelManager.render(ctx, (targetId, targetType) => {
                // 获取目标位置的回调
                if (targetType === 'component') {
                    const comp = components.find(c => (c.id || c.uuid) === targetId);
                    if (comp) {
                        return comp.pos || { x: comp.x || 0, y: comp.y || 0 };
                    }
                }
                return null;
            });
        }
        
        // 渲染技术说明区域
        if (this.modules.technicalNotesArea?.visible && canvasWidth && canvasHeight) {
            this.modules.technicalNotesArea.render(ctx, canvasWidth, canvasHeight);
        }
        
        // 渲染交互元素（选择框、选中高亮等）
        if (this.modules.interactionManager) {
            this.modules.interactionManager.render(ctx);
        }
    }

    /**
     * 使用专业图标渲染组件
     */
    renderComponentWithProfessionalIcon(ctx, component) {
        if (!this.modules.professionalIconManager) return false;
        
        const componentType = component.type || component.constructor?.name;
        if (!this.modules.professionalIconManager.hasIcon(componentType)) {
            return false;
        }
        
        const pos = component.pos || { x: component.x || 0, y: component.y || 0 };
        const angle = component.angle || 0;
        const scale = component.scale || 1;
        
        this.modules.professionalIconManager.renderIcon(
            ctx, componentType, pos.x, pos.y, angle, scale
        );
        
        return true;
    }

    /**
     * 处理图标选择
     * @private
     */
    _handleIconSelect(iconType) {
        console.log(`DiagramModeIntegration: Icon selected - ${iconType}`);
        
        // 触发自定义事件，让主应用处理组件添加
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('diagram-icon-selected', {
                detail: { iconType }
            }));
        }
        
        // 关闭图标浏览器
        this.modules.iconBrowserPanel?.close();
    }

    /**
     * 处理图标拖拽开始
     * @private
     */
    _handleIconDragStart(iconType, event) {
        console.log(`DiagramModeIntegration: Icon drag started - ${iconType}`);
    }

    /**
     * 切换技术说明显示
     * @private
     */
    _toggleTechnicalNotes() {
        const notesArea = this.modules.technicalNotesArea;
        if (!notesArea) return;
        
        notesArea.visible = !notesArea.visible;
        
        // 更新按钮状态
        const btn = document.querySelector('#btn-notes');
        if (btn) {
            btn.classList.toggle('active', notesArea.visible);
        }
        
        // 如果没有内容，添加示例
        if (notesArea.visible && notesArea.getAllSections().length === 0) {
            this._showTechnicalNotesEditor();
        }
        
        this._triggerRedraw();
    }

    /**
     * 显示技术说明编辑器
     * @private
     */
    _showTechnicalNotesEditor() {
        const existingEditor = document.querySelector('.technical-notes-editor');
        if (existingEditor) {
            existingEditor.remove();
            return;
        }
        
        const editor = document.createElement('div');
        editor.className = 'technical-notes-editor';
        editor.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-height: 80vh;
            background: var(--panel-bg, #1e1e1e);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 10003;
            overflow: hidden;
        `;
        
        editor.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color, #333);">
                <h3 style="margin: 0; font-size: 14px; color: var(--text-primary, #fff);">技术说明编辑</h3>
                <button class="notes-editor-close" style="background: none; border: none; font-size: 20px; color: var(--text-secondary, #888); cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 16px; max-height: 400px; overflow-y: auto;">
                <div class="notes-sections-list"></div>
                <button class="add-section-btn" style="
                    width: 100%;
                    padding: 10px;
                    margin-top: 12px;
                    border: 1px dashed var(--border-color, #444);
                    border-radius: 6px;
                    background: transparent;
                    color: var(--text-secondary, #888);
                    cursor: pointer;
                    font-size: 13px;
                ">+ 添加说明节</button>
            </div>
            <div style="padding: 12px 16px; border-top: 1px solid var(--border-color, #333); display: flex; gap: 8px; justify-content: flex-end;">
                <button class="notes-template-btn" style="
                    padding: 8px 16px;
                    border: 1px solid var(--border-color, #444);
                    border-radius: 4px;
                    background: transparent;
                    color: var(--text-primary, #fff);
                    cursor: pointer;
                    font-size: 13px;
                ">使用模板</button>
                <button class="notes-apply-btn" style="
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    background: var(--accent-color, #0078d4);
                    color: #fff;
                    cursor: pointer;
                    font-size: 13px;
                ">应用</button>
            </div>
        `;
        
        document.body.appendChild(editor);
        
        // 渲染现有节
        this._renderNoteSections(editor);
        
        // 绑定事件
        editor.querySelector('.notes-editor-close')?.addEventListener('click', () => editor.remove());
        editor.querySelector('.add-section-btn')?.addEventListener('click', () => {
            this._addNoteSection(editor);
        });
        editor.querySelector('.notes-template-btn')?.addEventListener('click', () => {
            this._showTemplateSelector(editor);
        });
        editor.querySelector('.notes-apply-btn')?.addEventListener('click', () => {
            editor.remove();
            this._triggerRedraw();
        });
    }

    /**
     * 渲染说明节列表
     * @private
     */
    _renderNoteSections(editor) {
        const list = editor.querySelector('.notes-sections-list');
        if (!list) return;
        
        const sections = this.modules.technicalNotesArea?.getAllSections() || [];
        
        if (sections.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary, #888); text-align: center; padding: 20px;">暂无说明节，点击下方按钮添加</p>';
            return;
        }
        
        list.innerHTML = sections.map(section => `
            <div class="note-section-item" data-id="${section.id}" style="
                padding: 12px;
                margin-bottom: 8px;
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--item-bg, #252526);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <input type="text" value="${section.title}" class="section-title-input" style="
                        flex: 1;
                        padding: 4px 8px;
                        border: 1px solid transparent;
                        border-radius: 4px;
                        background: transparent;
                        color: ${section.color};
                        font-weight: bold;
                        font-size: 13px;
                    ">
                    <input type="color" value="${section.color}" class="section-color-input" style="
                        width: 24px;
                        height: 24px;
                        border: none;
                        cursor: pointer;
                    ">
                    <button class="delete-section-btn" style="
                        margin-left: 8px;
                        padding: 4px 8px;
                        border: none;
                        background: transparent;
                        color: var(--text-secondary, #888);
                        cursor: pointer;
                    ">✕</button>
                </div>
                <div class="section-items">
                    ${section.items.map((item, idx) => `
                        <div class="section-item" style="display: flex; gap: 8px; margin-bottom: 4px;">
                            <input type="text" value="${item}" class="item-input" data-index="${idx}" style="
                                flex: 1;
                                padding: 4px 8px;
                                border: 1px solid var(--border-color, #444);
                                border-radius: 4px;
                                background: var(--input-bg, #2d2d2d);
                                color: var(--text-primary, #fff);
                                font-size: 12px;
                            ">
                            <button class="delete-item-btn" data-index="${idx}" style="
                                padding: 4px 8px;
                                border: none;
                                background: transparent;
                                color: var(--text-secondary, #888);
                                cursor: pointer;
                            ">✕</button>
                        </div>
                    `).join('')}
                </div>
                <button class="add-item-btn" style="
                    width: 100%;
                    padding: 6px;
                    margin-top: 8px;
                    border: 1px dashed var(--border-color, #444);
                    border-radius: 4px;
                    background: transparent;
                    color: var(--text-secondary, #888);
                    cursor: pointer;
                    font-size: 11px;
                ">+ 添加项目</button>
            </div>
        `).join('');
        
        // 绑定节事件
        this._bindNoteSectionEvents(editor);
    }

    /**
     * 绑定说明节事件
     * @private
     */
    _bindNoteSectionEvents(editor) {
        const notesArea = this.modules.technicalNotesArea;
        if (!notesArea) return;
        
        // 标题修改
        editor.querySelectorAll('.section-title-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sectionId = e.target.closest('.note-section-item').dataset.id;
                const section = notesArea.getSection(sectionId);
                if (section) section.title = e.target.value;
            });
        });
        
        // 颜色修改
        editor.querySelectorAll('.section-color-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sectionId = e.target.closest('.note-section-item').dataset.id;
                const section = notesArea.getSection(sectionId);
                if (section) {
                    section.color = e.target.value;
                    e.target.closest('.note-section-item').querySelector('.section-title-input').style.color = e.target.value;
                }
            });
        });
        
        // 删除节
        editor.querySelectorAll('.delete-section-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.target.closest('.note-section-item').dataset.id;
                notesArea.removeSection(sectionId);
                this._renderNoteSections(editor);
            });
        });
        
        // 项目修改
        editor.querySelectorAll('.item-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sectionId = e.target.closest('.note-section-item').dataset.id;
                const section = notesArea.getSection(sectionId);
                const index = parseInt(e.target.dataset.index);
                if (section) section.updateItem(index, e.target.value);
            });
        });
        
        // 删除项目
        editor.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.target.closest('.note-section-item').dataset.id;
                const section = notesArea.getSection(sectionId);
                const index = parseInt(e.target.dataset.index);
                if (section) {
                    section.removeItem(index);
                    this._renderNoteSections(editor);
                }
            });
        });
        
        // 添加项目
        editor.querySelectorAll('.add-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.target.closest('.note-section-item').dataset.id;
                const section = notesArea.getSection(sectionId);
                if (section) {
                    section.addItem('新项目');
                    this._renderNoteSections(editor);
                }
            });
        });
    }

    /**
     * 添加说明节
     * @private
     */
    _addNoteSection(editor) {
        const notesArea = this.modules.technicalNotesArea;
        if (!notesArea) return;
        
        notesArea.addSection({
            title: '新说明节',
            color: '#cc0000',
            items: ['项目1']
        });
        
        this._renderNoteSections(editor);
    }

    /**
     * 显示模板选择器
     * @private
     */
    _showTemplateSelector(editor) {
        const templates = [
            { name: '饱和吸收光谱', key: 'saturated-absorption' },
            { name: '磁光阱 (MOT)', key: 'mot' },
            { name: 'Mach-Zehnder干涉仪', key: 'mach-zehnder' }
        ];
        
        const selector = document.createElement('div');
        selector.style.cssText = `
            position: absolute;
            bottom: 60px;
            left: 16px;
            background: var(--menu-bg, #2d2d2d);
            border: 1px solid var(--border-color, #444);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10004;
        `;
        
        selector.innerHTML = templates.map(t => `
            <button class="template-option" data-key="${t.key}" style="
                display: block;
                width: 100%;
                padding: 10px 16px;
                border: none;
                background: transparent;
                color: var(--text-primary, #fff);
                text-align: left;
                cursor: pointer;
                font-size: 13px;
            ">${t.name}</button>
        `).join('');
        
        editor.appendChild(selector);
        
        selector.addEventListener('click', (e) => {
            const btn = e.target.closest('.template-option');
            if (btn) {
                const { TechnicalNotesArea } = require('./TechnicalNotesArea.js');
                const template = TechnicalNotesArea.createTemplate(btn.dataset.key);
                
                // 复制模板内容到当前实例
                const notesArea = this.modules.technicalNotesArea;
                notesArea.clear();
                template.getAllSections().forEach(section => {
                    notesArea.sections.set(section.id, section);
                });
                
                this._renderNoteSections(editor);
                selector.remove();
            }
        });
        
        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', function close(e) {
                if (!selector.contains(e.target)) {
                    selector.remove();
                    document.removeEventListener('click', close);
                }
            });
        }, 0);
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
        
        // 销毁交互管理器
        if (this.modules.interactionManager) {
            this.modules.interactionManager.destroy();
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
