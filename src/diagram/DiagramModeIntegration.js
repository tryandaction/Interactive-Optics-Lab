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
import { registerExtendedIcons } from './ProfessionalIconLibraryExtended.js';
import { getConnectionPointManager } from './ConnectionPointManager.js';
import { getRayLinkManager } from './RayLinkManager.js';
import { getIconBrowserPanel } from './IconBrowserPanel.js';
import { getProfessionalLabelManager, LABEL_COLOR_PRESETS } from './ProfessionalLabelSystem.js';
import { getTechnicalNotesArea, TechnicalNotesArea } from './TechnicalNotesArea.js';
import { getInteractionManager, ActionType } from './InteractionManager.js';
import { getAdvancedTemplateManager, TemplateBrowser } from './templates/index.js';
import { getCustomConnectionPointEditor } from './CustomConnectionPointEditor.js';
import { getMinimap } from './Minimap.js';
import { getDiagnosticSystem } from './DiagnosticSystem.js';
import { getStyleManager } from './styling/StyleManager.js';
import { getThemeManager } from './styling/ThemeManager.js';
import { getPluginManager } from './plugins/PluginManager.js';

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
            minimap: null,
            styleManager: null,
            themeManager: null,
            pluginManager: null
        };
        
        /** @type {HTMLElement|null} */
        this.toolbarContainer = null;
        
        /** @type {HTMLElement|null} */
        this.panelContainer = null;
        
        /** @type {Array<Function>} 清理函数 */
        this.cleanupFunctions = [];

        /** @type {Object|null} 绘图模式状态缓存 */
        this.diagramModeState = null;

        /** @type {boolean} 本次进入绘图模式是否已恢复状态 */
        this._diagramStateRestored = false;
        
        /** @type {DiagnosticSystem} 诊断系统 */
        this.diagnosticSystem = getDiagnosticSystem();
    }

    /**
     * 初始化集成
     * @param {Object} appContext - 应用上下文
     */
    initialize(appContext = {}) {
        if (this.initialized) {
            console.warn('DiagramModeIntegration: Already initialized');
            this.diagnosticSystem.log('warning', 'DiagramModeIntegration already initialized');
            return;
        }

        console.log('DiagramModeIntegration: Initializing...');
        this.diagnosticSystem.log('info', 'DiagramModeIntegration initialization started');

        // 初始化所有模块
        this._initializeModules(appContext);
        
        // 设置模式切换监听
        this._setupModeChangeListener();
        
        // 创建UI组件
        this._createUIComponents();
        
        // 注入样式
        this._injectStyles();

        // 导出插件注册接口
        if (typeof window !== 'undefined') {
            window.registerDiagramPlugin = (plugin) => this.registerToolbarPlugin(plugin);
            window.unregisterDiagramPlugin = (pluginId) => this.unregisterToolbarPlugin(pluginId);
        }
        
        this.initialized = true;
        console.log('DiagramModeIntegration: Initialization complete');
        this.diagnosticSystem.log('info', 'DiagramModeIntegration initialization complete');

        // 如果当前已经是绘图模式（例如从localStorage恢复），立即进入绘图模式
        if (this.modules.modeManager && this.modules.modeManager.isDiagramMode()) {
            console.log('DiagramModeIntegration: Already in diagram mode, entering...');
            this._updateUIVisibility(APP_MODES.DIAGRAM);
            this._updateToolbarIcons(APP_MODES.DIAGRAM);
            this._handleModeChange(APP_MODES.SIMULATION, APP_MODES.DIAGRAM);
        }
        
        // 运行初始诊断
        setTimeout(() => {
            const report = this.diagnosticSystem.runFullDiagnostic();
            console.log('Initial Diagnostic Report:', report);
        }, 1000);
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
                    this._handleModeChange(oldMode, newMode);
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
        this.modules.templateManager = getAdvancedTemplateManager();
        this.modules.templateBrowser = new TemplateBrowser({
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

        // 初始化样式与主题管理器
        this.modules.styleManager = getStyleManager();
        this.modules.themeManager = getThemeManager();

        // 初始化插件管理器
        this.modules.pluginManager = getPluginManager();
        
        // 注册专业SVG图标
        registerProfessionalIcons();
        registerExtendedIcons();
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
                
                // 更新左侧栏图标
                this._updateToolbarIcons(newMode);
                
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
     * 更新左侧工具栏图标
     * 在绘图模式下使用专业图标，在模拟模式下使用原始图标
     * @private
     */
    _updateToolbarIcons(mode) {
        if (typeof document === 'undefined') return;
        
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) return;
        
        const isDiagramMode = mode === APP_MODES.DIAGRAM;
        const buttons = toolbar.querySelectorAll('button[data-type]');
        
        buttons.forEach(btn => {
            const componentType = btn.dataset.type;
            const iconContainer = btn.querySelector('svg');
            
            if (isDiagramMode) {
                // 绘图模式：尝试使用专业图标
                btn.classList.add('professional-icon');
                
                // 检查是否有专业图标
                const hasIcon = this.modules.professionalIconManager?.hasIcon(componentType);
                
                // 创建或更新专业图标预览
                let preview = btn.querySelector('.professional-icon-preview');
                if (!preview) {
                    preview = document.createElement('canvas');
                    preview.className = 'professional-icon-preview';
                    preview.width = 48;  // 更高分辨率
                    preview.height = 48;
                    btn.insertBefore(preview, btn.firstChild);
                }
                
                // 渲染专业图标到canvas
                if (hasIcon) {
                    const ctx = preview.getContext('2d');
                    ctx.clearRect(0, 0, 48, 48);
                    const icon = this.modules.professionalIconManager.getIconDefinition(componentType);
                    const scale = Math.min(40 / (icon?.width || 60), 40 / (icon?.height || 60));
                    this.modules.professionalIconManager.renderIcon(ctx, componentType, 24, 24, 0, scale);
                    preview.style.display = 'block';
                    if (iconContainer) iconContainer.style.display = 'none';
                } else {
                    // 没有专业图标，使用原始SVG但添加绘图模式样式
                    preview.style.display = 'none';
                    if (iconContainer) iconContainer.style.display = '';
                }
            } else {
                // 模拟模式：使用原始图标
                btn.classList.remove('professional-icon');
                
                const professionalPreview = btn.querySelector('.professional-icon-preview');
                if (professionalPreview) professionalPreview.style.display = 'none';
                if (iconContainer) iconContainer.style.display = '';
            }
        });
        
        console.log(`DiagramModeIntegration: Toolbar icons updated for ${isDiagramMode ? 'diagram' : 'simulation'} mode`);
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
                const clone = (value) => {
                    try {
                        return JSON.parse(JSON.stringify(value));
                    } catch (err) {
                        return value;
                    }
                };
                const clonedItems = items.map(item => clone(item));
                const clonedLinks = (links || []).map(link => clone(link));
                
                // 添加粘贴的组件到场景
                if (window.components) {
                    const connectionPointManager = this.modules.connectionPointManager;
                    clonedItems.forEach(item => {
                        window.components.push(item);
                        if (connectionPointManager) {
                            const compId = item.id || item.uuid;
                            if (compId && !connectionPointManager.componentPoints.has(compId)) {
                                connectionPointManager.initializeComponentPoints(item);
                            }
                        }
                    });
                }
                // 添加粘贴的链接
                if (clonedLinks.length > 0 && this.modules.rayLinkManager) {
                    clonedLinks.forEach(link => {
                        if (!link) return;
                        this.modules.rayLinkManager.createLink({
                            ...link,
                            style: link.style ? { ...link.style } : undefined,
                            labelOffset: link.labelOffset ? { ...link.labelOffset } : undefined
                        });
                    });
                }
                
                // 记录历史（绘图模式）
                const interactionManager = this.modules.interactionManager;
                if (interactionManager) {
                    interactionManager.recordAction(
                        ActionType.ADD_COMPONENT,
                        { components: clonedItems, links: clonedLinks }
                    );
                    if (typeof window !== 'undefined') {
                        window.updateUndoRedoUI?.();
                        window.markSceneAsModified?.();
                    }
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
                const clone = (value) => {
                    try {
                        return JSON.parse(JSON.stringify(value));
                    } catch (err) {
                        return value;
                    }
                };
                const itemIds = items.map(i => i.id || i.uuid);
                const removedComponents = window.components
                    .filter(c => itemIds.includes(c.id || c.uuid))
                    .map(c => clone(c));
                const rayLinkManager = this.modules.rayLinkManager;
                const removedLinks = rayLinkManager
                    ? rayLinkManager.getAllLinks()
                        .filter(link => itemIds.includes(link.sourceComponentId) || itemIds.includes(link.targetComponentId))
                        .map(link => link.serialize())
                    : [];
                
                // 记录历史（绘图模式）
                const interactionManager = this.modules.interactionManager;
                if (interactionManager) {
                    interactionManager.recordAction(
                        ActionType.DELETE_COMPONENT,
                        { componentIds: itemIds },
                        { components: removedComponents, links: removedLinks }
                    );
                    if (typeof window !== 'undefined') {
                        window.updateUndoRedoUI?.();
                        window.markSceneAsModified?.();
                    }
                }
                
                window.components = window.components.filter(c =>
                    !itemIds.includes(c.id || c.uuid)
                );
                if (this.modules.connectionPointManager) {
                    itemIds.forEach(id => this.modules.connectionPointManager.removeComponentPoints(id));
                }
                // 删除相关链接
                if (rayLinkManager) {
                    itemIds.forEach(id => {
                        rayLinkManager.deleteLinksForComponent(id);
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
    _applyUndoAction(action, skipFinalize = false) {
        if (!action) return;

        switch (action.type) {
            case ActionType.BATCH: {
                const actions = action.data?.actions || [];
                if (Array.isArray(actions) && actions.length > 0) {
                    for (let i = actions.length - 1; i >= 0; i--) {
                        this._applyUndoAction(actions[i], true);
                    }
                }
                break;
            }
            case ActionType.ADD_COMPONENT:
                // 撤销添加 = 删除
                if (window.components) {
                    const ids = action.data?.componentIds
                        || (Array.isArray(action.data?.components)
                            ? action.data.components.map(c => c.id || c.uuid).filter(Boolean)
                            : action.data?.componentId ? [action.data.componentId] : []);
                    if (ids.length > 0) {
                        window.components = window.components.filter(c => !ids.includes(c.id || c.uuid));
                        this.modules.connectionPointManager?.removeComponentPoints && ids.forEach(id => {
                            this.modules.connectionPointManager.removeComponentPoints(id);
                        });
                    }
                }
                // 删除链接
                if (this.modules.rayLinkManager && Array.isArray(action.data?.links)) {
                    action.data.links.forEach(link => {
                        const linkId = link?.id;
                        if (linkId) this.modules.rayLinkManager.deleteLink(linkId);
                    });
                }
                if (this.modules.interactionManager?.selection) {
                    this.modules.interactionManager.selection.clearSelection();
                }
                break;
            case ActionType.DELETE_COMPONENT:
                // 撤销删除 = 恢复
                if (window.components && Array.isArray(action.undoData.components)) {
                    action.undoData.components.forEach(comp => {
                        const id = comp.id || comp.uuid;
                        const exists = window.components.some(c => (c.id || c.uuid) === id);
                        if (!exists) {
                            window.components.push(comp);
                            this.modules.connectionPointManager?.initializeComponentPoints?.(comp);
                        }
                    });
                } else if (window.components && action.undoData.component) {
                    window.components.push(action.undoData.component);
                    this.modules.connectionPointManager?.initializeComponentPoints?.(action.undoData.component);
                }
                if (Array.isArray(action.undoData.links) && this.modules.rayLinkManager) {
                    const connectionPointManager = this.modules.connectionPointManager;
                    if (connectionPointManager && Array.isArray(window.components)) {
                        window.components.forEach(comp => {
                            const compId = comp.id || comp.uuid;
                            if (!connectionPointManager.componentPoints.has(compId)) {
                                connectionPointManager.initializeComponentPoints(comp);
                            }
                        });
                    }
                    action.undoData.links.forEach(linkData => {
                        if (!linkData) return;
                        this.modules.rayLinkManager.createLink({
                            ...linkData,
                            style: linkData.style ? { ...linkData.style } : undefined
                        });
                    });
                }
                if (this.modules.interactionManager?.selection) {
                    this.modules.interactionManager.selection.clearSelection();
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
                        } else {
                            comp.x = action.undoData.position.x;
                            comp.y = action.undoData.position.y;
                        }
                        this.modules.connectionPointManager?.updateComponentPoints?.(comp);
                    }
                }
                break;
            case ActionType.ROTATE_COMPONENT:
                if (window.components && action.undoData?.angle !== undefined) {
                    const comp = window.components.find(c =>
                        (c.id || c.uuid) === action.data.componentId
                    );
                    if (comp) {
                        const nextAngle = action.undoData.angle;
                        if (comp.angleRad !== undefined) comp.angleRad = nextAngle;
                        if (comp.angle !== undefined) comp.angle = nextAngle;
                        if (typeof comp.onAngleChanged === 'function') comp.onAngleChanged();
                        else if (typeof comp._updateGeometry === 'function') comp._updateGeometry();
                        this.modules.connectionPointManager?.updateComponentPoints?.(comp);
                    }
                }
                break;
            case ActionType.ADD_LINK:
                if (this.modules.rayLinkManager && action.data?.link?.id) {
                    this.modules.rayLinkManager.deleteLink(action.data.link.id);
                }
                break;
            case ActionType.DELETE_LINK:
                if (this.modules.rayLinkManager && action.undoData?.link) {
                    const linkData = action.undoData.link;
                    this.modules.rayLinkManager.createLink({
                        ...linkData,
                        style: linkData.style ? { ...linkData.style } : undefined
                    });
                }
                break;
            case ActionType.ADD_LABEL: {
                const labelManager = this.modules.professionalLabelManager;
                const labelId = action.data?.label?.id || action.data?.labelId;
                if (labelManager && labelId) {
                    labelManager.deleteLabel?.(labelId);
                }
                break;
            }
            case ActionType.DELETE_LABEL: {
                const labelManager = this.modules.professionalLabelManager;
                const labelData = action.undoData?.label;
                if (labelManager && labelData) {
                    if (labelManager.createLabel) {
                        labelManager.createLabel(labelData);
                    } else if (labelManager.labels) {
                        labelManager.labels.set(labelData.id, labelData);
                    }
                }
                break;
            }
            case ActionType.MOVE_LABEL: {
                const labelManager = this.modules.professionalLabelManager;
                const labelId = action.data?.labelId;
                const pos = action.undoData?.position;
                if (labelManager && labelId && pos) {
                    const label = labelManager.labels?.get(labelId);
                    if (label) {
                        label.position.x = pos.x;
                        label.position.y = pos.y;
                    }
                }
                break;
            }
            case ActionType.MODIFY_STYLE: {
                const target = action.data?.target;
                const items = action.undoData?.items || [];
                if (target === 'component' && this.modules.styleManager) {
                    items.forEach(item => {
                        if (!item?.id) return;
                        if (item.style) {
                            this.modules.styleManager.setComponentStyle(item.id, item.style, false);
                        } else {
                            this.modules.styleManager.removeComponentStyle(item.id);
                        }
                    });
                } else if (target === 'link' && this.modules.rayLinkManager) {
                    items.forEach(item => {
                        const link = this.modules.rayLinkManager.getLink(item.id);
                        if (!link) return;
                        if (item.style) link.style = { ...item.style };
                        link.label = item.label ?? null;
                        if (item.labelPosition !== undefined) link.labelPosition = item.labelPosition;
                        if (item.labelOffset) link.labelOffset = { ...item.labelOffset };
                    });
                } else if (target === 'label' && this.modules.professionalLabelManager) {
                    items.forEach(item => {
                        const label = this.modules.professionalLabelManager.labels?.get(item.id);
                        if (!label) return;
                        if (item.text !== undefined) label.text = item.text;
                        if (item.style) label.style = { ...item.style };
                        if (item.leaderLine !== undefined) label.leaderLine = item.leaderLine;
                        if (item.leaderLineStyle) label.leaderLineStyle = { ...item.leaderLineStyle };
                    });
                }
                break;
            }
            case ActionType.GROUP:
                if (this.modules.interactionManager?.groups) {
                    this.modules.interactionManager.groups.dissolveGroup(action.data.groupId);
                }
                this.modules.interactionManager?.selection?.clearSelection?.();
                break;
            case ActionType.UNGROUP:
                if (this.modules.interactionManager?.groups && action.undoData?.group) {
                    this.modules.interactionManager.groups.restoreGroup(action.undoData.group);
                }
                this.modules.interactionManager?.selection?.clearSelection?.();
                break;
        }

        if (!skipFinalize) {
            if (typeof window !== 'undefined') {
                window.updateUndoRedoUI?.();
                window.markSceneAsModified?.();
            }
            this._triggerRedraw();
        }
    }

    /**
     * 应用重做操作
     * @private
     */
    _applyRedoAction(action, skipFinalize = false) {
        if (!action) return;

        switch (action.type) {
            case ActionType.BATCH: {
                const actions = action.data?.actions || [];
                if (Array.isArray(actions) && actions.length > 0) {
                    actions.forEach(childAction => this._applyRedoAction(childAction, true));
                }
                break;
            }
            case ActionType.ADD_COMPONENT:
                // 重做添加
                if (window.components && Array.isArray(action.data?.components)) {
                    action.data.components.forEach(comp => {
                        const id = comp.id || comp.uuid;
                        const exists = window.components.some(c => (c.id || c.uuid) === id);
                        if (!exists) {
                            window.components.push(comp);
                            this.modules.connectionPointManager?.initializeComponentPoints?.(comp);
                        }
                    });
                } else if (window.components && action.data.component) {
                    window.components.push(action.data.component);
                    this.modules.connectionPointManager?.initializeComponentPoints?.(action.data.component);
                }
                if (Array.isArray(action.data?.links) && this.modules.rayLinkManager) {
                    const connectionPointManager = this.modules.connectionPointManager;
                    if (connectionPointManager && Array.isArray(window.components)) {
                        window.components.forEach(comp => {
                            const compId = comp.id || comp.uuid;
                            if (!connectionPointManager.componentPoints.has(compId)) {
                                connectionPointManager.initializeComponentPoints(comp);
                            }
                        });
                    }
                    action.data.links.forEach(linkData => {
                        if (!linkData) return;
                        this.modules.rayLinkManager.createLink({
                            ...linkData,
                            style: linkData.style ? { ...linkData.style } : undefined
                        });
                    });
                }
                break;
            case ActionType.DELETE_COMPONENT:
                // 重做删除
                if (window.components) {
                    const ids = action.data?.componentIds
                        || (Array.isArray(action.undoData?.components)
                            ? action.undoData.components.map(c => c.id || c.uuid).filter(Boolean)
                            : action.data?.componentId ? [action.data.componentId] : []);
                    if (ids.length > 0) {
                        window.components = window.components.filter(c => !ids.includes(c.id || c.uuid));
                        if (this.modules.rayLinkManager) {
                            ids.forEach(id => this.modules.rayLinkManager.deleteLinksForComponent(id));
                        }
                        if (this.modules.connectionPointManager) {
                            ids.forEach(id => this.modules.connectionPointManager.removeComponentPoints(id));
                        }
                    }
                }
                if (this.modules.interactionManager?.selection) {
                    this.modules.interactionManager.selection.clearSelection();
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
                        } else {
                            comp.x = action.data.position.x;
                            comp.y = action.data.position.y;
                        }
                        this.modules.connectionPointManager?.updateComponentPoints?.(comp);
                    }
                }
                break;
            case ActionType.ROTATE_COMPONENT:
                if (window.components && action.data?.angle !== undefined) {
                    const comp = window.components.find(c =>
                        (c.id || c.uuid) === action.data.componentId
                    );
                    if (comp) {
                        const nextAngle = action.data.angle;
                        if (comp.angleRad !== undefined) comp.angleRad = nextAngle;
                        if (comp.angle !== undefined) comp.angle = nextAngle;
                        if (typeof comp.onAngleChanged === 'function') comp.onAngleChanged();
                        else if (typeof comp._updateGeometry === 'function') comp._updateGeometry();
                        this.modules.connectionPointManager?.updateComponentPoints?.(comp);
                    }
                }
                break;
            case ActionType.ADD_LINK:
                if (this.modules.rayLinkManager && action.data?.link) {
                    const linkData = action.data.link;
                    this.modules.rayLinkManager.createLink({
                        ...linkData,
                        style: linkData.style ? { ...linkData.style } : undefined
                    });
                }
                break;
            case ActionType.DELETE_LINK:
                if (this.modules.rayLinkManager && action.data?.linkId) {
                    this.modules.rayLinkManager.deleteLink(action.data.linkId);
                }
                break;
            case ActionType.ADD_LABEL: {
                const labelManager = this.modules.professionalLabelManager;
                const labelData = action.data?.label;
                if (labelManager && labelData) {
                    if (labelManager.createLabel) {
                        labelManager.createLabel(labelData);
                    } else if (labelManager.labels) {
                        labelManager.labels.set(labelData.id, labelData);
                    }
                }
                break;
            }
            case ActionType.DELETE_LABEL: {
                const labelManager = this.modules.professionalLabelManager;
                const labelId = action.data?.labelId || action.data?.id;
                if (labelManager && labelId) {
                    labelManager.deleteLabel?.(labelId);
                }
                break;
            }
            case ActionType.MOVE_LABEL: {
                const labelManager = this.modules.professionalLabelManager;
                const labelId = action.data?.labelId;
                const pos = action.data?.position;
                if (labelManager && labelId && pos) {
                    const label = labelManager.labels?.get(labelId);
                    if (label) {
                        label.position.x = pos.x;
                        label.position.y = pos.y;
                    }
                }
                break;
            }
            case ActionType.MODIFY_STYLE: {
                const target = action.data?.target;
                const items = action.data?.items || [];
                if (target === 'component' && this.modules.styleManager) {
                    items.forEach(item => {
                        if (!item?.id) return;
                        if (item.style) {
                            this.modules.styleManager.setComponentStyle(item.id, item.style, false);
                        } else {
                            this.modules.styleManager.removeComponentStyle(item.id);
                        }
                    });
                } else if (target === 'link' && this.modules.rayLinkManager) {
                    items.forEach(item => {
                        const link = this.modules.rayLinkManager.getLink(item.id);
                        if (!link) return;
                        if (item.style) link.style = { ...item.style };
                        link.label = item.label ?? null;
                        if (item.labelPosition !== undefined) link.labelPosition = item.labelPosition;
                        if (item.labelOffset) link.labelOffset = { ...item.labelOffset };
                    });
                } else if (target === 'label' && this.modules.professionalLabelManager) {
                    items.forEach(item => {
                        const label = this.modules.professionalLabelManager.labels?.get(item.id);
                        if (!label) return;
                        if (item.text !== undefined) label.text = item.text;
                        if (item.style) label.style = { ...item.style };
                        if (item.leaderLine !== undefined) label.leaderLine = item.leaderLine;
                        if (item.leaderLineStyle) label.leaderLineStyle = { ...item.leaderLineStyle };
                    });
                }
                break;
            }
            case ActionType.GROUP:
                if (this.modules.interactionManager?.groups && action.undoData?.group) {
                    this.modules.interactionManager.groups.restoreGroup(action.undoData.group);
                }
                this.modules.interactionManager?.selection?.clearSelection?.();
                break;
            case ActionType.UNGROUP:
                if (this.modules.interactionManager?.groups) {
                    this.modules.interactionManager.groups.dissolveGroup(action.data.groupId);
                }
                this.modules.interactionManager?.selection?.clearSelection?.();
                break;
        }

        if (!skipFinalize) {
            if (typeof window !== 'undefined') {
                window.updateUndoRedoUI?.();
                window.markSceneAsModified?.();
            }
            this._triggerRedraw();
        }
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
                    angle: comp.angle ?? comp.angleRad ?? 0,
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
                angle: c.angle ?? c.angleRad ?? 0,
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
                <button class="toolbar-btn" id="btn-auto-link" title="根据光线路径自动生成链接">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                        <circle cx="12" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M8 2v3M8 11v3M6.5 4.5h3M6.5 11.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                    <span>自动连</span>
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
            <div class="toolbar-group diagram-plugin-group" id="diagram-plugin-group"></div>
        `;
        
        this.toolbarContainer.appendChild(toolbar);
        
        // 绑定按钮事件
        this._bindToolbarEvents(toolbar);

        // 挂载插件工具栏
        const pluginContainer = toolbar.querySelector('#diagram-plugin-group');
        this.modules.pluginManager?.attachToolbar(pluginContainer);
    }

    /**
     * 注册工具栏插件
     */
    registerToolbarPlugin(plugin) {
        return this.modules.pluginManager?.registerPlugin(plugin);
    }

    /**
     * 注销工具栏插件
     */
    unregisterToolbarPlugin(pluginId) {
        return this.modules.pluginManager?.unregisterPlugin(pluginId);
    }

    /**
     * 绑定工具栏事件
     * @private
     */
    _bindToolbarEvents(toolbar) {
        this.diagnosticSystem.log('info', 'Binding toolbar events');
        
        // 导出按钮
        toolbar.querySelector('#btn-export')?.addEventListener('click', () => {
            this.diagnosticSystem.trackEvent('toolbar:export');
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

        // 自动连接按钮
        toolbar.querySelector('#btn-auto-link')?.addEventListener('click', (e) => {
            this._showAutoLinkMenu(e.currentTarget);
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
        menu.style.zIndex = '9000';

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
            z-index: 9000;
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
            if (text) {
                if (this.modules.professionalLabelManager) {
                    const createdLabel = this.modules.professionalLabelManager.createLabel({
                        text,
                        position: { x, y },
                        targetType: 'free'
                    });
                    const interactionManager = this.modules.interactionManager;
                    if (interactionManager) {
                        interactionManager.recordAction(
                            ActionType.ADD_LABEL,
                            { label: createdLabel.serialize ? createdLabel.serialize() : { ...createdLabel } }
                        );
                        window.updateUndoRedoUI?.();
                        window.markSceneAsModified?.();
                    } else if (typeof window !== 'undefined' && window.historyManager && window.AddLabelCommand) {
                        window.historyManager.addCommand(new window.AddLabelCommand(createdLabel, this.modules.professionalLabelManager));
                        window.updateUndoRedoUI?.();
                        window.markSceneAsModified?.();
                    }
                } else if (this.modules.annotationManager) {
                    this.modules.annotationManager.addAnnotation({
                        text,
                        position: { x, y },
                        style: {
                            fontSize: 14,
                            color: '#ffffff'
                        }
                    });
                }
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
            z-index: 9500;
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
        const rayLinkManager = this.modules.rayLinkManager;
        const labelManager = this.modules.professionalLabelManager;
        const styleManager = this.modules.styleManager;
        const themeManager = this.modules.themeManager;
        const connectionPointManager = this.modules.connectionPointManager;
        const currentScheme = rayStyleManager?.getCurrentScheme?.() || 'DEFAULT';
        const rayDefaultStyle = rayStyleManager?.defaultStyle || {};
        const rayDefaultWidth = rayDefaultStyle.lineWidth || 2;
        const rayDefaultLineStyle = rayDefaultStyle.lineStyle || 'solid';
        const rayLineStyleSolid = rayDefaultLineStyle === 'solid';
        const rayLineStyleDashed = rayDefaultLineStyle === 'dashed';
        const rayLineStyleDotted = rayDefaultLineStyle === 'dotted';
        const selectedLink = rayLinkManager?.selectedLink || null;
        const linkStyle = selectedLink?.style || rayLinkManager?.defaultStyle || {};
        const linkColor = linkStyle.color || '#ff0000';
        const linkWidth = linkStyle.width || 2;
        const linkLineStyle = linkStyle.lineStyle || 'solid';
        const linkArrowStart = !!linkStyle.arrowStart;
        const linkArrowEnd = linkStyle.arrowEnd !== false;
        const linkArrowSize = linkStyle.arrowSize || 8;
        const linkLabel = selectedLink?.label || '';
        const linkLabelPosition = typeof selectedLink?.labelPosition === 'number' ? selectedLink.labelPosition : 0.5;
        const linkLabelOffset = selectedLink?.labelOffset || { x: 0, y: -15 };

        const selectedLabel = labelManager?.selectedLabel || null;
        const labelStyle = selectedLabel?.style || labelManager?.defaultStyle || {};
        const labelText = selectedLabel?.text || '';
        const labelFontSize = labelStyle.fontSize || 14;
        const labelColor = labelStyle.color || '#000000';
        const labelBold = !!labelStyle.bold;
        const labelItalic = !!labelStyle.italic;
        const labelLeaderLine = selectedLabel ? selectedLabel.leaderLine !== false : true;
        const leaderLineStyle = selectedLabel?.leaderLineStyle || {};
        const leaderLineColor = leaderLineStyle.color || '#666666';
        const leaderLineWidth = leaderLineStyle.width || 1;
        const leaderLineDash = Array.isArray(leaderLineStyle.dashPattern) && leaderLineStyle.dashPattern.length ? 'dashed' : 'solid';
        const labelPresetOptions = Object.entries(LABEL_COLOR_PRESETS || {})
            .map(([key, preset]) => `<option value="${key}">${preset.name}</option>`)
            .join('');

        const selectedComponents = this._getSelectedDiagramComponents();
        const globalComponentStyle = styleManager?.getGlobalStyle?.() || {};
        const primaryComponentStyle = selectedComponents.length === 1 && styleManager
            ? (styleManager.getComponentStyle(selectedComponents[0].id || selectedComponents[0].uuid) || {})
            : {};
        const componentStroke = primaryComponentStyle.color || globalComponentStyle.color || '#000000';
        const componentFill = primaryComponentStyle.fillColor || globalComponentStyle.fillColor || '#666666';
        const componentLineWidth = primaryComponentStyle.lineWidth || globalComponentStyle.lineWidth || 2;
        const componentOpacity = primaryComponentStyle.opacity ?? globalComponentStyle.opacity ?? 1;
        const componentForceIconColor = primaryComponentStyle.forceIconColor === true;

        const connectionPointVisible = connectionPointManager?.visible !== false;
        const connectionPointShowLabels = connectionPointManager?.showLabels !== false;
        const connectionPointSnapEnabled = connectionPointManager?.snapEnabled !== false;
        const connectionPointSnapDistance = connectionPointManager?.snapDistance || 20;

        const builtinThemes = themeManager?.getBuiltinThemes?.() || [];
        const currentThemeId = themeManager?.getCurrentTheme?.()?.id || '';
        const themeOptions = builtinThemes
            .map(theme => `<option value="${theme.id}" ${theme.id === currentThemeId ? 'selected' : ''}>${theme.name}</option>`)
            .join('');
        
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
                    <label style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-color-secondary, #888);">主题</label>
                    <select class="theme-select" style="
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid var(--border-color, #444);
                        border-radius: 4px;
                        background: var(--input-bg, #343a40);
                        color: var(--text-color, #fff);
                        font-size: 13px;
                    ">
                        <option value="">(保持当前)</option>
                        ${themeOptions}
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-color-secondary, #888);">默认线宽</label>
                    <input type="range" class="line-width-slider" min="1" max="5" step="0.5" value="${rayDefaultWidth}" style="width: 100%;">
                    <span class="line-width-value" style="font-size: 12px; color: var(--text-color-secondary, #888);">${rayDefaultWidth}px</span>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-color-secondary, #888);">线条样式</label>
                    <div style="display: flex; gap: 8px;">
                        <button class="line-style-btn" data-style="solid" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid var(--border-color, #444);
                            border-radius: 4px;
                            background: ${rayLineStyleSolid ? 'var(--primary-color, #0078d4)' : 'transparent'};
                            color: ${rayLineStyleSolid ? '#fff' : 'var(--text-color, #fff)'};
                            cursor: pointer;
                            font-size: 12px;
                        " data-active="${rayLineStyleSolid}">实线</button>
                        <button class="line-style-btn" data-style="dashed" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid var(--border-color, #444);
                            border-radius: 4px;
                            background: ${rayLineStyleDashed ? 'var(--primary-color, #0078d4)' : 'transparent'};
                            color: ${rayLineStyleDashed ? '#fff' : 'var(--text-color, #fff)'};
                            cursor: pointer;
                            font-size: 12px;
                        " data-active="${rayLineStyleDashed}">虚线</button>
                        <button class="line-style-btn" data-style="dotted" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid var(--border-color, #444);
                            border-radius: 4px;
                            background: ${rayLineStyleDotted ? 'var(--primary-color, #0078d4)' : 'transparent'};
                            color: ${rayLineStyleDotted ? '#fff' : 'var(--text-color, #fff)'};
                            cursor: pointer;
                            font-size: 12px;
                        " data-active="${rayLineStyleDotted}">点线</button>
                    </div>
                </div>
                <div style="border-top: 1px solid var(--border-color, #444); margin: 16px 0;"></div>
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-color, #fff);">元件样式</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">描边颜色</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="color" class="component-stroke-input" value="${componentStroke}" style="width: 36px; height: 28px; border: none; background: transparent;">
                                <input type="text" class="component-stroke-text" value="${componentStroke}" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">填充颜色</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="color" class="component-fill-input" value="${componentFill}" style="width: 36px; height: 28px; border: none; background: transparent;">
                                <input type="text" class="component-fill-text" value="${componentFill}" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">线宽</label>
                            <input type="range" class="component-line-width" min="0.5" max="6" step="0.5" value="${componentLineWidth}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">不透明度</label>
                            <input type="range" class="component-opacity" min="0.2" max="1" step="0.05" value="${componentOpacity}" style="width: 100%;">
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="component-force-icon-color" ${componentForceIconColor ? 'checked' : ''}/> 使用自定义颜色渲染专业图标
                        </label>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
                        <button class="component-apply-selected" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">应用到选中</button>
                        <button class="component-apply-all" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">应用到全部</button>
                        <button class="component-clear-selected" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">清除选中样式</button>
                    </div>
                </div>
                <div style="border-top: 1px solid var(--border-color, #444); margin: 16px 0;"></div>
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-color, #fff);">连接点设置</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="cp-visible" ${connectionPointVisible ? 'checked' : ''}/> 显示连接点
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="cp-labels" ${connectionPointShowLabels ? 'checked' : ''}/> 显示连接点标签
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="cp-snap" ${connectionPointSnapEnabled ? 'checked' : ''}/> 启用连接点吸附
                        </label>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">吸附距离</label>
                            <input type="range" class="cp-snap-distance" min="5" max="40" step="1" value="${connectionPointSnapDistance}" style="width: 100%;" ${connectionPointSnapEnabled ? '' : 'disabled'}>
                        </div>
                    </div>
                </div>
                <div style="border-top: 1px solid var(--border-color, #444); margin: 16px 0;"></div>
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-color, #fff);">连接光线样式</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">颜色</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="color" class="link-color-input" value="${linkColor}" style="width: 36px; height: 28px; border: none; background: transparent;">
                                <input type="text" class="link-color-text" value="${linkColor}" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">线宽</label>
                            <input type="range" class="link-width-slider" min="1" max="6" step="0.5" value="${linkWidth}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">线型</label>
                            <select class="link-style-select" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                                <option value="solid" ${linkLineStyle === 'solid' ? 'selected' : ''}>实线</option>
                                <option value="dashed" ${linkLineStyle === 'dashed' ? 'selected' : ''}>虚线</option>
                                <option value="dotted" ${linkLineStyle === 'dotted' ? 'selected' : ''}>点线</option>
                                <option value="dashDot" ${linkLineStyle === 'dashDot' ? 'selected' : ''}>点划线</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">箭头大小</label>
                            <input type="range" class="link-arrow-size" min="4" max="14" step="1" value="${linkArrowSize}" style="width: 100%;">
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="link-arrow-start" ${linkArrowStart ? 'checked' : ''}/> 起始箭头
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="link-arrow-end" ${linkArrowEnd ? 'checked' : ''}/> 末端箭头
                        </label>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">标签文本（选中链接）</label>
                        <input type="text" class="link-label-input" value="${linkLabel}" placeholder="输入链接标签..." style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">标签位置</label>
                            <input type="range" class="link-label-position" min="0" max="1" step="0.05" value="${linkLabelPosition}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">标签偏移</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="number" class="link-label-offset-x" value="${linkLabelOffset.x ?? 0}" style="width: 50%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;" />
                                <input type="number" class="link-label-offset-y" value="${linkLabelOffset.y ?? -15}" style="width: 50%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;" />
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
                        <button class="link-apply-selected" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">应用到选中</button>
                        <button class="link-apply-all" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">应用到全部</button>
                        <button class="link-set-default" style="padding: 6px 10px; border: none; border-radius: 4px; background: var(--primary-color, #0078d4); color: #fff; cursor: pointer; font-size: 12px;">设为默认</button>
                    </div>
                </div>
                <div style="border-top: 1px solid var(--border-color, #444); margin: 16px 0;"></div>
                <div style="margin-bottom: 8px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-color, #fff);">专业标注样式</h4>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">标注文本（选中标注）</label>
                        <input type="text" class="label-text-input" value="${labelText}" placeholder="输入标注文本..." style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">标注预设</label>
                        <select class="label-preset-select" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                            <option value="">(不使用预设)</option>
                            ${labelPresetOptions}
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">字体大小</label>
                            <input type="range" class="label-font-size" min="10" max="28" step="1" value="${labelFontSize}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">字体颜色</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="color" class="label-color-input" value="${labelColor}" style="width: 36px; height: 28px; border: none; background: transparent;">
                                <input type="text" class="label-color-text" value="${labelColor}" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="label-bold" ${labelBold ? 'checked' : ''}/> 粗体
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="label-italic" ${labelItalic ? 'checked' : ''}/> 斜体
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-color, #fff);">
                            <input type="checkbox" class="label-leader-line" ${labelLeaderLine ? 'checked' : ''}/> 引线
                        </label>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">引线颜色</label>
                            <input type="color" class="label-leader-color" value="${leaderLineColor}" style="width: 100%; height: 28px; border: none; background: transparent;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">引线线宽</label>
                            <input type="range" class="label-leader-width" min="1" max="4" step="1" value="${leaderLineWidth}" style="width: 100%;">
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-color-secondary, #888);">引线样式</label>
                        <select class="label-leader-style" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--input-bg, #343a40); color: var(--text-color, #fff); font-size: 12px;">
                            <option value="solid" ${leaderLineDash === 'solid' ? 'selected' : ''}>实线</option>
                            <option value="dashed" ${leaderLineDash === 'dashed' ? 'selected' : ''}>虚线</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; flex-wrap: wrap;">
                        <button class="label-apply-selected" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">应用到选中</button>
                        <button class="label-apply-all" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">应用到全部</button>
                        <button class="label-auto-arrange" style="padding: 6px 10px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-color, #fff); cursor: pointer; font-size: 12px;">自动避让</button>
                        <button class="label-set-default" style="padding: 6px 10px; border: none; border-radius: 4px; background: var(--primary-color, #0078d4); color: #fff; cursor: pointer; font-size: 12px;">设为默认</button>
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

        // 主题切换
        const themeSelect = panel.querySelector('.theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const themeId = e.target.value;
                if (themeId && themeManager?.applyTheme) {
                    themeManager.applyTheme(themeId);
                    this._triggerRedraw();
                }
            });
        }

        // 连接点设置
        const cpVisibleInput = panel.querySelector('.cp-visible');
        if (cpVisibleInput) {
            cpVisibleInput.addEventListener('change', (e) => {
                if (connectionPointManager?.setVisible) {
                    connectionPointManager.setVisible(e.target.checked);
                } else if (connectionPointManager) {
                    connectionPointManager.visible = e.target.checked;
                }
                this._triggerRedraw();
            });
        }

        const cpLabelsInput = panel.querySelector('.cp-labels');
        if (cpLabelsInput) {
            cpLabelsInput.addEventListener('change', (e) => {
                if (connectionPointManager?.setShowLabels) {
                    connectionPointManager.setShowLabels(e.target.checked);
                } else if (connectionPointManager) {
                    connectionPointManager.showLabels = e.target.checked;
                }
                this._triggerRedraw();
            });
        }

        const cpSnapInput = panel.querySelector('.cp-snap');
        const cpSnapDistanceInput = panel.querySelector('.cp-snap-distance');
        if (cpSnapInput) {
            cpSnapInput.addEventListener('change', (e) => {
                if (connectionPointManager?.setSnapEnabled) {
                    connectionPointManager.setSnapEnabled(e.target.checked);
                } else if (connectionPointManager) {
                    connectionPointManager.snapEnabled = e.target.checked;
                }
                if (cpSnapDistanceInput) {
                    cpSnapDistanceInput.disabled = !e.target.checked;
                }
            });
        }
        if (cpSnapDistanceInput) {
            cpSnapDistanceInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (Number.isFinite(value) && connectionPointManager) {
                    connectionPointManager.snapDistance = value;
                }
            });
        }
        
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
                    b.dataset.active = 'false';
                });
                btn.style.background = 'var(--primary-color, #0078d4)';
                btn.style.color = '#fff';
                btn.dataset.active = 'true';
            });
        });
        
        // 应用按钮
        panel.querySelector('.style-panel-apply').addEventListener('click', () => {
            const selectedLineStyleBtn = panel.querySelector('.line-style-btn[data-active="true"]');
            const lineStyle = selectedLineStyleBtn?.dataset?.style || 'solid';
            const lineWidth = parseFloat(lineWidthSlider.value) || 2;
            if (rayStyleManager?.setDefaultStyle) {
                rayStyleManager.setDefaultStyle({ lineWidth, lineStyle });
            }
            this._triggerRedraw();
            overlay.remove();
        });

        const bindColorInputs = (colorInput, textInput) => {
            if (!colorInput || !textInput) return;
            colorInput.addEventListener('input', (e) => {
                textInput.value = e.target.value;
            });
            textInput.addEventListener('input', (e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    colorInput.value = e.target.value;
                }
            });
        };

        const linkColorInput = panel.querySelector('.link-color-input');
        const linkColorText = panel.querySelector('.link-color-text');
        const labelColorInput = panel.querySelector('.label-color-input');
        const labelColorText = panel.querySelector('.label-color-text');
        const componentStrokeInput = panel.querySelector('.component-stroke-input');
        const componentStrokeText = panel.querySelector('.component-stroke-text');
        const componentFillInput = panel.querySelector('.component-fill-input');
        const componentFillText = panel.querySelector('.component-fill-text');

        bindColorInputs(linkColorInput, linkColorText);
        bindColorInputs(labelColorInput, labelColorText);
        bindColorInputs(componentStrokeInput, componentStrokeText);
        bindColorInputs(componentFillInput, componentFillText);

        const buildComponentStyle = () => {
            return {
                color: componentStrokeInput.value || '#000000',
                fillColor: componentFillInput.value || '#666666',
                lineWidth: parseFloat(panel.querySelector('.component-line-width').value) || 2,
                opacity: parseFloat(panel.querySelector('.component-opacity').value) || 1,
                forceIconColor: panel.querySelector('.component-force-icon-color').checked
            };
        };

        const applyComponentStyle = (components, style, clear = false) => {
            if (!styleManager || !components || components.length === 0) return;
            const dataItems = [];
            const undoItems = [];
            components.forEach(comp => {
                const id = comp.id || comp.uuid;
                if (!id) return;
                const prevStyle = styleManager.getComponentStyle(id);
                const nextStyle = clear ? null : { ...(prevStyle || {}), ...(style || {}) };
                undoItems.push({ id, style: prevStyle ? { ...prevStyle } : null });
                dataItems.push({ id, style: nextStyle ? { ...nextStyle } : null });
                if (nextStyle) {
                    styleManager.setComponentStyle(id, nextStyle, false);
                } else {
                    styleManager.removeComponentStyle(id);
                }
            });
            if (dataItems.length > 0) {
                const interactionManager = this.modules.interactionManager;
                if (interactionManager) {
                    interactionManager.recordAction(
                        ActionType.MODIFY_STYLE,
                        { target: 'component', items: dataItems },
                        { items: undoItems }
                    );
                    if (typeof window !== 'undefined') {
                        window.updateUndoRedoUI?.();
                        window.markSceneAsModified?.();
                    }
                }
            }
            this._triggerRedraw();
        };

        panel.querySelector('.component-apply-selected').addEventListener('click', () => {
            const selected = this._getSelectedDiagramComponents();
            if (selected.length === 0) {
                console.warn('未选择元件，无法应用样式');
                return;
            }
            applyComponentStyle(selected, buildComponentStyle());
        });

        panel.querySelector('.component-apply-all').addEventListener('click', () => {
            if (!window.components || window.components.length === 0) return;
            applyComponentStyle(window.components, buildComponentStyle());
        });

        panel.querySelector('.component-clear-selected').addEventListener('click', () => {
            const selected = this._getSelectedDiagramComponents();
            if (selected.length === 0) {
                console.warn('未选择元件，无法清除样式');
                return;
            }
            applyComponentStyle(selected, null, true);
        });

        const buildLinkStyle = () => {
            const color = linkColorInput.value || '#ff0000';
            const width = parseFloat(panel.querySelector('.link-width-slider').value) || 2;
            const lineStyle = panel.querySelector('.link-style-select').value || 'solid';
            const arrowStart = panel.querySelector('.link-arrow-start').checked;
            const arrowEnd = panel.querySelector('.link-arrow-end').checked;
            const arrowSize = parseFloat(panel.querySelector('.link-arrow-size').value) || 8;
            return { color, width, lineStyle, arrowStart, arrowEnd, arrowSize };
        };

        const captureLinkState = (link) => {
            if (!link) return null;
            return {
                id: link.id,
                style: link.style ? { ...link.style } : null,
                label: link.label || null,
                labelPosition: link.labelPosition,
                labelOffset: link.labelOffset ? { ...link.labelOffset } : null
            };
        };

        const updateSelectedLinkLabel = () => {
            const link = rayLinkManager?.selectedLink;
            if (!link) return;
            const labelText = panel.querySelector('.link-label-input').value.trim();
            link.label = labelText.length > 0 ? labelText : null;
            const labelPosValue = parseFloat(panel.querySelector('.link-label-position').value);
            link.labelPosition = Number.isFinite(labelPosValue) ? labelPosValue : 0.5;
            const offsetX = parseFloat(panel.querySelector('.link-label-offset-x').value);
            const offsetY = parseFloat(panel.querySelector('.link-label-offset-y').value);
            link.labelOffset = {
                x: Number.isFinite(offsetX) ? offsetX : 0,
                y: Number.isFinite(offsetY) ? offsetY : -15
            };
            if (link.labelPosition === undefined || link.labelPosition === null) {
                link.labelPosition = 0.5;
            }
            if (!link.labelOffset) {
                link.labelOffset = { x: 0, y: -15 };
            }
            this._triggerRedraw();
        };

        panel.querySelector('.link-apply-selected').addEventListener('click', () => {
            const link = rayLinkManager?.selectedLink;
            if (!link) {
                console.warn('未选择链接，无法应用样式');
                return;
            }
            const prevState = captureLinkState(link);
            const style = buildLinkStyle();
            rayLinkManager.applyStyleToLink(link.id, style, true);
            updateSelectedLinkLabel();
            const nextState = captureLinkState(link);
            const interactionManager = this.modules.interactionManager;
            if (interactionManager && prevState && nextState) {
                interactionManager.recordAction(
                    ActionType.MODIFY_STYLE,
                    { target: 'link', items: [nextState] },
                    { items: [prevState] }
                );
                if (typeof window !== 'undefined') {
                    window.updateUndoRedoUI?.();
                    window.markSceneAsModified?.();
                }
            }
        });

        panel.querySelector('.link-apply-all').addEventListener('click', () => {
            if (!rayLinkManager) return;
            const prevStates = rayLinkManager.getAllLinks().map(link => captureLinkState(link)).filter(Boolean);
            const style = buildLinkStyle();
            rayLinkManager.applyStyleToAll(style, true);
            const nextStates = rayLinkManager.getAllLinks().map(link => captureLinkState(link)).filter(Boolean);
            const interactionManager = this.modules.interactionManager;
            if (interactionManager && nextStates.length > 0) {
                interactionManager.recordAction(
                    ActionType.MODIFY_STYLE,
                    { target: 'link', items: nextStates },
                    { items: prevStates }
                );
                if (typeof window !== 'undefined') {
                    window.updateUndoRedoUI?.();
                    window.markSceneAsModified?.();
                }
            }
            this._triggerRedraw();
        });

        panel.querySelector('.link-set-default').addEventListener('click', () => {
            if (!rayLinkManager) return;
            const style = buildLinkStyle();
            rayLinkManager.setDefaultStyle(style, true);
            this._triggerRedraw();
        });

        const buildLabelStyle = () => {
            const fontSize = parseFloat(panel.querySelector('.label-font-size').value) || 14;
            const color = labelColorInput.value || '#000000';
            const bold = panel.querySelector('.label-bold').checked;
            const italic = panel.querySelector('.label-italic').checked;
            return { fontSize, color, bold, italic };
        };

        const buildLeaderStyle = () => {
            const color = panel.querySelector('.label-leader-color').value || '#666666';
            const width = parseFloat(panel.querySelector('.label-leader-width').value) || 1;
            const dash = panel.querySelector('.label-leader-style').value === 'dashed' ? [4, 3] : [];
            return { color, width, dashPattern: dash };
        };

        const captureLabelState = (label) => {
            if (!label) return null;
            return {
                id: label.id,
                text: label.text,
                style: label.style ? { ...label.style } : null,
                leaderLine: !!label.leaderLine,
                leaderLineStyle: label.leaderLineStyle ? { ...label.leaderLineStyle } : null
            };
        };

        const updateSelectedLabelText = () => {
            const label = labelManager?.selectedLabel;
            if (!label) return;
            const text = panel.querySelector('.label-text-input').value.trim();
            if (text) {
                label.text = text;
                this._triggerRedraw();
            }
        };

        panel.querySelector('.label-apply-selected').addEventListener('click', () => {
            const label = labelManager?.selectedLabel;
            if (!label) {
                console.warn('未选择标注，无法应用样式');
                return;
            }
            const prevState = captureLabelState(label);
            const text = panel.querySelector('.label-text-input').value.trim();
            if (text) label.text = text;
            label.style = { ...label.style, ...buildLabelStyle() };
            label.leaderLine = panel.querySelector('.label-leader-line').checked;
            label.leaderLineStyle = { ...label.leaderLineStyle, ...buildLeaderStyle() };
            const presetKey = panel.querySelector('.label-preset-select')?.value;
            if (presetKey && label.applyPreset) {
                label.applyPreset(presetKey);
            }
            const nextState = captureLabelState(label);
            const interactionManager = this.modules.interactionManager;
            if (interactionManager && prevState && nextState) {
                interactionManager.recordAction(
                    ActionType.MODIFY_STYLE,
                    { target: 'label', items: [nextState] },
                    { items: [prevState] }
                );
                if (typeof window !== 'undefined') {
                    window.updateUndoRedoUI?.();
                    window.markSceneAsModified?.();
                }
            }
            this._triggerRedraw();
        });

        panel.querySelector('.label-apply-all').addEventListener('click', () => {
            if (!labelManager) return;
            const labels = labelManager.getAllLabels?.() || [];
            if (!labels.length) return;
            const prevStates = labels.map(label => captureLabelState(label)).filter(Boolean);
            const style = buildLabelStyle();
            const leaderStyle = buildLeaderStyle();
            const leaderLineEnabled = panel.querySelector('.label-leader-line').checked;
            const presetKey = panel.querySelector('.label-preset-select')?.value;
            labels.forEach(label => {
                label.style = { ...label.style, ...style };
                label.leaderLine = leaderLineEnabled;
                label.leaderLineStyle = { ...label.leaderLineStyle, ...leaderStyle };
                if (presetKey && label.applyPreset) {
                    label.applyPreset(presetKey);
                }
            });
            const nextStates = labels.map(label => captureLabelState(label)).filter(Boolean);
            const interactionManager = this.modules.interactionManager;
            if (interactionManager && nextStates.length > 0) {
                interactionManager.recordAction(
                    ActionType.MODIFY_STYLE,
                    { target: 'label', items: nextStates },
                    { items: prevStates }
                );
                if (typeof window !== 'undefined') {
                    window.updateUndoRedoUI?.();
                    window.markSceneAsModified?.();
                }
            }
            this._triggerRedraw();
        });

        panel.querySelector('.label-auto-arrange').addEventListener('click', () => {
            if (!labelManager) return;
            const labels = labelManager.getAllLabels?.() || [];
            if (!labels.length) return;
            const components = window.components || [];
            const targetLabels = labelManager.selectedLabel ? [labelManager.selectedLabel] : labels;
            targetLabels.forEach(label => {
                labelManager.autoPositionLabel?.(label, components, labels);
            });
            this._triggerRedraw();
        });

        panel.querySelector('.label-set-default').addEventListener('click', () => {
            if (!labelManager) return;
            labelManager.defaultStyle = { ...labelManager.defaultStyle, ...buildLabelStyle() };
            labelManager.defaultStyle.leaderLineStyle = { ...buildLeaderStyle() };
            this._triggerRedraw();
        });

        // 链接标签实时预览
        ['.link-label-input', '.link-label-position', '.link-label-offset-x', '.link-label-offset-y'].forEach(selector => {
            panel.querySelector(selector)?.addEventListener('input', updateSelectedLinkLabel);
        });

        // 标注文本实时预览（仅选中标注）
        panel.querySelector('.label-text-input')?.addEventListener('input', updateSelectedLabelText);
        
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
    _handleModeChange(oldMode, newMode) {
        console.log(`DiagramModeIntegration: Mode changed from ${oldMode} to ${newMode}`);
        
        if (newMode === APP_MODES.DIAGRAM) {
            // 进入绘图模式前先恢复数据，避免自动生成导致重复
            this._restoreDiagramModeState();
            this._enterDiagramMode();
        } else {
            // 离开绘图模式时缓存数据
            if (oldMode === APP_MODES.DIAGRAM) {
                this._saveDiagramModeState();
            }
            this._exitDiagramMode();
        }
    }

    /**
     * 保存绘图模式关键状态
     * @private
     */
    _saveDiagramModeState() {
        this.diagramModeState = {
            timestamp: Date.now(),
            annotations: this.modules.annotationManager?.serialize?.(),
            professionalLabels: this.modules.professionalLabelManager?.serialize?.(),
            styles: this.modules.styleManager?.serialize?.(),
            layoutEngine: this.modules.layoutEngine?.serialize?.(),
            rayLinks: this.modules.rayLinkManager?.serialize?.(),
            connectionPoints: this.modules.connectionPointManager?.serialize?.(),
            rayStyles: this.modules.rayStyleManager?.serialize?.(),
            technicalNotes: this.modules.technicalNotesManager?.serialize?.(),
            technicalNotesArea: this.modules.technicalNotesArea?.serialize?.(),
            parameterDisplay: this.modules.parameterDisplayManager?.serialize?.(),
            minimapVisible: this.modules.minimap?.visible
        };
    }

    /**
     * 恢复绘图模式关键状态
     * @private
     */
    _restoreDiagramModeState() {
        const state = this.diagramModeState;
        if (!state) {
            this._diagramStateRestored = false;
            return;
        }
        this._diagramStateRestored = true;

        if (state.annotations && this.modules.annotationManager?.deserialize) {
            this.modules.annotationManager.deserialize(state.annotations);
        }

        if (state.professionalLabels && this.modules.professionalLabelManager) {
            this.modules.professionalLabelManager.clear();
            this.modules.professionalLabelManager.deserialize(state.professionalLabels);
        }

        if (state.styles && this.modules.styleManager) {
            this.modules.styleManager.clear();
            this.modules.styleManager.deserialize(state.styles);
        }

        if (state.layoutEngine && this.modules.layoutEngine?.deserialize) {
            this.modules.layoutEngine.deserialize(state.layoutEngine);
        }

        if (state.rayLinks && this.modules.rayLinkManager) {
            this.modules.rayLinkManager.clear();
            this.modules.rayLinkManager.deserialize(state.rayLinks);
        }

        if (state.connectionPoints && this.modules.connectionPointManager) {
            const connectionPointManager = this.modules.connectionPointManager;
            connectionPointManager.clear();
            if (typeof window !== 'undefined' && Array.isArray(window.components)) {
                window.components.forEach(comp => {
                    connectionPointManager.initializeComponentPoints(comp);
                });
            }
            connectionPointManager.deserialize(state.connectionPoints);
        }

        if (state.rayStyles && this.modules.rayStyleManager?.deserialize) {
            this.modules.rayStyleManager.deserialize(state.rayStyles);
        }

        if (state.technicalNotes && this.modules.technicalNotesManager?.deserialize) {
            this.modules.technicalNotesManager.deserialize(state.technicalNotes);
        }

        if (state.technicalNotesArea && this.modules.technicalNotesArea?.deserialize) {
            this.modules.technicalNotesArea.deserialize(state.technicalNotesArea);
        }

        if (state.parameterDisplay && this.modules.parameterDisplayManager?.deserialize) {
            this.modules.parameterDisplayManager.deserialize(state.parameterDisplay);
        }

        if (state.minimapVisible !== undefined && this.modules.minimap) {
            if (state.minimapVisible) {
                this.modules.minimap.show();
            } else {
                this.modules.minimap.hide();
            }
        }

        this._triggerRedraw();
    }

    /**
     * 进入绘图模式
     * @private
     */
    _enterDiagramMode() {
        try {
        // 启用布局引擎功能
        if (!this._diagramStateRestored && this.modules.layoutEngine) {
            if (typeof this.modules.layoutEngine.setShowAlignmentGuides === 'function') {
                this.modules.layoutEngine.setShowAlignmentGuides(true);
            } else {
                this.modules.layoutEngine.showAlignmentGuides = true;
                if (typeof this.modules.layoutEngine._notifyChange === 'function') {
                    this.modules.layoutEngine._notifyChange('showAlignmentGuides', true);
                }
            }
        }

        // 启用连接点显示
        if (this.modules.connectionPointManager) {
            if (!this._diagramStateRestored) {
                this.modules.connectionPointManager.visible = true;
            }
        }

        // 显示小地图
        if (this.modules.minimap) {
            if (!this._diagramStateRestored) {
                this.modules.minimap.show();
            }
        }

        // 更新左侧栏图标为专业图标
        this._updateToolbarIcons(APP_MODES.DIAGRAM);

        // 初始化组件的连接点
        if (typeof window !== 'undefined' && window.components) {
            window.components.forEach(comp => {
                const componentId = comp.id || comp.uuid;
                if (!this.modules.connectionPointManager.componentPoints.has(componentId)) {
                    this.modules.connectionPointManager.initializeComponentPoints(comp);
                }
            });
        }

        // 自动生成光线连接（仅当当前没有任何链接时）
        if (this.modules.rayLinkManager && this.modules.rayLinkManager.getAllLinks().length === 0) {
            const rayCount = (typeof window !== 'undefined' && Array.isArray(window.currentRayPaths))
                ? window.currentRayPaths.length
                : 0;
            if (rayCount > 0) {
                const result = this._generateRayLinksFromSimulation({ replace: false });
                if (result?.created) {
                    console.log(`DiagramModeIntegration: Auto generated ${result.created} ray links`);
                }
            }
        }

        // 预加载所有SVG专业图标，加载完成后触发重绘
        if (this.modules.professionalIconManager) {
            const allTypes = Array.from(this.modules.professionalIconManager.iconDefinitions.keys());
            this.modules.professionalIconManager.preloadIcons(allTypes).then(() => {
                if (typeof window !== 'undefined' && window.needsRetrace !== undefined) {
                    window.needsRetrace = true;
                }
                console.log('DiagramModeIntegration: All professional icons preloaded');
            }).catch(err => {
                console.warn('DiagramModeIntegration: Icon preload error:', err);
            });
        }

        console.log('DiagramModeIntegration: Entered diagram mode');
        } catch (err) {
            console.error('DiagramModeIntegration: Error entering diagram mode:', err);
        }
    }

    /**
     * 退出绘图模式
     * @private
     */
    _exitDiagramMode() {
        try {
        // 禁用布局引擎功能
        if (this.modules.layoutEngine?.setShowGrid) {
            this.modules.layoutEngine.setShowGrid(false);
        }
        if (this.modules.layoutEngine?.clearAlignmentGuides) {
            this.modules.layoutEngine.clearAlignmentGuides();
        }

        // 禁用连接点显示
        if (this.modules.connectionPointManager) {
            this.modules.connectionPointManager.visible = false;
            if (this.modules.connectionPointManager.setSelectedPoint) {
                this.modules.connectionPointManager.setSelectedPoint(null);
            } else {
                this.modules.connectionPointManager.selectedPoint = null;
            }
        }

        // 取消光线链接模式
        this._rayLinkModeActive = false;
        if (this.modules.rayLinkManager) {
            this.modules.rayLinkManager.cancelLinkCreation();
        }

        // 退出标注模式（如果开启过）
        if (this._annotationModeActive) {
            this._annotationModeActive = false;
            const canvas = typeof document !== 'undefined' ? document.getElementById('opticsCanvas') : null;
            if (canvas && this._annotationClickHandler) {
                canvas.removeEventListener('click', this._annotationClickHandler);
            }
            this._annotationClickHandler = null;
            if (typeof document !== 'undefined') {
                const input = document.querySelector('.annotation-input-container');
                if (input) input.remove();
            }
        }

        // 恢复鼠标样式与工具栏按钮状态
        if (typeof document !== 'undefined') {
            document.body.style.cursor = '';
            document.querySelector('#btn-raylink')?.classList.remove('active');
            document.querySelector('#btn-annotation')?.classList.remove('active');
        }

        // 隐藏小地图
        if (this.modules.minimap) {
            this.modules.minimap.hide();
        }

        // 恢复左侧栏为原始图标
        this._updateToolbarIcons(APP_MODES.SIMULATION);

        console.log('DiagramModeIntegration: Exited diagram mode');
        } catch (err) {
            console.error('DiagramModeIntegration: Error exiting diagram mode:', err);
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
     * 显示自动连接菜单
     * @private
     */
    _showAutoLinkMenu(button) {
        const existingMenu = document.querySelector('.auto-link-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'auto-link-menu dropdown-menu';
        menu.innerHTML = `
            <div class="menu-section">
                <div class="menu-label">光线生成</div>
                <button data-action="append">生成链接（追加）</button>
                <button data-action="rebuild">生成链接（重建）</button>
                <button data-action="append-route">生成并自动布线</button>
            </div>
            <hr>
            <div class="menu-section">
                <div class="menu-hint">基于当前光线路径匹配连接点</div>
            </div>
        `;

        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '9000';

        document.body.appendChild(menu);

        menu.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action) {
                this._executeAutoLinkAction(action);
            }
            menu.remove();
        });

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
     * 执行自动连接操作
     * @private
     */
    _executeAutoLinkAction(action) {
        const options = {
            replace: action === 'rebuild',
            applyAutoRouting: action === 'append-route'
        };
        const result = this._generateRayLinksFromSimulation(options);
        if (!result) return;
        const message = result.error
            ? `自动连接失败：${result.error}`
            : `自动连接完成：新增 ${result.created} 条，跳过 ${result.skipped} 条`;
        if (typeof window !== 'undefined' && typeof window.showTemporaryMessage === 'function') {
            window.showTemporaryMessage(message, result.error ? 'error' : 'success');
        } else {
            console.log(message);
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
        menu.style.zIndex = '9000';
        
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
     * 从模拟光线路径生成连接
     * @private
     */
    _generateRayLinksFromSimulation(options = {}) {
        const rayLinkManager = this.modules.rayLinkManager;
        const connectionPointManager = this.modules.connectionPointManager;
        const components = window.components || [];
        const rays = options.rays || window.currentRayPaths || [];

        if (!rayLinkManager || !connectionPointManager) {
            return { created: 0, skipped: 0, total: 0, error: '连接系统未初始化' };
        }
        if (!Array.isArray(rays) || rays.length === 0) {
            return { created: 0, skipped: 0, total: 0, error: '当前没有可用光线路径' };
        }

        if (options.replace) {
            rayLinkManager.clear();
        }

        components.forEach(comp => {
            const componentId = comp.id || comp.uuid;
            if (!connectionPointManager.getComponentPoints(componentId).length) {
                connectionPointManager.initializeComponentPoints(comp);
            }
            connectionPointManager.updateComponentPoints(comp);
        });

        const maxDistance = typeof options.maxDistance === 'number' ? options.maxDistance : 28;
        const allowDuplicates = options.allowDuplicates === true;
        const existingKeys = new Set();

        const makeEndpointKey = (point) => `${point.componentId}:${point.pointId}`;
        const makePairKey = (a, b) => [makeEndpointKey(a), makeEndpointKey(b)].sort().join('|');

        if (!allowDuplicates) {
            rayLinkManager.getAllLinks().forEach(link => {
                existingKeys.add(makePairKey(
                    { componentId: link.sourceComponentId, pointId: link.sourcePointId },
                    { componentId: link.targetComponentId, pointId: link.targetPointId }
                ));
            });
        }

        let created = 0;
        let skipped = 0;
        const createdLinks = [];

        rays.forEach(ray => {
            const pathPoints = this._extractRayPathPoints(ray);
            if (!pathPoints || pathPoints.length < 2) {
                skipped += 1;
                return;
            }

            const start = pathPoints[0];
            const end = pathPoints[pathPoints.length - 1];
            const startPoint = connectionPointManager.findNearestPoint(start, null, maxDistance, { ignoreSnap: true });
            const endPoint = connectionPointManager.findNearestPoint(end, null, maxDistance, { ignoreSnap: true });

            if (!startPoint || !endPoint || startPoint.componentId === endPoint.componentId) {
                skipped += 1;
                return;
            }

            const pairKey = makePairKey(startPoint, endPoint);
            if (!allowDuplicates && existingKeys.has(pairKey)) {
                skipped += 1;
                return;
            }

            const color = typeof ray.getColor === 'function' ? ray.getColor() : (ray.color || '#ff0000');
            const width = typeof ray.getLineWidth === 'function' ? ray.getLineWidth() : (ray.lineWidth || 2);
            const lineStyle = ray.lineStyle || 'solid';

            const link = rayLinkManager.createLink({
                sourceComponentId: startPoint.componentId,
                sourcePointId: startPoint.pointId,
                targetComponentId: endPoint.componentId,
                targetPointId: endPoint.pointId,
                style: { color, width, lineStyle }
            });

            if (link) {
                created += 1;
                createdLinks.push(link);
                existingKeys.add(pairKey);
            } else {
                skipped += 1;
            }
        });

        if (options.applyAutoRouting && createdLinks.length > 0) {
            createdLinks.forEach(link => rayLinkManager.applyAutoRouting(link.id, components));
        }

        this._triggerRedraw();
        return { created, skipped, total: rays.length };
    }

    /**
     * 提取光线路径点（兼容Ray对象与普通点数组）
     * @private
     */
    _extractRayPathPoints(ray) {
        if (!ray) return null;
        let points = null;
        if (typeof ray.getPathPoints === 'function') {
            points = ray.getPathPoints();
        } else if (Array.isArray(ray.pathPoints)) {
            points = ray.pathPoints;
        } else if (Array.isArray(ray.path)) {
            points = ray.path;
        }
        if (!Array.isArray(points)) return null;
        const normalized = points
            .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
            .map(p => ({ x: p.x, y: p.y }));
        return normalized.length > 1 ? normalized : null;
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
        const angle = component.angle ?? component.angleRad ?? 0;
        const scale = component.scale || 1;
        const componentId = component.id || component.uuid;
        const styleManager = this.modules.styleManager;
        const componentStyle = componentId && styleManager ? styleManager.getComponentStyle(componentId) : null;
        const useCustomColor = componentStyle?.forceIconColor === true;
        const iconStyle = useCustomColor ? {
            preserveSvgColors: false,
            color: componentStyle?.color,
            fillColor: componentStyle?.fillColor,
            strokeWidth: componentStyle?.lineWidth,
            opacity: componentStyle?.opacity
        } : { preserveSvgColors: true, opacity: componentStyle?.opacity };
        
        this.modules.professionalIconManager.renderIcon(
            ctx, componentType, pos.x, pos.y, angle, scale, iconStyle
        );
        
        return true;
    }

    /**
     * 获取当前选中的绘图元件
     * @private
     */
    _getSelectedDiagramComponents() {
        if (typeof window !== 'undefined' && Array.isArray(window.components)) {
            const selected = window.components.filter(c => c && c.selected);
            if (selected.length > 0) return selected;
        }
        const selection = this.modules.interactionManager?.selection?.getSelectedItems?.() || [];
        return selection;
    }

    /**
     * 处理图标选择
     * @private
     */
    _handleIconSelect(iconType) {
        console.log(`DiagramModeIntegration: Icon selected - ${iconType}`);
        
        // 设置全局componentToAdd变量，让主应用处理组件添加
        if (typeof window !== 'undefined') {
            window.componentToAdd = iconType;
            
            // 更新光标
            const canvas = document.getElementById('opticsCanvas');
            if (canvas) {
                canvas.style.cursor = 'crosshair';
            }
        }
        
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
            z-index: 9500;
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
            z-index: 9000;
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
            initialConfig: {
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 40,
                useProfessionalIcons: true,
                includeNotes: false,
                includeGrid: false,
                format: 'pdf',
                dpi: 300,
                styleManager: this.modules.styleManager
            },
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
        const styleManager = this.modules.styleManager;
        const components = (window.components || []).map(comp => {
            const id = comp.id || comp.uuid;
            const style = id && styleManager ? styleManager.getComponentStyle(id) : null;
            return style ? { ...comp, style: { ...style } } : comp;
        });
        const rays = window.currentRayPaths || window.rays || [];
        const annotations = this.modules.annotationManager.getAllAnnotations();
        const notes = this.modules.technicalNotesManager.getAllNotes().map(n => n.text);
        const diagramLinks = this._buildDiagramLinksForExport(components);
        const professionalLabels = this.modules.professionalLabelManager?.getAllLabels().map(label => label.serialize()) || [];
        const gridSpacing = this.modules.layoutEngine?.gridSize || 20;
        const theme = this.modules.themeManager?.getCurrentTheme?.();
        const gridColor = theme?.globalStyle?.gridColor;

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
            notes,
            diagramLinks,
            professionalLabels,
            grid: {
                spacing: gridSpacing,
                color: gridColor
            }
        };
    }

    /**
     * 构建绘图模式连接光线导出数据
     * @private
     */
    _buildDiagramLinksForExport(components) {
        const rayLinkManager = this.modules.rayLinkManager;
        const connectionPointManager = this.modules.connectionPointManager;
        if (!rayLinkManager || !connectionPointManager) return [];

        components.forEach(comp => {
            const componentId = comp.id || comp.uuid;
            if (!connectionPointManager.getComponentPoints(componentId).length) {
                connectionPointManager.initializeComponentPoints(comp);
            }
            connectionPointManager.updateComponentPoints(comp);
        });

        return rayLinkManager.getAllLinks()
            .map(link => {
                const pathPoints = link.getPathPoints(connectionPointManager);
                return {
                    id: link.id,
                    pathPoints: Array.isArray(pathPoints) ? pathPoints.map(p => ({ x: p.x, y: p.y })) : [],
                    style: { ...link.style },
                    label: link.label || null,
                    labelPosition: link.labelPosition,
                    labelOffset: link.labelOffset ? { ...link.labelOffset } : null
                };
            })
            .filter(link => link.pathPoints.length >= 2);
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

            .dropdown-menu .menu-section {
                padding: 4px 0;
            }

            .dropdown-menu .menu-label {
                padding: 4px 12px;
                font-size: 11px;
                color: var(--text-secondary, #aaa);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .dropdown-menu .menu-hint {
                padding: 4px 12px 6px;
                font-size: 11px;
                color: var(--text-secondary, #888);
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

    /**
     * 是否处于光线链接模式
     * @returns {boolean}
     */
    isRayLinkModeActive() {
        return !!this._rayLinkModeActive;
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
