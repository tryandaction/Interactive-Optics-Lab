/**
 * FeedbackManager.js - 视觉反馈管理器
 * 提供操作提示、光标样式、进度指示等视觉反馈
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 * 
 * Features:
 * - Toast notifications (success, error, info, warning)
 * - Cursor style management
 * - Progress indicators
 * - Loading overlays
 * - Tooltips
 * - Visual highlights
 */

import { getEventBus } from './EventBus.js';

/**
 * 反馈类型
 */
export const FeedbackType = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
};

/**
 * 光标样式
 */
export const CursorStyle = {
    DEFAULT: 'default',
    POINTER: 'pointer',
    GRAB: 'grab',
    GRABBING: 'grabbing',
    CROSSHAIR: 'crosshair',
    MOVE: 'move',
    NOT_ALLOWED: 'not-allowed',
    WAIT: 'wait',
    HELP: 'help'
};

/**
 * 视觉反馈管理器类
 */
export class FeedbackManager {
    constructor(config = {}) {
        this.container = config.container || document.body;
        this.eventBus = config.eventBus || getEventBus();
        
        // Toast配置
        this.toastDuration = config.toastDuration || 3000;
        this.maxToasts = config.maxToasts || 5;
        this.toastPosition = config.toastPosition || 'top-right';
        
        // 状态
        this.activeToasts = [];
        this.currentCursor = CursorStyle.DEFAULT;
        this.loadingCount = 0;
        this.tooltips = new Map();
        
        // 容器元素
        this.toastContainer = null;
        this.loadingOverlay = null;
        this.tooltipElement = null;
        
        // 初始化
        this._initialize();
        
        // 统计
        this.stats = {
            totalToasts: 0,
            successToasts: 0,
            errorToasts: 0,
            cursorChanges: 0
        };
    }

    /**
     * 初始化
     * @private
     */
    _initialize() {
        this._createToastContainer();
        this._createLoadingOverlay();
        this._createTooltipElement();
        this._injectStyles();
        this._setupEventListeners();
    }

