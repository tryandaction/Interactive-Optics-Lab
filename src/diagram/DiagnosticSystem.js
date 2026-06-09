/**
 * DiagnosticSystem.js - 诊断系统
 * 实时监控系统状态，快速定位交互问题
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

/**
 * 诊断级别
 */
export const DiagnosticLevel = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * 诊断系统类
 * 负责监控和诊断应用状态
 */
export class DiagnosticSystem {
    constructor() {
        /** @type {Array<Object>} 诊断日志 */
        this.logs = [];
        
        /** @type {number} 最大日志数量 */
        this.maxLogs = 1000;
        
        /** @type {boolean} 是否启用 */
        this.enabled = true;
        
        /** @type {Object} 性能指标 */
        this.metrics = {
            eventHandlerCalls: 0,
            renderCalls: 0,
            lastRenderTime: 0,
            avgRenderTime: 0,
            eventLatency: []
        };
        
        /** @type {Map<string, number>} 事件计数器 */
        this.eventCounters = new Map();
        
        /** @type {Array<Function>} 监听器 */
        this.listeners = [];
        
        /** @type {HTMLElement|null} UI面板 */
        this.panel = null;
        
        /** @type {boolean} 是否显示面板 */
        this.panelVisible = false;
        
        this._initializeMonitoring();
    }

