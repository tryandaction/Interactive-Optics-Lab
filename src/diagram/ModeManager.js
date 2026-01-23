/**
 * ModeManager.js - 模式管理器
 * 管理模拟模式和专业绘图模式之间的切换
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 1.10, 1.11
 */

/**
 * 应用模式常量
 */
export const APP_MODES = {
    SIMULATION: 'simulation',
    DIAGRAM: 'diagram'
};

/**
 * 本地存储键名
 */
const STORAGE_KEYS = {
    CURRENT_MODE: 'opticslab_current_mode',
    DEFAULT_MODE: 'opticslab_default_mode',
    MODE_PREFERENCES: 'opticslab_mode_preferences'
};

/**
 * 模式管理器类
 * 负责管理应用的模式状态、切换和持久化
 */
export class ModeManager {
    /**
     * @param {Object} options - 配置选项
     * @param {Function} options.onModeChange - 模式切换回调
     * @param {Object} options.stateProvider - 状态提供者，用于获取和设置应用状态
     */
    constructor(options = {}) {
        /** @type {string} 当前模式 */
        this.currentMode = APP_MODES.SIMULATION;
        
        /** @type {string} 默认模式 */
        this.defaultMode = APP_MODES.SIMULATION;
        
        /** @type {Array<Function>} 模式切换监听器 */
        this.modeChangeListeners = [];
        
        /** @type {Object|null} 状态快照，用于模式切换时保存数据 */
        this.stateSnapshot = null;
        
        /** @type {Object} 状态提供者 */
        this.stateProvider = options.stateProvider || null;
        
        /** @type {Object} 模式特定的UI元素配置 */
        this.modeUIConfig = {
            [APP_MODES.SIMULATION]: {
                toolbars: ['simulation-toolbar'],
                panels: ['simulation-panel'],
                features: ['ray-tracing', 'animation', 'real-time-physics']
            },
            [APP_MODES.DIAGRAM]: {
                toolbars: ['diagram-toolbar'],
                panels: ['diagram-panel', 'symbol-library', 'annotation-tools', 'export-panel'],
                features: ['symbol-rendering', 'annotation', 'layout-optimization', 'export']
            }
        };

        // 注册外部回调
        if (options.onModeChange) {
            this.onModeChange(options.onModeChange);
        }

        // 初始化：加载保存的模式
        this._loadSavedMode();
    }

    /**
     * 获取当前模式
     * @returns {string} 当前模式
     */
    getMode() {
        return this.currentMode;
    }

    /**
     * 检查是否为模拟模式
     * @returns {boolean}
     */
    isSimulationMode() {
        return this.currentMode === APP_MODES.SIMULATION;
    }

    /**
     * 检查是否为绘图模式
     * @returns {boolean}
     */
    isDiagramMode() {
        return this.currentMode === APP_MODES.DIAGRAM;
    }

    /**
     * 切换到指定模式
     * @param {string} mode - 目标模式 ('simulation' | 'diagram')
     * @returns {boolean} 切换是否成功
     */
    switchMode(mode) {
        // 验证模式值
        if (!this._isValidMode(mode)) {
            console.error(`ModeManager: Invalid mode "${mode}". Valid modes are: ${Object.values(APP_MODES).join(', ')}`);
            return false;
        }

        // 如果已经是目标模式，不做任何操作
        if (this.currentMode === mode) {
            return true;
        }

        const oldMode = this.currentMode;
        const oldSnapshot = this.stateSnapshot;
        let rollbackNeeded = false;

        try {
            // 1. 捕获当前状态快照
            this.stateSnapshot = this._captureState();

            // 2. 通知所有监听器（模式切换前）
            this._notifyModeChange(oldMode, mode, 'before');

            // 3. 更新当前模式
            this.currentMode = mode;

            // 4. 更新UI
            this._updateUI(mode);

            // 5. 保存模式到本地存储
            this._saveCurrentMode(mode);

            // 6. 通知所有监听器（模式切换后）
            this._notifyModeChange(oldMode, mode, 'after');

            console.log(`ModeManager: Switched from ${oldMode} to ${mode}`);
            return true;

        } catch (error) {
            console.error('ModeManager: Error during mode switch:', error);
            rollbackNeeded = true;
            
            // 回滚到旧模式
            try {
                console.warn(`ModeManager: Rolling back to ${oldMode}`);
                this.currentMode = oldMode;
                this.stateSnapshot = oldSnapshot;
                this._updateUI(oldMode);
                this._saveCurrentMode(oldMode);
                
                // 通知监听器回滚
                this._notifyModeChange(mode, oldMode, 'rollback');
                
                console.log(`ModeManager: Successfully rolled back to ${oldMode}`);
            } catch (rollbackError) {
                console.error('ModeManager: Error during rollback:', rollbackError);
            }
            
            return false;
        }
    }

