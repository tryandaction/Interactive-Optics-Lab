/**
 * UnifiedHistoryManager.js - 统一历史记录管理器
 * 
 * 提供全局撤销/重做功能，支持：
 * - 所有diagram操作的撤销/重做
 * - 操作合并和批处理
 * - 历史记录限制
 * - 历史记录浏览
 * - 状态快照
 */

export class UnifiedHistoryManager {
    constructor(options = {}) {
        this.eventBus = options.eventBus;
        this.diagnosticSystem = options.diagnosticSystem;
        
        // 历史记录栈
        this.undoStack = [];
        this.redoStack = [];
        
        // 配置
        this.config = {
            maxHistorySize: options.maxHistorySize || 100,
            enableBatching: options.enableBatching !== false,
            batchTimeout: options.batchTimeout || 500
        };
        
        // 批处理
        this.currentBatch = null;
        this.batchTimer = null;
        
        // 状态
        this.isUndoing = false;
        this.isRedoing = false;
        this.enabled = true;
    }

    /**
     * 记录操作
     * @param {Object} action - 操作对象
     */
    record(action) {
        if (!this.enabled || this.isUndoing || this.isRedoing) {
            return;
        }
        
        // 验证操作
        if (!this._validateAction(action)) {
            this.diagnosticSystem?.log('warning', 'Invalid action recorded');
            return;
        }
        
        // 批处理
        if (this.config.enableBatching && action.batchable !== false) {
            this._addToBatch(action);
            return;
        }
        
        // 直接添加到历史记录
        this._addToHistory(action);
    }

    /**
     * 撤销
     * @returns {boolean} 是否成功
     */
    undo() {
        if (!this.canUndo()) {
            return false;
        }
        
        this.isUndoing = true;
        
        try {
            const action = this.undoStack.pop();
            
            // 执行撤销
            if (action.undo) {
                action.undo();
            } else if (action.restore) {
                action.restore(action.previousState);
            }
            
            // 添加到重做栈
            this.redoStack.push(action);
            
            // 限制重做栈大小
            if (this.redoStack.length > this.config.maxHistorySize) {
                this.redoStack.shift();
            }
            
            this.eventBus?.emit('history:undo', { action });
            
            return true;
            
        } catch (error) {
            this.diagnosticSystem?.log('error', `Undo failed: ${error.message}`);
            return false;
            
        } finally {
            this.isUndoing = false;
        }
    }

    /**
     * 重做
     * @returns {boolean} 是否成功
     */
    redo() {
        if (!this.canRedo()) {
            return false;
        }
        
        this.isRedoing = true;
        
        try {
            const action = this.redoStack.pop();
            
            // 执行重做
            if (action.redo) {
                action.redo();
            } else if (action.execute) {
                action.execute();
            } else if (action.restore) {
                action.restore(action.newState);
            }
            
            // 添加回撤销栈
            this.undoStack.push(action);
            
            this.eventBus?.emit('history:redo', { action });
            
            return true;
            
        } catch (error) {
            this.diagnosticSystem?.log('error', `Redo failed: ${error.message}`);
            return false;
            
        } finally {
            this.isRedoing = false;
        }
    }

    /**
     * 是否可以撤销
     * @returns {boolean}
     */
    canUndo() {
        return this.enabled && this.undoStack.length > 0;
    }

    /**
     * 是否可以重做
     * @returns {boolean}
     */
    canRedo() {
        return this.enabled && this.redoStack.length > 0;
    }

    /**
     * 清空历史记录
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.currentBatch = null;
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        
        this.eventBus?.emit('history:cleared');
    }

    /**
     * 开始批处理
     * @param {string} name - 批处理名称
     */
    beginBatch(name = 'Batch Operation') {
        this._flushBatch(); // 先刷新现有批处理
        
        this.currentBatch = {
            name,
            actions: [],
            timestamp: Date.now(),
            manual: true
        };
    }

    /**
     * 结束批处理
     */
    endBatch() {
        this._flushBatch();
    }

