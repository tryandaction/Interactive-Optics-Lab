/**
 * ErrorHandler - 错误处理系统
 * 
 * 提供统一的错误处理机制，包括：
 * - 错误分类
 * - 恢复策略
 * - 用户友好的错误消息
 * - 全局错误捕获
 * 
 * 需求：11.1, 11.4, 11.5, 11.7
 */

// 错误类型
export const ErrorType = {
  INITIALIZATION: 'initialization',
  RENDERING: 'rendering',
  USER_INPUT: 'user_input',
  STATE: 'state',
  NETWORK: 'network',
  RESOURCE: 'resource',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// 错误严重程度
export const ErrorSeverity = {
  LOW: 'low',           // 可忽略的警告
  MEDIUM: 'medium',     // 需要注意但不影响核心功能
  HIGH: 'high',         // 影响功能但可恢复
  CRITICAL: 'critical'  // 严重错误，需要立即处理
};

// 恢复策略
export const RecoveryStrategy = {
  IGNORE: 'ignore',           // 忽略错误
  RETRY: 'retry',             // 重试操作
  FALLBACK: 'fallback',       // 使用备用方案
  RESET_STATE: 'reset_state', // 重置状态
  RELOAD: 'reload',           // 重新加载
  NOTIFY_USER: 'notify_user'  // 通知用户
};

export class ErrorHandler {
  constructor(eventBus, feedbackManager = null) {
    this.eventBus = eventBus;
    this.feedbackManager = feedbackManager;
    this.errorLog = [];
    this.maxLogSize = 100;
    this.recoveryAttempts = new Map(); // 跟踪恢复尝试次数
    this.maxRetries = 3;
    
    this._setupGlobalErrorHandlers();
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 是否成功恢复
   */
  handleError(error, context = {}) {
    const errorInfo = this._classifyError(error, context);
    this._logError(errorInfo);
    
    // 发出错误事件
    this.eventBus?.emit('error:occurred', errorInfo);
    
    // 执行恢复策略
    const recovered = this._executeRecoveryStrategy(errorInfo);
    
    // 显示用户消息
    if (errorInfo.severity !== ErrorSeverity.LOW) {
      this._showUserMessage(errorInfo, recovered);
    }
    
    return recovered;
  }

  /**
   * 分类错误 (需求 11.1)
   * @private
   */
  _classifyError(error, context) {
    const errorInfo = {
      error,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.NOTIFY_USER
    };

    // 根据错误消息和上下文分类
    const message = error.message.toLowerCase();
    
    // 初始化错误
    if (message.includes('init') || message.includes('constructor')) {
      errorInfo.type = ErrorType.INITIALIZATION;
      errorInfo.severity = ErrorSeverity.CRITICAL;
      errorInfo.recoveryStrategy = RecoveryStrategy.RELOAD;
    }
    // 渲染错误
    else if (message.includes('render') || message.includes('canvas') || message.includes('draw')) {
      errorInfo.type = ErrorType.RENDERING;
      errorInfo.severity = ErrorSeverity.HIGH;
      errorInfo.recoveryStrategy = RecoveryStrategy.RESET_STATE;
    }
    // 用户输入错误
    else if (message.includes('invalid') || message.includes('validation')) {
      errorInfo.type = ErrorType.USER_INPUT;
      errorInfo.severity = ErrorSeverity.LOW;
      errorInfo.recoveryStrategy = RecoveryStrategy.NOTIFY_USER;
    }
    // 状态错误
    else if (message.includes('state') || message.includes('undefined')) {
      errorInfo.type = ErrorType.STATE;
      errorInfo.severity = ErrorSeverity.HIGH;
      errorInfo.recoveryStrategy = RecoveryStrategy.RESET_STATE;
    }
    // 网络错误
    else if (message.includes('network') || message.includes('fetch') || message.includes('load')) {
      errorInfo.type = ErrorType.NETWORK;
      errorInfo.severity = ErrorSeverity.MEDIUM;
      errorInfo.recoveryStrategy = RecoveryStrategy.RETRY;
    }
    // 资源错误
    else if (message.includes('resource') || message.includes('not found')) {
      errorInfo.type = ErrorType.RESOURCE;
      errorInfo.severity = ErrorSeverity.MEDIUM;
      errorInfo.recoveryStrategy = RecoveryStrategy.FALLBACK;
    }
    // 验证错误
    else if (context.type === 'validation') {
      errorInfo.type = ErrorType.VALIDATION;
      errorInfo.severity = ErrorSeverity.LOW;
      errorInfo.recoveryStrategy = RecoveryStrategy.NOTIFY_USER;
    }

    return errorInfo;
  }

  /**
   * 执行恢复策略 (需求 11.4)
   * @private
   */
  _executeRecoveryStrategy(errorInfo) {
    const { recoveryStrategy, error, context } = errorInfo;
    
    try {
      switch (recoveryStrategy) {
        case RecoveryStrategy.IGNORE:
          return true;

        case RecoveryStrategy.RETRY:
          return this._retryOperation(errorInfo);

        case RecoveryStrategy.FALLBACK:
          return this._useFallback(errorInfo);

        case RecoveryStrategy.RESET_STATE:
          return this._resetState(errorInfo);

        case RecoveryStrategy.RELOAD:
          this._reloadApplication(errorInfo);
          return false;

        case RecoveryStrategy.NOTIFY_USER:
          // 只通知用户，不执行恢复
          return false;

        default:
          console.warn('[ErrorHandler] Unknown recovery strategy:', recoveryStrategy);
          return false;
      }
    } catch (recoveryError) {
      console.error('[ErrorHandler] Recovery failed:', recoveryError);
      this._logError({
        error: recoveryError,
        message: 'Recovery strategy failed',
        context: { originalError: errorInfo }
      });
      return false;
    }
  }

  /**
   * 重试操作
   * @private
   */
  _retryOperation(errorInfo) {
    const key = `${errorInfo.type}_${errorInfo.context.operation || 'unknown'}`;
    const attempts = this.recoveryAttempts.get(key) || 0;

    if (attempts >= this.maxRetries) {
      console.warn('[ErrorHandler] Max retries reached for:', key);
      this.recoveryAttempts.delete(key);
      return false;
    }

    this.recoveryAttempts.set(key, attempts + 1);
    
    // 延迟重试
    setTimeout(() => {
      if (errorInfo.context.retryCallback) {
        try {
          errorInfo.context.retryCallback();
          this.recoveryAttempts.delete(key);
        } catch (error) {
          console.error('[ErrorHandler] Retry failed:', error);
        }
      }
    }, 1000 * (attempts + 1)); // 指数退避

    return true;
  }

  /**
   * 使用备用方案
   * @private
   */
  _useFallback(errorInfo) {
    if (errorInfo.context.fallbackCallback) {
      try {
        errorInfo.context.fallbackCallback();
        return true;
      } catch (error) {
        console.error('[ErrorHandler] Fallback failed:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * 重置状态 (需求 11.5)
   * @private
   */
  _resetState(errorInfo) {
    try {
      // Canvas恢复
      if (errorInfo.type === ErrorType.RENDERING && errorInfo.context.canvas) {
        const canvas = errorInfo.context.canvas;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // 发出状态重置事件
      this.eventBus?.emit('state:reset:requested', {
        reason: 'error_recovery',
        errorType: errorInfo.type
      });

      return true;
    } catch (error) {
      console.error('[ErrorHandler] State reset failed:', error);
      return false;
    }
  }

  /**
   * 重新加载应用
   * @private
   */
  _reloadApplication(errorInfo) {
    const message = this._getUserFriendlyMessage(errorInfo);
    
    if (confirm(`${message}\n\n是否重新加载应用？`)) {
      window.location.reload();
    }
  }

  /**
   * 获取用户友好的错误消息 (需求 11.7)
   * @private
   */
  _getUserFriendlyMessage(errorInfo) {
    const messages = {
      [ErrorType.INITIALIZATION]: '应用初始化失败，请刷新页面重试。',
      [ErrorType.RENDERING]: '绘图渲染出现问题，已尝试恢复。',
      [ErrorType.USER_INPUT]: '输入数据无效，请检查后重试。',
      [ErrorType.STATE]: '应用状态异常，已尝试恢复。',
      [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试。',
      [ErrorType.RESOURCE]: '资源加载失败，已使用备用方案。',
      [ErrorType.VALIDATION]: '数据验证失败，请检查输入。',
      [ErrorType.UNKNOWN]: '发生未知错误，请联系技术支持。'
    };

    let message = messages[errorInfo.type] || messages[ErrorType.UNKNOWN];
    
    // 添加具体错误信息（开发模式）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      message += `\n\n技术详情: ${errorInfo.message}`;
    }

    return message;
  }

  /**
   * 显示用户消息
   * @private
   */
  _showUserMessage(errorInfo, recovered) {
    const message = this._getUserFriendlyMessage(errorInfo);
    
    if (this.feedbackManager) {
      const type = recovered ? 'warning' : 'error';
      this.feedbackManager.showToast(message, type);
    } else {
      console.error('[ErrorHandler]', message);
    }
  }

  /**
   * 记录错误
   * @private
   */
  _logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // 控制台输出
    console.error('[ErrorHandler]', {
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message,
      context: errorInfo.context
    });
  }

  /**
   * 设置全局错误处理器 (需求 11.1)
   * @private
   */
  _setupGlobalErrorHandlers() {
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'promise' }
      );
    });
  }

  /**
   * 获取错误日志
   * @param {Object} filter - 过滤条件
   * @returns {Array} 错误日志
   */
  getErrorLog(filter = {}) {
    let logs = [...this.errorLog];

    if (filter.type) {
      logs = logs.filter(log => log.type === filter.type);
    }

    if (filter.severity) {
      logs = logs.filter(log => log.severity === filter.severity);
    }

    if (filter.since) {
      logs = logs.filter(log => log.timestamp >= filter.since);
    }

    return logs;
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
    this.recoveryAttempts.clear();
  }

  /**
   * 获取错误统计
   * @returns {Object} 统计信息
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      bySeverity: {},
      recentErrors: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * 销毁错误处理器
   */
  destroy() {
    this.clearErrorLog();
    this.eventBus = null;
    this.feedbackManager = null;
  }
}

// 单例实例
let errorHandlerInstance = null;

export function getErrorHandler() {
  return errorHandlerInstance;
}

export function createErrorHandler(eventBus, feedbackManager) {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler(eventBus, feedbackManager);
  }
  return errorHandlerInstance;
}

export function resetErrorHandler() {
  if (errorHandlerInstance) {
    errorHandlerInstance.destroy();
    errorHandlerInstance = null;
  }
}
