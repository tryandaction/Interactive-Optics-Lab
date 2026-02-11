/**
 * StateManager.js - 状态管理器
 * 提供状态保存、加载、撤销/重做功能
 * 
 * Requirements: 11.2, 11.3, 11.6
 * 
 * Features:
 * - DiagramState data model
 * - Auto-save (30 second interval)
 * - Local storage save/load
 * - Undo/Redo (50 step history)
 * - State serialization
 */

import { getEventBus } from './EventBus.js';

/**
 * 图表状态数据模型
 */
export class DiagramState {
    constructor(data = {}) {
        this.timestamp = data.timestamp || Date.now();
        this.mode = data.mode || 'simulation';
        this.components = data.components || [];
        this.links = data.links || [];
        this.annotations = data.annotations || [];
        this.layers = data.layers || [];
        this.camera = data.camera || { x: 0, y: 0, zoom: 1 };
        this.selection = data.selection || [];
        this.metadata = data.metadata || {};
    }

    /**
     * 克隆状态
     * @returns {DiagramState} 新的状态副本
     */
    clone() {
        return new DiagramState({
            timestamp: this.timestamp,
            mode: this.mode,
            components: JSON.parse(JSON.stringify(this.components)),
            links: JSON.parse(JSON.stringify(this.links)),
            annotations: JSON.parse(JSON.stringify(this.annotations)),
            layers: JSON.parse(JSON.stringify(this.layers)),
            camera: { ...this.camera },
            selection: [...this.selection],
            metadata: { ...this.metadata }
        });
    }

    /**
     * 序列化为JSON
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            timestamp: this.timestamp,
            mode: this.mode,
            components: this.components,
            links: this.links,
            annotations: this.annotations,
            layers: this.layers,
            camera: this.camera,
            selection: this.selection,
            metadata: this.metadata
        };
    }

    /**
     * 从JSON反序列化
     * @param {Object} json - JSON对象
     * @returns {DiagramState} 状态实例
     */
    static fromJSON(json) {
        return new DiagramState(json);
    }
}

/**
 * 状态管理器类
 */
export class StateManager {
    constructor(config = {}) {
        this.eventBus = config.eventBus || getEventBus();
        
        // 配置
        this.autoSaveInterval = config.autoSaveInterval || 30000; // 30秒
        this.maxHistorySize = config.maxHistorySize || 50;
        this.storageKey = config.storageKey || 'diagram-state';
        this.enableAutoSave = config.enableAutoSave !== false;
        
        // 状态
        this.currentState = new DiagramState();
        this.history = []; // 历史记录栈
        this.historyIndex = -1; // 当前历史位置
        this.redoStack = []; // 重做栈
        
        // 自动保存
        this.autoSaveTimer = null;
        this.isDirty = false;
        
        // 统计
        this.stats = {
            totalSaves: 0,
            totalLoads: 0,
            totalUndos: 0,
            totalRedos: 0,
            autoSaves: 0
        };
        
        // 初始化
        this._initialize();
    }

    /**
     * 初始化
     * @private
     */
    _initialize() {
        // 启动自动保存
        if (this.enableAutoSave) {
            this._startAutoSave();
        }
        
        // 监听状态变化事件
        this._setupEventListeners();
        
        // 尝试加载上次保存的状态
        this._loadFromStorage();
    }

    /**
     * 设置事件监听
     * @private
     */
    _setupEventListeners() {
        // 监听可能改变状态的事件
        const stateChangeEvents = [
            'drag:drop',
            'canvas:drag-end',
            'canvas:delete',
            'link:created',
            'link:deleted',
            'mode:change',
            'selection:change'
        ];
        
        stateChangeEvents.forEach(eventType => {
            this.eventBus.on(eventType, () => {
                this.isDirty = true;
            });
        });
    }

