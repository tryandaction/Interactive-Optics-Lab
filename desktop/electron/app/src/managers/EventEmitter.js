/**
 * EventEmitter.js - 事件发射器基类
 * 提供类型安全的事件订阅和发布机制
 */

/**
 * 事件发射器基类
 * 所有需要事件通信的管理器都应继承此类
 */
export class EventEmitter {
    constructor() {
        /** @type {Map<string, Function[]>} */
        this._listeners = new Map();
        
        /** @type {Map<string, Function[]>} */
        this._onceListeners = new Map();
    }

    /**
     * 注册事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {this} 返回自身以支持链式调用
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return this;
    }

    /**
     * 注册一次性事件监听器（触发后自动移除）
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {this} 返回自身以支持链式调用
     */
    once(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this._onceListeners.has(event)) {
            this._onceListeners.set(event, []);
        }
        this._onceListeners.get(event).push(callback);
        return this;
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 要移除的回调函数
     * @returns {this} 返回自身以支持链式调用
     */
    off(event, callback) {
        // 从普通监听器中移除
        if (this._listeners.has(event)) {
            const callbacks = this._listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this._listeners.delete(event);
            }
        }
        
        // 从一次性监听器中移除
        if (this._onceListeners.has(event)) {
            const callbacks = this._onceListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this._onceListeners.delete(event);
            }
        }
        
        return this;
    }

    /**
     * 移除指定事件的所有监听器
     * @param {string} [event] - 事件名称，如果不提供则移除所有事件的监听器
     * @returns {this} 返回自身以支持链式调用
     */
    removeAllListeners(event) {
        if (event) {
            this._listeners.delete(event);
            this._onceListeners.delete(event);
        } else {
            this._listeners.clear();
            this._onceListeners.clear();
        }
        return this;
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} [data] - 事件数据
     * @returns {boolean} 是否有监听器被调用
     */
    emit(event, data) {
        let called = false;
        
        // 调用普通监听器
        if (this._listeners.has(event)) {
            const callbacks = [...this._listeners.get(event)]; // 复制数组以防止迭代时修改
            for (const callback of callbacks) {
                try {
                    callback(data);
                    called = true;
                } catch (e) {
                    console.error(`Error in event listener for "${event}":`, e);
                }
            }
        }
        
        // 调用一次性监听器
        if (this._onceListeners.has(event)) {
            const callbacks = this._onceListeners.get(event);
            this._onceListeners.delete(event); // 清除一次性监听器
            
            for (const callback of callbacks) {
                try {
                    callback(data);
                    called = true;
                } catch (e) {
                    console.error(`Error in once listener for "${event}":`, e);
                }
            }
        }
        
        return called;
    }

    /**
     * 异步触发事件（等待所有异步监听器完成）
     * @param {string} event - 事件名称
     * @param {*} [data] - 事件数据
     * @returns {Promise<boolean>} 是否有监听器被调用
     */
    async emitAsync(event, data) {
        const promises = [];
        let called = false;
        
        // 调用普通监听器
        if (this._listeners.has(event)) {
            const callbacks = [...this._listeners.get(event)];
            for (const callback of callbacks) {
                promises.push(
                    Promise.resolve().then(() => callback(data)).catch(e => {
                        console.error(`Error in async event listener for "${event}":`, e);
                    })
                );
                called = true;
            }
        }
        
        // 调用一次性监听器
        if (this._onceListeners.has(event)) {
            const callbacks = this._onceListeners.get(event);
            this._onceListeners.delete(event);
            
            for (const callback of callbacks) {
                promises.push(
                    Promise.resolve().then(() => callback(data)).catch(e => {
                        console.error(`Error in async once listener for "${event}":`, e);
                    })
                );
                called = true;
            }
        }
        
        await Promise.all(promises);
        return called;
    }

    /**
     * 获取指定事件的监听器数量
     * @param {string} event - 事件名称
     * @returns {number} 监听器数量
     */
    listenerCount(event) {
        let count = 0;
        if (this._listeners.has(event)) {
            count += this._listeners.get(event).length;
        }
        if (this._onceListeners.has(event)) {
            count += this._onceListeners.get(event).length;
        }
        return count;
    }

    /**
     * 获取所有已注册的事件名称
     * @returns {string[]} 事件名称数组
     */
    eventNames() {
        const names = new Set([
            ...this._listeners.keys(),
            ...this._onceListeners.keys()
        ]);
        return [...names];
    }

    /**
     * 检查是否有指定事件的监听器
     * @param {string} event - 事件名称
     * @returns {boolean} 是否有监听器
     */
    hasListeners(event) {
        return this.listenerCount(event) > 0;
    }

    /**
     * 销毁事件发射器，清理所有监听器
     */
    destroy() {
        this._listeners.clear();
        this._onceListeners.clear();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.EventEmitter = EventEmitter;
}
