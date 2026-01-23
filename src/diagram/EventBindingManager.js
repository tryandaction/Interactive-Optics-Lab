/**
 * EventBindingManager - 事件绑定管理器
 * 
 * 提供统一的事件绑定机制，包括：
 * - 事件委托
 * - 元素存在性检查
 * - 防重复绑定
 * - 异常捕获
 * 
 * 需求：7.1, 7.2, 7.3, 7.4, 7.5
 */

export class EventBindingManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.bindings = new Map(); // 存储所有绑定: key -> {element, event, handler, wrappedHandler}
    this.delegatedBindings = new Map(); // 存储委托绑定
    this.bindingCounter = 0;
  }

  /**
   * 绑定事件到元素
   * @param {HTMLElement|string} elementOrSelector - 元素或选择器
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 选项
   * @returns {string|null} 绑定ID，失败返回null
   */
  bind(elementOrSelector, eventType, handler, options = {}) {
    const {
      checkExistence = true,
      captureException = true,
      preventDuplicate = true,
      context = null
    } = options;

    // 获取元素
    const element = this._resolveElement(elementOrSelector);
    
    // 检查元素存在性 (需求 7.2)
    if (checkExistence && !this._checkElementExists(element)) {
      console.warn(`[EventBindingManager] Element not found: ${elementOrSelector}`);
      this.eventBus?.emit('event:binding:failed', {
        selector: elementOrSelector,
        eventType,
        reason: 'element_not_found'
      });
      return null;
    }

    // 防止重复绑定 (需求 7.4)
    if (preventDuplicate) {
      const existingBinding = this._findExistingBinding(element, eventType, handler);
      if (existingBinding) {
        console.warn(`[EventBindingManager] Duplicate binding prevented: ${eventType} on`, element);
        return existingBinding;
      }
    }

    // 包装处理函数以捕获异常 (需求 7.5)
    const wrappedHandler = captureException
      ? this._wrapWithExceptionHandler(handler, eventType, element, context)
      : handler.bind(context || this);

    // 添加事件监听器
    element.addEventListener(eventType, wrappedHandler);

    // 记录绑定
    const bindingId = `binding_${this.bindingCounter++}`;
    this.bindings.set(bindingId, {
      element,
      eventType,
      handler,
      wrappedHandler,
      selector: typeof elementOrSelector === 'string' ? elementOrSelector : null
    });

    this.eventBus?.emit('event:binding:added', {
      bindingId,
      eventType,
      element
    });

    return bindingId;
  }

  /**
   * 使用事件委托绑定事件
   * @param {HTMLElement|string} containerOrSelector - 容器元素或选择器
   * @param {string} targetSelector - 目标元素选择器
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 选项
   * @returns {string|null} 绑定ID
   */
  delegate(containerOrSelector, targetSelector, eventType, handler, options = {}) {
    const container = this._resolveElement(containerOrSelector);
    
    if (!this._checkElementExists(container)) {
      console.warn(`[EventBindingManager] Container not found: ${containerOrSelector}`);
      return null;
    }

    // 创建委托处理函数
    const delegatedHandler = (event) => {
      const target = event.target.closest(targetSelector);
      if (target && container.contains(target)) {
        handler.call(target, event);
      }
    };

    // 使用标准绑定方法
    const bindingId = this.bind(container, eventType, delegatedHandler, {
      ...options,
      preventDuplicate: false // 委托绑定允许多个
    });

    if (bindingId) {
      this.delegatedBindings.set(bindingId, {
        container,
        targetSelector,
        eventType,
        handler
      });
    }

    return bindingId;
  }

  /**
   * 解除绑定
   * @param {string} bindingId - 绑定ID
   * @returns {boolean} 是否成功
   */
  unbind(bindingId) {
    const binding = this.bindings.get(bindingId);
    if (!binding) {
      return false;
    }

    const { element, eventType, wrappedHandler } = binding;
    element.removeEventListener(eventType, wrappedHandler);

    this.bindings.delete(bindingId);
    this.delegatedBindings.delete(bindingId);

    this.eventBus?.emit('event:binding:removed', {
      bindingId,
      eventType
    });

    return true;
  }

  /**
   * 解除元素的所有绑定
   * @param {HTMLElement|string} elementOrSelector - 元素或选择器
   * @returns {number} 解除的绑定数量
   */
  unbindAll(elementOrSelector) {
    const element = this._resolveElement(elementOrSelector);
    let count = 0;

    for (const [bindingId, binding] of this.bindings.entries()) {
      if (binding.element === element) {
        this.unbind(bindingId);
        count++;
      }
    }

    return count;
  }

  /**
   * 解除特定事件类型的所有绑定 (需求 7.3)
   * @param {string} eventType - 事件类型
   * @returns {number} 解除的绑定数量
   */
  unbindByEventType(eventType) {
    let count = 0;

    for (const [bindingId, binding] of this.bindings.entries()) {
      if (binding.eventType === eventType) {
        this.unbind(bindingId);
        count++;
      }
    }

    return count;
  }

  /**
   * 清除所有绑定 (需求 7.3)
   */
  clear() {
    const bindingIds = Array.from(this.bindings.keys());
    bindingIds.forEach(id => this.unbind(id));
    
    this.eventBus?.emit('event:bindings:cleared', {
      count: bindingIds.length
    });
  }

  /**
   * 获取所有绑定信息
   * @returns {Array} 绑定信息数组
   */
  getBindings() {
    return Array.from(this.bindings.entries()).map(([id, binding]) => ({
      id,
      eventType: binding.eventType,
      selector: binding.selector,
      element: binding.element.tagName,
      isDelegated: this.delegatedBindings.has(id)
    }));
  }

  /**
   * 检查元素是否存在于DOM中
   * @private
   */
  _checkElementExists(element) {
    if (!element) return false;
    if (element === document || element === window) return true;
    return document.contains(element);
  }

  /**
   * 解析元素
   * @private
   */
  _resolveElement(elementOrSelector) {
    if (typeof elementOrSelector === 'string') {
      return document.querySelector(elementOrSelector);
    }
    return elementOrSelector;
  }

  /**
   * 查找已存在的绑定
   * @private
   */
  _findExistingBinding(element, eventType, handler) {
    for (const [bindingId, binding] of this.bindings.entries()) {
      if (binding.element === element &&
          binding.eventType === eventType &&
          binding.handler === handler) {
        return bindingId;
      }
    }
    return null;
  }

  /**
   * 包装处理函数以捕获异常
   * @private
   */
  _wrapWithExceptionHandler(handler, eventType, element, context) {
    return (event) => {
      try {
        handler.call(context || this, event);
      } catch (error) {
        console.error(`[EventBindingManager] Error in ${eventType} handler:`, error);
        
        this.eventBus?.emit('event:handler:error', {
          eventType,
          element,
          error: error.message,
          stack: error.stack
        });

        // 不重新抛出错误，避免中断其他事件处理
      }
    };
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.clear();
    this.bindings.clear();
    this.delegatedBindings.clear();
    this.eventBus = null;
  }
}
