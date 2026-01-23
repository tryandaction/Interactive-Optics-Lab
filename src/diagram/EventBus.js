/**
 * EventBus.js - 事件总线系统
 * 提供模块间通信的事件发布/订阅机制
 * 
 * Requirements: 13.1, 13.2, 13.5, 13.6
 * 
 * Features:
 * - Event publishing and subscription
 * - Event history tracking
 * - Circular event detection
 * - Wildcard event patterns
 * - Event priority
 * - Automatic cleanup
 */

/**
 * 事件总线类
 * 实现发布/订阅模式，支持事件历史和循环检测
 */
export class EventBus {
    constructor(config = {}) {
        // 事件监听器映射 { eventName: [{ callback, context, priority, once }] }
        this.listeners = new Map();
        
        // 事件历史记录
        this.history = [];
        this.maxHistorySize = config.maxHistorySize || 100;
        this.enableHistory = config.enableHistory !== false;
        
        // 循环检测
        this.emitStack = [];
        this.maxEmitDepth = config.maxEmitDepth || 10;
        this.enableCircularDetection = config.enableCircularDetection !== false;
        
        // 统计信息
        this.stats = {
            totalEvents: 0,
            totalListeners: 0,
            circularDetections: 0
        };
    }

    /**
     * 订阅事件
     * @param {string} eventName - 事件名称，支持通配符 *
     * @param {Function} callback - 回调函数
     * @param {Object} context - 回调上下文
     * @param {number} priority - 优先级（数字越大优先级越高）
     * @returns {Function} 取消订阅函数
     */
    on(eventName, callback, context = null, priority = 0) {
        if (typeof eventName !== 'string' || !eventName) {
            throw new Error('Event name must be a non-empty string');
        }
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        
        const listener = {
            callback,
            context,
            priority,
            once: false,
            id: this._generateListenerId()
        };
        
        const listeners = this.listeners.get(eventName);
        listeners.push(listener);
        
        // 按优先级排序（高优先级在前）
        listeners.sort((a, b) => b.priority - a.priority);
        
        this.stats.totalListeners++;
        
        // 返回取消订阅函数
        return () => this.off(eventName, callback, context);
    }

    /**
     * 订阅一次性事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} context - 回调上下文
     * @param {number} priority - 优先级
     * @returns {Function} 取消订阅函数
     */
    once(eventName, callback, context = null, priority = 0) {
        if (typeof eventName !== 'string' || !eventName) {
            throw new Error('Event name must be a non-empty string');
        }
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        
        const listener = {
            callback,
            context,
            priority,
            once: true,
            id: this._generateListenerId()
        };
        
        const listeners = this.listeners.get(eventName);
        listeners.push(listener);
        
        // 按优先级排序
        listeners.sort((a, b) => b.priority - a.priority);
        
        this.stats.totalListeners++;
        
        return () => this.off(eventName, callback, context);
    }

    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数（可选）
     * @param {Object} context - 回调上下文（可选）
     */
    off(eventName, callback = null, context = null) {
        if (!this.listeners.has(eventName)) {
            return;
        }
        
        const listeners = this.listeners.get(eventName);
        
        if (!callback) {
            // 移除所有监听器
            this.stats.totalListeners -= listeners.length;
            this.listeners.delete(eventName);
            return;
        }
        
        // 移除匹配的监听器
        const initialLength = listeners.length;
        const filtered = listeners.filter(listener => {
            const match = listener.callback === callback && 
                         (context === null || listener.context === context);
            return !match;
        });
        
        this.stats.totalListeners -= (initialLength - filtered.length);
        
        if (filtered.length === 0) {
            this.listeners.delete(eventName);
        } else {
            this.listeners.set(eventName, filtered);
        }
    }

    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据
     * @returns {boolean} 是否成功发布
     */
    emit(eventName, data = null) {
        if (typeof eventName !== 'string' || !eventName) {
            throw new Error('Event name must be a non-empty string');
        }
        
        // 循环检测
        if (this.enableCircularDetection) {
            if (this._detectCircular(eventName)) {
                this.stats.circularDetections++;
                console.warn(`[EventBus] Circular event detected: ${eventName}`, {
                    stack: this.emitStack.slice(),
                    depth: this.emitStack.length
                });
                return false;
            }
        }
        
        // 记录到历史
        if (this.enableHistory) {
            this._addToHistory(eventName, data);
        }
        
        this.stats.totalEvents++;
        
        // 推入调用栈
        this.emitStack.push(eventName);
        
        try {
            // 获取直接监听器
            const directListeners = this.listeners.get(eventName) || [];
            
            // 获取通配符监听器
            const wildcardListeners = this.listeners.get('*') || [];
            
            // 合并并按优先级排序
            const allListeners = [...directListeners, ...wildcardListeners]
                .sort((a, b) => b.priority - a.priority);
            
            // 执行监听器
            const toRemove = [];
            
            for (const listener of allListeners) {
                try {
                    listener.callback.call(listener.context, {
                        eventName,
                        data,
                        timestamp: Date.now()
                    });
                    
                    // 标记一次性监听器待移除
                    if (listener.once) {
                        toRemove.push({ eventName, listener });
                    }
                } catch (error) {
                    console.error(`[EventBus] Error in event listener for "${eventName}":`, error);
                }
            }
            
            // 移除一次性监听器
            for (const { eventName: evtName, listener } of toRemove) {
                this.off(evtName, listener.callback, listener.context);
            }
            
            return true;
        } finally {
            // 弹出调用栈
            this.emitStack.pop();
        }
    }

