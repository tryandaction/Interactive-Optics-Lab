/**
 * ContextMenuManager.js - 上下文菜单管理器
 * 管理右键上下文菜单的显示和交互
 */

import { EventEmitter } from './EventEmitter.js';

/**
 * @typedef {import('./types.js').MenuItem} MenuItem
 * @typedef {import('./types.js').MenuContext} MenuContext
 * @typedef {import('./types.js').TreeNode} TreeNode
 */

/**
 * 上下文菜单管理器
 */
export class ContextMenuManager extends EventEmitter {
    constructor() {
        super();
        
        /** @type {HTMLElement|null} */
        this._menuElement = null;
        
        /** @type {MenuContext|null} */
        this._currentContext = null;
        
        /** @type {Map<string, Function>} */
        this._actionHandlers = new Map();
        
        this._init();
    }

    /**
     * 初始化菜单元素
     * @private
     */
    _init() {
        this._menuElement = document.createElement('div');
        this._menuElement.className = 'context-menu';
        this._menuElement.style.cssText = `
            display: none;
            position: fixed;
            z-index: 10001;
            background: var(--panel-bg, #fff);
            border: 1px solid var(--border-color, #ddd);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 180px;
            padding: 4px 0;
            font-size: 13px;
            color: var(--text-color, #333);
        `;
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!this._menuElement.contains(e.target)) {
                this.hide();
            }
        });
        
        // ESC 键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // 滚动时关闭菜单
        document.addEventListener('scroll', () => this.hide(), true);
        
        document.body.appendChild(this._menuElement);
    }

    /**
     * 注册动作处理器
     * @param {string} actionId - 动作 ID
     * @param {Function} handler - 处理函数
     */
    registerAction(actionId, handler) {
        this._actionHandlers.set(actionId, handler);
    }

    /**
     * 批量注册动作处理器
     * @param {Object<string, Function>} handlers - 处理器映射
     */
    registerActions(handlers) {
        for (const [actionId, handler] of Object.entries(handlers)) {
            this._actionHandlers.set(actionId, handler);
        }
    }

    /**
     * 显示上下文菜单
     * @param {MouseEvent} event - 鼠标事件
     * @param {MenuContext} context - 菜单上下文
     */
    show(event, context) {
        event.preventDefault();
        event.stopPropagation();
        
        this._currentContext = context;
        
        // 获取菜单项
        const items = this.getMenuItems(context);
        
        if (items.length === 0) {
            return;
        }
        
        // 渲染菜单
        this._renderMenu(items);
        
        // 定位菜单
        this._positionMenu(event.clientX, event.clientY);
        
        // 显示菜单
        this._menuElement.style.display = 'block';
        
        this.emit('menuShown', { context, items });
    }

    /**
     * 隐藏上下文菜单
     */
    hide() {
        if (this._menuElement.style.display !== 'none') {
            this._menuElement.style.display = 'none';
            this._currentContext = null;
            this.emit('menuHidden');
        }
    }

    /**
     * 根据上下文获取菜单项
     * @param {MenuContext} context - 菜单上下文
     * @returns {MenuItem[]}
     */
    getMenuItems(context) {
        const items = [];
        const { type, target, selectedItems = [] } = context;
        const isMultiSelection = selectedItems.length > 1;

        switch (type) {
            case 'project':
                items.push(
                    { id: 'newScene', label: '新建场景', icon: '📄', shortcut: 'Ctrl+N' },
                    { id: 'newFolder', label: '新建文件夹', icon: '📁' },
                    { separator: true },
                    { id: 'paste', label: '粘贴', icon: '📋', shortcut: 'Ctrl+V', disabled: !this._hasClipboardContent() },
                    { separator: true },
                    { id: 'refresh', label: '刷新', icon: '🔄' },
                    { id: 'openInExplorer', label: '在文件管理器中打开', icon: '📂' }
                );
                break;

            case 'directory':
                items.push(
                    { id: 'newScene', label: '新建场景', icon: '📄' },
                    { id: 'newFolder', label: '新建文件夹', icon: '📁' },
                    { separator: true },
                    { id: 'paste', label: '粘贴', icon: '📋', shortcut: 'Ctrl+V', disabled: !this._hasClipboardContent() },
                    { separator: true },
                    { id: 'rename', label: '重命名', icon: '✏️', shortcut: 'F2' },
                    { id: 'delete', label: '删除', icon: '🗑️', shortcut: 'Delete' }
                );
                break;

            case 'scene':
                if (isMultiSelection) {
                    items.push(
                        { id: 'copy', label: `复制 ${selectedItems.length} 个项目`, icon: '📋', shortcut: 'Ctrl+C' },
                        { id: 'cut', label: `剪切 ${selectedItems.length} 个项目`, icon: '✂️', shortcut: 'Ctrl+X' },
                        { separator: true },
                        { id: 'delete', label: `删除 ${selectedItems.length} 个项目`, icon: '🗑️', shortcut: 'Delete' }
                    );
                } else {
                    items.push(
                        { id: 'open', label: '打开', icon: '📂' },
                        { separator: true },
                        { id: 'copy', label: '复制', icon: '📋', shortcut: 'Ctrl+C' },
                        { id: 'cut', label: '剪切', icon: '✂️', shortcut: 'Ctrl+X' },
                        { id: 'duplicate', label: '复制副本', icon: '📑', shortcut: 'Ctrl+D' },
                        { separator: true },
                        { id: 'rename', label: '重命名', icon: '✏️', shortcut: 'F2' },
                        { id: 'delete', label: '删除', icon: '🗑️', shortcut: 'Delete' },
                        { separator: true },
                        { id: 'export', label: '导出...', icon: '📤' }
                    );
                }
                break;

            case 'multi-selection':
                items.push(
                    { id: 'copy', label: `复制 ${selectedItems.length} 个项目`, icon: '📋', shortcut: 'Ctrl+C' },
                    { id: 'cut', label: `剪切 ${selectedItems.length} 个项目`, icon: '✂️', shortcut: 'Ctrl+X' },
                    { separator: true },
                    { id: 'delete', label: `删除 ${selectedItems.length} 个项目`, icon: '🗑️', shortcut: 'Delete' }
                );
                break;

            case 'empty':
                items.push(
                    { id: 'newProject', label: '新建项目', icon: '📁' },
                    { id: 'openProject', label: '打开项目', icon: '📂' },
                    { separator: true },
                    { id: 'import', label: '导入场景...', icon: '📥' }
                );
                break;
        }

        return items;
    }

    /**
     * 渲染菜单
     * @private
     */
    _renderMenu(items) {
        this._menuElement.innerHTML = '';
        
        // 根据当前主题动态更新样式
        const isDarkTheme = document.body.getAttribute('data-ui-theme') === 'dark';
        this._menuElement.style.background = isDarkTheme ? 'var(--panel-bg, #343a40)' : 'var(--panel-bg, #fff)';
        this._menuElement.style.borderColor = isDarkTheme ? 'var(--border-color, #495057)' : 'var(--border-color, #ddd)';
        this._menuElement.style.color = isDarkTheme ? 'var(--text-color, #dee2e6)' : 'var(--text-color, #333)';
        this._menuElement.style.boxShadow = isDarkTheme ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)';
        
        for (const item of items) {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                separator.style.cssText = `
                    height: 1px;
                    background: var(--border-color, ${isDarkTheme ? '#495057' : '#eee'});
                    margin: 4px 8px;
                `;
                this._menuElement.appendChild(separator);
            } else {
                const menuItem = this._createMenuItem(item, isDarkTheme);
                this._menuElement.appendChild(menuItem);
            }
        }
    }

    /**
     * 创建菜单项元素
     * @private
     */
    _createMenuItem(item, isDarkTheme = false) {
        const element = document.createElement('div');
        element.className = 'context-menu-item';
        
        const textColor = isDarkTheme ? 'var(--text-color, #dee2e6)' : 'var(--text-color, #333)';
        const hoverBg = 'var(--primary-color, #0078d4)';
        
        element.style.cssText = `
            display: flex;
            align-items: center;
            padding: 6px 12px;
            cursor: ${item.disabled ? 'default' : 'pointer'};
            opacity: ${item.disabled ? '0.5' : '1'};
            transition: background 0.15s, color 0.15s;
            color: ${textColor};
        `;
        
        // XSS防护: 使用DOM API而非innerHTML
        const iconSpan = document.createElement('span');
        iconSpan.className = 'menu-icon';
        iconSpan.style.cssText = 'width: 20px; margin-right: 8px; text-align: center;';
        iconSpan.textContent = item.icon || '';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'menu-label';
        labelSpan.style.flex = '1';
        labelSpan.textContent = item.label;

        element.appendChild(iconSpan);
        element.appendChild(labelSpan);

        if (item.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'menu-shortcut';
            shortcutSpan.style.cssText = `color: var(--text-color-secondary, ${isDarkTheme ? '#adb5bd' : '#888'}); font-size: 11px; margin-left: 16px;`;
            shortcutSpan.textContent = item.shortcut;
            element.appendChild(shortcutSpan);
        }
        
        if (!item.disabled) {
            element.addEventListener('mouseenter', () => {
                element.style.background = hoverBg;
                element.style.color = '#fff';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.background = 'transparent';
                element.style.color = textColor;
            });
            
            element.addEventListener('click', () => {
                this.executeAction(item.id, this._currentContext);
                this.hide();
            });
        }
        
        return element;
    }

    /**
     * 定位菜单
     * @private
     */
    _positionMenu(x, y) {
        const menu = this._menuElement;
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 临时显示以获取尺寸
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        
        menu.style.visibility = 'visible';
        
        // 调整位置以确保菜单在视口内
        let finalX = x;
        let finalY = y;
        
        if (x + menuWidth > viewportWidth) {
            finalX = viewportWidth - menuWidth - 8;
        }
        
        if (y + menuHeight > viewportHeight) {
            finalY = viewportHeight - menuHeight - 8;
        }
        
        menu.style.left = `${Math.max(8, finalX)}px`;
        menu.style.top = `${Math.max(8, finalY)}px`;
    }

    /**
     * 执行菜单动作
     * @param {string} actionId - 动作 ID
     * @param {MenuContext} context - 上下文
     */
    executeAction(actionId, context) {
        const handler = this._actionHandlers.get(actionId);
        
        if (handler) {
            try {
                handler(context);
            } catch (e) {
                console.error(`Error executing action ${actionId}:`, e);
            }
        }
        
        this.emit('actionExecuted', { actionId, context });
    }

    /**
     * 检查剪贴板是否有内容
     * @private
     */
    _hasClipboardContent() {
        // 这个方法需要与 ClipboardManager 集成
        // 暂时返回 false，实际使用时需要注入 ClipboardManager
        return this._clipboardManager?.hasContent() || false;
    }

    /**
     * 设置剪贴板管理器引用
     * @param {import('./ClipboardManager.js').ClipboardManager} manager
     */
    setClipboardManager(manager) {
        this._clipboardManager = manager;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        if (this._menuElement && this._menuElement.parentNode) {
            this._menuElement.parentNode.removeChild(this._menuElement);
        }
        this._menuElement = null;
        this._currentContext = null;
        this._actionHandlers.clear();
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ContextMenuManager = ContextMenuManager;
}
