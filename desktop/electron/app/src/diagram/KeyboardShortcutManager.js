/**
 * KeyboardShortcutManager.js - 键盘快捷键管理器
 * 
 * 提供全局键盘快捷键管理，包括：
 * - 快捷键注册和注销
 * - 快捷键冲突检测
 * - 上下文相关快捷键
 * - 快捷键帮助面板
 * - 自定义快捷键
 */

export class KeyboardShortcutManager {
    constructor(options = {}) {
        this.eventBus = options.eventBus;
        this.diagnosticSystem = options.diagnosticSystem;
        
        // 快捷键注册表
        this.shortcuts = new Map();
        this.contexts = new Map();
        this.activeContext = 'global';
        
        // 配置
        this.config = {
            enabled: true,
            preventDefault: true,
            stopPropagation: true,
            caseSensitive: false
        };
        
        // 绑定事件
        this._boundHandler = this._handleKeyDown.bind(this);
        
        // 注册默认快捷键
        this._registerDefaultShortcuts();
        
        // 启动监听
        this._startListening();
    }

    /**
     * 注册快捷键
     * @param {string} key - 快捷键组合 (e.g., 'Ctrl+S', 'Alt+Shift+A')
     * @param {Function} handler - 处理函数
     * @param {Object} options - 选项
     */
    register(key, handler, options = {}) {
        const normalizedKey = this._normalizeKey(key);
        const context = options.context || 'global';
        
        // 检查冲突
        if (this._hasConflict(normalizedKey, context)) {
            this.diagnosticSystem?.log('warning', 
                `Shortcut conflict: ${key} already registered in context ${context}`);
            
            if (!options.override) {
                return false;
            }
        }
        
        // 注册快捷键
        const shortcut = {
            key: normalizedKey,
            originalKey: key,
            handler,
            context,
            description: options.description || '',
            enabled: options.enabled !== false,
            preventDefault: options.preventDefault !== false,
            stopPropagation: options.stopPropagation !== false
        };
        
        const contextMap = this.contexts.get(context) || new Map();
        contextMap.set(normalizedKey, shortcut);
        this.contexts.set(context, contextMap);
        
        this.shortcuts.set(normalizedKey, shortcut);
        
        this.eventBus?.emit('shortcut:registered', { key, context });
        
        return true;
    }

    /**
     * 注销快捷键
     * @param {string} key - 快捷键组合
     * @param {string} context - 上下文
     */
    unregister(key, context = 'global') {
        const normalizedKey = this._normalizeKey(key);
        
        const contextMap = this.contexts.get(context);
        if (contextMap) {
            contextMap.delete(normalizedKey);
        }
        
        this.shortcuts.delete(normalizedKey);
        
        this.eventBus?.emit('shortcut:unregistered', { key, context });
    }

    /**
     * 设置活动上下文
     * @param {string} context - 上下文名称
     */
    setContext(context) {
        this.activeContext = context;
        this.eventBus?.emit('shortcut:context:changed', { context });
    }

    /**
     * 获取活动上下文
     * @returns {string}
     */
    getContext() {
        return this.activeContext;
    }

    /**
     * 处理键盘事件
     * @private
     */
    _handleKeyDown(event) {
        if (!this.config.enabled) return;
        
        const key = this._getKeyFromEvent(event);
        
        // 查找快捷键（先查找当前上下文，再查找全局）
        let shortcut = this._findShortcut(key, this.activeContext);
        if (!shortcut) {
            shortcut = this._findShortcut(key, 'global');
        }
        
        if (shortcut && shortcut.enabled) {
            // 执行处理函数
            try {
                const result = shortcut.handler(event);
                
                // 阻止默认行为
                if (shortcut.preventDefault && result !== false) {
                    event.preventDefault();
                }
                
                // 停止传播
                if (shortcut.stopPropagation && result !== false) {
                    event.stopPropagation();
                }
                
                this.eventBus?.emit('shortcut:executed', { 
                    key: shortcut.originalKey, 
                    context: shortcut.context 
                });
                
            } catch (error) {
                this.diagnosticSystem?.log('error', 
                    `Shortcut handler error for ${key}: ${error.message}`);
            }
        }
    }

    /**
     * 从事件获取键组合
     * @private
     */
    _getKeyFromEvent(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        
        // 获取主键
        let mainKey = event.key;
        
        // 特殊键映射
        const specialKeys = {
            ' ': 'Space',
            'ArrowUp': 'Up',
            'ArrowDown': 'Down',
            'ArrowLeft': 'Left',
            'ArrowRight': 'Right',
            'Escape': 'Esc',
            'Delete': 'Del'
        };
        
        mainKey = specialKeys[mainKey] || mainKey;
        
        // 转换为大写（如果不区分大小写）
        if (!this.config.caseSensitive) {
            mainKey = mainKey.toUpperCase();
        }
        
        parts.push(mainKey);
        
        return parts.join('+');
    }