    /**
     * 检测循环事件
     * @private
     */
    _detectCircular(eventName) {
        // 检查调用栈深度
        if (this.emitStack.length >= this.maxEmitDepth) {
            return true;
        }
        
        // 检查是否在当前调用栈中
        const count = this.emitStack.filter(name => name === eventName).length;
        if (count >= 2) {
            return true;
        }
        
        return false;
    }

    /**
     * 添加到历史记录
     * @private
     */
    _addToHistory(eventName, data) {
        this.history.push({
            eventName,
            data,
            timestamp: Date.now(),
            stack: this.emitStack.slice()
        });
        
        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * 生成监听器ID
     * @private
     */
    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取事件历史
     * @param {string} eventName - 事件名称（可选）
     * @param {number} limit - 限制数量
     * @returns {Array} 历史记录
     */
    getHistory(eventName = null, limit = null) {
        let history = this.history;
        
        if (eventName) {
            history = history.filter(entry => entry.eventName === eventName);
        }
        
        if (limit && limit > 0) {
            history = history.slice(-limit);
        }
        
        return history;
    }

    /**
     * 清除历史记录
     * @param {string} eventName - 事件名称（可选）
     */
    clearHistory(eventName = null) {
        if (eventName) {
            this.history = this.history.filter(entry => entry.eventName !== eventName);
        } else {
            this.history = [];
        }
    }

    /**
     * 获取所有监听器
     * @param {string} eventName - 事件名称（可选）
     * @returns {Array|Map} 监听器列表或映射
     */
    getListeners(eventName = null) {
        if (eventName) {
            return this.listeners.get(eventName) || [];
        }
        return new Map(this.listeners);
    }

    /**
     * 获取监听器数量
     * @param {string} eventName - 事件名称（可选）
     * @returns {number} 监听器数量
     */
    getListenerCount(eventName = null) {
        if (eventName) {
            const listeners = this.listeners.get(eventName);
            return listeners ? listeners.length : 0;
        }
        
        let total = 0;
        for (const listeners of this.listeners.values()) {
            total += listeners.length;
        }
        return total;
    }

    /**
     * 获取所有事件名称
     * @returns {Array} 事件名称列表
     */
    getEventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * 检查是否有监听器
     * @param {string} eventName - 事件名称
     * @returns {boolean} 是否有监听器
     */
    hasListeners(eventName) {
        return this.listeners.has(eventName) && this.listeners.get(eventName).length > 0;
    }

    /**
     * 移除所有监听器
     */
    removeAllListeners() {
        this.listeners.clear();
        this.stats.totalListeners = 0;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            currentListeners: this.getListenerCount(),
            eventTypes: this.listeners.size,
            historySize: this.history.length,
            emitStackDepth: this.emitStack.length
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalEvents: 0,
            totalListeners: this.getListenerCount(),
            circularDetections: 0
        };
    }

    /**
     * 销毁事件总线
     */
    destroy() {
        this.removeAllListeners();
        this.clearHistory();
        this.emitStack = [];
        this.resetStats();
    }

    /**
     * 调试信息
     * @returns {Object} 调试信息
     */
    debug() {
        const info = {
            stats: this.getStats(),
            eventNames: this.getEventNames(),
            listeners: {}
        };
        
        for (const [eventName, listeners] of this.listeners.entries()) {
            info.listeners[eventName] = listeners.map(l => ({
                priority: l.priority,
                once: l.once,
                hasContext: l.context !== null,
                id: l.id
            }));
        }
        
        return info;
    }
}

// ========== 单例模式 ==========
let eventBusInstance = null;

/**
 * 获取事件总线单例
 * @param {Object} config - 配置选项
 * @returns {EventBus} 事件总线实例
 */
export function getEventBus(config) {
    if (!eventBusInstance) {
        eventBusInstance = new EventBus(config);
    }
    return eventBusInstance;
}

/**
 * 重置事件总线单例
 */
export function resetEventBus() {
    if (eventBusInstance) {
        eventBusInstance.destroy();
    }
    eventBusInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.getEventBus = getEventBus;
    window.resetEventBus = resetEventBus;
}
