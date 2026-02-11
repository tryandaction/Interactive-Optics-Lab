/**
 * InitializationManager - 初始化管理器
 * 
 * 负责按依赖顺序同步初始化所有diagram模块
 * 
 * 需求：6.1, 6.2, 6.3, 6.4
 */

import { getDiagnosticSystem } from './DiagnosticSystem.js';
import { getEventBus } from './EventBus.js';

// 模块依赖图
const MODULE_DEPENDENCIES = {
  // 核心模块 - 无依赖
  diagnosticSystem: [],
  eventBus: [],
  
  // 基础管理器 - 依赖核心模块
  modeManager: ['eventBus'],
  stateManager: ['eventBus'],
  errorHandler: ['eventBus'],
  eventBindingManager: ['eventBus'],
  
  // UI管理器 - 依赖基础管理器
  feedbackManager: ['eventBus'],
  tutorialManager: ['eventBus'],
  
  // 功能模块 - 依赖UI管理器
  dragDropManager: ['eventBus', 'feedbackManager'],
  selectionManager: ['eventBus'],
  canvasEventHandler: ['eventBus', 'selectionManager'],
  
  // 专业绘图模块
  professionalIconManager: [],
  connectionPointManager: ['eventBus'],
  rayLinkManager: ['eventBus', 'connectionPointManager'],
  iconBrowserPanel: ['professionalIconManager', 'dragDropManager'],
  
  // 高级功能
  layoutEngine: [],
  exportEngine: [],
  templateManager: [],
  interactionManager: ['eventBus', 'selectionManager']
};

export class InitializationManager {
  constructor() {
    this.diagnosticSystem = getDiagnosticSystem();
    this.eventBus = getEventBus();
    this.initializedModules = new Map();
    this.initializationOrder = [];
    this.initializationErrors = [];
  }

  /**
   * 同步初始化所有模块 (需求 6.1, 6.2)
   * @param {Object} context - 应用上下文
   * @returns {Object} 初始化结果
   */
  initializeAll(context = {}) {
    this.diagnosticSystem.log('info', 'InitializationManager: Starting initialization');
    
    try {
      // 1. 验证依赖关系
      this._validateDependencies();
      
      // 2. 计算初始化顺序
      this.initializationOrder = this._calculateInitializationOrder();
      this.diagnosticSystem.log('info', `Initialization order: ${this.initializationOrder.join(' -> ')}`);
      
      // 3. 按顺序初始化模块
      for (const moduleName of this.initializationOrder) {
        this._initializeModule(moduleName, context);
      }
      
      // 4. 验证所有模块已初始化
      this._verifyInitialization();
      
      this.diagnosticSystem.log('info', 'InitializationManager: All modules initialized successfully');
      
      return {
        success: true,
        modules: this.initializedModules,
        order: this.initializationOrder,
        errors: []
      };
      
    } catch (error) {
      this.diagnosticSystem.log('error', `InitializationManager: Initialization failed - ${error.message}`);
      
      return {
        success: false,
        modules: this.initializedModules,
        order: this.initializationOrder,
        errors: this.initializationErrors
      };
    }
  }

  /**
   * 验证依赖关系 (需求 6.3)
   * @private
   */
  _validateDependencies() {
    const allModules = Object.keys(MODULE_DEPENDENCIES);
    
    for (const [moduleName, dependencies] of Object.entries(MODULE_DEPENDENCIES)) {
      for (const dep of dependencies) {
        if (!allModules.includes(dep)) {
          throw new Error(`Module ${moduleName} depends on unknown module ${dep}`);
        }
      }
    }
    
    // 检测循环依赖
    this._detectCircularDependencies();
  }