    /**
     * 标准化键组合
     * @private
     */
    _normalizeKey(key) {
        const parts = key.split('+').map(p => p.trim());
        const modifiers = [];
        let mainKey = '';
        
        for (const part of parts) {
            const upper = part.toUpperCase();
            if (upper === 'CTRL' || upper === 'CMD' || upper === 'META') {
                modifiers.push('Ctrl');
            } else if (upper === 'ALT' || upper === 'OPTION') {
                modifiers.push('Alt');
            } else if (upper === 'SHIFT') {
                modifiers.push('Shift');
            } else {
                mainKey = this.config.caseSensitive ? part : part.toUpperCase();
            }
        }
        
        // 排序修饰键
        modifiers.sort();
        
        return [...modifiers, mainKey].join('+');
    }

    /**
     * 查找快捷键
     * @private
     */
    _findShortcut(key, context) {
        const contextMap = this.contexts.get(context);
        return contextMap ? contextMap.get(key) : null;
    }

    /**
     * 检查快捷键冲突
     * @private
     */
    _hasConflict(key, context) {
        const contextMap = this.contexts.get(context);
        return contextMap ? contextMap.has(key) : false;
    }

    /**
     * 启动监听
     * @private
     */
    _startListening() {
        document.addEventListener('keydown', this._boundHandler, true);
    }

    /**
     * 停止监听
     * @private
     */
    _stopListening() {
        document.removeEventListener('keydown', this._boundHandler, true);
    }