    /**
     * 切换模式（在两种模式之间切换）
     * @returns {string} 切换后的模式
     */
    toggleMode() {
        const newMode = this.currentMode === APP_MODES.SIMULATION 
            ? APP_MODES.DIAGRAM 
            : APP_MODES.SIMULATION;
        this.switchMode(newMode);
        return this.currentMode;
    }

    /**
     * 注册模式切换监听器
     * @param {Function} callback - 回调函数 (oldMode, newMode, phase, stateSnapshot) => void
     * @returns {Function} 取消注册的函数
     */
    onModeChange(callback) {
        if (typeof callback !== 'function') {
            console.error('ModeManager: onModeChange callback must be a function');
            return () => {};
        }

        this.modeChangeListeners.push(callback);

        // 返回取消注册的函数
        return () => {
            const index = this.modeChangeListeners.indexOf(callback);
            if (index > -1) {
                this.modeChangeListeners.splice(index, 1);
            }
        };
    }

    /**
     * 设置默认模式
     * @param {string} mode - 默认模式
     */
    setDefaultMode(mode) {
        if (!this._isValidMode(mode)) {
            console.error(`ModeManager: Invalid default mode "${mode}"`);
            return;
        }

        this.defaultMode = mode;
        this._saveDefaultMode(mode);
    }

    /**
     * 获取默认模式
     * @returns {string} 默认模式
     */
    getDefaultMode() {
        return this.defaultMode;
    }

    /**
     * 获取当前模式的UI配置
     * @returns {Object} UI配置
     */
    getCurrentModeUIConfig() {
        return this.modeUIConfig[this.currentMode] || {};
    }

    /**
     * 获取指定模式的功能列表
     * @param {string} mode - 模式
     * @returns {Array<string>} 功能列表
     */
    getModeFeatures(mode) {
        const config = this.modeUIConfig[mode];
        return config ? config.features : [];
    }

    /**
     * 检查当前模式是否支持指定功能
     * @param {string} feature - 功能名称
     * @returns {boolean}
     */
    isFeatureEnabled(feature) {
        const features = this.getModeFeatures(this.currentMode);
        return features.includes(feature);
    }

    /**
     * 获取状态快照
     * @returns {Object|null} 最近的状态快照
     */
    getStateSnapshot() {
        return this.stateSnapshot;
    }

    // ==================== 私有方法 ====================

    /**
     * 验证模式值是否有效
     * @private
     */
    _isValidMode(mode) {
        return Object.values(APP_MODES).includes(mode);
    }

    /**
     * 捕获当前状态
     * @private
     */
    _captureState() {
        const snapshot = {
            timestamp: Date.now(),
            mode: this.currentMode,
            components: [],
            annotations: [],
            cameraState: null,
            diagramSettings: null
        };

        // 如果有状态提供者，从中获取状态
        if (this.stateProvider) {
            try {
                if (typeof this.stateProvider.getComponents === 'function') {
                    const components = this.stateProvider.getComponents();
                    snapshot.components = components.map(c => 
                        typeof c.serialize === 'function' ? c.serialize() : { ...c }
                    );
                }

                if (typeof this.stateProvider.getAnnotations === 'function') {
                    snapshot.annotations = this.stateProvider.getAnnotations();
                }

                if (typeof this.stateProvider.getCameraState === 'function') {
                    snapshot.cameraState = this.stateProvider.getCameraState();
                }

                if (typeof this.stateProvider.getDiagramSettings === 'function') {
                    snapshot.diagramSettings = this.stateProvider.getDiagramSettings();
                }
            } catch (error) {
                console.warn('ModeManager: Error capturing state:', error);
            }
        }

        // 尝试从全局状态获取
        if (typeof window !== 'undefined') {
            if (window.components && snapshot.components.length === 0) {
                snapshot.components = window.components.map(c => 
                    typeof c.serialize === 'function' ? c.serialize() : { id: c.id, type: c.constructor?.name }
                );
            }
        }

        return snapshot;
    }