    /**
     * 添加到批处理
     * @private
     */
    _addToBatch(action) {
        if (!this.currentBatch) {
            this.currentBatch = {
                name: 'Auto Batch',
                actions: [],
                timestamp: Date.now()
            };
        }
        
        this.currentBatch.actions.push(action);
        
        if (this.currentBatch.manual) {
            return;
        }

        // 重置批处理计时器
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(() => {
            this._flushBatch();
        }, this.config.batchTimeout);
    }

    /**
     * 刷新批处理
     * @private
     */
    _flushBatch() {
        if (!this.currentBatch || this.currentBatch.actions.length === 0) {
            this.currentBatch = null;
            return;
        }

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        const batchActions = [...this.currentBatch.actions];

        // 创建批处理操作
        const batchAction = {
            type: 'batch',
            name: this.currentBatch.name,
            timestamp: this.currentBatch.timestamp,
            actions: batchActions,
            
            undo: () => {
                // 反向执行所有撤销
                for (let i = batchActions.length - 1; i >= 0; i--) {
                    const action = batchActions[i];
                    if (action.undo) {
                        action.undo();
                    } else if (action.restore) {
                        action.restore(action.previousState);
                    }
                }
            },
            
            redo: () => {
                // 正向执行所有重做
                for (const action of batchActions) {
                    if (action.redo) {
                        action.redo();
                    } else if (action.execute) {
                        action.execute();
                    } else if (action.restore) {
                        action.restore(action.newState);
                    }
                }
            }
        };
        
        this._addToHistory(batchAction);
        
        this.currentBatch = null;
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * 添加到历史记录
     * @private
     */
    _addToHistory(action) {
        // 添加时间戳
        if (!action.timestamp) {
            action.timestamp = Date.now();
        }
        
        // 添加到撤销栈
        this.undoStack.push(action);
        
        // 限制历史记录大小
        if (this.undoStack.length > this.config.maxHistorySize) {
            this.undoStack.shift();
        }
        
        // 清空重做栈
        this.redoStack = [];
        
        this.eventBus?.emit('history:recorded', { action });
    }

    /**
     * 验证操作
     * @private
     */
    _validateAction(action) {
        if (!action) return false;
        
        // 必须有撤销或恢复方法
        if (!action.undo && !action.restore) {
            return false;
        }
        
        // 如果有恢复方法，必须有状态
        if (action.restore && !action.previousState) {
            return false;
        }
        
        return true;
    }

    /**
     * 获取历史记录
     * @returns {Object}
     */
    getHistory() {
        return {
            undoStack: this.undoStack.map(a => ({
                type: a.type,
                name: a.name,
                timestamp: a.timestamp
            })),
            redoStack: this.redoStack.map(a => ({
                type: a.type,
                name: a.name,
                timestamp: a.timestamp
            })),
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    /**
     * 跳转到历史记录点
     * @param {number} index - 历史记录索引
     */
    goToHistoryPoint(index) {
        const currentIndex = this.undoStack.length - 1;
        
        if (index === currentIndex) {
            return true;
        }
        
        if (index < currentIndex) {
            // 撤销到指定点
            const steps = currentIndex - index;
            for (let i = 0; i < steps; i++) {
                if (!this.undo()) break;
            }
        } else {
            // 重做到指定点
            const steps = index - currentIndex;
            for (let i = 0; i < steps; i++) {
                if (!this.redo()) break;
            }
        }
        
        return true;
    }

    /**
     * 创建快照
     * @param {string} name - 快照名称
     * @param {Object} state - 状态数据
     */
    createSnapshot(name, state) {
        const snapshot = {
            type: 'snapshot',
            name,
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(state)), // 深拷贝
            
            restore: (snapshotState) => {
                this.eventBus?.emit('history:snapshot:restore', { 
                    name, 
                    state: snapshotState 
                });
            }
        };
        
        this.record({
            type: 'snapshot',
            name,
            previousState: state,
            newState: state,
            restore: snapshot.restore
        });
    }

    /**
     * 启用/禁用历史记录
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 获取统计信息
     * @returns {Object}
     */
    getStats() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            maxSize: this.config.maxHistorySize,
            enabled: this.enabled,
            batchingEnabled: this.config.enableBatching,
            currentBatch: this.currentBatch ? {
                name: this.currentBatch.name,
                actionCount: this.currentBatch.actions.length
            } : null
        };
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        return {
            config: this.config,
            enabled: this.enabled,
            // 注意：不序列化历史记录栈，因为包含函数
            stats: this.getStats()
        };
    }