    /**
     * 注册默认快捷键
     * @private
     */
    _registerDefaultShortcuts() {
        // 文件操作
        this.register('Ctrl+S', () => {
            this.eventBus?.emit('file:save');
        }, { description: 'Save diagram' });
        
        this.register('Ctrl+O', () => {
            this.eventBus?.emit('file:open');
        }, { description: 'Open diagram' });
        
        this.register('Ctrl+N', () => {
            this.eventBus?.emit('file:new');
        }, { description: 'New diagram' });
        
        this.register('Ctrl+E', () => {
            this.eventBus?.emit('file:export');
        }, { description: 'Export diagram' });
        
        // 编辑操作
        this.register('Ctrl+Z', () => {
            this.eventBus?.emit('edit:undo');
        }, { description: 'Undo' });
        
        this.register('Ctrl+Y', () => {
            this.eventBus?.emit('edit:redo');
        }, { description: 'Redo' });
        
        this.register('Ctrl+Shift+Z', () => {
            this.eventBus?.emit('edit:redo');
        }, { description: 'Redo (alternative)' });
        
        this.register('Ctrl+C', () => {
            this.eventBus?.emit('edit:copy');
        }, { description: 'Copy' });
        
        this.register('Ctrl+X', () => {
            this.eventBus?.emit('edit:cut');
        }, { description: 'Cut' });
        
        this.register('Ctrl+V', () => {
            this.eventBus?.emit('edit:paste');
        }, { description: 'Paste' });
        
        this.register('Ctrl+A', () => {
            this.eventBus?.emit('edit:selectAll');
        }, { description: 'Select all' });
        
        this.register('Del', () => {
            this.eventBus?.emit('edit:delete');
        }, { description: 'Delete selected' });
        
        this.register('Ctrl+D', () => {
            this.eventBus?.emit('edit:duplicate');
        }, { description: 'Duplicate' });
        
        // 视图操作
        this.register('Ctrl+=', () => {
            this.eventBus?.emit('view:zoomIn');
        }, { description: 'Zoom in' });
        
        this.register('Ctrl+-', () => {
            this.eventBus?.emit('view:zoomOut');
        }, { description: 'Zoom out' });
        
        this.register('Ctrl+0', () => {
            this.eventBus?.emit('view:resetZoom');
        }, { description: 'Reset zoom' });
        
        this.register('Ctrl+Shift+F', () => {
            this.eventBus?.emit('view:fitToScreen');
        }, { description: 'Fit to screen' });
        
        this.register('Space', () => {
            this.eventBus?.emit('view:pan');
        }, { description: 'Pan mode', context: 'canvas' });
        
        // 对齐操作
        this.register('Ctrl+Shift+L', () => {
            this.eventBus?.emit('align:left');
        }, { description: 'Align left' });
        
        this.register('Ctrl+Shift+R', () => {
            this.eventBus?.emit('align:right');
        }, { description: 'Align right' });
        
        this.register('Ctrl+Shift+T', () => {
            this.eventBus?.emit('align:top');
        }, { description: 'Align top' });
        
        this.register('Ctrl+Shift+B', () => {
            this.eventBus?.emit('align:bottom');
        }, { description: 'Align bottom' });
        
        this.register('Ctrl+Shift+H', () => {
            this.eventBus?.emit('align:centerHorizontal');
        }, { description: 'Center horizontally' });
        
        this.register('Ctrl+Shift+V', () => {
            this.eventBus?.emit('align:centerVertical');
        }, { description: 'Center vertically' });
        
        // 图层操作
        this.register('Ctrl+]', () => {
            this.eventBus?.emit('layer:bringForward');
        }, { description: 'Bring forward' });
        
        this.register('Ctrl+[', () => {
            this.eventBus?.emit('layer:sendBackward');
        }, { description: 'Send backward' });
        
        this.register('Ctrl+Shift+]', () => {
            this.eventBus?.emit('layer:bringToFront');
        }, { description: 'Bring to front' });
        
        this.register('Ctrl+Shift+[', () => {
            this.eventBus?.emit('layer:sendToBack');
        }, { description: 'Send to back' });
        
        // 工具切换
        this.register('V', () => {
            this.eventBus?.emit('tool:select');
        }, { description: 'Select tool' });
        
        this.register('H', () => {
            this.eventBus?.emit('tool:pan');
        }, { description: 'Pan tool' });
        
        this.register('T', () => {
            this.eventBus?.emit('tool:text');
        }, { description: 'Text tool' });
        
        this.register('L', () => {
            this.eventBus?.emit('tool:line');
        }, { description: 'Line tool' });
        
        this.register('R', () => {
            this.eventBus?.emit('tool:rectangle');
        }, { description: 'Rectangle tool' });
        
        this.register('M', () => {
            this.eventBus?.emit('tool:measure');
        }, { description: 'Measure tool' });
        
        // 网格和对齐
        this.register('Ctrl+\'', () => {
            this.eventBus?.emit('grid:toggle');
        }, { description: 'Toggle grid' });
        
        this.register('Ctrl+Shift+\'', () => {
            this.eventBus?.emit('grid:snap:toggle');
        }, { description: 'Toggle snap to grid' });
        
        // 面板切换
        this.register('Ctrl+Shift+I', () => {
            this.eventBus?.emit('panel:icons:toggle');
        }, { description: 'Toggle icon palette' });
        
        this.register('Ctrl+Shift+L', () => {
            this.eventBus?.emit('panel:layers:toggle');
        }, { description: 'Toggle layers panel' });
        
        this.register('Ctrl+Shift+P', () => {
            this.eventBus?.emit('panel:properties:toggle');
        }, { description: 'Toggle properties panel' });
        
        // 模式切换
        this.register('Ctrl+Shift+D', () => {
            this.eventBus?.emit('mode:diagram');
        }, { description: 'Switch to diagram mode' });
        
        this.register('Ctrl+Shift+S', () => {
            this.eventBus?.emit('mode:simulation');
        }, { description: 'Switch to simulation mode' });
        
        // 帮助
        this.register('F1', () => {
            this.eventBus?.emit('help:show');
        }, { description: 'Show help' });
        
        this.register('Ctrl+/', () => {
            this.showShortcutHelp();
        }, { description: 'Show keyboard shortcuts' });
        
        // 调试
        this.register('Ctrl+Shift+D', () => {
            this.eventBus?.emit('debug:toggle');
        }, { description: 'Toggle debug panel', context: 'debug' });
        
        // ESC - 取消操作
        this.register('Esc', () => {
            this.eventBus?.emit('action:cancel');
        }, { description: 'Cancel current action' });
    }

