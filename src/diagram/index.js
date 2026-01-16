/**
 * Diagram Mode Module - 专业绘图模式模块
 * 提供论文发表级光路图导出功能
 */

export { ModeManager, APP_MODES, getModeManager, resetModeManager } from './ModeManager.js';
export { ModeSwitcher, createModeSwitcher } from './ModeSwitcher.js';
export { SymbolLibrary, getSymbolLibrary, resetSymbolLibrary } from './SymbolLibrary.js';
export { Annotation, AnnotationManager, getAnnotationManager, resetAnnotationManager, SUBSCRIPT_MAP, SUPERSCRIPT_MAP } from './AnnotationSystem.js';
export { 
    LayoutEngine, 
    ComponentGroup, 
    AlignDirection, 
    DistributeDirection, 
    getLayoutEngine, 
    resetLayoutEngine 
} from './LayoutEngine.js';
export { 
    ExportEngine, 
    ExportFormat, 
    getExportEngine, 
    resetExportEngine 
} from './ExportEngine.js';
export { 
    ExportDialog, 
    CropSelector, 
    getExportDialog, 
    openExportDialog 
} from './ExportUI.js';
export { 
    RayStyleManager, 
    LineStyle, 
    ColorSchemes, 
    getRayStyleManager, 
    resetRayStyleManager 
} from './RayStyleManager.js';
export { 
    TechnicalNotesManager, 
    NoteItem, 
    NoteType, 
    getTechnicalNotesManager, 
    resetTechnicalNotesManager 
} from './TechnicalNotes.js';
export { 
    ParameterDisplayManager, 
    ParameterUnits, 
    LabelPosition, 
    getParameterDisplayManager, 
    resetParameterDisplayManager 
} from './ParameterDisplay.js';
export { 
    TemplateManager, 
    ExportTemplate, 
    TemplateType, 
    getTemplateManager, 
    resetTemplateManager 
} from './TemplateManager.js';
export { 
    BatchExportManager, 
    BatchExportTask, 
    BatchExportStatus, 
    NamingPattern, 
    getBatchExportManager, 
    resetBatchExportManager 
} from './BatchExport.js';
export { 
    DiagramModeIntegration, 
    getDiagramModeIntegration, 
    initializeDiagramMode, 
    resetDiagramModeIntegration 
} from './DiagramModeIntegration.js';

// ========== 专业绘图模式新模块 ==========
export {
    ProfessionalIconManager,
    getProfessionalIconManager,
    resetProfessionalIconManager,
    CONNECTION_POINT_TYPES,
    ICON_CATEGORIES
} from './ProfessionalIconManager.js';

export {
    PROFESSIONAL_SVG_ICONS,
    registerProfessionalIcons,
    getAvailableProfessionalIcons,
    getProfessionalIconsByCategory,
    getProfessionalIconCategories
} from './ProfessionalIconLibrary.js';

export {
    ConnectionPointManager,
    ConnectionPointInstance,
    getConnectionPointManager,
    resetConnectionPointManager,
    CONNECTION_POINT_STYLES
} from './ConnectionPointManager.js';

export {
    RayLink,
    RayLinkManager,
    getRayLinkManager,
    resetRayLinkManager,
    RAY_LINK_STYLES,
    LINE_STYLES
} from './RayLinkManager.js';

export {
    IconBrowserPanel,
    getIconBrowserPanel,
    resetIconBrowserPanel
} from './IconBrowserPanel.js';

export {
    ProfessionalLabel,
    ProfessionalLabelManager,
    getProfessionalLabelManager,
    resetProfessionalLabelManager,
    LABEL_COLOR_PRESETS,
    GREEK_LETTERS
} from './ProfessionalLabelSystem.js';

export {
    TechnicalNotesArea,
    TechnicalNoteSection,
    getTechnicalNotesArea,
    resetTechnicalNotesArea,
    SECTION_COLOR_PRESETS
} from './TechnicalNotesArea.js';

export {
    ProfessionalExporter,
    getProfessionalExporter,
    resetProfessionalExporter,
    EXPORT_PRESETS
} from './ProfessionalExport.js';

export {
    InteractionManager,
    HistoryManager,
    SelectionManager,
    ClipboardManager,
    GroupManager,
    Action,
    ActionType,
    getInteractionManager,
    resetInteractionManager
} from './InteractionManager.js';

export {
    DiagramTemplate,
    DiagramTemplateManager,
    TemplateBrowserPanel,
    getDiagramTemplateManager,
    resetDiagramTemplateManager,
    TEMPLATE_CATEGORIES,
    CATEGORY_NAMES,
    BUILTIN_TEMPLATES
} from './DiagramTemplateSystem.js';

export {
    CustomConnectionPointEditor,
    getCustomConnectionPointEditor,
    resetCustomConnectionPointEditor
} from './CustomConnectionPointEditor.js';

export {
    AutoRouter,
    PathPoint,
    getAutoRouter,
    resetAutoRouter,
    ROUTING_STYLES,
    ROUTING_STYLE_NAMES
} from './AutoRouter.js';

export {
    Minimap,
    getMinimap,
    resetMinimap
} from './Minimap.js';

// 兼容旧代码的全局导出已移至 src/compat/legacy-globals.js