    /**
     * 反序列化
     * @param {Object} data - 序列化数据
     */
    deserialize(data) {
        if (data.config) {
            this.config = { ...this.config, ...data.config };
        }
        
        if (typeof data.enabled === 'boolean') {
            this.enabled = data.enabled;
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.clear();
        this.enabled = false;
    }
}

// ========== 操作工厂函数 ==========

/**
 * 创建组件操作
 */
export function createComponentAction(type, component, previousState, newState) {
    return {
        type: `component:${type}`,
        name: `${type} Component`,
        componentId: component.id || component.uuid,
        previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
        newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
        
        undo: () => {
            if (previousState) {
                Object.assign(component, previousState);
            }
        },
        
        redo: () => {
            if (newState) {
                Object.assign(component, newState);
            }
        }
    };
}

/**
 * 创建标注操作
 */
export function createAnnotationAction(type, annotationManager, annotationId, data) {
    return {
        type: `annotation:${type}`,
        name: `${type} Annotation`,
        annotationId,
        data,
        
        undo: () => {
            if (type === 'create') {
                annotationManager.deleteAnnotation(annotationId);
            } else if (type === 'delete') {
                annotationManager.addAnnotation(data);
            } else if (type === 'modify') {
                annotationManager.updateAnnotation(annotationId, data.previous);
            }
        },
        
        redo: () => {
            if (type === 'create') {
                annotationManager.addAnnotation(data);
            } else if (type === 'delete') {
                annotationManager.deleteAnnotation(annotationId);
            } else if (type === 'modify') {
                annotationManager.updateAnnotation(annotationId, data.new);
            }
        }
    };
}

/**
 * 创建图层操作
 */
export function createLayerAction(type, layerManager, layerId, data) {
    return {
        type: `layer:${type}`,
        name: `${type} Layer`,
        layerId,
        data,
        
        undo: () => {
            if (type === 'create') {
                layerManager.deleteLayer(layerId);
            } else if (type === 'delete') {
                layerManager.createLayer(data);
            } else if (type === 'modify') {
                layerManager.updateLayer(layerId, data.previous);
            } else if (type === 'reorder') {
                layerManager.reorderLayers(data.previousOrder);
            }
        },
        
        redo: () => {
            if (type === 'create') {
                layerManager.createLayer(data);
            } else if (type === 'delete') {
                layerManager.deleteLayer(layerId);
            } else if (type === 'modify') {
                layerManager.updateLayer(layerId, data.new);
            } else if (type === 'reorder') {
                layerManager.reorderLayers(data.newOrder);
            }
        }
    };
}

/**
 * 创建样式操作
 */
export function createStyleAction(type, styleManager, targetId, previousStyle, newStyle) {
    return {
        type: `style:${type}`,
        name: `${type} Style`,
        targetId,
        previousStyle: previousStyle ? JSON.parse(JSON.stringify(previousStyle)) : null,
        newStyle: newStyle ? JSON.parse(JSON.stringify(newStyle)) : null,
        
        undo: () => {
            if (previousStyle) {
                styleManager.setComponentStyle(targetId, previousStyle);
            }
        },
        
        redo: () => {
            if (newStyle) {
                styleManager.setComponentStyle(targetId, newStyle);
            }
        }
    };
}

// ========== 单例模式 ==========
let historyManagerInstance = null;

export function getUnifiedHistoryManager(options) {
    if (!historyManagerInstance) {
        historyManagerInstance = new UnifiedHistoryManager(options);
    }
    return historyManagerInstance;
}

export function resetUnifiedHistoryManager() {
    if (historyManagerInstance) {
        historyManagerInstance.destroy();
        historyManagerInstance = null;
    }
}

// 全局导出
if (typeof window !== 'undefined') {
    window.UnifiedHistoryManager = UnifiedHistoryManager;
    window.getUnifiedHistoryManager = getUnifiedHistoryManager;
}
