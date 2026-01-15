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

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    import('./ModeManager.js').then(module => {
        window.ModeManager = module.ModeManager;
        window.APP_MODES = module.APP_MODES;
        window.getModeManager = module.getModeManager;
    });
    import('./ModeSwitcher.js').then(module => {
        window.ModeSwitcher = module.ModeSwitcher;
        window.createModeSwitcher = module.createModeSwitcher;
    });
    import('./SymbolLibrary.js').then(module => {
        window.SymbolLibrary = module.SymbolLibrary;
        window.getSymbolLibrary = module.getSymbolLibrary;
    });
}
