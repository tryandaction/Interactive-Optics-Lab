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

// ========== 诊断系统 ==========
export {
    DiagnosticSystem,
    getDiagnosticSystem,
    DiagnosticLevel
} from './DiagnosticSystem.js';

// ========== 事件总线 ==========
export {
    EventBus,
    getEventBus,
    resetEventBus
} from './EventBus.js';

// ========== 交互管理器 ==========
export {
    DragDropManager,
    getDragDropManager,
    resetDragDropManager
} from './DragDropManager.js';

export {
    SelectionManager,
    getSelectionManager,
    resetSelectionManager
} from './SelectionManager.js';

export {
    CanvasEventHandler,
    getCanvasEventHandler,
    resetCanvasEventHandler
} from './CanvasEventHandler.js';

export {
    FeedbackManager,
    getFeedbackManager,
    resetFeedbackManager,
    FeedbackType,
    CursorStyle
} from './FeedbackManager.js';

export {
    StateManager,
    DiagramState,
    getStateManager,
    resetStateManager
} from './StateManager.js';

export {
    EventBindingManager
} from './EventBindingManager.js';

export {
    ErrorHandler,
    getErrorHandler,
    createErrorHandler,
    resetErrorHandler,
    ErrorType,
    ErrorSeverity,
    RecoveryStrategy
} from './ErrorHandler.js';

export {
    TutorialManager,
    getTutorialManager,
    createTutorialManager,
    resetTutorialManager
} from './TutorialManager.js';

export {
    InitializationManager,
    getInitializationManager,
    resetInitializationManager
} from './InitializationManager.js';

export {
    DebugPanel,
    getDebugPanel,
    resetDebugPanel
} from './DebugPanel.js';

export {
    PerformanceOptimizer,
    getPerformanceOptimizer,
    resetPerformanceOptimizer
} from './PerformanceOptimizer.js';

export {
    KeyboardShortcutManager,
    getKeyboardShortcutManager,
    resetKeyboardShortcutManager
} from './KeyboardShortcutManager.js';

export {
    UnifiedHistoryManager,
    getUnifiedHistoryManager,
    resetUnifiedHistoryManager,
    createComponentAction,
    createAnnotationAction,
    createLayerAction,
    createStyleAction
} from './UnifiedHistoryManager.js';

// ========== 导入模块 ==========
export {
    SVGImporter,
    getSVGImporter,
    resetSVGImporter,
    ImageImporter,
    getImageImporter,
    resetImageImporter
} from './import/index.js';

// ========== 统一API ==========
export {
    ProfessionalDiagramAPI,
    getProfessionalDiagramAPI,
    resetProfessionalDiagramAPI
} from './ProfessionalDiagramAPI.js';

// ========== 集成示例 ==========
export {
    initializeProfessionalDiagramSystem,
    quickStart as quickStartDiagramSystem,
    createQuickStartConfig
} from './IntegrationExample.js';

export {
    ComprehensiveIntegration,
    createComprehensiveExample,
    getComprehensiveIntegration,
    resetComprehensiveIntegration
} from './ComprehensiveIntegrationExample.js';

export {
    NavigationIntegration,
    createNavigationExample,
    getNavigationIntegration,
    resetNavigationIntegration
} from './NavigationIntegrationExample.js';

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
    EXTENDED_SVG_ICONS,
    registerExtendedIcons,
    getExtendedIconTypes
} from './ProfessionalIconLibraryExtended.js';

export {
    registerExtendedIconsPart1,
    registerExtendedIconsPart2,
    registerExtendedIconsPart3,
    registerExtendedIconsPart4,
    registerAllExtendedIcons
} from './icons/ExtendedIconLibrary.js';

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

// DiagramTemplateSystem.js has been removed - use templates/index.js instead

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

// ========== 增强导出模块 ==========
export {
    EPSExporter,
    getEPSExporter,
    resetEPSExporter,
    HighDPIExporter,
    getHighDPIExporter,
    resetHighDPIExporter,
    DPI_PRESETS,
    PDFExporter,
    getPDFExporter,
    resetPDFExporter,
    PDF_PRESETS
} from './export/index.js';

// ========== 模式集成模块 ==========
export {
    DiagramToSimulationConverter,
    getDiagramToSimulationConverter,
    resetDiagramToSimulationConverter,
    SimulationToDiagramConverter,
    getSimulationToDiagramConverter,
    resetSimulationToDiagramConverter,
    ModeIntegrationManager,
    getModeIntegrationManager,
    resetModeIntegrationManager,
    Mode
} from './integration/index.js';

// ========== 导航模块 ==========
export {
    Minimap as NavigationMinimap,
    getMinimap as getNavigationMinimap,
    resetMinimap as resetNavigationMinimap
} from './navigation/index.js';

// ========== 测量工具模块 ==========
export {
    MeasurementTools,
    MeasurementResult,
    getMeasurementTools,
    resetMeasurementTools,
    MeasurementType,
    Units
} from './measurement/index.js';

// ========== 光学计算器模块 ==========
export {
    OpticsCalculator,
    PhysicalConstants,
    getOpticsCalculator,
    resetOpticsCalculator
} from './calculation/index.js';

// ========== 注释系统模块 ==========
export {
    Annotation as DiagramAnnotation,
    AnnotationManager as DiagramAnnotationManager,
    getAnnotationManager as getDiagramAnnotationManager,
    resetAnnotationManager as resetDiagramAnnotationManager,
    AnnotationType,
    LeaderLineStyle
} from './annotations/index.js';

// ========== 网格和对齐模块 ==========
export {
    GridManager,
    getGridManager,
    resetGridManager,
    GridType
} from './grid/index.js';

export {
    AlignmentManager,
    getAlignmentManager,
    resetAlignmentManager,
    AlignDirection as AlignmentDirection,
    DistributeDirection as DistributionDirection,
    AlignTarget
} from './alignment/index.js';

// ========== 图层管理模块 ==========
export {
    Layer,
    LayerManager,
    getLayerManager,
    resetLayerManager
} from './layers/index.js';

// ========== 样式和主题模块 ==========
export {
    StyleManager,
    getStyleManager,
    resetStyleManager
} from './styling/index.js';

export {
    ThemeManager,
    getThemeManager,
    resetThemeManager,
    BUILTIN_THEMES
} from './styling/index.js';

// ========== 布局模块 ==========
export {
    ForceDirectedLayout,
    getForceDirectedLayout,
    resetForceDirectedLayout,
    HierarchicalLayout,
    LayoutDirection,
    getHierarchicalLayout,
    resetHierarchicalLayout,
    LayoutManager,
    LayoutType,
    getLayoutManager,
    resetLayoutManager
} from './layout/index.js';

// ========== 验证模块 ==========
export {
    DiagramValidator,
    ValidationResult,
    getDiagramValidator,
    resetDiagramValidator
} from './validation/index.js';

// ========== 模板系统模块 ==========
export {
    TEMPLATE_LIBRARY,
    TEMPLATE_CATEGORIES,
    getAllTemplates,
    getTemplatesByCategory,
    getTemplateById,
    searchTemplates,
    AdvancedTemplateManager,
    TemplateBrowser,
    getAdvancedTemplateManager,
    resetAdvancedTemplateManager
} from './templates/index.js';

// 兼容旧代码的全局导出已移至 src/compat/legacy-globals.js