    /**
     * 创建Toast容器
     * @private
     */
    _createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'feedback-toast-container';
        this.toastContainer.style.cssText = this._getToastContainerStyle();
        this.container.appendChild(this.toastContainer);
    }

    /**
     * 获取Toast容器样式
     * @private
     */
    _getToastContainerStyle() {
        const positions = {
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;',
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
            'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
        };
        
        return `
            position: fixed;
            ${positions[this.toastPosition] || positions['top-right']}
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
    }

    /**
     * 创建加载遮罩
     * @private
     */
    _createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'feedback-loading-overlay';
        this.loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const spinner = document.createElement('div');
        spinner.className = 'feedback-spinner';
        spinner.innerHTML = `
            <div class="spinner-ring"></div>
            <div class="spinner-text">Loading...</div>
        `;
        this.loadingOverlay.appendChild(spinner);
        this.container.appendChild(this.loadingOverlay);
    }

    /**
     * 创建Tooltip元素
     * @private
     */
    _createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'feedback-tooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10001;
            display: none;
            white-space: nowrap;
        `;
        this.container.appendChild(this.tooltipElement);
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        if (document.getElementById('feedback-manager-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'feedback-manager-styles';
        style.textContent = `
            .feedback-toast {
                background: white;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 12px 16px;
                min-width: 250px;
                max-width: 400px;
                display: flex;
                align-items: center;
                gap: 12px;
                pointer-events: auto;
                animation: slideIn 0.3s ease-out;
            }
            
            .feedback-toast.removing {
                animation: slideOut 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .feedback-toast-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .feedback-toast-content {
                flex: 1;
            }
            
            .feedback-toast-title {
                font-weight: 600;
                margin-bottom: 2px;
                font-size: 14px;
            }
            
            .feedback-toast-message {
                font-size: 13px;
                color: #666;
            }
            
            .feedback-toast-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .feedback-toast-close:hover {
                color: #333;
            }
            
            .feedback-toast.success {
                border-left: 4px solid #4caf50;
            }
            
            .feedback-toast.error {
                border-left: 4px solid #f44336;
            }
            
            .feedback-toast.warning {
                border-left: 4px solid #ff9800;
            }
            
            .feedback-toast.info {
                border-left: 4px solid #2196f3;
            }
            
            .feedback-spinner {
                text-align: center;
                color: white;
            }
            
            .spinner-ring {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 12px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .spinner-text {
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 设置事件监听
     * @private
     */
    _setupEventListeners() {
        // 监听系统事件自动显示反馈
        this.eventBus.on('drag:drop', () => {
            this.showToast('Component placed', 'Component added to canvas', FeedbackType.SUCCESS);
        });
        
        this.eventBus.on('canvas:delete', (event) => {
            const { items } = event.data;
            this.showToast('Deleted', `${items.length} component(s) deleted`, FeedbackType.INFO);
        });
        
        this.eventBus.on('link:created', () => {
            this.showToast('Link created', 'Components connected successfully', FeedbackType.SUCCESS);
        });
    }

    /**
     * 显示Toast通知
     * @param {string} title - 标题
     * @param {string} message - 消息
     * @param {string} type - 类型 (success, error, info, warning)
     * @param {number} duration - 持续时间（毫秒）
     * @returns {Object} Toast对象
     */
    showToast(title, message = '', type = FeedbackType.INFO, duration = null) {
        // 限制Toast数量
        if (this.activeToasts.length >= this.maxToasts) {
            this.activeToasts[0].remove();
        }
        
        const toast = this._createToast(title, message, type);
        this.toastContainer.appendChild(toast.element);
        this.activeToasts.push(toast);
        
        this.stats.totalToasts++;
        if (type === FeedbackType.SUCCESS) this.stats.successToasts++;
        if (type === FeedbackType.ERROR) this.stats.errorToasts++;
        
        // 自动移除
        const actualDuration = duration !== null ? duration : this.toastDuration;
        if (actualDuration > 0) {
            toast.timeout = setTimeout(() => {
                this.removeToast(toast);
            }, actualDuration);
        }
        
        this.eventBus.emit('feedback:toast-shown', { title, message, type });
        
        return toast;
    }

    /**
     * 创建Toast元素
     * @private
     */
    _createToast(title, message, type) {
        const element = document.createElement('div');
        element.className = `feedback-toast ${type}`;
        
        const icons = {
            [FeedbackType.SUCCESS]: '✓',
            [FeedbackType.ERROR]: '✕',
            [FeedbackType.WARNING]: '⚠',
            [FeedbackType.INFO]: 'ℹ'
        };
        
        element.innerHTML = `
            <div class="feedback-toast-icon">${icons[type] || icons[FeedbackType.INFO]}</div>
            <div class="feedback-toast-content">
                <div class="feedback-toast-title">${title}</div>
                ${message ? `<div class="feedback-toast-message">${message}</div>` : ''}
            </div>
            <button class="feedback-toast-close">×</button>
        `;
        
        const toast = {
            element,
            type,
            timeout: null,
            remove: () => this.removeToast(toast)
        };
        
        // 关闭按钮
        element.querySelector('.feedback-toast-close').onclick = () => {
            this.removeToast(toast);
        };
        
        return toast;
    }

    /**
     * 移除Toast
     * @param {Object} toast - Toast对象
     */
    removeToast(toast) {
        if (!toast || !toast.element) return;
        
        const index = this.activeToasts.indexOf(toast);
        if (index === -1) return;
        
        // 清除定时器
        if (toast.timeout) {
            clearTimeout(toast.timeout);
        }
        
        // 动画移除
        toast.element.classList.add('removing');
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.activeToasts.splice(index, 1);
        }, 300);
    }

    /**
     * 清除所有Toast
     */
    clearAllToasts() {
        this.activeToasts.forEach(toast => this.removeToast(toast));
    }

    /**
     * 显示成功消息
     * @param {string} title - 标题
     * @param {string} message - 消息
     */
    success(title, message = '') {
        return this.showToast(title, message, FeedbackType.SUCCESS);
    }

    /**
     * 显示错误消息
     * @param {string} title - 标题
     * @param {string} message - 消息
     */
    error(title, message = '') {
        return this.showToast(title, message, FeedbackType.ERROR);
    }

    /**
     * 显示警告消息
     * @param {string} title - 标题
     * @param {string} message - 消息
     */
    warning(title, message = '') {
        return this.showToast(title, message, FeedbackType.WARNING);
    }

    /**
     * 显示信息消息
     * @param {string} title - 标题
     * @param {string} message - 消息
     */
    info(title, message = '') {
        return this.showToast(title, message, FeedbackType.INFO);
    }

    /**
     * 设置光标样式
     * @param {string} cursor - 光标样式
     * @param {HTMLElement} element - 目标元素（默认为body）
     */
    setCursor(cursor, element = document.body) {
        element.style.cursor = cursor;
        this.currentCursor = cursor;
        this.stats.cursorChanges++;
        
        this.eventBus.emit('feedback:cursor-changed', { cursor });
    }

    /**
     * 重置光标样式
     * @param {HTMLElement} element - 目标元素
     */
    resetCursor(element = document.body) {
        this.setCursor(CursorStyle.DEFAULT, element);
    }

    /**
     * 显示加载遮罩
     * @param {string} message - 加载消息
     */
    showLoading(message = 'Loading...') {
        this.loadingCount++;
        
        if (this.loadingOverlay) {
            const textEl = this.loadingOverlay.querySelector('.spinner-text');
            if (textEl) {
                textEl.textContent = message;
            }
            this.loadingOverlay.style.display = 'flex';
        }
        
        this.eventBus.emit('feedback:loading-shown', { message });
    }

    /**
     * 隐藏加载遮罩
     */
    hideLoading() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        
        if (this.loadingCount === 0 && this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
        
        this.eventBus.emit('feedback:loading-hidden', {});
    }

    /**
     * 显示Tooltip
     * @param {string} text - Tooltip文本
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    showTooltip(text, x, y) {
        if (!this.tooltipElement) return;
        
        this.tooltipElement.textContent = text;
        this.tooltipElement.style.left = `${x + 10}px`;
        this.tooltipElement.style.top = `${y + 10}px`;
        this.tooltipElement.style.display = 'block';
    }

    /**
     * 隐藏Tooltip
     */
    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
    }

    /**
     * 注册Tooltip
     * @param {HTMLElement} element - 元素
     * @param {string} text - Tooltip文本
     */
    registerTooltip(element, text) {
        if (!element) return;
        
        const handlers = {
            mouseenter: (e) => {
                this.showTooltip(text, e.clientX, e.clientY);
            },
            mouseleave: () => {
                this.hideTooltip();
            },
            mousemove: (e) => {
                if (this.tooltipElement.style.display === 'block') {
                    this.showTooltip(text, e.clientX, e.clientY);
                }
            }
        };
        
        element.addEventListener('mouseenter', handlers.mouseenter);
        element.addEventListener('mouseleave', handlers.mouseleave);
        element.addEventListener('mousemove', handlers.mousemove);
        
        this.tooltips.set(element, { text, handlers });
    }

    /**
     * 取消注册Tooltip
     * @param {HTMLElement} element - 元素
     */
    unregisterTooltip(element) {
        const tooltip = this.tooltips.get(element);
        if (!tooltip) return;
        
        element.removeEventListener('mouseenter', tooltip.handlers.mouseenter);
        element.removeEventListener('mouseleave', tooltip.handlers.mouseleave);
        element.removeEventListener('mousemove', tooltip.handlers.mousemove);
        
        this.tooltips.delete(element);
    }

    /**
     * 高亮元素
     * @param {HTMLElement} element - 元素
     * @param {number} duration - 持续时间（毫秒）
     */
    highlightElement(element, duration = 1000) {
        if (!element) return;
        
        const originalOutline = element.style.outline;
        const originalOutlineOffset = element.style.outlineOffset;
        
        element.style.outline = '2px solid #4488ff';
        element.style.outlineOffset = '2px';
        
        setTimeout(() => {
            element.style.outline = originalOutline;
            element.style.outlineOffset = originalOutlineOffset;
        }, duration);
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            activeToasts: this.activeToasts.length,
            loadingCount: this.loadingCount,
            registeredTooltips: this.tooltips.size
        };
    }

    /**
     * 销毁
     */
    destroy() {
        this.clearAllToasts();
        
        if (this.toastContainer && this.toastContainer.parentNode) {
            this.toastContainer.parentNode.removeChild(this.toastContainer);
        }
        
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
        
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
        
        this.tooltips.forEach((tooltip, element) => {
            this.unregisterTooltip(element);
        });
        
        this.eventBus = null;
    }
}

// ========== 单例模式 ==========
let feedbackManagerInstance = null;

export function getFeedbackManager(config) {
    if (!feedbackManagerInstance) {
        feedbackManagerInstance = new FeedbackManager(config);
    }
    return feedbackManagerInstance;
}

export function resetFeedbackManager() {
    if (feedbackManagerInstance) {
        feedbackManagerInstance.destroy();
    }
    feedbackManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.FeedbackManager = FeedbackManager;
    window.getFeedbackManager = getFeedbackManager;
    window.FeedbackType = FeedbackType;
    window.CursorStyle = CursorStyle;
}