    /**
     * 启动自动保存
     * @private
     */
    _startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.isDirty) {
                this.autoSave();
            }
        }, this.autoSaveInterval);
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
     * 获取当前状态
     * @returns {DiagramState} 当前状态
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * 设置当前状态
     * @param {DiagramState} state - 新状态
     * @param {boolean} addToHistory - 是否添加到历史记录
     */
    setState(state, addToHistory = true) {
        if (!(state instanceof DiagramState)) {
            state = new DiagramState(state);
        }
        
        if (addToHistory) {
            this._addToHistory(this.currentState.clone());
        }
        
        this.currentState = state;
        this.isDirty = true;
        
        this.eventBus.emit('state:changed', { state: this.currentState });
    }

    /**
     * 更新状态的部分属性
     * @param {Object} updates - 要更新的属性
     * @param {boolean} addToHistory - 是否添加到历史记录
     */
    updateState(updates, addToHistory = true) {
        if (addToHistory) {
            this._addToHistory(this.currentState.clone());
        }
        
        Object.assign(this.currentState, updates);
        this.currentState.timestamp = Date.now();
        this.isDirty = true;
        
        this.eventBus.emit('state:updated', { updates });
    }

    /**
     * 添加到历史记录
     * @private
     */
    _addToHistory(state) {
        // 如果不在历史末尾，清除后面的历史
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // 添加到历史
        this.history.push(state);
        
        // 限制历史大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        // 清空重做栈
        this.redoStack = [];
    }

    /**
     * 撤销
     * @returns {boolean} 是否成功撤销
     */
    undo() {
        if (!this.canUndo()) {
            return false;
        }
        
        // 保存当前状态到重做栈
        this.redoStack.push(this.currentState.clone());
        
        // 恢复历史状态
        this.currentState = this.history[this.historyIndex].clone();
        this.historyIndex--;
        
        this.stats.totalUndos++;
        this.isDirty = true;
        
        this.eventBus.emit('state:undo', { state: this.currentState });
        
        return true;
    }

    /**
     * 重做
     * @returns {boolean} 是否成功重做
     */
    redo() {
        if (!this.canRedo()) {
            return false;
        }
        
        // 从重做栈恢复
        const state = this.redoStack.pop();
        
        // 保存当前状态到历史
        this._addToHistory(this.currentState.clone());
        
        this.currentState = state;
        
        this.stats.totalRedos++;
        this.isDirty = true;
        
        this.eventBus.emit('state:redo', { state: this.currentState });
        
        return true;
    }

    /**
     * 是否可以撤销
     * @returns {boolean}
     */
    canUndo() {
        return this.historyIndex >= 0;
    }

    /**
     * 是否可以重做
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * 清除历史记录
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.redoStack = [];
        
        this.eventBus.emit('state:history-cleared', {});
    }

    /**
     * 保存到本地存储
     * @returns {boolean} 是否成功保存
     */
    saveToStorage() {
        try {
            const json = JSON.stringify(this.currentState.toJSON());
            localStorage.setItem(this.storageKey, json);
            
            this.stats.totalSaves++;
            this.isDirty = false;
            
            this.eventBus.emit('state:saved', { 
                storage: 'local',
                size: json.length 
            });
            
            return true;
        } catch (error) {
            console.error('[StateManager] Failed to save to storage:', error);
            this.eventBus.emit('state:save-error', { error });
            return false;
        }
    }

    /**
     * 从本地存储加载
     * @returns {boolean} 是否成功加载
     * @private
     */
    _loadFromStorage() {
        try {
            const json = localStorage.getItem(this.storageKey);
            if (!json) {
                return false;
            }
            
            const data = JSON.parse(json);
            this.currentState = DiagramState.fromJSON(data);
            
            this.stats.totalLoads++;
            this.isDirty = false;
            
            this.eventBus.emit('state:loaded', { 
                storage: 'local',
                timestamp: this.currentState.timestamp 
            });
            
            return true;
        } catch (error) {
            console.error('[StateManager] Failed to load from storage:', error);
            this.eventBus.emit('state:load-error', { error });
            return false;
        }
    }

    /**
     * 手动加载
     * @returns {boolean} 是否成功加载
     */
    loadFromStorage() {
        return this._loadFromStorage();
    }

    /**
     * 自动保存
     */
    autoSave() {
        if (this.saveToStorage()) {
            this.stats.autoSaves++;
            this.eventBus.emit('state:auto-saved', {});
        }
    }

    /**
     * 导出状态为JSON字符串
     * @param {boolean} pretty - 是否格式化
     * @returns {string} JSON字符串
     */
    exportToJSON(pretty = false) {
        const json = this.currentState.toJSON();
        return pretty ? JSON.stringify(json, null, 2) : JSON.stringify(json);
    }

    /**
     * 从JSON字符串导入状态
     * @param {string} jsonString - JSON字符串
     * @param {boolean} addToHistory - 是否添加到历史记录
     * @returns {boolean} 是否成功导入
     */
    importFromJSON(jsonString, addToHistory = true) {
        try {
            const data = JSON.parse(jsonString);
            const state = DiagramState.fromJSON(data);
            this.setState(state, addToHistory);
            
            this.eventBus.emit('state:imported', { 
                timestamp: state.timestamp 
            });
            
            return true;
        } catch (error) {
            console.error('[StateManager] Failed to import from JSON:', error);
            this.eventBus.emit('state:import-error', { error });
            return false;
        }
    }

    /**
     * 导出状态为文件
     * @param {string} filename - 文件名
     */
    exportToFile(filename = 'diagram-state.json') {
        const json = this.exportToJSON(true);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.eventBus.emit('state:exported-to-file', { filename });
    }

    /**
     * 从文件导入状态
     * @param {File} file - 文件对象
     * @param {boolean} addToHistory - 是否添加到历史记录
     * @returns {Promise<boolean>} 是否成功导入
     */
    async importFromFile(file, addToHistory = true) {
        try {
            const text = await file.text();
            return this.importFromJSON(text, addToHistory);
        } catch (error) {
            console.error('[StateManager] Failed to import from file:', error);
            this.eventBus.emit('state:import-error', { error });
            return false;
        }
    }

    /**
     * 获取历史记录信息
     * @returns {Object} 历史记录信息
     */
    getHistoryInfo() {
        return {
            size: this.history.length,
            index: this.historyIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            redoStackSize: this.redoStack.length
        };
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            historySize: this.history.length,
            historyIndex: this.historyIndex,
            redoStackSize: this.redoStack.length,
            isDirty: this.isDirty,
            autoSaveEnabled: this.enableAutoSave
        };
    }

    /**
     * 重置状态
     */
    reset() {
        this.currentState = new DiagramState();
        this.clearHistory();
        this.isDirty = false;
        
        this.eventBus.emit('state:reset', {});
    }

    /**
     * 销毁
     */
    destroy() {
        this._stopAutoSave();
        
        // 保存当前状态
        if (this.isDirty) {
            this.saveToStorage();
        }
        
        this.eventBus = null;
    }
}

// ========== 单例模式 ==========
let stateManagerInstance = null;

export function getStateManager(config) {
    if (!stateManagerInstance) {
        stateManagerInstance = new StateManager(config);
    }
    return stateManagerInstance;
}

export function resetStateManager() {
    if (stateManagerInstance) {
        stateManagerInstance.destroy();
    }
    stateManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
    window.DiagramState = DiagramState;
    window.getStateManager = getStateManager;
    window.resetStateManager = resetStateManager;
}