    /**
     * 通知所有监听器
     * @private
     */
    _notifyModeChange(oldMode, newMode, phase) {
        this.modeChangeListeners.forEach(listener => {
            try {
                listener(oldMode, newMode, phase, this.stateSnapshot);
            } catch (error) {
                console.error('ModeManager: Error in mode change listener:', error);
            }
        });
    }

    /**
     * 更新UI
     * @private
     */
    _updateUI(mode) {
        if (typeof document === 'undefined') return;

        const config = this.modeUIConfig[mode];
        if (!config) return;

        // 更新body的data属性
        document.body.dataset.appMode = mode;

        // 触发自定义事件，让UI组件响应
        const event = new CustomEvent('app-mode-change', {
            detail: {
                mode,
                config
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 从本地存储加载保存的模式
     * @private
     */
    _loadSavedMode() {
        if (typeof localStorage === 'undefined') return;

        try {
            // 加载默认模式
            const savedDefaultMode = localStorage.getItem(STORAGE_KEYS.DEFAULT_MODE);
            if (savedDefaultMode && this._isValidMode(savedDefaultMode)) {
                this.defaultMode = savedDefaultMode;
            }

            // 加载上次使用的模式
            const savedCurrentMode = localStorage.getItem(STORAGE_KEYS.CURRENT_MODE);
            if (savedCurrentMode && this._isValidMode(savedCurrentMode)) {
                this.currentMode = savedCurrentMode;
            } else {
                // 使用默认模式
                this.currentMode = this.defaultMode;
            }

            // 初始化UI
            this._updateUI(this.currentMode);

        } catch (error) {
            console.warn('ModeManager: Error loading saved mode:', error);
        }
    }

    /**
     * 保存当前模式到本地存储
     * @private
     */
    _saveCurrentMode(mode) {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEYS.CURRENT_MODE, mode);
        } catch (error) {
            console.warn('ModeManager: Error saving current mode:', error);
        }
    }

    /**
     * 保存默认模式到本地存储
     * @private
     */
    _saveDefaultMode(mode) {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEYS.DEFAULT_MODE, mode);
        } catch (error) {
            console.warn('ModeManager: Error saving default mode:', error);
        }
    }

    /**
     * 序列化模式管理器状态
     * @returns {Object} 序列化的状态
     */
    serialize() {
        return {
            currentMode: this.currentMode,
            defaultMode: this.defaultMode,
            stateSnapshot: this.stateSnapshot
        };
    }

    /**
     * 从序列化数据恢复状态
     * @param {Object} data - 序列化的数据
     */
    deserialize(data) {
        if (data.currentMode && this._isValidMode(data.currentMode)) {
            this.currentMode = data.currentMode;
        }
        if (data.defaultMode && this._isValidMode(data.defaultMode)) {
            this.defaultMode = data.defaultMode;
        }
        if (data.stateSnapshot) {
            this.stateSnapshot = data.stateSnapshot;
        }
        this._updateUI(this.currentMode);
    }
}

// 创建单例实例
let modeManagerInstance = null;

/**
 * 获取ModeManager单例实例
 * @param {Object} options - 配置选项（仅在首次调用时有效）
 * @returns {ModeManager}
 */
export function getModeManager(options = {}) {
    if (!modeManagerInstance) {
        modeManagerInstance = new ModeManager(options);
    }
    return modeManagerInstance;
}

/**
 * 重置ModeManager单例（主要用于测试）
 */
export function resetModeManager() {
    modeManagerInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ModeManager = ModeManager;
    window.APP_MODES = APP_MODES;
    window.getModeManager = getModeManager;
}