    /**
     * 初始化监控
     * @private
     */
    _initializeMonitoring() {
        if (typeof window === 'undefined') return;
        
        // 监控全局错误
        window.addEventListener('error', (e) => {
            this.log(DiagnosticLevel.ERROR, 'Global Error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });
        
        // 监控未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (e) => {
            this.log(DiagnosticLevel.ERROR, 'Unhandled Promise Rejection', {
                reason: e.reason
            });
        });
        
        console.log('DiagnosticSystem: Monitoring initialized');
    }

    /**
     * 记录诊断日志
     * @param {string} level - 日志级别
     * @param {string} message - 消息
     * @param {Object} [data] - 附加数据
     */
    log(level, message, data = {}) {
        if (!this.enabled) return;
        
        const entry = {
            timestamp: Date.now(),
            level,
            message,
            data,
            stack: new Error().stack
        };
        
        this.logs.push(entry);
        
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // 控制台输出
        const consoleMethod = level === DiagnosticLevel.ERROR || level === DiagnosticLevel.CRITICAL 
            ? 'error' 
            : level === DiagnosticLevel.WARNING 
            ? 'warn' 
            : 'log';
        
        console[consoleMethod](`[Diagnostic:${level}] ${message}`, data);
        
        // 通知监听器
        this._notifyListeners(entry);
        
        // 更新UI
        if (this.panelVisible) {
            this._updatePanel();
        }
    }

    /**
     * 记录事件
     * @param {string} eventType - 事件类型
     * @param {Object} [data] - 事件数据
     */
    trackEvent(eventType, data = {}) {
        const count = (this.eventCounters.get(eventType) || 0) + 1;
        this.eventCounters.set(eventType, count);
        
        this.metrics.eventHandlerCalls++;
        
        this.log(DiagnosticLevel.INFO, `Event: ${eventType}`, {
            count,
            ...data
        });
    }

    /**
     * 记录渲染性能
     * @param {number} duration - 渲染耗时（毫秒）
     */
    trackRender(duration) {
        this.metrics.renderCalls++;
        this.metrics.lastRenderTime = duration;
        
        // 计算平均渲染时间
        const alpha = 0.1; // 平滑因子
        this.metrics.avgRenderTime = this.metrics.avgRenderTime * (1 - alpha) + duration * alpha;
        
        if (duration > 16.67) { // 超过60fps阈值
            this.log(DiagnosticLevel.WARNING, 'Slow Render', {
                duration,
                avgDuration: this.metrics.avgRenderTime.toFixed(2)
            });
        }
    }

    /**
     * 检查DOM元素状态
     * @param {string} selector - CSS选择器
     * @returns {Object} 诊断结果
     */
    checkElement(selector) {
        const element = document.querySelector(selector);
        
        const result = {
            exists: !!element,
            visible: false,
            interactive: false,
            zIndex: null,
            position: null,
            dimensions: null,
            eventListeners: []
        };
        
        if (element) {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            result.visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            result.interactive = style.pointerEvents !== 'none';
            result.zIndex = style.zIndex;
            result.position = {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            };
            result.dimensions = {
                width: rect.width,
                height: rect.height
            };
            
            // 检查事件监听器（需要浏览器支持）
            if (typeof getEventListeners === 'function') {
                result.eventListeners = Object.keys(getEventListeners(element));
            }
        }
        
        this.log(DiagnosticLevel.INFO, `Element Check: ${selector}`, result);
        
        return result;
    }

    /**
     * 检查模块初始化状态
     * @param {Object} modules - 模块对象
     * @returns {Object} 诊断结果
     */
    checkModules(modules) {
        const result = {
            total: 0,
            initialized: 0,
            failed: 0,
            optional: 0,
            details: {}
        };
        
        for (const [name, module] of Object.entries(modules)) {
            result.total++;
            const isDescriptor = module
                && typeof module === 'object'
                && Object.prototype.hasOwnProperty.call(module, 'optional')
                && Object.prototype.hasOwnProperty.call(module, 'instance');
            const instance = isDescriptor ? module.instance : module;
            const isOptional = isDescriptor && module.optional === true;
            
            if (instance === null || instance === undefined) {
                if (isOptional) {
                    result.optional++;
                    result.details[name] = module.reason || 'optional';
                    continue;
                }
                result.failed++;
                result.details[name] = 'not initialized';
            } else {
                result.initialized++;
                result.details[name] = 'initialized';
            }
        }
        
        this.log(DiagnosticLevel.INFO, 'Module Status', result);
        
        return result;
    }

    /**
     * 检查事件绑定
     * @param {HTMLElement} element - DOM元素
     * @param {string} eventType - 事件类型
     * @returns {boolean} 是否有监听器
     */
    checkEventBinding(element, eventType) {
        if (!element) {
            this.log(DiagnosticLevel.ERROR, 'Event Binding Check Failed', {
                reason: 'Element not found',
                eventType
            });
            return false;
        }
        
        // 简单测试：触发一个测试事件
        let hasListener = false;
        const testHandler = () => { hasListener = true; };
        
        element.addEventListener(eventType, testHandler);
        element.dispatchEvent(new Event(eventType));
        element.removeEventListener(eventType, testHandler);
        
        this.log(DiagnosticLevel.INFO, 'Event Binding Check', {
            element: element.tagName,
            eventType,
            hasListener
        });
        
        return hasListener;
    }

    /**
     * 运行完整诊断
     * @returns {Object} 诊断报告
     */
    runFullDiagnostic() {
        const report = {
            timestamp: Date.now(),
            checks: {}
        };
        
        // 检查关键DOM元素
        report.checks.canvas = this.checkElement('#opticsCanvas');
        report.checks.toolbar = this.checkElement('#toolbar');
        report.checks.modeSwitcher = this.checkElement('#mode-switcher-container');
        
        // 检查全局变量
        report.checks.globals = {
            components: Array.isArray(window.components),
            componentCount: window.components?.length || 0,
            selectedComponent: !!window.selectedComponent,
            isDragging: !!window.isDragging,
            componentToAdd: window.componentToAdd
        };
        
        // 检查模块状态
        if (window.getDiagramModeIntegration) {
            const integration = window.getDiagramModeIntegration();
            if (integration && integration.modules) {
                report.checks.modules = this.checkModules(integration.modules);
            }
        }
        
        // 性能指标
        report.metrics = { ...this.metrics };
        
        // 事件统计
        report.events = Object.fromEntries(this.eventCounters);
        
        // 最近的错误和警告
        report.recentIssues = this.logs
            .filter(log => log.level === DiagnosticLevel.ERROR || log.level === DiagnosticLevel.WARNING)
            .slice(-10);
        
        this.log(DiagnosticLevel.INFO, 'Full Diagnostic Complete', report);
        
        return report;
    }

    /**
     * 添加监听器
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听的函数
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知监听器
     * @private
     */
    _notifyListeners(entry) {
        this.listeners.forEach(listener => {
            try {
                listener(entry);
            } catch (error) {
                console.error('DiagnosticSystem: Listener error', error);
            }
        });
    }

    /**
     * 显示诊断面板
     */
    showPanel() {
        if (this.panel) {
            this.panel.style.display = 'block';
            this.panelVisible = true;
            this._updatePanel();
            return;
        }
        
        this._createPanel();
        this.panelVisible = true;
    }

    /**
     * 隐藏诊断面板
     */
    hidePanel() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.panelVisible = false;
        }
    }

    /**
     * 切换诊断面板显示
     */
    togglePanel() {
        if (this.panelVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    /**
     * 创建诊断面板
     * @private
     */
    _createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'diagnostic-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            width: 400px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 16px;
            z-index: 10000;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        `;
        
        this.panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 14px;">🔍 诊断面板</h3>
                <div>
                    <button id="diagnostic-refresh" style="padding: 4px 8px; margin-right: 4px; cursor: pointer;">刷新</button>
                    <button id="diagnostic-close" style="padding: 4px 8px; cursor: pointer;">关闭</button>
                </div>
            </div>
            <div id="diagnostic-content"></div>
        `;
        
        document.body.appendChild(this.panel);
        
        // 绑定事件
        this.panel.querySelector('#diagnostic-close').addEventListener('click', () => this.hidePanel());
        this.panel.querySelector('#diagnostic-refresh').addEventListener('click', () => this._updatePanel());
        
        this._updatePanel();
    }

    /**
     * 更新诊断面板
     * @private
     */
    _updatePanel() {
        if (!this.panel) return;
        
        const content = this.panel.querySelector('#diagnostic-content');
        if (!content) return;
        
        const report = this.runFullDiagnostic();
        
        let html = '<div style="margin-bottom: 12px;">';
        html += '<h4 style="margin: 8px 0 4px 0; color: #4CAF50;">性能指标</h4>';
        html += `<div>渲染调用: ${report.metrics.renderCalls}</div>`;
        html += `<div>平均渲染时间: ${report.metrics.avgRenderTime.toFixed(2)}ms</div>`;
        html += `<div>事件处理: ${report.metrics.eventHandlerCalls}</div>`;
        html += '</div>';
        
        html += '<div style="margin-bottom: 12px;">';
        html += '<h4 style="margin: 8px 0 4px 0; color: #2196F3;">DOM元素</h4>';
        for (const [name, check] of Object.entries(report.checks)) {
            if (check.exists !== undefined) {
                const status = check.exists ? (check.visible ? '✅' : '⚠️') : '❌';
                html += `<div>${status} ${name}: ${check.exists ? '存在' : '不存在'}${check.exists && !check.visible ? ' (隐藏)' : ''}</div>`;
            }
        }
        html += '</div>';
        
        html += '<div style="margin-bottom: 12px;">';
        html += '<h4 style="margin: 8px 0 4px 0; color: #FF9800;">全局状态</h4>';
        if (report.checks.globals) {
            html += `<div>组件数量: ${report.checks.globals.componentCount}</div>`;
            html += `<div>选中组件: ${report.checks.globals.selectedComponent ? '是' : '否'}</div>`;
            html += `<div>拖拽中: ${report.checks.globals.isDragging ? '是' : '否'}</div>`;
            html += `<div>待添加组件: ${report.checks.globals.componentToAdd || '无'}</div>`;
        }
        html += '</div>';
        
        if (report.checks.modules) {
            html += '<div style="margin-bottom: 12px;">';
            html += '<h4 style="margin: 8px 0 4px 0; color: #9C27B0;">模块状态</h4>';
            html += `<div>总计: ${report.checks.modules.total}</div>`;
            html += `<div>已初始化: ${report.checks.modules.initialized}</div>`;
            html += `<div>失败: ${report.checks.modules.failed}</div>`;
            html += '</div>';
        }
        
        if (report.recentIssues.length > 0) {
            html += '<div>';
            html += '<h4 style="margin: 8px 0 4px 0; color: #F44336;">最近问题</h4>';
            report.recentIssues.forEach(issue => {
                const time = new Date(issue.timestamp).toLocaleTimeString();
                html += `<div style="margin: 4px 0; padding: 4px; background: rgba(244, 67, 54, 0.1); border-left: 2px solid #F44336;">`;
                html += `<div style="font-weight: bold;">[${time}] ${issue.message}</div>`;
                if (issue.data && Object.keys(issue.data).length > 0) {
                    html += `<div style="font-size: 10px; color: #aaa;">${JSON.stringify(issue.data, null, 2)}</div>`;
                }
                html += `</div>`;
            });
            html += '</div>';
        }
        
        content.innerHTML = html;
    }

    /**
     * 清除日志
     */
    clearLogs() {
        this.logs = [];
        this.log(DiagnosticLevel.INFO, 'Logs cleared');
    }

    /**
     * 导出诊断报告
     * @returns {string} JSON格式的报告
     */
    exportReport() {
        const report = this.runFullDiagnostic();
        return JSON.stringify(report, null, 2);
    }
}

// 创建单例实例
let diagnosticInstance = null;

/**
 * 获取DiagnosticSystem单例实例
 * @returns {DiagnosticSystem}
 */
export function getDiagnosticSystem() {
    if (!diagnosticInstance) {
        diagnosticInstance = new DiagnosticSystem();
    }
    return diagnosticInstance;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DiagnosticSystem = DiagnosticSystem;
    window.getDiagnosticSystem = getDiagnosticSystem;
    
    // 添加快捷键 Ctrl+Shift+D 打开诊断面板
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            getDiagnosticSystem().togglePanel();
        }
    });
    
    console.log('DiagnosticSystem: Loaded. Press Ctrl+Shift+D to open diagnostic panel.');
}