    /**
     * 显示快捷键帮助
     */
    showShortcutHelp() {
        const shortcuts = this.getAllShortcuts();
        
        // 按类别分组
        const categories = {
            'File': ['Ctrl+S', 'Ctrl+O', 'Ctrl+N', 'Ctrl+E'],
            'Edit': ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Ctrl+A', 'Del', 'Ctrl+D'],
            'View': ['Ctrl+=', 'Ctrl+-', 'Ctrl+0', 'Ctrl+Shift+F'],
            'Align': ['Ctrl+Shift+L', 'Ctrl+Shift+R', 'Ctrl+Shift+T', 'Ctrl+Shift+B', 'Ctrl+Shift+H', 'Ctrl+Shift+V'],
            'Layer': ['Ctrl+]', 'Ctrl+[', 'Ctrl+Shift+]', 'Ctrl+Shift+['],
            'Tools': ['V', 'H', 'T', 'L', 'R', 'M'],
            'Grid': ['Ctrl+\'', 'Ctrl+Shift+\''],
            'Panels': ['Ctrl+Shift+I', 'Ctrl+Shift+L', 'Ctrl+Shift+P'],
            'Mode': ['Ctrl+Shift+D', 'Ctrl+Shift+S'],
            'Help': ['F1', 'Ctrl+/']
        };
        
        // 创建帮助面板
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 8px;
            width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 24px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        let html = '<h2 style="margin-top: 0; color: #4CAF50;">Keyboard Shortcuts</h2>';
        
        for (const [category, keys] of Object.entries(categories)) {
            html += `<h3 style="color: #2196F3; margin-top: 20px; margin-bottom: 12px;">${category}</h3>`;
            html += '<div style="display: grid; grid-template-columns: 200px 1fr; gap: 8px;">';
            
            for (const key of keys) {
                const shortcut = shortcuts.find(s => s.originalKey === key);
                if (shortcut) {
                    html += `
                        <div style="
                            padding: 6px 12px;
                            background: #2a2a2a;
                            border-radius: 4px;
                            font-family: 'Consolas', monospace;
                            font-size: 13px;
                        ">${shortcut.originalKey}</div>
                        <div style="padding: 6px 0; color: #ccc;">${shortcut.description}</div>
                    `;
                }
            }
            
            html += '</div>';
        }
        
        html += `
            <button style="
                margin-top: 24px;
                padding: 10px 20px;
                background: #4CAF50;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 14px;
                width: 100%;
            ">Close</button>
        `;
        
        panel.innerHTML = html;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        // 关闭按钮
        panel.querySelector('button').addEventListener('click', () => {
            overlay.remove();
        });
        
        // 点击背景关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        // ESC关闭
        const closeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', closeHandler);
            }
        };
        document.addEventListener('keydown', closeHandler);
    }

    /**
     * 获取所有快捷键
     * @returns {Array}
     */
    getAllShortcuts() {
        return Array.from(this.shortcuts.values());
    }

    /**
     * 获取上下文快捷键
     * @param {string} context - 上下文名称
     * @returns {Array}
     */
    getShortcutsByContext(context) {
        const contextMap = this.contexts.get(context);
        return contextMap ? Array.from(contextMap.values()) : [];
    }

    /**
     * 启用/禁用快捷键
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }

    /**
     * 启用快捷键
     * @param {string} key - 快捷键组合
     * @param {string} context - 上下文
     */
    enable(key, context = 'global') {
        const shortcut = this._findShortcut(this._normalizeKey(key), context);
        if (shortcut) {
            shortcut.enabled = true;
        }
    }

    /**
     * 禁用快捷键
     * @param {string} key - 快捷键组合
     * @param {string} context - 上下文
     */
    disable(key, context = 'global') {
        const shortcut = this._findShortcut(this._normalizeKey(key), context);
        if (shortcut) {
            shortcut.enabled = false;
        }
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        const shortcuts = {};
        
        for (const [context, contextMap] of this.contexts.entries()) {
            shortcuts[context] = {};
            for (const [key, shortcut] of contextMap.entries()) {
                shortcuts[context][key] = {
                    originalKey: shortcut.originalKey,
                    description: shortcut.description,
                    enabled: shortcut.enabled
                };
            }
        }
        
        return {
            shortcuts,
            activeContext: this.activeContext,
            config: this.config
        };
    }

    /**
     * 反序列化
     * @param {Object} data - 序列化数据
     */
    deserialize(data) {
        if (data.activeContext) {
            this.activeContext = data.activeContext;
        }
        
        if (data.config) {
            this.config = { ...this.config, ...data.config };
        }
        
        // 恢复快捷键启用状态
        if (data.shortcuts) {
            for (const [context, contextShortcuts] of Object.entries(data.shortcuts)) {
                for (const [key, shortcutData] of Object.entries(contextShortcuts)) {
                    const shortcut = this._findShortcut(key, context);
                    if (shortcut) {
                        shortcut.enabled = shortcutData.enabled;
                    }
                }
            }
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this._stopListening();
        this.shortcuts.clear();
        this.contexts.clear();
    }
}

// ========== 单例模式 ==========
let shortcutManagerInstance = null;

export function getKeyboardShortcutManager(options) {
    if (!shortcutManagerInstance) {
        shortcutManagerInstance = new KeyboardShortcutManager(options);
    }
    return shortcutManagerInstance;
}

export function resetKeyboardShortcutManager() {
    if (shortcutManagerInstance) {
        shortcutManagerInstance.destroy();
        shortcutManagerInstance = null;
    }
}

// 全局导出
if (typeof window !== 'undefined') {
    window.KeyboardShortcutManager = KeyboardShortcutManager;
    window.getKeyboardShortcutManager = getKeyboardShortcutManager;
}