  /**
   * 检测循环依赖
   * @private
   */
  _detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (module) => {
      visited.add(module);
      recursionStack.add(module);
      
      const dependencies = MODULE_DEPENDENCIES[module] || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          throw new Error(`Circular dependency detected: ${module} -> ${dep}`);
        }
      }
      
      recursionStack.delete(module);
      return false;
    };
    
    for (const module of Object.keys(MODULE_DEPENDENCIES)) {
      if (!visited.has(module)) {
        hasCycle(module);
      }
    }
  }

  /**
   * 计算初始化顺序 (拓扑排序) (需求 6.2)
   * @private
   */
  _calculateInitializationOrder() {
    const order = [];
    const visited = new Set();
    
    const visit = (module) => {
      if (visited.has(module)) return;
      
      visited.add(module);
      
      const dependencies = MODULE_DEPENDENCIES[module] || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      order.push(module);
    };
    
    for (const module of Object.keys(MODULE_DEPENDENCIES)) {
      visit(module);
    }
    
    return order;
  }

  /**
   * 初始化单个模块
   * @private
   */
  _initializeModule(moduleName, context) {
    try {
      this.diagnosticSystem.log('info', `Initializing module: ${moduleName}`);
      
      // 检查依赖是否已初始化
      const dependencies = MODULE_DEPENDENCIES[moduleName] || [];
      for (const dep of dependencies) {
        if (!this.initializedModules.has(dep)) {
          throw new Error(`Dependency ${dep} not initialized for ${moduleName}`);
        }
      }
      
      // 初始化模块
      const module = this._createModule(moduleName, context);
      
      if (module) {
        this.initializedModules.set(moduleName, module);
        this.eventBus.emit('module:initialized', { moduleName, module });
      }
      
    } catch (error) {
      const errorInfo = {
        module: moduleName,
        error: error.message,
        timestamp: Date.now()
      };
      
      this.initializationErrors.push(errorInfo);
      this.diagnosticSystem.log('error', `Failed to initialize ${moduleName}: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * 创建模块实例
   * @private
   */
  _createModule(moduleName, context) {
    // 动态导入和创建模块
    switch (moduleName) {
      case 'diagnosticSystem':
        return getDiagnosticSystem();
        
      case 'eventBus':
        return getEventBus();
        
      case 'modeManager': {
        const { getModeManager } = require('./ModeManager.js');
        return getModeManager({
          stateProvider: context.stateProvider,
          onModeChange: context.onModeChange
        });
      }
        
      case 'stateManager': {
        const { getStateManager } = require('./StateManager.js');
        return getStateManager();
      }
        
      case 'errorHandler': {
        const { createErrorHandler } = require('./ErrorHandler.js');
        const feedbackManager = this.initializedModules.get('feedbackManager');
        return createErrorHandler(this.eventBus, feedbackManager);
      }
        
      case 'eventBindingManager': {
        const { EventBindingManager } = require('./EventBindingManager.js');
        return new EventBindingManager(this.eventBus);
      }
        
      case 'feedbackManager': {
        const { getFeedbackManager } = require('./FeedbackManager.js');
        return getFeedbackManager();
      }
        
      case 'tutorialManager': {
        const { createTutorialManager } = require('./TutorialManager.js');
        return createTutorialManager(this.eventBus);
      }
        
      case 'dragDropManager': {
        const { getDragDropManager } = require('./DragDropManager.js');
        return getDragDropManager();
      }
        
      case 'selectionManager': {
        const { getSelectionManager } = require('./SelectionManager.js');
        return getSelectionManager();
      }
        
      case 'canvasEventHandler': {
        const { getCanvasEventHandler } = require('./CanvasEventHandler.js');
        return getCanvasEventHandler();
      }
        
      case 'professionalIconManager': {
        const { getProfessionalIconManager } = require('./ProfessionalIconManager.js');
        return getProfessionalIconManager();
      }
        
      case 'connectionPointManager': {
        const { getConnectionPointManager } = require('./ConnectionPointManager.js');
        return getConnectionPointManager();
      }
        
      case 'rayLinkManager': {
        const { getRayLinkManager } = require('./RayLinkManager.js');
        return getRayLinkManager();
      }
        
      case 'iconBrowserPanel': {
        const { getIconBrowserPanel } = require('./IconBrowserPanel.js');
        return getIconBrowserPanel(context.iconBrowserCallbacks);
      }
        
      case 'layoutEngine': {
        const { getLayoutEngine } = require('./LayoutEngine.js');
        return getLayoutEngine();
      }
        
      case 'exportEngine': {
        const { getExportEngine } = require('./ExportEngine.js');
        return getExportEngine();
      }
        
      case 'templateManager': {
        const { getAdvancedTemplateManager } = require('./templates/index.js');
        return getAdvancedTemplateManager();
      }
        
      case 'interactionManager': {
        const { getInteractionManager } = require('./InteractionManager.js');
        return getInteractionManager();
      }
        
      default:
        this.diagnosticSystem.log('warning', `Unknown module: ${moduleName}`);
        return null;
    }
  }

  /**
   * 验证初始化完成 (需求 6.4)
   * @private
   */
  _verifyInitialization() {
    const requiredModules = Object.keys(MODULE_DEPENDENCIES);
    const missingModules = requiredModules.filter(m => !this.initializedModules.has(m));
    
    if (missingModules.length > 0) {
      throw new Error(`Missing modules: ${missingModules.join(', ')}`);
    }
    
    this.diagnosticSystem.log('info', 'All required modules initialized');
  }

  /**
   * 激活模块 (需求 6.4)
   * @param {string} moduleName - 模块名称
   */
  activate(moduleName) {
    const module = this.initializedModules.get(moduleName);
    if (!module) {
      this.diagnosticSystem.log('warning', `Cannot activate uninitialized module: ${moduleName}`);
      return false;
    }
    
    if (typeof module.activate === 'function') {
      try {
        module.activate();
        this.eventBus.emit('module:activated', { moduleName });
        this.diagnosticSystem.log('info', `Module activated: ${moduleName}`);
        return true;
      } catch (error) {
        this.diagnosticSystem.log('error', `Failed to activate ${moduleName}: ${error.message}`);
        return false;
      }
    }
    
    return true; // Module doesn't have activate method
  }

  /**
   * 停用模块 (需求 6.4)
   * @param {string} moduleName - 模块名称
   */
  deactivate(moduleName) {
    const module = this.initializedModules.get(moduleName);
    if (!module) {
      this.diagnosticSystem.log('warning', `Cannot deactivate uninitialized module: ${moduleName}`);
      return false;
    }
    
    if (typeof module.deactivate === 'function') {
      try {
        module.deactivate();
        this.eventBus.emit('module:deactivated', { moduleName });
        this.diagnosticSystem.log('info', `Module deactivated: ${moduleName}`);
        return true;
      } catch (error) {
        this.diagnosticSystem.log('error', `Failed to deactivate ${moduleName}: ${error.message}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取模块
   * @param {string} moduleName - 模块名称
   * @returns {Object|null}
   */
  getModule(moduleName) {
    return this.initializedModules.get(moduleName) || null;
  }

  /**
   * 获取所有模块
   * @returns {Map}
   */
  getAllModules() {
    return new Map(this.initializedModules);
  }

  /**
   * 获取初始化报告
   * @returns {Object}
   */
  getInitializationReport() {
    return {
      totalModules: Object.keys(MODULE_DEPENDENCIES).length,
      initializedModules: this.initializedModules.size,
      initializationOrder: this.initializationOrder,
      errors: this.initializationErrors,
      modules: Array.from(this.initializedModules.keys())
    };
  }

  /**
   * 销毁所有模块
   */
  destroy() {
    // 按相反顺序销毁
    const reverseOrder = [...this.initializationOrder].reverse();
    
    for (const moduleName of reverseOrder) {
      const module = this.initializedModules.get(moduleName);
      if (module && typeof module.destroy === 'function') {
        try {
          module.destroy();
          this.diagnosticSystem.log('info', `Module destroyed: ${moduleName}`);
        } catch (error) {
          this.diagnosticSystem.log('error', `Failed to destroy ${moduleName}: ${error.message}`);
        }
      }
    }
    
    this.initializedModules.clear();
    this.initializationOrder = [];
    this.initializationErrors = [];
  }
}

// 单例实例
let initializationManagerInstance = null;

export function getInitializationManager() {
  if (!initializationManagerInstance) {
    initializationManagerInstance = new InitializationManager();
  }
  return initializationManagerInstance;
}

export function resetInitializationManager() {
  if (initializationManagerInstance) {
    initializationManagerInstance.destroy();
    initializationManagerInstance = null;
  }
}
